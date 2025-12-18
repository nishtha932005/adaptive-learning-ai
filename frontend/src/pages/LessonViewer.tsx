import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Play, ArrowLeft, Clock, Award, BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { completeSagaChapter, updateSagaFromActivity } from "../services/sagaService";
import { useTheme } from "../context/ThemeContext";

interface LessonData {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  duration_minutes: number;
  type: "video" | "quiz" | "reading";
}

export default function LessonViewer() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeColor } = useTheme();
  
  const type = searchParams.get("type") || "video";
  const topic = searchParams.get("topic") || "";
  const xpReward = parseInt(searchParams.get("xp") || "500");
  const estimatedTime = parseInt(searchParams.get("time") || "30");
  
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId || !user?.id) return;
    
    (async () => {
      try {
        setLoading(true);
        
        // Check if this is a personalized chapter
        const { data: chapter } = await supabase
          .from("personalized_saga_chapters")
          .select("*")
          .eq("id", chapterId)
          .single();
        
        if (chapter) {
          // Generate lesson content based on chapter type
          const lessonData = await generateLessonContent(chapter, type);
          setLesson(lessonData);
          
          // Check if already completed
          const { data: progress } = await supabase
            .from("saga_progress")
            .select("status, completed_at")
            .eq("student_id", user.id)
            .eq("personalized_chapter_id", chapterId)
            .single();
          
          if (progress?.status === "completed") {
            setCompleted(true);
          }
        } else {
          // Fallback to default chapters
          const { data: defaultChapter } = await supabase
            .from("saga_chapters")
            .select("*")
            .eq("id", chapterId)
            .single();
          
          if (defaultChapter) {
            const lessonData = await generateLessonContent(defaultChapter, type);
            setLesson(lessonData);
          }
        }
      } catch (e: any) {
        console.error("Error loading lesson:", e);
        setError(e?.message || "Failed to load lesson");
      } finally {
        setLoading(false);
      }
    })();
  }, [chapterId, user?.id, type]);

  const generateLessonContent = async (chapter: any, contentType: string): Promise<LessonData> => {
    // For now, generate content using the study tool API
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      
      if (contentType === "quiz") {
        // Generate quiz
        const response = await fetch(`${API_URL}/api/ai/study-tool`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool_type: "quiz",
            topic: chapter.subtitle || chapter.title,
            num_questions: 5,
            level: "standard",
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            id: chapter.id,
            title: chapter.title,
            content: JSON.stringify(data.quiz || []),
            type: "quiz",
            duration_minutes: chapter.estimated_time_minutes || 30,
          };
        }
      } else {
        // Generate explanation/lesson
        const response = await fetch(`${API_URL}/api/ai/study-tool`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool_type: "explain",
            topic: chapter.subtitle || chapter.title,
            difficulty: "standard",
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            id: chapter.id,
            title: chapter.title,
            content: data.content || `Learn about ${chapter.subtitle}`,
            type: "video",
            duration_minutes: chapter.estimated_time_minutes || 30,
          };
        }
      }
    } catch (e) {
      console.error("Error generating content:", e);
    }
    
    // Fallback content
    return {
      id: chapter.id,
      title: chapter.title,
      content: `This lesson covers: ${chapter.subtitle}. ${chapter.title} is an important topic that will help you progress in your learning journey.`,
      type: contentType === "quiz" ? "quiz" : "video",
      duration_minutes: chapter.estimated_time_minutes || 30,
    };
  };

  // Track watch time
  useEffect(() => {
    if (!isPlaying || completed) return;
    const interval = setInterval(() => {
      setWatchTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, completed]);

  const handleComplete = async () => {
    if (!user?.id || !chapterId || completed) return;
    
    try {
      const timeSpentMinutes = Math.floor(watchTime / 60) || 1;
      
      // Complete the chapter using the RPC function (handles both personalized and default)
      const { error: completeError } = await supabase.rpc("complete_saga_chapter", {
        student_uuid: user.id,
        chapter_id_param: chapterId,
        xp_earned_param: xpReward,
        time_spent_param: timeSpentMinutes,
      });

      if (completeError) {
        console.error("Error completing chapter:", completeError);
        // Try manual update as fallback
        const { data: personalizedChapter } = await supabase
          .from("personalized_saga_chapters")
          .select("id")
          .eq("id", chapterId)
          .single();

        if (personalizedChapter) {
          await supabase
            .from("saga_progress")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              xp_earned: xpReward,
              time_spent_minutes: timeSpentMinutes,
            })
            .eq("student_id", user.id)
            .eq("personalized_chapter_id", chapterId);

          // Unlock next chapter
          const { data: currentChapter } = await supabase
            .from("personalized_saga_chapters")
            .select("chapter_number")
            .eq("id", chapterId)
            .single();

          if (currentChapter) {
            const { data: nextChapter } = await supabase
              .from("personalized_saga_chapters")
              .select("id")
              .eq("student_id", user.id)
              .eq("chapter_number", currentChapter.chapter_number + 1)
              .single();

            if (nextChapter) {
              await supabase
                .from("saga_progress")
                .update({ status: "active" })
                .eq("student_id", user.id)
                .eq("personalized_chapter_id", nextChapter.id);
            }
          }
        } else {
          await supabase
            .from("saga_progress")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              xp_earned: xpReward,
              time_spent_minutes: timeSpentMinutes,
            })
            .eq("student_id", user.id)
            .eq("chapter_id", chapterId);
        }

        // Update student XP
        const { data: student } = await supabase
          .from("students")
          .select("xp_points")
          .eq("id", user.id)
          .single();

        if (student) {
          await supabase
            .from("students")
            .update({ xp_points: (student.xp_points || 0) + xpReward })
            .eq("id", user.id);
        }
      }
      
      // Mark as completed
      setCompleted(true);
      
      // Show success message
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (e: any) {
      console.error("Error completing lesson:", e);
      setError(e?.message || "Failed to complete lesson");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-rose-500 mb-4">{error || "Lesson not found"}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-lg bg-primary text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{Math.floor(watchTime / 60)}m {watchTime % 60}s</span>
            </div>
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3 text-primary" />
              <span className="text-primary font-semibold">{xpReward} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          {/* Title */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                {type === "quiz" ? "Quiz" : "Lesson"}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {lesson.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {topic || lesson.content.substring(0, 100)}...
            </p>
          </div>

          {/* Content */}
          <div className="mb-8">
            {type === "quiz" ? (
              <QuizContent content={lesson.content} onComplete={handleComplete} />
            ) : (
              <VideoContent 
                content={lesson.content} 
                videoUrl={lesson.videoUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}
          </div>

          {/* Complete Button */}
          {!completed && (
            <div className="flex justify-end">
              <button
                onClick={handleComplete}
                disabled={watchTime < 30 && type !== "quiz"} // Require at least 30s watch time for videos
                className="px-6 py-3 rounded-lg bg-primary text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                Complete Lesson
              </button>
            </div>
          )}

          {completed && (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-block mb-4"
              >
                <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Lesson Completed!
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                You earned {xpReward} XP
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-2 rounded-lg bg-primary text-white"
              >
                Continue Learning
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function VideoContent({ 
  content, 
  videoUrl, 
  onPlay, 
  onPause 
}: { 
  content: string; 
  videoUrl?: string;
  onPlay: () => void;
  onPause: () => void;
}) {
  return (
    <div className="space-y-4">
      {videoUrl ? (
        <div className="aspect-video rounded-lg overflow-hidden bg-slate-900">
          <iframe
            src={videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onPlay={onPlay}
            onPause={onPause}
          />
        </div>
      ) : (
        <div className="aspect-video rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Play className="w-16 h-16 text-slate-400" />
        </div>
      )}
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function QuizContent({ 
  content, 
  onComplete 
}: { 
  content: string; 
  onComplete: () => void;
}) {
  const [quizItems, setQuizItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        setQuizItems(parsed);
      }
    } catch (e) {
      console.error("Error parsing quiz content:", e);
      // Fallback: try to extract quiz from content string
      if (content.includes("question")) {
        try {
          const extracted = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, ""));
          if (Array.isArray(extracted)) {
            setQuizItems(extracted);
          }
        } catch (e2) {
          console.error("Failed to parse quiz:", e2);
        }
      }
    }
  }, [content]);

  const handleAnswer = (index: number) => {
    if (showResults || revealed) return;
    setSelected(index);
    setRevealed(true);
  };

  const handleNext = () => {
    if (selected === null) return;
    
    const current = quizItems[currentIndex];
    let isCorrect = false;
    
    // Handle different quiz formats
    if (current.correct_answer !== undefined) {
      // Format: correct_answer is 0-indexed number
      isCorrect = current.correct_answer === selected;
    } else if (current.correctAnswer !== undefined) {
      // Format: correctAnswer is the actual answer string
      isCorrect = current.options?.[selected] === current.correctAnswer;
    } else if (current.correct !== undefined) {
      // Format: correct is 0-indexed number
      isCorrect = current.correct === selected;
    }
    
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setShowResults(true);
    }
  };

  if (showResults) {
    return (
      <div className="text-center py-8">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Quiz Complete!
        </h3>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
          You scored {score} out of {quizItems.length}
        </p>
        <button
          onClick={onComplete}
          className="px-6 py-3 rounded-lg bg-primary text-white font-semibold"
        >
          Complete Lesson
        </button>
      </div>
    );
  }

  if (quizItems.length === 0) {
    return <div className="text-slate-600 dark:text-slate-400">Loading quiz...</div>;
  }

  const current = quizItems[currentIndex];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Question {currentIndex + 1} of {quizItems.length}
          </span>
          <span className="text-sm font-semibold text-primary">
            Score: {score}/{quizItems.length}
          </span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
          {current.question}
        </h3>
        <div className="space-y-3">
          {current.options?.map((option: string, index: number) => {
            const isSelected = selected === index;
            let isCorrect = false;
            let isWrong = false;
            
            if (revealed) {
              if (current.correct_answer !== undefined) {
                isCorrect = current.correct_answer === index;
                isWrong = isSelected && !isCorrect;
              } else if (current.correctAnswer !== undefined) {
                isCorrect = option === current.correctAnswer;
                isWrong = isSelected && !isCorrect;
              } else if (current.correct !== undefined) {
                isCorrect = current.correct === index;
                isWrong = isSelected && !isCorrect;
              }
            }
            
            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={revealed}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isCorrect
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100"
                    : isWrong
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-100"
                    : isSelected
                    ? "border-primary bg-primary/10"
                    : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                } ${revealed ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {revealed && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {selected !== null && (
        <div className="flex justify-end">
          <button
            onClick={handleNext}
            className="px-6 py-2 rounded-lg bg-primary text-white font-semibold"
          >
            {currentIndex < quizItems.length - 1 ? "Next Question" : "Finish Quiz"}
          </button>
        </div>
      )}
    </div>
  );
}

