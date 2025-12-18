export interface Lesson {
  id: string;
  title: string;
  duration: string; // e.g., "14:32"
  videoUrl: string;
  isCompleted: boolean;
  isLocked?: boolean;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  modules: Module[];
}


