import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { PublicAnnouncementPage, PublicAttendancePage, PublicQuestionPage, PublicReportPage, PublicSubjectPage, PublicSubjectQuestionsPage } from "@/pages/PublicPages";
import { PremiumPublicSubjectHome } from "@/pages/PremiumPublicSubjectHome";
import { PremiumPublicResourcePage } from "@/pages/PremiumPublicResourcePage";
import { SecretaryDashboard, SecretarySettingsPage } from "@/pages/SecretaryPages";
import SubjectsPage from "@/pages/SubjectsPage";
import { SubjectCreatePage, SubjectDetailsPage, SubjectSharingPage } from "@/pages/SubjectPages";
import IndependentSubjectWorkspacePage, { LegacyContentRedirect } from "@/pages/IndependentSubjectWorkspacePage";
import { FocusedStudentsPage } from "@/pages/FocusedStudentsPage";
import { FocusedAttendancePage, LegacyScheduleRedirect } from "@/pages/FocusedSchedulePage";
import AttendancePage from "@/pages/AttendancePage";
import FocusedContentPage from "@/pages/FocusedContentPage";
import ReportsPage from "@/pages/ReportsPage";
import ArchivePage from "@/pages/ArchivePage";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
      <Route path="/app/attendance/:sessionId" component={AttendancePage} />
      <Route path="/app/content/:subjectId/:kind" component={LegacyContentRedirect} />
      <Route path="/app/reports" component={ReportsPage} />
      <Route path="/app/archive" component={ArchivePage} />
      <Route path="/app/settings" component={SecretarySettingsPage} />
      <Route path="/s/:publicId/questions" component={PublicSubjectQuestionsPage} />
      <Route path="/s/:publicId" component={PremiumPublicSubjectHome} />
      <Route path="/a/:publicId" component={PublicAnnouncementPage} />
      <Route path="/r/:publicId" component={PremiumPublicResourcePage} />
      <Route path="/q/:publicId" component={PublicQuestionPage} />
      <Route path="/attendance/:publicId" component={PublicAttendancePage} />
      <Route path="/reports/:publicId" component={PublicReportPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
