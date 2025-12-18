import { supabase } from "../lib/supabase";

export interface SagaChapter {
  id: string;
  chapter_number: number;
  title: string;
  subtitle: string;
  xp_reward: number;
  estimated_time_minutes: number;
  type: "video" | "quiz" | "boss_fight";
  prerequisite_chapter_id: string | null;
  course_id: string | null;
  action_url: string | null;
  action_type: "course" | "quiz" | "study" | "competition" | "notes" | "dashboard" | null;
  action_params: Record<string, any> | null;
}

export interface SagaProgress {
  id: string;
  student_id: string;
  chapter_id: string;
  status: "completed" | "active" | "locked";
  completed_at: string | null;
  xp_earned: number;
  time_spent_minutes: number;
}

export interface SagaNode extends SagaChapter {
  status: "completed" | "active" | "locked";
  completed_at: string | null;
  xp_earned: number;
  time_spent_minutes: number;
}

/**
 * Fetch all saga chapters with student's progress
 * Checks for personalized chapters first, falls back to default chapters
 */
export async function getSagaProgress(studentId: string): Promise<SagaNode[]> {
  // First, check if student has personalized chapters
  const { data: personalizedChapters, error: personalizedError } = await supabase
    .from("personalized_saga_chapters")
    .select("*")
    .eq("student_id", studentId)
    .order("chapter_number", { ascending: true });

  if (!personalizedError && personalizedChapters && personalizedChapters.length > 0) {
    // Use personalized chapters
    const { data: progress, error: progressError } = await supabase
      .from("saga_progress")
      .select("*")
      .eq("student_id", studentId)
      .not("personalized_chapter_id", "is", null);

    // If no progress yet for personalized chapters, treat first chapter as active
    const hasAnyProgress = !!(progress && progress.length > 0 && !progressError);

    const progressMap = new Map(
      (progress || []).map((p) => [p.personalized_chapter_id, p])
    );

    return personalizedChapters.map((chapter, index) => {
      const prog = progressMap.get(chapter.id);
      // If no stored progress, make the first chapter "active" so the path is clickable
      const fallbackStatus: SagaNode["status"] =
        !hasAnyProgress && index === 0 ? "active" : "locked";

      return {
        id: chapter.id,
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        subtitle: chapter.subtitle,
        xp_reward: chapter.xp_reward,
        estimated_time_minutes: chapter.estimated_time_minutes,
        type: chapter.type as "video" | "quiz" | "boss_fight",
        prerequisite_chapter_id: chapter.prerequisite_chapter_id,
        course_id: chapter.course_id,
        action_url: chapter.action_url,
        action_type: chapter.action_type as any,
        action_params: chapter.action_params,
        status: prog?.status || fallbackStatus,
        completed_at: prog?.completed_at || null,
        xp_earned: prog?.xp_earned || 0,
        time_spent_minutes: prog?.time_spent_minutes || 0,
      };
    });
  }

  // Fallback to default chapters
  const { data: chapters, error: chaptersError } = await supabase
    .from("saga_chapters")
    .select("*")
    .order("chapter_number", { ascending: true });

  if (chaptersError) {
    console.error("Error fetching saga chapters:", chaptersError);
    throw new Error("Failed to load saga chapters");
  }

  if (!chapters || chapters.length === 0) {
    return [];
  }

  // Fetch student's progress
  const { data: progress, error: progressError } = await supabase
    .from("saga_progress")
    .select("*")
    .eq("student_id", studentId)
    .is("personalized_chapter_id", null);

  if (progressError) {
    console.error("Error fetching saga progress:", progressError);
  }

  // Merge chapters with progress
  const progressMap = new Map((progress || []).map((p) => [p.chapter_id, p]));
  const hasAnyProgress = !!(progress && progress.length > 0 && !progressError);

  return chapters.map((chapter, index) => {
    const prog = progressMap.get(chapter.id);
    // If there is no stored progress for this student yet,
    // make the very first chapter "active" and leave the rest "locked"
    const fallbackStatus: SagaNode["status"] =
      !hasAnyProgress && index === 0 ? "active" : "locked";

    return {
      ...chapter,
      status: prog?.status || fallbackStatus,
      completed_at: prog?.completed_at || null,
      xp_earned: prog?.xp_earned || 0,
      time_spent_minutes: prog?.time_spent_minutes || 0,
    };
  });
}

