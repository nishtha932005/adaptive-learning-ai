import React from "react";
import type { QuizItem } from "../services/studyService";

export type QuizPhase = "question" | "reveal";

interface QuizRendererProps {
  item: QuizItem;
  index: number;
  total: number;
  selected: string | null;
  phase: QuizPhase;
  timer: number;
  onSelect: (option: string) => void;
  onSubmit: () => void;
  onNext: () => void;
}

export default function QuizRenderer({
  item,
  index,
  total,
  selected,
  phase,
  timer,
  onSelect,
  onSubmit,
  onNext,
}: QuizRendererProps) {
  const isReveal = phase === "reveal";

  const getOptionClasses = (option: string) => {
    const base = "text-left p-3 rounded-xl border text-xs transition-all";
    if (!isReveal) {
      return `${base} ${selected === option ? "border-violet-500 bg-violet-500/20" : "border-slate-700 hover:border-violet-500/50"}`;
    }

    if (option === item.correctAnswer) {
      return `${base} border-emerald-500 bg-emerald-500/20`;
    }

    if (selected === option && option !== item.correctAnswer) {
      return `${base} border-red-500 bg-red-500/20`;
    }

    return `${base} border-slate-700`;
  };

  const feedbackText = () => {
    if (!isReveal) return null;
    if (selected === item.correctAnswer) {
      return "Correct! Nice work.";
    }
    if (selected == null) {
      return "Time's up. Review the correct answer highlighted above.";
    }
    return `Not quite. The correct answer is highlighted in green.`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-slate-400">
        <span>
          Question {index + 1} / {total}
        </span>
        <span>Time: {timer}s</span>
      </div>
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700">
        <p className="font-medium mb-3">{item.question}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {item.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => !isReveal && onSelect(opt)}
              className={getOptionClasses(opt)}
              disabled={isReveal}
            >
              {opt}
            </button>
          ))}
        </div>
        {!isReveal ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!selected}
            className="mt-4 px-4 py-2 rounded-full bg-primary text-white text-xs disabled:opacity-40"
          >
            Submit
          </button>
        ) : (
          <div className="mt-4 flex flex-col gap-3 text-xs">
            {feedbackText() && (
              <p className="text-slate-300">{feedbackText()}</p>
            )}
            <button
              type="button"
              onClick={onNext}
              className="px-4 py-2 rounded-full bg-primary text-white text-xs self-start"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
