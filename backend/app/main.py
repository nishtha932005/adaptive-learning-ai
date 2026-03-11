import os
import json
import re
import asyncio
from pathlib import Path
from urllib.parse import quote_plus
from fastapi import FastAPI, HTTPException
from collections import Counter
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import requests

from dotenv import load_dotenv

from .models import (
    AIExplainRequest,
    AIExplainResponse,
    GenerateContentRequest,
    GenerateContentResponse,
    AIGenerateLessonRequest,
    AIGenerateLessonResponse,
    StudentStatus,
    StudyToolRequest,
    StudyToolResponse,
    PersonalizeSagaRequest,
    PersonalizeSagaResponse,
    SagaChapter,
)
from .mock_data import generate_mock_student_status
from .services.predictor import predict_student_risk, predict_final_result
from .services.gemini import AdaptiveTutor, GeminiService, list_gemini_models
from .services.personalization import PersonalizationService

# Load environment deterministically so running uvicorn from project root or
# backend/ behaves the same.
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv()

# Simple file logger 
import logging
logging.basicConfig(
    filename=os.path.join(os.getcwd(), "backend_debug.log"),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logging.info("Backend server starting up...")

app = FastAPI(title="AI-Powered Adaptive Learning System")

COURSE_GENERATION_TIMEOUT_SECONDS = int(os.getenv("COURSE_GENERATION_TIMEOUT_SECONDS", "20"))

def _parse_cors_origins() -> list[str]:
    """
    Build allowlist from CORS_ORIGINS (comma-separated) with local defaults.
    Example: CORS_ORIGINS=https://main.app.amplifyapp.com,https://app.example.com
    """
    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://0.0.0.0:5173",
    ]

    raw = os.getenv("CORS_ORIGINS", "")
    if not raw.strip():
        return default_origins

    parsed = [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
    return parsed or default_origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tutor = AdaptiveTutor()
ai_service: Optional[GeminiService] = None
personalization_service = PersonalizationService()


def get_ai_service() -> GeminiService:
    global ai_service
    if ai_service is None:
        ai_service = GeminiService()
    return ai_service


@app.get("/")
async def root():
    """
    Simple handshake route so the frontend can confirm the backend is online.
    """
    return {"status": "online"}


if __name__ == "__main__":  # pragma: no cover - container entrypoint helper
    import uvicorn

    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)


@app.get("/api/health")
async def health_check():
    """
    Mock system health/student snapshot for handshake and diagnostics.
    """
    return {
        "student_id": "STU_001",
        "risk_score": 85,
        "system_status": "All Systems Go",
    }


@app.get("/api/ai/models")
async def list_models():
    """
    Returns Gemini models that support content generation.
    """
    try:
        models = list_gemini_models()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"models": models}


def _find_youtube_video_id(query: str) -> Optional[str]:
    """Fetch YouTube search results HTML and extract the first non-shorts id."""
    if not query or not query.strip():
        return None

    encoded = quote_plus(query.strip())
    url = f"https://www.youtube.com/results?search_query={encoded}"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
    }

    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()

    html = response.text
    # Match canonical watch ids and avoid shorts where possible.
    matches = re.findall(r"/watch\?v=([A-Za-z0-9_-]{11})", html)
    if not matches:
        return None

    seen = set()
    deduped = []
    for vid in matches:
        if vid not in seen:
            seen.add(vid)
            deduped.append(vid)

    return deduped[0] if deduped else None


@app.get("/api/video/search")
async def search_video(topic: str):
    """Resolve an embeddable YouTube video URL for a lesson topic."""
    try:
        video_id = _find_youtube_video_id(topic)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Video search failed: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected video search error: {exc}") from exc

    if not video_id:
        return {"video_url": None, "video_id": None}

    return {
        "video_id": video_id,
        "video_url": f"https://www.youtube.com/embed/{video_id}",
    }


