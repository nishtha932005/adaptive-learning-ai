
import { Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import StudyRoom from "./pages/StudyRoom";
import LessonViewer from "./pages/LessonViewer";
import MentorDashboard from "./pages/mentor/MentorDashboard";
import { useAuth } from "./context/AuthContext";

export default function AppRoutes() {
    const { user } = useAuth(); // Assuming role is available in user object or fetched

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/study" element={<StudyRoom />} />
            <Route path="/lesson/:chapterId" element={<LessonViewer />} />

            {/* Mentor Routes */}
            <Route path="/mentor/dashboard" element={<MentorDashboard />} />
        </Routes>
    );
}
