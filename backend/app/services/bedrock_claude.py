import os
import json
import asyncio
from typing import List, Optional, Tuple, Any

import botocore.exceptions

try:  # pragma: no cover - optional dependency
    import boto3
except ImportError:  # pragma: no cover - environment-specific
    boto3 = None  # type: ignore[assignment]


def _ensure_bedrock_configured() -> Tuple[str, str]:
    """Ensure the Bedrock runtime client can be constructed.

    Returns (region, model_id).

    Raises:
        RuntimeError: if boto3 is missing or config is incomplete.
    """
    if boto3 is None:
        raise RuntimeError(
            "boto3 is not installed in this environment. "
            "Install it with 'pip install boto3' to use Amazon Bedrock."
        )

    region = os.getenv("BEDROCK_REGION") or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
    if not region:
        raise RuntimeError(
            "BEDROCK_REGION (or AWS_REGION / AWS_DEFAULT_REGION) environment variable is not set."
        )

    model_id = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")
    return region, model_id


def _build_bedrock_client(region: str):
    """Create a Bedrock Runtime client.

    Separated for easier mocking and error handling.
    """
    if boto3 is None:  # pragma: no cover - guarded earlier
        raise RuntimeError("boto3 is not available")
    try:
        return boto3.client("bedrock-runtime", region_name=region)
    except botocore.exceptions.BotoCoreError as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Failed to create Bedrock client: {exc}") from exc


def _extract_claude_text(response_body: bytes) -> str:
    """Extract plain text from a Claude-style Bedrock response body."""
    try:
        payload = json.loads(response_body.decode("utf-8"))
    except Exception as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Failed to decode Bedrock response: {exc}") from exc

    # Claude 3 on Bedrock returns {"content":[{"type":"text","text":"..."}], ...}
    content = payload.get("content") or []
    if content and isinstance(content, list):
        first = content[0] or {}
        text = first.get("text")
        if isinstance(text, str) and text.strip():
            return text

    # Fallback: try common alternative shapes or stringify
    text = payload.get("output_text") or payload.get("generation")
    if isinstance(text, str) and text.strip():
        return text

    raise RuntimeError("Bedrock Claude response did not contain text content.")


