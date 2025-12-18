import { supabase } from "../lib/supabase";

/**
 * Generate personalized saga journey for a personal account user
 */
export async function generatePersonalizedSaga(userId: string): Promise<void> {
  try {
    // Get user's learning preferences - try multiple times if 406 error
    // Get user's learning preferences from students table
    let prefs = null;

    const { data: studentPrefs } = await supabase
      .from("students")
      .select("learning_goals, preferred_pace, interests") // Changed column names to match actual schema
      .eq("id", userId)
      .single();

    if (studentPrefs) {
      prefs = {
        goal: studentPrefs.learning_goals?.[0] || "general",
        vibe: "interactive", // Default since not in schema
        pace: studentPrefs.preferred_pace,
      };
    }

    if (!prefs || (!prefs.goal && !prefs.vibe && !prefs.pace)) {
      console.warn("No learning preferences found, skipping personalized saga generation");
      return;
    }

    // Get student data for skill level
    const { data: student } = await supabase
      .from("students")
      .select("python_skill_level, learning_goals, preferred_pace, interests, learning_style")
      .eq("id", userId)
      .single();

    // Call AI to generate personalized saga
    const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${API_URL}/api/ai/personalize-saga`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        python_skill_level: student?.python_skill_level || "beginner",
        learning_goals: student?.learning_goals || [prefs.goal || "general"],
        preferred_pace: student?.preferred_pace || prefs.pace || "moderate",
        interests: student?.interests || [],
        learning_style: student?.learning_style || "interactive",
      }),
    });

    if (!response.ok) {
      console.error("Failed to generate personalized saga");
      return;
    }

    const { chapters } = await response.json();

    // Save personalized chapters
    const personalizedChapters = chapters.map((ch: any, index: number) => ({
      student_id: userId,
      chapter_number: ch.chapter_number || index + 1,
      title: ch.title,
      subtitle: ch.subtitle,
      xp_reward: ch.xp_reward,
      estimated_time_minutes: ch.estimated_time_minutes,
      type: ch.type,
      course_id: null,
      action_url: ch.action_url,
      action_type: ch.action_type,
      action_params: ch.action_params || {},
    }));

    // Insert personalized chapters
    const { error: chaptersError } = await supabase
      .from("personalized_saga_chapters")
      .upsert(personalizedChapters, { onConflict: "student_id,chapter_number" });

    if (chaptersError) {
      console.error("Failed to save personalized chapters:", chaptersError);
      return;
    }

    // Initialize saga progress for personalized chapters using the RPC function
    // This function properly handles the personalized_chapter_id field
    const { error: progressError } = await supabase.rpc("initialize_personalized_saga_progress", {
      student_uuid: userId,
    });

    if (progressError) {
      console.warn("Progress initialization warning:", progressError);
      // If RPC fails, try manual initialization as fallback
      const { data: personalizedChapters } = await supabase
        .from("personalized_saga_chapters")
        .select("id, chapter_number")
        .eq("student_id", userId)
        .order("chapter_number", { ascending: true });

      if (personalizedChapters && personalizedChapters.length > 0) {
        // Create progress entries using personalized_chapter_id (not chapter_id)
        const progressEntries = personalizedChapters.map((chapter, index) => ({
          student_id: userId,
          chapter_id: `personalized-${chapter.id}`, // Use a placeholder for chapter_id
          personalized_chapter_id: chapter.id, // Use the actual UUID
          status: index === 0 ? "active" : "locked",
          completed_at: null,
          xp_earned: 0,
          time_spent_minutes: 0,
        }));

        // Insert progress entries
        const { error: manualError } = await supabase
          .from("saga_progress")
          .upsert(progressEntries, { onConflict: "student_id,chapter_id" });

        if (manualError) {
          console.error("Manual progress initialization failed:", manualError);
        }
      }
    }

    // Mark as generated
    await supabase
      .from("students")
      .update({ personalized_saga_created: true })
      .eq("id", userId);
  } catch (e) {
    console.error("Error generating personalized saga:", e);
  }
}

