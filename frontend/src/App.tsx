import React from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import StudyRoomPage from "./pages/StudyRoom";
import CoursePlayer from "./pages/CoursePlayer";
import CoursesLibrary from "./pages/CoursesLibrary";
import Onboarding from "./pages/Onboarding";
import MentorDashboard from "./pages/mentor/MentorDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import LessonViewer from "./pages/LessonViewer";
import { useAuth } from "./context/AuthContext";
import { CourseProvider } from "./context/CourseContext";

function MentorRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // In a real app, we would cache role in context; for now, rely on backend checks in the page itself.
  if (!user) {
    return null;
  }
  return <>{children}</>;
}

function DashboardApp() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/overview" element={<Dashboard />} />
        <Route path="/study" element={<StudyRoomPage />} />
        <Route path="/courses" element={<CoursesLibrary />} />
        <Route path="/course/:id/module/:moduleIndex" element={<CoursePlayer />} />
        <Route path="/courses/:id/module/:moduleIndex" element={<CoursePlayer />} />
        <Route path="/course/:id" element={<CoursePlayer />} />
        <Route path="/lesson/:chapterId" element={<LessonViewer />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/mentor"
          element={
            <MentorRoute>
              <MentorDashboard />
            </MentorRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <div className="p-8 text-sm text-slate-500 dark:text-gray-400">
              Analytics view coming soon. For now, explore the Overview and Study Room experiences.
            </div>
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <CourseProvider>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<Landing />} />

            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Authenticated non-dashboard flows */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mentor"
              element={
                <ProtectedRoute>
                  <MentorRoute>
                    <MentorDashboard />
                  </MentorRoute>
                </ProtectedRoute>
              }
            />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardApp />
                </ProtectedRoute>
              }
            />

            <Route
              path="/overview"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </CourseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
