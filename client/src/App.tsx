import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { PublicAnnouncementPage, PublicQuestionPage, PublicResourcePage, PublicSubjectPage, PublicUnavailable } from "@/pages/PublicPages";
import { SecretaryDashboard, SecretaryPlaceholder } from "@/pages/SecretaryPages";
import SubjectsPage from "@/pages/SubjectsPage";
import AttendancePage from "@/pages/AttendancePage";
import ContentPage from "@/pages/ContentPage";
import ReportsPage from "@/pages/ReportsPage";
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
      <Route path="/app/settings">{() => <SecretaryPlaceholder page="settings" />}</Route>
      <Route path="/s/:publicId" component={PublicSubjectPage} />
      <Route path="/a/:publicId" component={PublicAnnouncementPage} />
      <Route path="/r/:publicId" component={PublicResourcePage} />
      <Route path="/q/:publicId" component={PublicQuestionPage} />
      <Route path="/attendance/:publicId" component={PublicUnavailable} />
      <Route path="/reports/:publicId" component={PublicUnavailable} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
