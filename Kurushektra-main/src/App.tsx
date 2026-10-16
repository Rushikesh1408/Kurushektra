import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import LearnerLayout from './layouts/LearnerLayout';
import TeacherLayout from './layouts/TeacherLayout';
import AdminLayout from './layouts/AdminLayout';

// Public & Auth Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import OnboardingPage from './pages/auth/OnboardingPage';

// Learner Pages
import DashboardPage from './pages/learner/DashboardPage';
import ChallengesPage from './pages/learner/ChallengesPage';
import ChallengeDetailPage from './pages/learner/ChallengeDetailPage';
import CodingWorkspacePage from './pages/learner/CodingWorkspacePage';
import SubmissionResultsPage from './pages/learner/SubmissionResultsPage';
import UnderstandingAssessmentPage from './pages/learner/UnderstandingAssessmentPage';
import LearningGapPage from './pages/learner/LearningGapPage';
import PracticeActivityPage from './pages/learner/PracticeActivityPage';
import MasteryPathPage from './pages/learner/MasteryPathPage';
import SubmissionHistoryPage from './pages/learner/SubmissionHistoryPage';
import LearnerReportPage from './pages/learner/LearnerReportPage';
import SettingsPage from './pages/learner/SettingsPage';

// Teacher Pages
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import LearnerReviewPage from './pages/teacher/LearnerReviewPage';
import AssessmentManagementPage from './pages/teacher/AssessmentManagementPage';

// Admin Pages
import UserManagementPage from './pages/admin/UserManagementPage';
import PlatformConfigPage from './pages/admin/PlatformConfigPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public & Authentication Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>

          {/* Authenticated Learner Routes */}
          <Route element={<LearnerLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
            <Route path="/workspace/:challengeId" element={<CodingWorkspacePage />} />
            <Route path="/submissions/:id" element={<SubmissionResultsPage />} />
            <Route path="/assessment/:submissionId" element={<UnderstandingAssessmentPage />} />
            <Route path="/learn/gap/:id" element={<LearningGapPage />} />
            <Route path="/practice/:activityId" element={<PracticeActivityPage />} />
            <Route path="/mastery" element={<MasteryPathPage />} />
            <Route path="/history" element={<SubmissionHistoryPage />} />
            <Route path="/reports/me" element={<LearnerReportPage />} />
            <Route path="/reports" element={<Navigate to="/reports/me" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Teacher Routes */}
          <Route element={<TeacherLayout />}>
            <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
            <Route path="/teacher/learners/:id" element={<LearnerReviewPage />} />
            <Route path="/teacher/learners" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/teacher/assessments" element={<AssessmentManagementPage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/settings" element={<PlatformConfigPage />} />
          </Route>

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