class BedrockClaudeService:
    """Thin wrapper around Amazon Bedrock Claude for lesson and content generation.

    Public methods mirror GeminiService so FastAPI routes can switch providers
    without changing business logic. All public methods raise RuntimeError on
    failure so the FastAPI layer can translate them into HTTP errors.
    """

    def __init__(self, model_id: Optional[str] = None) -> None:
        region, default_model_id = _ensure_bedrock_configured()
        self._region = region
        self._model_id = model_id or default_model_id
        self._client = _build_bedrock_client(self._region)

    async def _invoke(self, prompt: str, max_tokens: int = 800) -> str:
        """Invoke the Claude model with a simple user prompt."""

        def _call() -> str:
            body = json.dumps(
                {
                    "model": self._model_id,
                    "max_tokens": max_tokens,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                            ],
                        }
                    ],
                }
            )

            try:
                response = self._client.invoke_model(
                    modelId=self._model_id,
                    body=body.encode("utf-8"),
                    contentType="application/json",
                    accept="application/json",
                )
            except botocore.exceptions.ClientError as exc:  # pragma: no cover - defensive
                msg = str(exc)
                if "Throttling" in msg or "Rate exceeded" in msg:
                    raise RuntimeError(
                        f"Bedrock Claude quota or rate limit exceeded. Details: {msg}"
                    ) from exc
                raise RuntimeError(f"Bedrock Claude invocation failed: {msg}") from exc
            except Exception as exc:  # pragma: no cover - defensive
                raise RuntimeError(f"Bedrock Claude invocation failed: {exc}") from exc

            body_bytes = response.get("body")
            if hasattr(body_bytes, "read"):
                # StreamingBody
                body_bytes = body_bytes.read()
            if not isinstance(body_bytes, (bytes, bytearray)):
                raise RuntimeError("Unexpected Bedrock response body type.")

            return _extract_claude_text(body_bytes)

        return await asyncio.to_thread(_call)

    async def generate_content(self, topic: str, difficulty: str) -> str:
        """Generic content generator used by earlier /api/generate route."""
        diff = (difficulty or "").lower()
        if diff in ("easy", "simplified", "beginner"):
            prompt = f"Explain {topic} to a 10-year-old using clear analogies and simple language."
        elif diff in ("hard", "advanced", "phd"):
            prompt = f"Provide a PhD-level challenge question and short discussion prompt for the topic: {topic}."
        else:
            prompt = f"Provide a concise, clear explanation of {topic} suitable for a university student."

        return await self._invoke(prompt)

    async def generate_lesson(self, topic: str, mode: str) -> str:
        """Lesson generator used by /api/ai/generate.

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

        return await self._invoke(prompt)

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
        """Multi-tool generator backing the Study Room 2.0.

        Mirrors GeminiService.generate_study_tool but uses Claude via Bedrock.

        Returns (mode, content, quiz_items) where:
          - mode: 'explain' | 'summarize' | 'quiz' | 'socratic' | 'visualize'
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
            text = await self._invoke(prompt)
            if not text:
                raise RuntimeError("Bedrock Claude returned an empty summary.")
            return "summarize", text, None

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
            raw = await self._invoke(prompt, max_tokens=1200)
            if not raw:
                raise RuntimeError("Bedrock Claude returned an empty quiz payload.")

            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.strip("`")
                first_newline = cleaned.find("\n")
                if first_newline != -1:
                    cleaned = cleaned[first_newline + 1 :].strip()
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3].strip()

            quiz_items: Any = json.loads(cleaned)
            if not isinstance(quiz_items, list):
                raise RuntimeError("Quiz JSON was not an array.")
            return "quiz", None, quiz_items

        if mode == "socratic":
            if not topic:
                raise RuntimeError("Socratic mode requires a topic or question.")
            # Keep existing Socratic tutor prompt style
            prompt = (
                "Act as a Socratic tutor. The student wants to learn the following topic. "
                "Do NOT give the final answer. Instead, respond with one or two guiding "
                "questions that probe their understanding and push them to think.\n\n"
                f"TOPIC OR QUESTION: {topic}"
            )
            text = await self._invoke(prompt)
            if not text:
                raise RuntimeError("Bedrock Claude returned an empty Socratic prompt.")
            return "socratic", text, None

        if mode == "visualize":
            if not topic:
                raise RuntimeError("Visualizer requires a topic.")
            safe_topic = (topic or "")[:300]
            diagram = (diagram_type or "flowchart").lower()

            if diagram == "flowchart":
                prompt = (
                    "You are a diagram engine. Generate a simple Mermaid.js FLOWCHART for this topic.\n"
                    "Respond with ONLY a ```mermaid code block and nothing else (no text before or after).\n\n"
                    f"TOPIC: {safe_topic}"
                )
            else:
                prompt = (
                    "Generate a concise Mermaid.js diagram for the topic below.\n"
                    f"Preferred diagram type: {diagram}.\n"
                    "Start with a ```mermaid code block containing ONLY the diagram code. "
                    "Optionally, you may add one short sentence of summary after the code block.\n\n"
                    f"TOPIC: {safe_topic}"
                )

            text = await self._invoke(prompt, max_tokens=800)
            if not text:
                raise RuntimeError("Bedrock Claude returned an empty visualization payload.")
            return "visualize", text, None

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
    """Higher-level adaptive tutor wrapper used by /api/ai/explain.

    Uses BedrockClaudeService under the hood but keeps the same interface
    as the previous Gemini-based AdaptiveTutor.
    """

    def __init__(self, service: Optional[BedrockClaudeService] = None) -> None:
        # Defer BedrockClaudeService creation until first use to avoid
        # initializing Bedrock at FastAPI import/startup time.
        self._service: Optional[BedrockClaudeService] = service

    async def get_adaptive_explanation(self, topic: str, struggle_score: int) -> str:
        """Return an explanation tuned to the struggle score (0–100)."""
        if struggle_score >= 70:
            mode = "simplify"
        elif struggle_score <= 30:
            mode = "deep_dive"
        else:
            mode = "standard"

        # Lazily create the underlying BedrockClaudeService on first use.
        if self._service is None:
            self._service = BedrockClaudeService()

        return await self._service.generate_lesson(topic=topic, mode=mode)


def list_bedrock_models() -> List[str]:
    """Return the configured Claude model id as a one-item list.

    Bedrock does not expose a simple "list all models" API in the same way
    as the Gemini helper did, so for now we just surface the active model id
    for debugging / configuration UIs.
    """
    _, model_id = _ensure_bedrock_configured()
    return [model_id]
