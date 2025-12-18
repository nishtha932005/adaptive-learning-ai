"""
AI-powered personalization service for creating personalized learning journeys.
"""
import json
from typing import List, Dict, Any
from .gemini import GeminiService


class PersonalizationService:
    """Service for generating personalized saga chapters based on student preferences."""
    
    def __init__(self):
        self.gemini_service = GeminiService()
    
    async def generate_personalized_saga(
        self,
        python_skill_level: str,
        learning_goals: List[str],
        preferred_pace: str,
        interests: List[str],
        learning_style: str = "interactive"
    ) -> List[Dict[str, Any]]:
        """
        Generate a personalized Python programming saga journey.
        
        Args:
            python_skill_level: 'beginner', 'intermediate', or 'advanced'
            learning_goals: List of goals like ['web_dev', 'data_science', 'automation']
            preferred_pace: 'slow', 'moderate', or 'fast'
            interests: List of interests
            learning_style: 'visual', 'text', or 'interactive'
        
        Returns:
            List of saga chapter dictionaries
        """
        
        # Build the prompt for AI
        prompt = f"""You are an expert Python programming instructor creating a personalized, gamified learning journey.

Student Profile:
- Python Skill Level: {python_skill_level}
- Learning Goals: {', '.join(learning_goals)}
- Preferred Pace: {preferred_pace}
- Interests: {', '.join(interests)}
- Learning Style: {learning_style}

Create a personalized Python programming saga journey with 5-7 chapters. Each chapter should:
1. Have an epic, gamified title (like "The Awakening", "The First Trial", "Boss Battle: Functions")
2. Focus on Python programming concepts appropriate for {python_skill_level} level
3. Align with their goals: {', '.join(learning_goals)}
4. Match their pace: {preferred_pace} (adjust time estimates accordingly)
5. Include their interests: {', '.join(interests)}

For each chapter, provide:
- chapter_number: sequential number starting from 1
- title: Epic, gamified title
- subtitle: Specific Python topic/concept
- xp_reward: Based on difficulty (beginner: 300-500, intermediate: 600-1000, advanced: 1200-2000)
- estimated_time_minutes: Based on pace (slow: 60-90min, moderate: 30-60min, fast: 15-30min)
- type: 'video', 'quiz', or 'boss_fight'
- action_type: 'course', 'quiz', or 'study'
- action_url: '/dashboard/courses' for videos, '/dashboard/study' for quizzes/study
- action_params: JSON object with mode, topic, difficulty based on type

Return ONLY a valid JSON array of chapter objects, no markdown, no explanation.
Example format:
[
  {{
    "chapter_number": 1,
    "title": "The Awakening",
    "subtitle": "Python Basics: Variables and Data Types",
    "xp_reward": 500,
    "estimated_time_minutes": 45,
    "type": "video",
    "action_type": "course",
    "action_url": "/dashboard/courses",
    "action_params": {{"highlight": "python-basics"}}
  }},
  {{
    "chapter_number": 2,
    "title": "The First Trial",
    "subtitle": "Control Flow: If Statements and Loops",
    "xp_reward": 750,
    "estimated_time_minutes": 60,
    "type": "quiz",
    "action_type": "quiz",
    "action_url": "/dashboard/study",
    "action_params": {{"mode": "quiz", "topic": "Control Flow", "difficulty": "standard"}}
  }}
]

Make it engaging, progressive, and tailored to their profile!"""

        try:
            # Use Gemini to generate the personalized saga
            response = await self.gemini_service.generate_content(
                topic=prompt,
                difficulty="standard"
            )
            
            # Parse the JSON response
            # Remove markdown code blocks if present
            content = response.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            chapters = json.loads(content)
            
            # Validate and ensure proper structure
            validated_chapters = []
            for i, chapter in enumerate(chapters, start=1):
                validated_chapter = {
                    "chapter_number": chapter.get("chapter_number", i),
                    "title": chapter.get("title", f"Chapter {i}"),
                    "subtitle": chapter.get("subtitle", ""),
                    "xp_reward": chapter.get("xp_reward", 500),
                    "estimated_time_minutes": chapter.get("estimated_time_minutes", 30),
                    "type": chapter.get("type", "video"),
                    "action_type": chapter.get("action_type", "course"),
                    "action_url": chapter.get("action_url", "/dashboard/courses"),
                    "action_params": chapter.get("action_params", {})
                }
                validated_chapters.append(validated_chapter)
            
            return validated_chapters
            
        except json.JSONDecodeError as e:
            # Fallback to default Python journey if AI fails
            return self._get_default_python_journey(python_skill_level)
        except Exception as e:
            print(f"Error generating personalized saga: {e}")
            return self._get_default_python_journey(python_skill_level)
    
    def _get_default_python_journey(self, skill_level: str) -> List[Dict[str, Any]]:
        """Fallback default Python journey based on skill level."""
        if skill_level == "beginner":
            return [
                {
                    "chapter_number": 1,
                    "title": "The Awakening",
                    "subtitle": "Python Basics: Variables and Data Types",
                    "xp_reward": 500,
                    "estimated_time_minutes": 45,
                    "type": "video",
                    "action_type": "course",
                    "action_url": "/dashboard/courses",
                    "action_params": {"highlight": "python-basics"}
                },
                {
                    "chapter_number": 2,
                    "title": "The First Trial",
                    "subtitle": "Control Flow: If Statements and Loops",
                    "xp_reward": 750,
                    "estimated_time_minutes": 60,
                    "type": "quiz",
                    "action_type": "quiz",
                    "action_url": "/dashboard/study",
                    "action_params": {"mode": "quiz", "topic": "Control Flow", "difficulty": "standard"}
                },
                {
                    "chapter_number": 3,
                    "title": "The Collection Quest",
                    "subtitle": "Lists, Tuples, and Dictionaries",
                    "xp_reward": 1000,
                    "estimated_time_minutes": 75,
                    "type": "video",
                    "action_type": "course",
                    "action_url": "/dashboard/courses",
                    "action_params": {"highlight": "python-data-structures"}
                },
                {
                    "chapter_number": 4,
                    "title": "Boss Battle: Functions",
                    "subtitle": "Creating and Using Functions",
                    "xp_reward": 1250,
                    "estimated_time_minutes": 90,
                    "type": "boss_fight",
                    "action_type": "study",
                    "action_url": "/dashboard/study",
                    "action_params": {"mode": "explain", "topic": "Python Functions", "difficulty": 70}
                },
                {
                    "chapter_number": 5,
                    "title": "The Final Challenge",
                    "subtitle": "Object-Oriented Programming Basics",
                    "xp_reward": 1500,
                    "estimated_time_minutes": 120,
                    "type": "boss_fight",
                    "action_type": "study",
                    "action_url": "/dashboard/study",
                    "action_params": {"mode": "visualize", "topic": "Python OOP", "diagram_type": "Class Diagram"}
                }
            ]
        elif skill_level == "intermediate":
            return [
                {
                    "chapter_number": 1,
                    "title": "The Awakening",
                    "subtitle": "Advanced Python: Decorators and Generators",
                    "xp_reward": 1000,
                    "estimated_time_minutes": 60,
                    "type": "video",
                    "action_type": "course",
                    "action_url": "/dashboard/courses",
                    "action_params": {"highlight": "python-advanced"}
                },
                {
                    "chapter_number": 2,
                    "title": "The First Trial",
                    "subtitle": "Working with APIs and HTTP Requests",
                    "xp_reward": 1200,
                    "estimated_time_minutes": 75,
                    "type": "quiz",
                    "action_type": "quiz",
                    "action_url": "/dashboard/study",
                    "action_params": {"mode": "quiz", "topic": "Python APIs", "difficulty": "hard"}
                },
                {
                    "chapter_number": 3,
                    "title": "The Data Quest",
                    "subtitle": "Data Processing with Pandas",
                    "xp_reward": 1500,
                    "estimated_time_minutes": 90,
                    "type": "video",
                    "action_type": "course",
                    "action_url": "/dashboard/courses",
                    "action_params": {"highlight": "python-data-science"}
                },
                {
                    "chapter_number": 4,
                    "title": "Boss Battle: Async Programming",
                    "subtitle": "Async/Await and Concurrency",
                    "xp_reward": 2000,
                    "estimated_time_minutes": 120,
                    "type": "boss_fight",
                    "action_type": "study",
                    "action_url": "/dashboard/study",
                    "action_params": {"mode": "explain", "topic": "Python Async", "difficulty": 85}
                }
            ]
        else:  # advanced
            return [
                {
                    "chapter_number": 1,
                    "title": "The Awakening",
                    "subtitle": "Advanced Design Patterns in Python",
                    "xp_reward": 1500,
                    "estimated_time_minutes": 90,
                    "type": "video",
                    "action_type": "course",
                    "action_url": "/dashboard/courses",
                    "action_params": {"highlight": "python-design-patterns"}
                },
                {
                    "chapter_number": 2,
                    "title": "The First Trial",
                    "subtitle": "Building Production-Ready APIs",
                    "xp_reward": 2000,
                    "estimated_time_minutes": 120,
                    "type": "boss_fight",
                    "action_type": "study",
                    "action_url": "/dashboard/study",
                    "action_params": {"mode": "explain", "topic": "Python API Design", "difficulty": 90}
                }
            ]



