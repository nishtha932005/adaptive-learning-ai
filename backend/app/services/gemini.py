import os
import json
from typing import List, Optional, Tuple, Any

try:
    import google.generativeai as genai
except ImportError as exc:  # pragma: no cover - environment-specific
    genai = None  # type: ignore[assignment]


def _ensure_gemini_configured() -> str:
    """
    Configure the Gemini client and return the model id.

    Raises:
        RuntimeError: if the SDK is missing or the API key is not set.
    """
    if genai is None:
        raise RuntimeError(
            "google-generativeai is not installed in this environment. "
            "Install it with 'pip install google-generativeai'."
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

    genai.configure(api_key=api_key)

    model_id = os.getenv("GEMINI_MODEL_ID", "gemini-1.5-flash")
    return model_id


class GeminiService:
    """
    Thin wrapper around Google Gemini for lesson and content generation.

    All public methods raise RuntimeError on failure so the FastAPI layer
    can translate them into HTTP 500 with a clean message.
    """

    def __init__(self, model_id: Optional[str] = None) -> None:
        self._model_id = model_id or os.getenv("GEMINI_MODEL_ID", "gemini-1.5-flash")

    def _get_model(self):
        model_id = _ensure_gemini_configured()
        # Always prefer configured id, but fall back to instance override if given.
        if self._model_id:
            model_id = self._model_id
        return genai.GenerativeModel(model_id)

    async def generate_content(self, topic: str, difficulty: str) -> str:
        """
        Generic content generator used by the earlier /api/generate route.

        difficulty: arbitrary string such as 'easy', 'normal', 'hard'.
        """
        prompt: str
        diff = (difficulty or "").lower()
        if diff in ("easy", "simplified", "beginner"):
            prompt = f"Explain {topic} to a 10-year-old using clear analogies and simple language."
        elif diff in ("hard", "advanced", "phd"):
            prompt = f"Provide a PhD-level challenge question and short discussion prompt for the topic: {topic}."
        else:
            prompt = f"Provide a concise, clear explanation of {topic} suitable for a university student."

        try:
            model = self._get_model()
            response = await model.generate_content_async(prompt)
            text = getattr(response, "text", None) or ""
            if not text:
                raise RuntimeError("Gemini returned an empty response.")
            return text
        except RuntimeError:
            # Bubble up configuration errors as-is.
            raise
        except Exception as exc:  # pragma: no cover - defensive
            error_msg = str(exc)
            # Check for quota/rate limit errors
            if "429" in error_msg or "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
                raise RuntimeError(f"Gemini API quota exceeded. Please try again later. Details: {error_msg}")
            raise RuntimeError(f"Gemini generate_content failed: {error_msg}") from exc

    async def generate_lesson(self, topic: str, mode: str) -> str:
        """
        Lesson generator used by /api/ai/generate.

        mode: 'simplify' | 'standard' | 'deep_dive'
        """
        mode_norm = (mode or "").lower()
        if mode_norm == "simplify":
            prompt = (
                f"Explain {topic} to a struggling student using very simple analogies. "
                "Keep it under 100 words and give one concrete example."
            )
        elif mode_norm == "deep_dive":
            prompt = (
                f"Provide a comprehensive, advanced summary of {topic}. "
                "Include one complex challenge question at the end."
            )
        else:
            prompt = (
                f"Teach {topic} at a standard university level. "
                "Include a short explanation and one quick check-your-understanding question."
            )

        try:
            model = self._get_model()
            response = await model.generate_content_async(prompt)
            text = getattr(response, "text", None) or ""
            if not text:
                raise RuntimeError("Gemini returned an empty response.")
            return text
        except RuntimeError:
            raise
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(f"Gemini generate_lesson failed: {exc}") from exc

    async def generate_study_tool(
        self,
        tool_type: str,
        topic: Optional[str] = None,
        input_text: Optional[str] = None,
        difficulty: Optional[int] = None,
        diagram_type: Optional[str] = None,
        num_questions: Optional[int] = 5,
        level: Optional[str] = None,
        detail: Optional[str] = None,
    ) -> Tuple[str, Optional[str], Optional[List[dict]]]:
        """
        Multi-tool generator backing the Study Room 2.0.

        Returns (mode, content, quiz_items) where:
          - mode: 'explain' | 'summarize' | 'quiz' | 'socratic'
          - content: markdown/text for non-quiz tools
          - quiz_items: list of quiz dicts for 'quiz' mode
        """
        mode = (tool_type or "explain").lower()

        if mode == "summarize":
            if not input_text:
                raise RuntimeError("Summarizer requires input_text.")
            prompt = (
                "Summarize the following text into clear bullet points and key takeaways. "
                "Focus on clarity and structure.\n\n"
                f"TEXT:\n{input_text}"
            )
            try:
                model = self._get_model()
                response = await model.generate_content_async(prompt)
                text = getattr(response, "text", None) or ""
                if not text:
                    raise RuntimeError("Gemini returned an empty summary.")
                return "summarize", text, None
            except RuntimeError:
                raise
            except Exception as exc:  # pragma: no cover
                raise RuntimeError(f"Gemini summarize failed: {exc}") from exc

        if mode == "quiz":
            if not topic:
                raise RuntimeError("Quiz generator requires a topic.")
            prompt = (

                f"Generate {num_questions or 5} multiple-choice questions about the following topic. "
                "Return ONLY raw JSON (no commentary, no markdown) in this format:\n"
                "[\n"
                "  {\n"
                '    "id": 1,\n'
                '    "question": "string",\n'
                '    "options": ["option A", "option B", "option C", "option D"],\n'
                '    "correctAnswer": "The exact string of the correct option"\n'
                "  }\n"
                "]\n\n"
                f"TOPIC: {topic}"
            )
            try:
                model = self._get_model()
                response = await model.generate_content_async(prompt)
                raw = getattr(response, "text", None) or ""
                if not raw:
                    raise RuntimeError("Gemini returned an empty quiz payload.")

                # Strip markdown fences if model wrapped JSON
                cleaned = raw.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.strip("`")
                    # Remove potential language hint like json\n
                    first_newline = cleaned.find("\n")
                    if first_newline != -1:
                        cleaned = cleaned[first_newline + 1 :].strip()
                    if cleaned.endswith("```"):
                        cleaned = cleaned[: -3].strip()

                quiz_items: Any = json.loads(cleaned)
                if not isinstance(quiz_items, list):
                    raise RuntimeError("Quiz JSON was not an array.")
                return "quiz", None, quiz_items
            except RuntimeError:
                raise
            except Exception as exc:  # pragma: no cover
                raise RuntimeError(f"Gemini quiz generation failed: {exc}") from exc

        if mode == "socratic":
            if not topic:
                raise RuntimeError("Socratic mode requires a topic or question.")
            prompt = (
                "Act as a Socratic tutor. The student wants to learn the following topic. "
                "Do NOT give the final answer. Instead, respond with one or two guiding "
                "questions that probe their understanding and push them to think.\n\n"
                f"TOPIC OR QUESTION: {topic}"
            )
            try:
                model = self._get_model()
                response = await model.generate_content_async(prompt)
                text = getattr(response, "text", None) or ""
                if not text:
                    raise RuntimeError("Gemini returned an empty Socratic prompt.")
                return "socratic", text, None
            except RuntimeError:
                raise
            except Exception as exc:  # pragma: no cover
                raise RuntimeError(f"Gemini socratic mode failed: {exc}") from exc

        if mode == "visualize":
            if not topic:
                raise RuntimeError("Visualizer requires a topic.")
            # Hard cap topic length to keep prompt small and protect rate/quotas
            safe_topic = (topic or "")[:300]
            diagram = (diagram_type or "flowchart").lower()

            if diagram == "flowchart":
                # Highly optimized prompt: ask ONLY for mermaid code, no prose.
                prompt = (
                    "You are a diagram engine. Generate a simple Mermaid.js FLOWCHART for this topic.\n"
                    "Respond with ONLY a ```mermaid code block and nothing else (no text before or after).\n\n"
                    f"TOPIC: {safe_topic}"
                )
            else:
                # Other diagram types can still include a tiny summary if the model chooses.
                prompt = (
                    "Generate a concise Mermaid.js diagram for the topic below.\n"
                    f"Preferred diagram type: {diagram}.\n"
                    "Start with a ```mermaid code block containing ONLY the diagram code. "
                    "Optionally, you may add one short sentence of summary after the code block.\n\n"
                    f"TOPIC: {safe_topic}"
                )
            try:
                model = self._get_model()
                response = await model.generate_content_async(prompt)
                text = getattr(response, "text", None) or ""
                if not text:
                    raise RuntimeError("Gemini returned an empty visualization payload.")
                return "visualize", text, None
            except RuntimeError:
                raise
            except Exception as exc:  # pragma: no cover
                raise RuntimeError(f"Gemini visualize mode failed: {exc}") from exc

        # Default / explain path – reuse difficulty slider if provided
        if difficulty is not None:
            if difficulty <= 30:
                explain_mode = "simplify"
            elif difficulty <= 70:
                explain_mode = "standard"
            else:
                explain_mode = "deep_dive"
        else:
            explain_mode = "standard"

        text = await self.generate_lesson(topic or "", explain_mode)
        return "explain", text, None


class AdaptiveTutor:
    """
    Higher-level adaptive tutor wrapper used by /api/ai/explain.
    Decides how to pitch the explanation based on a struggle score.
    """

    def __init__(self, service: Optional[GeminiService] = None) -> None:
        self._service = service or GeminiService()

    async def get_adaptive_explanation(self, topic: str, struggle_score: int) -> str:
        """
        struggle_score: 0–100. Higher means student is struggling more.
        """
        if struggle_score >= 70:
            mode = "simplify"
        elif struggle_score <= 30:
            mode = "deep_dive"
        else:
            mode = "standard"

        return await self._service.generate_lesson(topic=topic, mode=mode)


def list_gemini_models() -> List[str]:
    """
    Returns a list of available Gemini model ids that support generateContent.
    """
    model_id = _ensure_gemini_configured()
    # model_id is only used to ensure config; we still list all models

    try:
        models = genai.list_models()
        ids: List[str] = []
        for m in models:
            # m.supported_generation_methods is typically like ['generateContent', ...]
            methods = getattr(m, "supported_generation_methods", []) or []
            if "generateContent" in methods:
                ids.append(getattr(m, "name", ""))
        return [m for m in ids if m]
    except RuntimeError:
        raise
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Failed to list Gemini models: {exc}") from exc



