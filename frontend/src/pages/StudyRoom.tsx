import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Brain,
  Sparkles,
  BookOpen,
  Target,
  Save,
  ClipboardCopy,
  CheckCircle2,
} from "lucide-react";
import ConfettiExplosion from "react-confetti-explosion";
import { mapSliderToDifficulty, runStudyTool, StudyToolMode, QuizItem } from "../services/studyService";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import StruggleMonitor from "../components/dashboard/StruggleMonitor";

type QuizState = {
  items: QuizItem[];
  currentIndex: number;
  selected: string | null;
  revealed: boolean;
  score: number;
  phase: "lobby" | "question" | "reveal" | "results";
  timer: number;
  history: { item: QuizItem; selected: string | null; correct: boolean }[];
};

type ChatMessage = {
  id: number;
  from: "user" | "ai";
  text: string;
};

export default function StudyRoomPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Initialize mode from URL params if present
  const urlMode = searchParams.get("mode") as StudyToolMode | null;
  const urlTopic = searchParams.get("topic") || "";
  const urlDifficulty = searchParams.get("difficulty");
  const urlDiagramType = searchParams.get("diagram_type");

  const [mode, setMode] = useState<StudyToolMode>(urlMode || "explain");

  // Shared
  const [topic, setTopic] = useState(urlTopic || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState<{
    goal?: string;
    vibe?: string;
    pace?: string;
  } | null>(null);

  // Load user preferences for personalization
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: student } = await supabase
        .from("students")
        .select("learning_goals, preferred_pace")
        .eq("id", user.id)
        .single();

      if (student) {
        // Map student fields to the shape StudyRoom expects
        const prefs = {
          goal: student.learning_goals?.[0] || "",
          vibe: "interactive",
          pace: student.preferred_pace || "moderate"
        };
        setUserPreferences(prefs);
        // Set default topic based on user's goal if no URL topic
        if (!urlTopic && prefs.goal) {
          setTopic(prefs.goal);
        }
      }
    })();
  }, [user?.id, urlTopic]);

  // Explain
  const [slider, setSlider] = useState(20);
  const [fullContent, setFullContent] = useState("");
  const [displayContent, setDisplayContent] = useState("");
  const [showChips, setShowChips] = useState(false);

  // Summarize
  const [rawText, setRawText] = useState("");
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const [summaryDetail, setSummaryDetail] = useState<"short" | "standard" | "deep">("standard");

  // Quiz - Initialize with URL topic or default
  const [quizTopic, setQuizTopic] = useState(urlTopic || "Dynamic Programming");
  const [quizLevel, setQuizLevel] = useState<"easy" | "standard" | "hard">("standard");
  const [quizCountSetting, setQuizCountSetting] = useState<number>(5);
  const [quizState, setQuizState] = useState<QuizState>({
    items: [],
    currentIndex: 0,
    selected: null,
    revealed: false,
    score: 0,
    phase: "lobby",
    timer: 30,
    history: [],
  });
  const [showQuizConfetti, setShowQuizConfetti] = useState(false);

  // Socratic - Initialize with URL topic or default
  const [socraticTopic, setSocraticTopic] = useState(urlTopic || "Recursion");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Visualizer - Initialize with URL topic or default
  const [visualTopic, setVisualTopic] = useState(urlTopic || "Backpropagation in Neural Networks");
  const [diagramType, setDiagramType] = useState("Flowchart");
  const [visualContent, setVisualContent] = useState("");
  const [quizLogged, setQuizLogged] = useState(false);
  const [studentStatus, setStudentStatus] = useState<any>(null);

  // Session Intelligence State
  const [sessionUnderstanding, setSessionUnderstanding] = useState<number>(0);
  const [learningRate, setLearningRate] = useState<number>(0);
  const [startTime] = useState<number>(Date.now());
  const [baselineSet, setBaselineSet] = useState(false);

  // Fetch student status for prediction monitor
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let consecutiveFailures = 0;
    const controller = new AbortController();

    const fetchStatus = async () => {
      try {
        // Skip if offline
        if (!navigator.onLine) {
          scheduleNext(30000);
          return;
        }

        const response = await fetch("http://127.0.0.1:8000/api/student/status", {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          setStudentStatus(data);
          consecutiveFailures = 0;

          // Set initial baseline once
          if (!baselineSet && data.predicted_final_result) {
            setSessionUnderstanding(data.predicted_final_result);
            setBaselineSet(true);
          }

          scheduleNext(30000);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || !isMounted) return;

        consecutiveFailures++;
        // Periodic fetch failures are logged as warnings
        // Use exponential backoff: 30s, 60s, 120s, max 300s
        const backoff = Math.min(30000 * Math.pow(2, consecutiveFailures - 1), 300000);

        // Log sparingly
        if (consecutiveFailures <= 3) {
          console.warn(`Student status sync failed (attempt ${consecutiveFailures}). Retrying in ${backoff / 1000}s...`, err.message);
        }

        scheduleNext(backoff);
      }
    };

    const scheduleNext = (delay: number) => {
      if (!isMounted) return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(fetchStatus, delay);
    };

    const handleOnline = () => {
      console.log("Network back online, resuming status sync...");
      consecutiveFailures = 0;
      fetchStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => console.warn("Network offline. Status sync paused."));

    // Initial fetch
    fetchStatus();

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
    };
  }, [baselineSet]);

  // Learning Rate Calculation Effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (!baselineSet || !studentStatus?.predicted_final_result) return;
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      if (elapsedMinutes > 0.1) {
        const delta = sessionUnderstanding - studentStatus.predicted_final_result;
        setLearningRate(delta / elapsedMinutes);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionUnderstanding, baselineSet, studentStatus, startTime]);

  // Update topics when user preferences load
  useEffect(() => {
    if (userPreferences?.goal && !urlTopic) {
      const goalTopic = userPreferences.goal;
      setTopic(goalTopic);
      setQuizTopic(goalTopic);
      setSocraticTopic(goalTopic);
      setVisualTopic(goalTopic);
    }
  }, [userPreferences, urlTopic]);

  // Initialize from URL params on mount (after all state is declared)
  useEffect(() => {
    if (urlMode && ["explain", "summarize", "quiz", "socratic", "visualize"].includes(urlMode)) {
      setMode(urlMode);
    }
    if (urlTopic) {
      setTopic(urlTopic);
      setQuizTopic(urlTopic);
      setSocraticTopic(urlTopic);
      setVisualTopic(urlTopic);
    }
    if (urlDifficulty && ["easy", "standard", "hard"].includes(urlDifficulty)) {
      setQuizLevel(urlDifficulty as any);
    }
    if (urlDiagramType) {
      setDiagramType(urlDiagramType);
    }
  }, [urlMode, urlTopic, urlDifficulty, urlDiagramType]);
  const diagramOptions = [
    "Flowchart",
    "Mindmap",
    "Sequence Diagram",
    "Class Diagram",
    "State Diagram",
    "Entity Relationship (ER)",
    "User Journey",
    "Gantt",
    "Pie Chart",
  ];

  // Typewriter effect for explainer
  useEffect(() => {
    if (!fullContent) return;
    let index = 0;
    setDisplayContent("");
    setShowChips(false);

    const interval = setInterval(() => {
      setDisplayContent(fullContent.slice(0, index));
      index += 3;
      if (index >= fullContent.length) {
        clearInterval(interval);
        setDisplayContent(fullContent);
        setShowChips(true);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [fullContent]);

  const getSliderLabel = () => {
    if (slider <= 30) return "ELI5";
    if (slider <= 70) return "Standard";
    return "PhD Level";
  };

  const getSliderColor = () => {
    if (slider <= 30) return "from-green-400 to-green-500";
    if (slider <= 70) return "from-blue-500 to-blue-600";
    return "from-purple-500 to-purple-600";
  };

  const handleExplain = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setFullContent("");
    setDisplayContent("");
    setShowChips(false);
    try {
      const difficulty = slider;
      const res = await runStudyTool({
        tool_type: "explain",
        topic,
        difficulty,
      });
      setFullContent(res.content || "");
    } catch (err) {
      setError("Failed to generate explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    setSummary("");
    try {
      const res = await runStudyTool({
        tool_type: "summarize",
        input_text: rawText,
        detail: summaryDetail,
      });
      setSummary(res.content || "");
    } catch (err) {
      setError("Failed to summarize text. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizGenerate = async () => {
    if (!quizTopic.trim()) return;
    setLoading(true);
    setError(null);
    setQuizState({
      items: [],
      currentIndex: 0,
      selected: null,
      revealed: false,
      score: 0,
      phase: "lobby",
      timer: 30,
      history: [],
    });
    try {
      const res = await runStudyTool({
        tool_type: "quiz",
        topic: quizTopic,
        num_questions: quizCountSetting,
        level: quizLevel,
      });
      const items = res.quiz && res.quiz.length > 0 ? res.quiz : null;
      if (!items) {
        throw new Error("Empty quiz payload");
      }
      setQuizState((prev) => ({
        ...prev,
        items,
        phase: "lobby",
      }));
    } catch (err) {
      // Fallback
      const fallback: QuizItem[] = [
        {
          question: `What best describes ${quizTopic}?`,
          options: [
            "A random concept unrelated to the topic",
            "A core idea you should understand deeply",
            "A minor detail you can safely ignore",
            "A purely theoretical construct with no applications",
          ],
          correctAnswer: "A core idea you should understand deeply",
        },
      ];
      setQuizState((prev) => ({
        ...prev,
        items: fallback,
        phase: "lobby",
      }));
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswer = (qIndex: number, option: string) => {
    const item = quizState.items[qIndex];
    if (!item || quizState.phase !== "question") return;
    setQuizState((prev) => ({
      ...prev,
      selected: option,
    }));
  };

  const startQuiz = () => {
    if (quizState.items.length === 0) return;
    setQuizState((prev) => ({
      ...prev,
      phase: "question",
      currentIndex: 0,
      selected: null,
      revealed: false,
      timer: 30,
      score: 0,
      history: [],
    }));
    setQuizLogged(false);
  };

  const gotoQuizIndex = (idx: number) => {
    if (idx < 0 || idx >= quizState.items.length) return;
    setQuizState((prev) => ({
      ...prev,
      phase: "question",
      currentIndex: idx,
      selected: null,
      revealed: false,
      timer: 30,
    }));
  };

  const revealCurrent = (timeoutSkip = false) => {
    const item = quizState.items[quizState.currentIndex];
    if (!item || quizState.phase !== "question") return;
    const selected = timeoutSkip ? null : quizState.selected;
    const correct = !!selected && selected === item.correctAnswer;
    setQuizState((prev) => ({
      ...prev,
      phase: "reveal",
      revealed: true,
      score: prev.score + (correct ? 1 : 0),
      history: [
        ...prev.history,
        { item, selected, correct },
      ],
    }));

    // Session Intelligence
    setSessionUnderstanding(prev => {
      const delta = correct ? 3 : -2;
      return Math.max(0, Math.min(100, prev + delta));
    });

    if (correct) {
      setShowQuizConfetti(true);
      setTimeout(() => setShowQuizConfetti(false), 800);
    }
  };

  const nextQuestion = () => {
    const nextIndex = quizState.currentIndex + 1;
    if (nextIndex >= quizState.items.length) {
      setQuizState((prev) => ({ ...prev, phase: "results" }));
      return;
    }
    gotoQuizIndex(nextIndex);
  };

  const prevQuestion = () => {
    gotoQuizIndex(quizState.currentIndex - 1);
  };

  const logQuizResult = async (score: number, total: number) => {
    if (!user?.id || total === 0) return;
    try {
      await supabase.from("assessment_results").insert({
        student_id: user.id,
        topic: quizTopic,
        score: Math.round((score / total) * 100),
        weak_areas: [],
        suggested_action: "quiz_me",
      });
      const xpEarned = Math.round((score / total) * 100);
      const timeSpentMinutes = 5;
      const { updateSagaFromActivity } = await import("../services/sagaService");
      await updateSagaFromActivity(user.id, "quiz", xpEarned, timeSpentMinutes);
    } catch (e) {
      console.error("Failed to log quiz result", e);
    }
  };

  // Timer effect
  useEffect(() => {
    if (mode !== "quiz" || quizState.phase !== "question") return;
    if (quizState.timer <= 0) {
      revealCurrent(true);
      return;
    }
    const timerId = setTimeout(
      () =>
        setQuizState((prev) =>
          prev.phase === "question"
            ? { ...prev, timer: prev.timer - 1 }
            : prev
        ),
      1000
    );
    return () => clearTimeout(timerId);
  }, [mode, quizState.phase, quizState.timer, quizState.currentIndex]);

  // Persist results
  useEffect(() => {
    if (mode === "quiz" && quizState.phase === "results" && !quizLogged && quizState.items.length > 0) {
      setQuizLogged(true);
      void logQuizResult(quizState.score, quizState.items.length);
    }
  }, [mode, quizState.phase, quizState.score, quizState.items.length, quizLogged]);

  const handleSocraticSend = async () => {
    const text = chatInput.trim() || socraticTopic.trim();
    if (!text) return;
    const userMessage: ChatMessage = { id: Date.now(), from: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await runStudyTool({ tool_type: "socratic", topic: text });
      const aiMessage: ChatMessage = { id: Date.now() + 1, from: "ai", text: res.content || "" };
      setMessages((prev) => [...prev, aiMessage]);
      setSessionUnderstanding(prev => Math.max(0, Math.min(100, prev + 0.5)));
    } catch (err) {
      setError("Socratic tutor is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySummary = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleVisualize = async () => {
    if (!visualTopic.trim()) return;
    setLoading(true);
    setError(null);
    setVisualContent("");
    try {
      const res = await runStudyTool({
        tool_type: "visualize" as StudyToolMode,
        topic: visualTopic,
        diagram_type: diagramType.toLowerCase(),
      } as any);
      setVisualContent(res.content || "");
    } catch (err) {
      setError("Failed to generate diagram.");
    } finally {
      setLoading(false);
    }
  };

  const renderMainContent = () => {
    if (mode === "explain") {
      return (
        <>
          {!displayContent && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-violet-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ready to Learn?</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md">Enter a topic and start your session.</p>
            </div>
          )}
          {displayContent && <MarkdownRenderer content={displayContent} />}
          {showChips && (
            <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
              <button type="button" className="px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/40 font-medium transition-all hover:scale-105 flex items-center gap-2"><Target className="w-4 h-4" />Quiz</button>
              <button type="button" className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/30 font-medium transition-all hover:scale-105 flex items-center gap-2"><BookOpen className="w-4 h-4" />Diagram</button>
            </div>
          )}
        </>
      );
    }
    if (mode === "summarize") {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} className="flex-1 rounded-2xl bg-slate-950/70 text-sm p-4 text-slate-100 border border-slate-700 resize-none focus:ring-2 focus:ring-violet-500" placeholder="Paste notes..." />
          <div className="flex-1 rounded-2xl bg-slate-900/70 p-4 border border-slate-700 overflow-auto">
            {summary ? <MarkdownRenderer content={summary} /> : <p className="text-xs text-slate-500">Summary appears here.</p>}
          </div>
        </div>
      );
    }
    if (mode === "quiz") {
      return (
        <div className="h-full flex flex-col">
          {quizState.items.length === 0 && quizState.phase === "lobby" && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                <Target className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-sm text-slate-400">Setup your quiz options above and click Generate.</p>
            </div>
          )}
          {quizState.phase === "lobby" && quizState.items.length > 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <button type="button" onClick={startQuiz} className="px-6 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg">Start Quiz</button>
            </div>
          )}
          {quizState.phase === "question" && quizState.items[quizState.currentIndex] && (
            <div className="space-y-4">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Question {quizState.currentIndex + 1} / {quizState.items.length}</span>
                <span>Time: {quizState.timer}s</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700">
                <p className="font-medium mb-3">{quizState.items[quizState.currentIndex].question}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {quizState.items[quizState.currentIndex].options.map(opt => (
                    <button key={opt} onClick={() => handleQuizAnswer(quizState.currentIndex, opt)} className={`text-left p-3 rounded-xl border text-xs transition-all ${quizState.selected === opt ? "border-violet-500 bg-violet-500/20" : "border-slate-700 hover:border-violet-500/50"}`}>{opt}</button>
                  ))}
                </div>
                <button onClick={() => revealCurrent(false)} disabled={!quizState.selected} className="mt-4 px-4 py-2 rounded-full bg-primary text-white text-xs disabled:opacity-40">Submit</button>
              </div>
            </div>
          )}
          {quizState.phase === "reveal" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700">
                <p className="mb-2 text-xs">Response logged. Score: {quizState.score}</p>
                <button onClick={nextQuestion} className="px-4 py-2 rounded-full bg-primary text-white text-xs">Next</button>
              </div>
            </div>
          )}
          {quizState.phase === "results" && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-xl font-bold">Quiz Complete!</p>
              <p>Score: {quizState.score} / {quizState.items.length}</p>
              <button onClick={() => setQuizState(p => ({ ...p, phase: "lobby" }))} className="px-4 py-2 rounded-xl bg-primary text-white">Retry</button>
            </div>
          )}
        </div>
      );
    }
    if (mode === "visualize") {
      return visualContent ? (
        <MarkdownRenderer content={visualContent} />
      ) : (
        <div className="h-full flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">Generate a visualization above and it will render here.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full space-y-4">
        <div className="flex-1 overflow-auto space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-slate-500 italic mt-4 text-center">Start a conversation to trigger guiding questions...</p>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`p-3 rounded-2xl text-xs max-w-[80%] ${m.from === "user" ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-100"}`}>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSocraticSend()} className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-xs" placeholder="Ask away..." />
          <button onClick={handleSocraticSend} className="px-4 py-2 rounded-full bg-violet-600 text-white text-xs">Send</button>
        </div>
      </div>
    );
  };

  const renderBottomControls = () => {
    if (mode === "explain") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center w-full">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Subject Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="e.g. Quantum Entanglement" />
          </div>
          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Synapse Slider</label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${getSliderColor()} text-white`}>{getSliderLabel()}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={slider}
              onChange={(e) => setSlider(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-primary"
              style={{
                background: `linear-gradient(to right, 
                  #4ade80 0%, 
                  #3b82f6 50%, 
                  #a855f7 100%)`,
              }}
            />
          </div>
          <div className="md:col-span-3">
            <button onClick={handleExplain} disabled={loading || !topic.trim()} className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Ignite
            </button>
          </div>
        </div>
      );
    }
    if (mode === "summarize") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center w-full">
          <div className="md:col-span-12">
            <button onClick={handleSummarize} disabled={loading || !rawText.trim()} className="w-full py-2.5 rounded-xl bg-primary text-white font-bold">Summarize Notes</button>
          </div>
        </div>
      );
    }
    if (mode === "quiz") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end w-full">
          <div className="md:col-span-6">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Topic</label>
            <input value={quizTopic} onChange={e => setQuizTopic(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-sm" placeholder="Quiz topic..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Level</label>
            <select value={quizLevel} onChange={e => setQuizLevel(e.target.value as any)} className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-xs">
              <option value="easy">Easy</option>
              <option value="standard">Standard</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Count</label>
            <select value={quizCountSetting} onChange={e => setQuizCountSetting(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-xs">
              {[5, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <button onClick={handleQuizGenerate} disabled={loading || !quizTopic.trim()} className="w-full py-2.5 rounded-xl bg-primary text-white font-bold">Generate</button>
          </div>
        </div>
      );
    }
    if (mode === "visualize") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end w-full">
          <div className="md:col-span-7">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Target Concept</label>
            <input value={visualTopic} onChange={e => setVisualTopic(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-sm" placeholder="Concept to visualize..." />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Diagram Type</label>
            <select value={diagramType} onChange={e => setDiagramType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-xs text-white">
              {diagramOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <button onClick={handleVisualize} disabled={loading || !visualTopic.trim()} className="w-full py-2.5 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4" /> Draw
            </button>
          </div>
        </div>
      );
    }
    return <div className="md:col-span-12 text-xs text-slate-500 font-medium italic">Socratic mode is active. Engage with the tutor below through active inquiry.</div>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Simplified Header */}
        <header className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg"><Brain className="text-white" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Study Lab</h1>
            <p className="text-slate-500 text-sm">Interactive AI-powered learning environment.</p>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-800/50">
          {["explain", "summarize", "quiz", "socratic", "visualize"].map(t => (
            <button key={t} onClick={() => setMode(t as any)} className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-tight transition-all border-b-2 ${mode === t ? "bg-primary/10 text-primary border-primary" : "text-slate-400 border-transparent hover:text-white hover:bg-white/5"}`}>{t}</button>
          ))}
        </nav>

        {/* Integrated Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Stage - Intelligence Integrated Sidebar */}
          <main className="lg:col-span-8 xl:col-span-9 bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800/80 bg-slate-950/20">
              <div className="flex items-center gap-4">{renderBottomControls()}</div>
            </div>
            <div className="p-8 min-h-[550px] bg-slate-900/40 relative">
              {loading ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/20 backdrop-blur-[1px] gap-4">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-slate-400 text-xs animate-pulse font-bold uppercase tracking-widest">Neural Syncing...</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={mode} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="h-full">
                    {error && <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium">{error}</div>}
                    {renderMainContent()}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </main>

          {/* Intelligence Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
            <StruggleMonitor
              understanding={sessionUnderstanding}
              learningRate={learningRate}
              struggleLevel={100 - sessionUnderstanding}
              isRealTime={true}
            />

            {/* Contextual Tip */}
            <div className="bg-slate-900/80 border border-slate-800/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest">Pedagogical Insight</h4>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium relative z-10">
                {mode === 'quiz' ? "Regular testing forces your brain to retrieve information, which is the single most effective way to lock in learning." :
                  mode === 'socratic' ? "The Socratic tutor won't give answers because struggle is where growth happens. Keep digging deeper!" :
                    mode === 'explain' ? "If the 'PhD Level' feels too dense, slide back to Eli5 to build your foundation before leveling up again." :
                      "Your session metrics update in real-time as you interact with the Lab toolset."}
              </p>
            </div>
          </aside>
        </div>
      </div>
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #6366f1;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
          transition: all 0.2s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.6);
        }
      `}</style>
    </motion.div>
  );
}
