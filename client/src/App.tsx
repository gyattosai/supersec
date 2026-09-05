import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { PublicAnnouncementPage, PublicAttendancePage, PublicQuestionPage, PublicReportPage, PublicSubjectPage, PublicSubjectQuestionsPage } from "@/pages/PublicPages";
import { PremiumPublicSubjectHome } from "@/pages/PremiumPublicSubjectHome";
import { PremiumPublicResourcePage } from "@/pages/PremiumPublicResourcePage";
import { AttendanceProofPage } from "@/pages/AttendanceProofPage";
import { ExcuseSubmissionPage } from "@/pages/ExcuseSubmissionPage";
import { lazy, Suspense } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Lazy-load secretary admin pages to accelerate initial public page loads
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const SecretaryDashboard = lazy(() => import("@/pages/SecretaryPages").then(m => ({ default: m.SecretaryDashboard })));
const SecretarySettingsPage = lazy(() => import("@/pages/SecretaryPages").then(m => ({ default: m.SecretarySettingsPage })));
const SubjectsPage = lazy(() => import("@/pages/SubjectsPage"));
const SubjectCreatePage = lazy(() => import("@/pages/SubjectPages").then(m => ({ default: m.SubjectCreatePage })));
const SubjectDetailsPage = lazy(() => import("@/pages/SubjectPages").then(m => ({ default: m.SubjectDetailsPage })));
const SubjectSharingPage = lazy(() => import("@/pages/SubjectPages").then(m => ({ default: m.SubjectSharingPage })));
const IndependentSubjectWorkspacePage = lazy(() => import("@/pages/IndependentSubjectWorkspacePage"));
const LegacyContentRedirect = lazy(() => import("@/pages/IndependentSubjectWorkspacePage").then(m => ({ default: m.LegacyContentRedirect })));
const FocusedStudentsPage = lazy(() => import("@/pages/FocusedStudentsPage").then(m => ({ default: m.FocusedStudentsPage })));
const FocusedAttendancePage = lazy(() => import("@/pages/FocusedSchedulePage").then(m => ({ default: m.FocusedAttendancePage })));
const LegacyScheduleRedirect = lazy(() => import("@/pages/FocusedSchedulePage").then(m => ({ default: m.LegacyScheduleRedirect })));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const FocusedContentPage = lazy(() => import("@/pages/FocusedContentPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const ArchivePage = lazy(() => import("@/pages/ArchivePage"));
const MessageTemplatesPage = lazy(() => import("@/pages/MessageTemplatesPage"));
const NotesPage = lazy(() => import("@/pages/NotesPage"));

function LoadingFallback() {
  return <div className="grid min-h-screen place-items-center text-sm font-semibold text-muted-foreground">Loading…</div>;
}

function Router() {
  const [location] = useLocation();

  if (location.length > 1 && location.endsWith("/")) {
    return <Redirect to={location.replace(/\/+$/, "")} replace />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login">{() => <AuthPage initialMode="login" />}</Route>
        <Route path="/register">{() => <AuthPage initialMode="register" />}</Route>
        <Route path="/auth">{() => <AuthPage initialMode="login" />}</Route>
        <Route path="/app" component={SecretaryDashboard} />
        <Route path="/app/subjects" component={SubjectsPage} />
        <Route path="/app/subjects/new" component={SubjectCreatePage} />
        <Route path="/app/subjects/:subjectId/details" component={SubjectDetailsPage} />
        <Route path="/app/subjects/:subjectId/students" component={FocusedStudentsPage} />
        <Route path="/app/subjects/:subjectId/attendance" component={FocusedAttendancePage} />
        <Route path="/app/subjects/:subjectId/schedule" component={LegacyScheduleRedirect} />
        <Route path="/app/subjects/:subjectId/sharing" component={SubjectSharingPage} />
        <Route path="/app/subjects/:subjectId/:kind/edit/:itemId" component={FocusedContentPage} />
        <Route path="/app/subjects/:subjectId/:kind/new" component={FocusedContentPage} />
        <Route path="/app/subjects/:subjectId/:kind" component={FocusedContentPage} />
        <Route path="/app/subjects/:subjectId" component={IndependentSubjectWorkspacePage} />
        <Route path="/app/attendance">{() => <Redirect to="/app/subjects" />}</Route>
        <Route path="/app/attendance/:sessionId" component={AttendancePage} />
        <Route path="/app/content/:subjectId/:kind" component={LegacyContentRedirect} />
        <Route path="/app/templates" component={MessageTemplatesPage} />
        <Route path="/app/notes" component={NotesPage} />
        <Route path="/app/reports" component={ReportsPage} />
        <Route path="/app/archive" component={ArchivePage} />
        <Route path="/app/settings" component={SecretarySettingsPage} />
        <Route path="/s/:publicId/questions" component={PublicSubjectQuestionsPage} />
        <Route path="/s/:publicId" component={PremiumPublicSubjectHome} />
        <Route path="/a/:publicId" component={PublicAnnouncementPage} />
        <Route path="/r/:publicId" component={PremiumPublicResourcePage} />
        <Route path="/q/:publicId" component={PublicQuestionPage} />
        <Route path="/attendance/:publicId/proof" component={AttendanceProofPage} />
        <Route path="/attendance/:publicId/excuse" component={ExcuseSubmissionPage} />
        <Route path="/attendance/:publicId" component={PublicAttendancePage} />
        <Route path="/reports/:publicId" component={PublicReportPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
