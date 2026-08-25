import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { PublicAnnouncementPage, PublicAttendancePage, PublicQuestionPage, PublicReportPage, PublicResourcePage, PublicSubjectPage, PublicSubjectQuestionsPage } from "@/pages/PublicPages";
import { SecretaryDashboard, SecretarySettingsPage } from "@/pages/SecretaryPages";
import SubjectsPage from "@/pages/SubjectsPage";
import AttendancePage from "@/pages/AttendancePage";
import ContentPage from "@/pages/ContentPage";
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
      <Route path="/app/attendance/:sessionId" component={AttendancePage} />
      <Route path="/app/content/:subjectId/:kind" component={ContentPage} />
      <Route path="/app/reports" component={ReportsPage} />
      <Route path="/app/archive" component={ArchivePage} />
      <Route path="/app/settings" component={SecretarySettingsPage} />
      <Route path="/s/:publicId/questions" component={PublicSubjectQuestionsPage} />
      <Route path="/s/:publicId" component={PublicSubjectPage} />
      <Route path="/a/:publicId" component={PublicAnnouncementPage} />
      <Route path="/r/:publicId" component={PublicResourcePage} />
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
