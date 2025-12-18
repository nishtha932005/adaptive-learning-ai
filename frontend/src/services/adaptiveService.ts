import type { DashboardStudent } from "../lib/supabase";
import type { Course } from "../types";

export type PersonalizedPlaylistItem = {
  id: string;
  title: string;
  youtubeId: string;
  type: "video" | "quiz" | "project";
};

export type StudentProfileForAdaptation = DashboardStudent & {
  learning_style?: string | null;
  technical_level?: string | null;
};

export function generatePersonalizedPlaylist(
  student: StudentProfileForAdaptation,
  baseCourse: Course
): PersonalizedPlaylistItem[] {
  const style = (student.learning_style || "").toLowerCase();
  const level = (student.technical_level || "").toLowerCase();
  const risk = student.risk_score ?? 0;

  const allVideoItems: PersonalizedPlaylistItem[] = baseCourse.modules.flatMap(
    (m) =>
      m.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        youtubeId: lesson.videoUrl.replace("https://www.youtube.com/embed/", ""),
        type: "video" as const,
      }))
  );

  const playlist: PersonalizedPlaylistItem[] = [];

  if (risk > 80) {
    playlist.push({
      id: "remedial-basics",
      title: `Remedial Basics for ${baseCourse.title}`,
      youtubeId: allVideoItems[0]?.youtubeId || "dQw4w9WgXcQ",
      type: "video",
    });
  }

  if (style === "visual") {
    playlist.push(...allVideoItems.slice(0, 3));
  } else {
    playlist.push(...allVideoItems.slice(0, 2));
  }

  if (level === "advanced") {
    playlist.push({
      id: "coding-challenge-1",
      title: "Advanced Coding Challenge",
      youtubeId: "",
      type: "project",
    });
  } else {
    playlist.push({
      id: "checkpoint-quiz-1",
      title: "Checkpoint Quiz",
      youtubeId: "",
      type: "quiz",
    });
  }

  return playlist;
}


