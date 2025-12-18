import { supabase } from "../lib/supabase";
import type { Course } from "../types";

const MOCK_COURSES: Course[] = [
  {
    id: "advanced-neural-networks",
    title: "Advanced Neural Networks",
    description:
      "Deep dive into modern neural network architectures, optimization tricks, and production-grade training workflows.",
    thumbnail:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    modules: [
      {
        id: "m1",
        title: "Foundations & Intuition",
        lessons: [
          {
            id: "m1-l1",
            title: "From Linear Models to Deep Networks",
            duration: "14:32",
            videoUrl: "https://www.youtube.com/embed/aircAruvnKk",
            isCompleted: false,
          },
          {
            id: "m1-l2",
            title: "Activation Functions & Non-Linearity",
            duration: "11:08",
            videoUrl: "https://www.youtube.com/embed/1O4vC5c0OVs",
            isCompleted: false,
          },
        ],
      },
      {
        id: "m2",
        title: "Architectures in Practice",
        lessons: [
          {
            id: "m2-l1",
            title: "Convolutional Neural Networks (CNNs)",
            duration: "18:20",
            videoUrl: "https://www.youtube.com/embed/YRhxdVk_sIs",
            isCompleted: false,
          },
          {
            id: "m2-l2",
            title: "Attention & Transformers",
            duration: "21:42",
            videoUrl: "https://www.youtube.com/embed/U0s0f995w14",
            isCompleted: false,
          },
        ],
      },
    ],
  },
  {
    id: "react-mastery",
    title: "React Mastery",
    description:
      "From fundamentals to advanced patterns, hooks, performance, and production deployment.",
    thumbnail:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
    modules: [
      {
        id: "rm1",
        title: "Core Concepts",
        lessons: [
          {
            id: "rm1-l1",
            title: "Components & Props",
            duration: "12:10",
            videoUrl: "https://www.youtube.com/embed/Ke90Tje7VS0",
            isCompleted: false,
          },
          {
            id: "rm1-l2",
            title: "State & Lifecycle",
            duration: "15:20",
            videoUrl: "https://www.youtube.com/embed/DPnqb74Smug",
            isCompleted: false,
          },
        ],
      },
    ],
  },
  {
    id: "ml-systems-design",
    title: "ML Systems Design",
    description:
      "Designing, deploying and monitoring machine learning systems in the real world.",
    thumbnail:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    modules: [
      {
        id: "ml1",
        title: "End-to-End Pipelines",
        lessons: [
          {
            id: "ml1-l1",
            title: "Feature Pipelines",
            duration: "16:30",
            videoUrl: "https://www.youtube.com/embed/06-AZXmwHjo",
            isCompleted: false,
          },
        ],
      },
    ],
  },
];

export async function getAllCourses(): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, thumbnail_url")
      .order("title", { ascending: true });

    if (error || !data || data.length === 0) {
      return MOCK_COURSES;
    }

    return data.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description || "",
      thumbnail: c.thumbnail_url,
      modules: [], // modules will be loaded on course detail
    }));
  } catch {
    return MOCK_COURSES;
  }
}

export async function getCourseById(courseId: string): Promise<Course> {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, thumbnail_url")
      .eq("id", courseId)
      .single();

    if (error || !data) {
      const fallback = MOCK_COURSES.find((c) => c.id === courseId);
      return fallback || MOCK_COURSES[0];
    }

    // TODO: if you later add modules/lessons tables to Supabase, fetch and map them here.
    return {
      id: data.id,
      title: data.title,
      description: data.description || "",
      thumbnail: data.thumbnail_url,
      modules: MOCK_COURSES[0].modules, // temporary: provide rich mock modules so player works
    };
  } catch {
    const fallback = MOCK_COURSES.find((c) => c.id === courseId);
    return fallback || MOCK_COURSES[0];
  }
}