@app.get("/api/student/status", response_model=StudentStatus)
async def get_student_status():
    """
    Returns mock student engagement stats and a derived risk score.
    """
    print("DEBUG: Received request for /api/student/status")
    base = generate_mock_student_status()
    risk_score = predict_student_risk(
        interactions=base["interactions"],
        last_score=base["last_score"],
        days_overdue=base["days_overdue"],
    )
    
    # Calculate predicted result based on dataset fields
    predicted_result = predict_final_result(
        credits=base.get("studied_credits", 0),
        clicks=base.get("total_clicks", 0)
    )
    
    base["predicted_final_result"] = predicted_result
    
    return StudentStatus(risk_score=risk_score, **base)


@app.post("/api/ai/explain", response_model=AIExplainResponse)
async def explain_topic(payload: AIExplainRequest):
    """
    Uses Gemini via AdaptiveTutor to generate an adaptive explanation or
    challenge.
    """
    try:
        explanation = await tutor.get_adaptive_explanation(
            topic=payload.topic,
            struggle_score=payload.struggle_score,
            difficulty=payload.difficulty,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AIExplainResponse(explanation=explanation)


@app.post("/api/generate", response_model=GenerateContentResponse)
async def generate_content(payload: GenerateContentRequest):
    """
    Generic AI endpoint backed by Gemini to generate lessons/challenges.
    """
    try:
        content = await get_ai_service().generate_content(
            topic=payload.topic, difficulty=payload.difficulty
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return GenerateContentResponse(content=content)


@app.post("/api/ai/generate", response_model=AIGenerateLessonResponse)
async def ai_generate_lesson(payload: AIGenerateLessonRequest):
    """
    MVP endpoint for the Study Room, backed by GeminiService.generate_lesson.
    """
    try:
        content = await get_ai_service().generate_lesson(
            topic=payload.topic, mode=payload.mode
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AIGenerateLessonResponse(content=content)


@app.post("/api/ai/study-tool", response_model=StudyToolResponse)
async def ai_study_tool(payload: StudyToolRequest):
    """
        Multi-tool endpoint powering the Study Room 2.0.
        Supports:
            - explain
            - summarize
            - quiz
            - socratic
    """
    print(f"DEBUG: Received study-tool request: {payload.tool_type} for topic: {payload.topic}")
    try:
        mode, content, quiz_items = await get_ai_service().generate_study_tool(
            tool_type=payload.tool_type,
            topic=payload.topic,
            input_text=payload.input_text,
            difficulty=payload.difficulty,
            diagram_type=payload.diagram_type,
            num_questions=payload.num_questions,
            level=payload.level,
            detail=payload.detail,
        )
    except RuntimeError as exc:
        error_msg = str(exc)
        # Check for quota errors
        if "quota" in error_msg.lower() or "429" in error_msg or "Throttling" in error_msg:
            logging.warning("Study-tool quota limited; serving fallback mode=%s", payload.tool_type)
            return _study_tool_fallback(payload)
        # Check for API key errors
        if "credentials" in error_msg.lower() or "not set" in error_msg.lower() or "GEMINI" in error_msg.upper():
            logging.warning("Study-tool Gemini not configured; serving fallback mode=%s", payload.tool_type)
            return _study_tool_fallback(payload)

        logging.warning("Study-tool runtime error; serving fallback mode=%s error=%s", payload.tool_type, error_msg)
        return _study_tool_fallback(payload)
    except Exception as exc:
        import traceback
        print(f"Unexpected error in study-tool: {exc}")
        print(traceback.format_exc())
        logging.error("Study-tool unexpected error; serving fallback mode=%s error=%s", payload.tool_type, str(exc))
        return _study_tool_fallback(payload)

    print(f"DEBUG: Study-tool request completed successfully for {payload.tool_type}")
    return StudyToolResponse(mode=mode, content=content, quiz=quiz_items)


@app.post("/api/ai/generate-course")
async def generate_course(payload: dict):
    """
    Generate a personalized course based on topic and student pace.
    Only accessible to personal accounts.
    """
    try:
        topic = payload.get("topic", "")
        pace = payload.get("pace", "moderate")
        student_id = payload.get("student_id")

        if not topic:
            raise HTTPException(status_code=400, detail="Topic is required")

        # Build detailed prompt based on pace
        pace_instructions = {
            "blitz": "Create 3-4 concise summary modules with key concepts only. Each module should be 15-20 minutes. Focus on essentials.",
            "moderate": "Create 5-6 balanced modules with practice exercises. Each module should be 30-45 minutes. Include hands-on examples.",
            "deep": "Create 7-10 detailed modules with quizzes, projects, and deep dives. Each module should be 60-90 minutes. Include comprehensive exercises and assessments."
        }
        
        pace_instruction = pace_instructions.get(pace, pace_instructions["moderate"])

        # Generate course content using the shared AI service (Gemini)
        prompt = f"""You are an expert course creator. Create a comprehensive, engaging course on: {topic}

Student Pace: {pace}
{pace_instruction}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{{
    "title": "Course Title",
    "description": "Short description",

  "modules": [
    {{
            "title": "Specific module title for this topic progression",
            "chapters": [
                {{
                    "title": "Chapter title",
                    "videoId": "optional_youtube_video_id"
                }}
                        ]
    }}
  ]
}}

Rules:
- Use modules[].chapters[] under each module.
- Number chapters by module order: 1.1, 1.2, 1.3 ... then 2.1, 2.2, 2.3.
- Chapter titles should include that numbering (example: "Chapter 1.1: Installing PyCharm").
- Module titles must be meaningful and progress logically from beginner to advanced for the topic.
- Avoid generic module titles like "Foundations", "Advanced Topic", "Module 1".
- Chapter titles must be specific, practical, and unique across the whole course.
- Chapter titles should resemble real tutorial/video topics learners would recognize.

Make it practical, engaging, and tailored to {pace} pace learning!"""

        try:
            content = await asyncio.wait_for(
                get_ai_service().generate_content(topic=prompt, difficulty="raw"),
                timeout=COURSE_GENERATION_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            logging.warning(
                "Gemini generate-course timed out after %ss. Serving fallback course for topic=%s pace=%s",
                COURSE_GENERATION_TIMEOUT_SECONDS,
                topic,
                pace,
            )
            return {"course": _create_fallback_course(topic, pace)}
        except RuntimeError as ai_error:
            # Handle quota errors specifically
            error_msg = str(ai_error)
            if "quota" in error_msg.lower() or "429" in error_msg or "Throttling" in error_msg:
                logging.warning(
                    "Gemini generate-course quota/rate-limited. Serving fallback course for topic=%s pace=%s",
                    topic,
                    pace,
                )
                return {"course": _create_fallback_course(topic, pace)}
            logging.error("Gemini generate-course runtime error: %s", error_msg)
            return {"course": _create_fallback_course(topic, pace)}
        
        course_data = _parse_and_normalize_course(content=content, topic=topic, pace=pace)

        return {"course": course_data}
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as exc:
        error_msg = str(exc)
        # Log the full error for debugging
        import traceback
        print(f"Error generating course: {error_msg}")
        print(traceback.format_exc())
        
        # Check for specific error types
        if "quota" in error_msg.lower() or "429" in error_msg or "Throttling" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="AI service quota exceeded. Please try again later."
            ) from exc
        if "credentials" in error_msg.lower() or "not set" in error_msg.lower() or "GEMINI" in error_msg.upper():
            raise HTTPException(
                status_code=500,
                detail="AI service not configured. Please check server configuration."
            ) from exc
        
        raise HTTPException(status_code=500, detail=f"Failed to generate course: {error_msg}") from exc


def _create_fallback_course(topic: str, pace: str) -> dict:
    """Fallback course structure if AI generation fails"""
    module_count = {"blitz": 3, "moderate": 5, "deep": 8}.get(pace, 5)

    progression_labels = [
        "Basics",
        "Core Concepts",
        "Hands-on Workflows",
        "Real-world Use Cases",
        "Deployment and Scaling",
        "Optimization",
        "Security and Reliability",
        "Advanced Patterns",
    ]

    modules = []
    for i in range(1, module_count + 1):
        label = progression_labels[min(i - 1, len(progression_labels) - 1)]
        module_title = f"Module {i}: {topic} {label}"

        modules.append({
            "title": module_title,
            "description": f"Learn the key concepts of {topic}",
            "chapters": [
                {
                    "chapterNumber": f"{i}.1",
                    "title": f"Chapter {i}.1: {topic} essentials for {label.lower()}",
                    "videoId": None,
                },
                {
                    "chapterNumber": f"{i}.2",
                    "title": f"Chapter {i}.2: Practical {topic} workflow in {label.lower()}",
                    "videoId": None,
                },
                {
                    "chapterNumber": f"{i}.3",
                    "title": f"Chapter {i}.3: Common mistakes and best practices in {topic}",
                    "videoId": None,
                },
            ]
        })
    
    return {
        "title": f"Complete Guide to {topic}",
        "description": f"A comprehensive course covering all aspects of {topic}, designed for {pace} pace learning.",
        "difficulty": "intermediate",
        "thumbnail_url": None,
        "modules": modules
    }


def _strip_markdown_json_fences(text: str) -> str:
    cleaned = (text or "").strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    return cleaned.strip()



def _is_placeholder_title(value: str) -> bool:
    lowered = (value or "").strip().lower()
    if not lowered:
        return True
    return bool(
        re.match(r"^(module\s*\d+|chapter\s*\d+(\.\d+)?|lesson\s*\d+(\.\d+)?|advanced topic|foundations?)$", lowered)
    )


def _normalize_module_title(raw_title: object, topic: str, module_index: int) -> str:
    title = str(raw_title or "").strip()
    if not title or _is_placeholder_title(title):
        fallback_progression = [
            "Basics",
            "Core Concepts",
            "Hands-on Practice",
            "Real-world Applications",
            "Deployment and Scaling",
            "Optimization",
            "Advanced Techniques",
        ]
        stage = fallback_progression[min(module_index - 1, len(fallback_progression) - 1)]
        return f"{topic} {stage}"
    return title


def _to_unique_chapter_titles(raw_chapters: object, module_title: str, topic: str) -> list[str]:
    def _clean_title(raw: str) -> str:
        cleaned = (raw or "").strip()
        cleaned = re.sub(r"^(chapter\s*\d+(?:\.\d+)?\s*[:\-]\s*|lesson\s*\d+(?:\.\d+)?\s*[:\-]\s*)", "", cleaned, flags=re.IGNORECASE)
        return cleaned.strip()

    chapters = raw_chapters if isinstance(raw_chapters, list) else []
    if not chapters:
        return [f"Introduction to {module_title}"]

    unique_titles: list[str] = []
    seen: set[str] = set()

    for idx, lesson in enumerate(chapters, start=1):
        title = ""
        if isinstance(lesson, str):
            title = _clean_title(lesson)
        elif isinstance(lesson, dict):
            title = str(
                lesson.get("title")
                or lesson.get("name")
                or lesson.get("chapter_title")
                or lesson.get("video_title")
                or lesson.get("youtube_title")
                or lesson.get("core_topic")
                or lesson.get("content")
                or ""
            )
            title = _clean_title(title)

        if not title or _is_placeholder_title(title):
            title = f"{module_title} - Key Topic {idx}"

        candidate = title
        suffix = 2
        while candidate.lower() in seen:
            candidate = f"{title} ({suffix})"
            suffix += 1

        seen.add(candidate.lower())
        unique_titles.append(candidate)

    return unique_titles or [f"Introduction to {topic}"]


def _ensure_unique_across_course(chapter_titles: list[str], seen_titles: set[str]) -> list[str]:
    unique_across_course: list[str] = []
    for title in chapter_titles:
        candidate = title
        suffix = 2
        while candidate.lower() in seen_titles:
            candidate = f"{title} ({suffix})"
            suffix += 1
        seen_titles.add(candidate.lower())
        unique_across_course.append(candidate)
    return unique_across_course


def _extract_module_chapters(module: dict, module_title: str, topic: str, module_index: int) -> list[dict]:
    chapters_raw = module.get("chapters")
    chapter_items: list[object] = []

    if isinstance(chapters_raw, list) and chapters_raw:
        chapter_items = chapters_raw
    else:
        # Backward compatibility for prior modules[].lessons[] outputs.
        legacy_lessons = module.get("lessons")
        if isinstance(legacy_lessons, list) and legacy_lessons:
            chapter_items = legacy_lessons

    if not chapter_items:
        chapter_items = [f"Introduction to {module_title}"]

    chapter_titles = _to_unique_chapter_titles(chapter_items, module_title, topic)
    normalized_chapters: list[dict] = []

    for chapter_index, chapter_title in enumerate(chapter_titles, start=1):
        chapter_number = f"{module_index}.{chapter_index}"
        final_title = chapter_title
        if not re.match(r"^chapter\s*\d+\.\d+\s*[:\-]", final_title, re.IGNORECASE):
            final_title = f"Chapter {chapter_number}: {final_title}"

        source_obj = chapter_items[chapter_index - 1] if chapter_index - 1 < len(chapter_items) else None
        video_id = None
        if isinstance(source_obj, dict):
            video_id = source_obj.get("videoId") or source_obj.get("video_id")

        normalized_chapters.append(
            {
                "chapterNumber": chapter_number,
                "title": final_title,
                "videoId": video_id,
            }
        )

    return normalized_chapters


def _normalize_course_payload(candidate: dict, topic: str, pace: str) -> dict:
    title = str(candidate.get("title") or f"Complete Guide to {topic}").strip()
    description = str(
        candidate.get("description")
        or f"A comprehensive course covering all aspects of {topic}, designed for {pace} pace learning."
    ).strip()

    raw_modules = candidate.get("modules")
    if not isinstance(raw_modules, list) or not raw_modules:
        return _create_fallback_course(topic, pace)

    normalized_modules: list[dict] = []
    seen_module_titles: set[str] = set()
    seen_chapter_titles: set[str] = set()
    for m_idx, module in enumerate(raw_modules, start=1):
        if not isinstance(module, dict):
            module = {}

        module_title = _normalize_module_title(module.get("title"), topic, m_idx)
        if module_title.lower() in seen_module_titles:
            module_title = f"{module_title} ({m_idx})"
        seen_module_titles.add(module_title.lower())

        if not re.match(r"^module\s*\d+\s*:", module_title, re.IGNORECASE):
            module_title = f"Module {m_idx}: {module_title}"

        module_desc = str(module.get("description") or f"Key concepts for {module_title}").strip()

        module_chapters = _extract_module_chapters(module, module_title, topic, m_idx)
        chapter_titles = [c["title"] for c in module_chapters]
        unique_titles = _ensure_unique_across_course(chapter_titles, seen_chapter_titles)
        for idx, unique_title in enumerate(unique_titles):
            module_chapters[idx]["title"] = unique_title

        normalized_modules.append(
            {
                "title": module_title,
                "description": module_desc,
                "chapters": module_chapters,
            }
        )

    return {
        "title": title,
        "description": description,
        "difficulty": str(candidate.get("difficulty") or "intermediate"),
        "thumbnail_url": candidate.get("thumbnail_url", None),
        "modules": normalized_modules,
    }


def _extractive_summary_fallback(text: str, detail: Optional[str] = None) -> str:
    """Create a lightweight extractive summary when AI is unavailable."""
    cleaned = re.sub(r"\s+", " ", (text or "")).strip()
    if not cleaned:
        return "No input text provided."

    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    sentences = [s.strip() for s in sentences if s and len(s.strip()) > 20]
    if not sentences:
        return cleaned[:400]

    tokens = re.findall(r"[A-Za-z]{3,}", cleaned.lower())
    stop_words = {
        "the", "and", "for", "that", "with", "this", "from", "are", "was", "were", "have",
        "has", "had", "you", "your", "but", "not", "can", "will", "into", "about", "their",
        "they", "them", "our", "out", "how", "what", "when", "where", "which", "while", "also",
    }
    freq = Counter(t for t in tokens if t not in stop_words)

    def score_sentence(sentence: str) -> float:
        words = re.findall(r"[A-Za-z]{3,}", sentence.lower())
        if not words:
            return 0.0
        return sum(freq.get(w, 0) for w in words) / max(len(words), 1)

    ranked = sorted(
        ((idx, s, score_sentence(s)) for idx, s in enumerate(sentences)),
        key=lambda x: x[2],
        reverse=True,
    )

    sentence_count = {"short": 3, "standard": 5, "deep": 8}.get((detail or "standard").lower(), 5)
    chosen = sorted(ranked[: min(sentence_count, len(sentences))], key=lambda x: x[0])
    key_points = [item[1] for item in chosen]

    top_terms = [term for term, _ in freq.most_common(5)]
    bullets = "\n".join(f"- {point}" for point in key_points)
    terms_line = ", ".join(top_terms) if top_terms else "N/A"

    return (
        "Summary (fallback mode):\n"
        f"{bullets}\n\n"
        f"Key terms: {terms_line}"
    )


def _study_tool_fallback(payload: StudyToolRequest) -> StudyToolResponse:
    mode = (payload.tool_type or "explain").lower()
    topic = (payload.topic or "the topic").strip() or "the topic"

    if mode == "summarize":
        summary = _extractive_summary_fallback(payload.input_text or "", payload.detail)
        return StudyToolResponse(mode="summarize", content=summary, quiz=None)

    if mode == "visualize":
        diagram_topic = topic.replace('"', "'")
        mermaid = (
            "```mermaid\n"
            "flowchart TD\n"
            f"    A[{diagram_topic}] --> B[Core Concepts]\n"
            "    B --> C[Examples]\n"
            "    C --> D[Practice]\n"
            "    D --> E[Review]\n"
            "```"
        )
        return StudyToolResponse(mode="visualize", content=mermaid, quiz=None)

    if mode == "quiz":
        return StudyToolResponse(
            mode="quiz",
            content=None,
            quiz=[
                {
                    "question": f"What is the primary goal when learning {topic}?",
                    "options": [
                        "Memorize definitions only",
                        "Understand concepts and apply them",
                        "Avoid practice exercises",
                        "Skip fundamentals",
                    ],
                    "correctAnswer": "Understand concepts and apply them",
                },
                {
                    "question": f"Which approach best supports mastery in {topic}?",
                    "options": [
                        "Passive reading only",
                        "No feedback loop",
                        "Practice with reflection and iteration",
                        "One-time review",
                    ],
                    "correctAnswer": "Practice with reflection and iteration",
                },
            ],
        )

    if mode == "socratic":
        prompt = (
            f"What do you already know about {topic}, and which part feels unclear?\n"
            "What small example could you use to test your current understanding?"
        )
        return StudyToolResponse(mode="socratic", content=prompt, quiz=None)

    explain = (
        f"Fallback explanation for {topic}:\n"
        "- Start from the core definition and why it matters.\n"
        "- Break the topic into 2-3 sub-concepts.\n"
        "- Apply one practical example and validate your understanding with a quick question."
    )
    return StudyToolResponse(mode="explain", content=explain, quiz=None)


def _parse_and_normalize_course(content: str, topic: str, pace: str) -> dict:
    cleaned_content = _strip_markdown_json_fences(content)

    try:
        parsed = json.loads(cleaned_content)
        if isinstance(parsed, dict):
            return _normalize_course_payload(parsed, topic, pace)
    except json.JSONDecodeError:
        pass

    json_match = re.search(r"\{[\s\S]*\}", cleaned_content)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            if isinstance(parsed, dict):
                return _normalize_course_payload(parsed, topic, pace)
        except json.JSONDecodeError:
            pass

    # Required for debugging malformed model output.
    logging.error("Failed to parse Gemini course JSON. Raw output: %s", content)
    return _create_fallback_course(topic, pace)


@app.post("/api/ai/personalize-saga", response_model=PersonalizeSagaResponse)
async def personalize_saga(payload: PersonalizeSagaRequest):
    """
    Generate a personalized Python programming saga journey based on student preferences.
    """
    try:
        chapters_data = await personalization_service.generate_personalized_saga(
            python_skill_level=payload.python_skill_level,
            learning_goals=payload.learning_goals,
            preferred_pace=payload.preferred_pace,
            interests=payload.interests,
            learning_style=payload.learning_style
        )
        
        chapters = [SagaChapter(**ch) for ch in chapters_data]
        return PersonalizeSagaResponse(chapters=chapters)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate personalized saga: {str(exc)}") from exc

