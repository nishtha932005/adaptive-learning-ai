from pydantic import BaseModel


class AIExplainRequest(BaseModel):
    topic: str
    struggle_score: int


class AIExplainResponse(BaseModel):
    explanation: str


class StudentStatus(BaseModel):
    student_id: str
    interactions: int
    last_score: int
    days_overdue: int
    last_active: str
    risk_score: int
    studied_credits: int
    total_clicks: int
    predicted_final_result: int


class GenerateContentRequest(BaseModel):
    topic: str
    difficulty: str


class GenerateContentResponse(BaseModel):
    content: str


class AIGenerateLessonRequest(BaseModel):
    topic: str
    mode: str


class AIGenerateLessonResponse(BaseModel):
    content: str


class StudyToolQuizItem(BaseModel):
    question: str
    options: list[str]
    correctAnswer: str


class StudyToolRequest(BaseModel):
    tool_type: str  # 'explain' | 'summarize' | 'quiz' | 'socratic'
    topic: str | None = None
    input_text: str | None = None
    difficulty: int | None = None
    diagram_type: str | None = None
    num_questions: int | None = None
    level: str | None = None  # e.g. 'easy' | 'standard' | 'hard'
    detail: str | None = None  # e.g. 'short' | 'standard' | 'deep'


class StudyToolResponse(BaseModel):
    mode: str
    content: str | None = None
    quiz: list[StudyToolQuizItem] | None = None


class PersonalizeSagaRequest(BaseModel):
    python_skill_level: str  # 'beginner' | 'intermediate' | 'advanced'
    learning_goals: list[str]
    preferred_pace: str  # 'slow' | 'moderate' | 'fast'
    interests: list[str]
    learning_style: str = "interactive"  # 'visual' | 'text' | 'interactive'


class SagaChapter(BaseModel):
    chapter_number: int
    title: str
    subtitle: str
    xp_reward: int
    estimated_time_minutes: int
    type: str  # 'video' | 'quiz' | 'boss_fight'
    action_type: str
    action_url: str
    action_params: dict


class PersonalizeSagaResponse(BaseModel):
    chapters: list[SagaChapter]


