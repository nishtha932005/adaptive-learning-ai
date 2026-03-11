import os
import json
import asyncio
from typing import List, Optional, Tuple, Any

try:
    from google import genai
except ImportError as exc:  # pragma: no cover - environment-specific
    genai = None  # type: ignore[assignment]


def _ensure_gemini_client() -> Any:
    """
    Build and return the Gemini client.

    Raises:
        RuntimeError: if the SDK is missing or the API key is not set.
    """
    if genai is None:
        raise RuntimeError(
            "google-genai is not installed in this environment. "
            "Install it with 'pip install google-genai'."
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

    return genai.Client(api_key=api_key)


class GeminiService:
    """
    Thin wrapper around Google Gemini for lesson and content generation.

    All public methods raise RuntimeError on failure so the FastAPI layer
    can translate them into HTTP 500 with a clean message.
    """

    def __init__(self, model_id: Optional[str] = None) -> None:
        self._model_id = model_id or os.getenv("GEMINI_MODEL_ID", "gemini-3.1-pro-preview")
        self._client = _ensure_gemini_client()

    async def _generate_text(self, prompt: str) -> str:
        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._model_id,
                contents=prompt,
            )
        except Exception as exc:  # pragma: no cover - defensive
            error_msg = str(exc)
            if "429" in error_msg or "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
                raise RuntimeError(f"Gemini API quota exceeded. Please try again later. Details: {error_msg}")
            raise RuntimeError(f"Gemini generate_content failed: {error_msg}") from exc

        text = self._extract_response_text(response)
        if not text:
            raise RuntimeError("Gemini returned an empty response.")
        return text

    @staticmethod
    def _extract_response_text(response: Any) -> str:
        """Extract plain text from Gemini response payloads.

        Gemini SDK often exposes text via response.text, but some responses only
        include candidates/content parts.
        """
        direct_text = getattr(response, "text", None)
        if isinstance(direct_text, str) and direct_text.strip():
            return direct_text

        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            if not content:
                continue
            parts = getattr(content, "parts", None) or []
            chunks: List[str] = []
            for part in parts:
                part_text = getattr(part, "text", None)
                if isinstance(part_text, str) and part_text.strip():
                    chunks.append(part_text)
            if chunks:
                return "\n".join(chunks)

        return ""

    async def generate_content(self, topic: str, difficulty: str) -> str:
        """
        Generic content generator used by the earlier /api/generate route.

        difficulty: arbitrary string such as 'easy', 'normal', 'hard'.
        """
        prompt: str
        diff = (difficulty or "").lower()
        if diff in ("raw", "structured", "json"):
            # Caller-provided prompt should pass through unchanged.
            prompt = topic
        elif diff in ("easy", "simplified", "beginner"):
            prompt = f"Explain {topic} to a 10-year-old using clear analogies and simple language."
        elif diff in ("hard", "advanced", "phd"):
            prompt = f"Provide a PhD-level challenge question and short discussion prompt for the topic: {topic}."
        else:
            prompt = f"Provide a concise, clear explanation of {topic} suitable for a university student."

        try:
            return await self._generate_text(prompt)
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
            return await self._generate_text(prompt)
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

            detail_norm = (detail or "standard").lower()
            if detail_norm == "short":
                style = (
                    "Summarize the text into 3-5 very concise bullet points. "
                    "First, infer the core keywords and then center the summary around those key ideas. "
                    "Avoid extra commentary."
                )
            elif "deep" in detail_norm:
                style = (
                    "Provide a detailed, structured summary with sections and bullet points. "
                    "Explicitly capture the main concepts and how they relate, based on the strongest keywords in the text."
                )
            else:
                style = (
                    "Summarize the following text into clear bullet points and key takeaways. "
                    "Focus on clarity and structure, highlighting the most important keywords and concepts."
                )

            prompt = (
                f"{style}\n\n"
                f"TEXT:\n{input_text}"
            )
            try:
                text = await self._generate_text(prompt)
                return "summarize", text, None
            except RuntimeError:
                raise
            except Exception as exc:  # pragma: no cover
                raise RuntimeError(f"Gemini summarize failed: {exc}") from exc

        if mode == "quiz":
            if not topic:
                raise RuntimeError("Quiz generator requires a topic.")

            level_norm = (level or "standard").lower()
            if level_norm == "easy":
                difficulty_instructions = (
                    "Make the questions beginner-friendly, focusing on basic recall and simple understanding."
                )
            elif level_norm == "hard":
                difficulty_instructions = (
                    "Make the questions challenging, focusing on deeper reasoning, edge cases, and subtle conceptual traps."
                )
            else:
                difficulty_instructions = (
                    "Use a mix of recall and conceptual understanding suitable for an average university student."
                )

            prompt = (
                f"Generate {num_questions or 5} multiple-choice questions about the following topic. "
                f"{difficulty_instructions} "
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
                raw = await self._generate_text(prompt)
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
                text = await self._generate_text(prompt)
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
            raw_diagram = (diagram_type or "flowchart").strip().lower()

            # Map UI-friendly labels to Mermaid diagram types
            if "mindmap" in raw_diagram:
                mermaid_hint = "mindmap"
                diagram_label = "MINDMAP"
                syntax_hint = "Start with 'mindmap' and use indented bullets for branches."
            elif "sequence" in raw_diagram:
                mermaid_hint = "sequenceDiagram"
                diagram_label = "SEQUENCE DIAGRAM"
                syntax_hint = "Start with 'sequenceDiagram' and use 'participant' and message lines."
            elif "class" in raw_diagram:
                mermaid_hint = "classDiagram"
                diagram_label = "CLASS DIAGRAM"
                syntax_hint = "Start with 'classDiagram' and declare classes and relationships."
            elif "state" in raw_diagram:
                mermaid_hint = "stateDiagram-v2"
                diagram_label = "STATE DIAGRAM"
                syntax_hint = "Start with 'stateDiagram-v2' and define states and transitions."
            elif "entity" in raw_diagram or "er" in raw_diagram:
                mermaid_hint = "erDiagram"
                diagram_label = "ENTITY RELATIONSHIP DIAGRAM"
                syntax_hint = "Start with 'erDiagram' and define entities and relationships."
            elif "journey" in raw_diagram:
                mermaid_hint = "journey"
                diagram_label = "USER JOURNEY"
                syntax_hint = "Start with 'journey' and define stages and steps."
            elif "gantt" in raw_diagram:
                mermaid_hint = "gantt"
                diagram_label = "GANTT CHART"
                syntax_hint = "Start with 'gantt' and define date ranges and tasks."
            elif "pie" in raw_diagram:
                mermaid_hint = "pie"
                diagram_label = "PIE CHART"
                syntax_hint = "Start with 'pie' and list label:value pairs."
            else:
                mermaid_hint = "flowchart TD"
                diagram_label = "FLOWCHART"
                syntax_hint = "Start with 'flowchart TD' and connect steps with arrows."

            # Highly optimized prompt: ask primarily for mermaid code.
            prompt = (
                "You are a diagram engine. Generate a Mermaid.js diagram for this topic.\n"
                f"Requested diagram type: {diagram_label}. {syntax_hint}\n"
                f"Use Mermaid syntax starting with: {mermaid_hint}.\n"
                "Respond with ONLY a ```mermaid code block containing the diagram. "
                "Optionally, after the code block, you may add one short sentence explaining the high-level idea.\n\n"
                f"TOPIC: {safe_topic}"
            )
            try:
                text = await self._generate_text(prompt)
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

    async def get_adaptive_explanation(
        self,
        topic: str,
        struggle_score: Optional[int] = None,
        difficulty: Optional[str] = None,
    ) -> str:
        """
        difficulty: explicit user level from frontend ('beginner' | 'intermediate' | 'advanced').
        struggle_score: optional legacy 0-100 score used when difficulty is not supplied.
        """
        level = (difficulty or "").strip().lower()

        # Preferred path: explicit slider level from frontend.
        if level in {"beginner", "intermediate", "advanced"}:
            if level == "beginner":
                prompt = (
                    f"Explain {topic} for a beginner learner using simple language and 2 practical examples. "
                    "Avoid jargon, and end with a quick recap in 3 bullet points."
                )
            elif level == "advanced":
                prompt = (
                    f"Give an advanced technical explanation of {topic}. "
                    "Include underlying mechanisms, trade-offs, and deeper reasoning. "
                    "Use precise terminology and provide one challenging applied scenario."
                )
            else:
                prompt = (
                    f"Explain {topic} at an intermediate level with conceptual clarity. "
                    "Connect key ideas, include one practical example, and avoid over-simplification."
                )

            return await self._service.generate_content(topic=prompt, difficulty="raw")

        # Backward-compatible path: infer mode from struggle score if provided.
        score = 50 if struggle_score is None else struggle_score
        if score >= 70:
            mode = "simplify"
        elif score <= 30:
            mode = "deep_dive"
        else:
            mode = "standard"

        return await self._service.generate_lesson(topic=topic, mode=mode)


def list_gemini_models() -> List[str]:
    """
    Returns a list of available Gemini model ids that support generateContent.
    """
    client = _ensure_gemini_client()

    try:
        models = client.models.list()
        ids: List[str] = []
        for m in models:
            name = getattr(m, "name", "") or ""
            methods = getattr(m, "supported_actions", None) or getattr(m, "supported_generation_methods", None) or []
            if methods:
                normalized = {str(item).lower() for item in methods}
                if "generatecontent" in normalized or "generate_content" in normalized:
                    ids.append(name)
                    continue
            if "gemini" in name.lower():
                ids.append(name)
        return [m for m in ids if m]
    except RuntimeError:
        raise
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Failed to list Gemini models: {exc}") from exc



