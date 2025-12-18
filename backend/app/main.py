import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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

# CORS configuration - expanded for dev troubleshooting
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://0.0.0.0:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tutor = AdaptiveTutor()
gemini_service = GeminiService()
personalization_service = PersonalizationService()


@app.get("/")
async def root():
    """
    Simple handshake route so the frontend can confirm the backend is online.
    """
    return {"status": "online"}


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
    Returns the list of available Gemini models that support generateContent.

    Useful for debugging / selecting the right model ID in configuration.
    """
    try:
        models = list_gemini_models()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"models": models}


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
    Uses Gemini via AdaptiveTutor to generate an adaptive explanation or challenge.
    """
    try:
        explanation = await tutor.get_adaptive_explanation(
            topic=payload.topic, struggle_score=payload.struggle_score
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AIExplainResponse(explanation=explanation)


@app.post("/api/generate", response_model=GenerateContentResponse)
async def generate_content(payload: GenerateContentRequest):
    """
    Generic Gemini endpoint used by the Study Room to generate lessons/challenges.
    """
    try:
        content = await gemini_service.generate_content(
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
        content = await gemini_service.generate_lesson(
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
        mode, content, quiz_items = await gemini_service.generate_study_tool(
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
        if "quota" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="AI service quota exceeded. Please try again later."
            ) from exc
        # Check for API key errors
        if "GEMINI_API_KEY" in error_msg or "not set" in error_msg.lower():
            raise HTTPException(
                status_code=500,
                detail="AI service not configured. Please check server configuration."
            ) from exc
        raise HTTPException(status_code=500, detail=f"AI service error: {error_msg}") from exc
    except Exception as exc:
        import traceback
        print(f"Unexpected error in study-tool: {exc}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to process study tool request: {str(exc)}") from exc

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

        # Generate course content using Gemini
        prompt = f"""You are an expert course creator. Create a comprehensive, engaging course on: {topic}

Student Pace: {pace}
{pace_instruction}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{{
  "title": "Course title (engaging and specific)",
  "description": "Detailed course description (2-3 sentences)",
  "difficulty": "beginner|intermediate|advanced",
  "thumbnail_url": null,
  "modules": [
    {{
      "title": "Module title",
      "description": "Module description",
      "lessons": [
        {{
          "title": "Lesson title",
          "content": "Detailed lesson content with explanations, examples, and key takeaways"
        }}
      ]
    }}
  ]
}}

Make it practical, engaging, and tailored to {pace} pace learning!"""

        try:
            content = await gemini_service.generate_content(topic=prompt, difficulty="standard")
        except RuntimeError as gemini_error:
            # Handle quota errors specifically
            error_msg = str(gemini_error)
            if "quota" in error_msg.lower() or "429" in error_msg:
                raise HTTPException(
                    status_code=429,
                    detail="AI service quota exceeded. Please try again later or upgrade your plan."
                ) from gemini_error
            raise HTTPException(status_code=500, detail=f"AI generation failed: {error_msg}") from gemini_error
        
        # Parse JSON from response
        import json
        import re
        
        # Clean the response - remove markdown code blocks if present
        cleaned_content = content.strip()
        if cleaned_content.startswith("```json"):
            cleaned_content = cleaned_content[7:]
        elif cleaned_content.startswith("```"):
            cleaned_content = cleaned_content[3:]
        if cleaned_content.endswith("```"):
            cleaned_content = cleaned_content[:-3]
        cleaned_content = cleaned_content.strip()
        
        # Extract JSON
        json_match = re.search(r'\{[\s\S]*\}', cleaned_content)
        if json_match:
            try:
                course_data = json.loads(json_match.group())
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                course_data = _create_fallback_course(topic, pace)
        else:
            course_data = _create_fallback_course(topic, pace)

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
        if "quota" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="AI service quota exceeded. Please try again later."
            ) from exc
        if "GEMINI_API_KEY" in error_msg or "not set" in error_msg.lower():
            raise HTTPException(
                status_code=500,
                detail="AI service not configured. Please check server configuration."
            ) from exc
        
        raise HTTPException(status_code=500, detail=f"Failed to generate course: {error_msg}") from exc


def _create_fallback_course(topic: str, pace: str) -> dict:
    """Fallback course structure if AI generation fails"""
    module_count = {"blitz": 3, "moderate": 5, "deep": 8}.get(pace, 5)
    
    modules = []
    for i in range(1, module_count + 1):
        modules.append({
            "title": f"Module {i}: {topic} Fundamentals" if i == 1 else f"Module {i}: Advanced {topic}",
            "description": f"Learn the key concepts of {topic}",
            "lessons": [
                {
                    "title": f"Lesson {i}.1: Introduction",
                    "content": f"This lesson covers the fundamentals of {topic}. You'll learn the core concepts and how to apply them in practice."
                }
            ]
        })
    
    return {
        "title": f"Complete Guide to {topic}",
        "description": f"A comprehensive course covering all aspects of {topic}, designed for {pace} pace learning.",
        "difficulty": "intermediate",
        "thumbnail_url": None,
        "modules": modules
    }


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

