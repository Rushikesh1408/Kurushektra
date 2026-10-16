import { MotionConfig } from "framer-motion";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SiteHeader } from "./components/layout/SiteHeader";
import { ToastProvider } from "./components/Toast";
import { AuthProvider } from "./lib/auth";
import AuthForm from "./pages/AuthForm";
import ChallengeDetail from "./pages/ChallengeDetail";
import Challenges from "./pages/Challenges";
import DesignSystem from "./pages/DesignSystem";
import Landing from "./pages/Landing";
import NewChallenge from "./pages/NewChallenge";
import TeacherDashboard from "./pages/TeacherDashboard";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <SiteHeader />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/design-system" element={<DesignSystem />} />
              <Route path="/login" element={<AuthForm mode="login" />} />
              <Route path="/register" element={<AuthForm mode="register" />} />
              <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
              <Route path="/challenges/new" element={<ProtectedRoute roles={["teacher", "admin"]}><NewChallenge /></ProtectedRoute>} />
              <Route path="/challenges/:slug" element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>} />
              <Route path="/teacher" element={<ProtectedRoute roles={["teacher", "admin"]}><TeacherDashboard /></ProtectedRoute>} />
              <Route path="*" element={<main className="p-12 text-center text-muted">Page not found.</main>} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
