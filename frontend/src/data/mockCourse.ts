export type Lesson = {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  isCompleted: boolean;
  isLocked?: boolean;
};

export type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type MockCourse = {
  courseId: string;
  title: string;
  description: string;
  modules: Module[];
};

export const advancedNeuralNetworksCourse: MockCourse = {
  courseId: "advanced-neural-networks",
  title: "Advanced Neural Networks",
  description:
    "Deep dive into modern neural network architectures, optimization tricks, and production-grade training workflows.",
  modules: [
    {
      id: "module-1",
      title: "Foundations & Intuition",
      lessons: [
        {
          id: "m1-l1",
          title: "From Linear Models to Deep Networks",
          duration: "14:32",
          videoUrl: "https://www.youtube.com/embed/aircAruvnKk",
          isCompleted: true,
        },
        {
          id: "m1-l2",
          title: "Activation Functions & Non-Linearity",
          duration: "11:08",
          videoUrl: "https://www.youtube.com/embed/1O4vC5c0OVs",
          isCompleted: false,
        },
        {
          id: "m1-l3",
          title: "Loss Landscapes & Optimization Intuition",
          duration: "16:47",
          videoUrl: "https://www.youtube.com/embed/IHZwWFHWa-w",
          isCompleted: false,
        },
      ],
    },
    {
      id: "module-2",
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
          title: "Recurrent Networks & Sequence Modeling",
          duration: "19:05",
          videoUrl: "https://www.youtube.com/embed/AsNTP8Kwu80",
          isCompleted: false,
        },
        {
          id: "m2-l3",
          title: "Attention & Transformers",
          duration: "21:42",
          videoUrl: "https://www.youtube.com/embed/U0s0f995w14",
          isCompleted: false,
          isLocked: true,
        },
        {
          id: "m2-l4",
          title: "Residual Connections & Deep Architectures",
          duration: "13:57",
          videoUrl: "https://www.youtube.com/embed/sAzLQ4Wq74c",
          isCompleted: false,
          isLocked: true,
        },
      ],
    },
    {
      id: "module-3",
      title: "Training at Scale & Production",
      lessons: [
        {
          id: "m3-l1",
          title: "Regularization, Dropout & BatchNorm",
          duration: "17:12",
          videoUrl: "https://www.youtube.com/embed/ARq74QuavAo",
          isCompleted: false,
          isLocked: true,
        },
        {
          id: "m3-l2",
          title: "Optimizers: Adam, RMSprop & Scheduling",
          duration: "15:40",
          videoUrl: "https://www.youtube.com/embed/s0HW7vrsFeI",
          isCompleted: false,
          isLocked: true,
        },
        {
          id: "m3-l3",
          title: "Monitoring, Debugging & Productionizing",
          duration: "20:05",
          videoUrl: "https://www.youtube.com/embed/bhUHF5CkF2E",
          isCompleted: false,
          isLocked: true,
        },
      ],
    },
  ],
};


