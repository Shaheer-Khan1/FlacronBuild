import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import ComparePage from "@/pages/compare";
import UserDashboardPage from "@/pages/userdashboard";
import EstimateDetailPage from "@/pages/estimate-detail";
import CompareSlogPage from "@/pages/compare-slog";
import EstimateEditPage from "@/pages/estimate-edit";
import UserSettingsPage from "@/pages/user-settings";
import AdminPage from "@/pages/admin";
import ReportDetailPage from "@/pages/report/[id]";
import SuccessPage from "@/pages/success";
import CancelPage from "@/pages/cancel";
import SupportPage from "@/pages/support";
import Chatbot from "./components/chatbot";
import { userRoleManager, type UserRole } from "./lib/user-role";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/compare/slog" component={CompareSlogPage} />
      <Route path="/my-estimates" component={UserDashboardPage} />
      <Route path="/user-settings" component={UserSettingsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/estimate/:id" component={EstimateDetailPage} />
      <Route path="/estimate/:id/edit" component={EstimateEditPage} />
      <Route path="/report/:id" component={ReportDetailPage} />
      <Route path="/success" component={SuccessPage} />
      <Route path="/cancel" component={CancelPage} />
      <Route path="/support" component={SupportPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Footer() {
  return (
    <footer style={{
      width: '100%',
      background: '#f3f4f6',
      color: '#374151',
      textAlign: 'center',
      padding: '1rem 0',
      borderTop: '1px solid #e5e7eb',
      // position: 'fixed',
      // left: 0,
      // bottom: 0,
      // zIndex: 100,
    }}>
      <div>
        &copy; {new Date().getFullYear()} FlacronBuild &mdash; AI-powered construction cost estimation
      </div>
    </footer>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="pb-20">
          <Toaster />
          <Router />
          <Chatbot />
        </div>
        <Footer />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
