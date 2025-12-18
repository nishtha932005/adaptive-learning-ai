export interface SagaNode {
  id: string;
  title: string;
  subtitle: string;
  status: "completed" | "active" | "locked";
  xpReward: number;
  estimatedTime: string;
  type: "video" | "quiz" | "boss_fight";
  chapter: number;
  course_id?: string | null;
  action_url?: string | null;
  action_type?: "course" | "quiz" | "study" | "competition" | "notes" | "dashboard" | null;
  action_params?: Record<string, any> | null;
}

export const sagaNodes: SagaNode[] = [
  {
    id: "chapter-1",
    title: "The Awakening",
    subtitle: "Python Basics Refresher",
    status: "completed",
    xpReward: 500,
    estimatedTime: "30m",
    type: "video",
    chapter: 1,
    action_type: "course",
    action_url: "/dashboard/courses",
    action_params: { highlight: "python-basics" },
  },
  {
    id: "chapter-2",
    title: "The First Trial",
    subtitle: "Data Structures Logic",
    status: "completed",
    xpReward: 750,
    estimatedTime: "45m",
    type: "quiz",
    chapter: 2,
    action_type: "quiz",
    action_url: "/dashboard/study",
    action_params: { mode: "quiz", topic: "Data Structures", difficulty: "standard" },
  },
  {
    id: "chapter-3",
    title: "The Neural Link",
    subtitle: "Introduction to Deep Learning",
    status: "active",
    xpReward: 1000,
    estimatedTime: "60m",
    type: "video",
    chapter: 3,
    action_type: "course",
    action_url: "/dashboard/courses",
    action_params: { highlight: "deep-learning" },
  },
  {
    id: "chapter-4",
    title: "The Void",
    subtitle: "Backpropagation Maths",
    status: "locked",
    xpReward: 1250,
    estimatedTime: "75m",
    type: "boss_fight",
    chapter: 4,
    action_type: "study",
    action_url: "/dashboard/study",
    action_params: { mode: "explain", topic: "Backpropagation", difficulty: 80 },
  },
  {
    id: "chapter-5",
    title: "Ascension",
    subtitle: "Building a Transformer from Scratch",
    status: "locked",
    xpReward: 1500,
    estimatedTime: "90m",
    type: "boss_fight",
    chapter: 5,
    action_type: "study",
    action_url: "/dashboard/study",
    action_params: { mode: "visualize", topic: "Transformer Architecture", diagram_type: "Flowchart" },
  },
];