/**
 * Initialize saga progress for a new student
 */
export async function initializeSagaProgress(studentId: string): Promise<void> {
  const { error } = await supabase.rpc("initialize_saga_progress", {
    student_uuid: studentId,
  });

  if (error) {
    console.error("Error initializing saga progress:", error);
    throw new Error("Failed to initialize saga progress");
  }
}

/**
 * Mark a saga chapter as completed
 */
export async function completeSagaChapter(
  studentId: string,
  chapterId: string,
  xpEarned?: number,
  timeSpentMinutes?: number
): Promise<void> {
  const { error } = await supabase.rpc("complete_saga_chapter", {
    student_uuid: studentId,
    chapter_id_param: chapterId,
    xp_earned_param: xpEarned || 0,
    time_spent_param: timeSpentMinutes || 0,
  });

  if (error) {
    console.error("Error completing saga chapter:", error);
    throw new Error("Failed to complete saga chapter");
  }
}

/**
 * Get the active chapter for a student
 */
export async function getActiveChapter(studentId: string): Promise<SagaNode | null> {
  const nodes = await getSagaProgress(studentId);
  return nodes.find((node) => node.status === "active") || null;
}

/**
 * Update saga progress based on lesson/quiz completion
 * This should be called when a student completes a lesson or quiz
 */
export async function updateSagaFromActivity(
  studentId: string,
  activityType: "lesson" | "quiz",
  xpEarned: number,
  timeSpentMinutes: number,
  chapterId?: string
): Promise<void> {
  // If chapterId is provided, use it directly
  let targetChapter: SagaNode | null = null;

  if (chapterId) {
    const nodes = await getSagaProgress(studentId);
    targetChapter = nodes.find((node) => node.id === chapterId) || null;
  } else {
    // Get active chapter
    targetChapter = await getActiveChapter(studentId);
  }

  if (!targetChapter) {
    console.warn("No active chapter found for progress update");
    return;
  }

  // Check if this is a personalized chapter
  const { data: personalizedChapter } = await supabase
    .from("personalized_saga_chapters")
    .select("id")
    .eq("id", targetChapter.id)
    .single();

  const isPersonalized = !!personalizedChapter;

  // Calculate totals
  const totalXp = (targetChapter.xp_earned || 0) + xpEarned;
  const totalTime = (targetChapter.time_spent_minutes || 0) + timeSpentMinutes;

  // Complete if we've reached the reward threshold or spent enough time
  const shouldComplete =
    totalXp >= targetChapter.xp_reward * 0.8 ||
    totalTime >= targetChapter.estimated_time_minutes * 0.8 ||
    activityType === "quiz"; // Always complete on quiz finish

  if (shouldComplete) {
    // Complete the chapter - THIS ALREADY INCREMENTS STUDENT XP in the database
    await completeSagaChapter(studentId, targetChapter.id, totalXp, totalTime);
  } else {
    // Just update progress
    const updateQuery = supabase
      .from("saga_progress")
      .update({
        xp_earned: totalXp,
        time_spent_minutes: totalTime,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId);

    if (isPersonalized) {
      updateQuery.eq("personalized_chapter_id", targetChapter.id);
    } else {
      updateQuery.eq("chapter_id", targetChapter.id);
    }

    const { error } = await updateQuery;

    if (error) {
      console.error("Error updating saga progress:", error);
    }

    // For non-completion updates, we use the RPC to add incremental XP
    // Note: Wrapping in try/catch or checking error gracefully to avoid blocking UI
    try {
      const { error: xpError } = await supabase.rpc("increment_student_xp", {
        student_uuid: studentId,
        xp_amount: xpEarned,
      });

      if (xpError) {
        // Log as warning - often means function is missing or schema cache is stale
        console.warn("Incremental XP update skipped:", xpError.message);
      }
    } catch (e) {
      console.warn("Failed to call increment_student_xp RPC:", e);
    }
  }
}

