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
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import Header from "@/components/header";
import LoginDialog from "@/components/login-dialog";

// CookieConsent component
function CookieConsent() {
  useEffect(() => {
    if (!localStorage.getItem('cookieConsent')) {
      window.alert('This site uses cookies to enhance your experience. By continuing, you agree to our use of cookies.');
      localStorage.setItem('cookieConsent', 'true');
    }
  }, []);
  return null;
}

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
    }}>
      <div>
        &copy; {new Date().getFullYear()} FlacronBuild &mdash; AI-powered construction cost estimation
      </div>
    </footer>
  );
}

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-xl w-full text-center py-16">
          <h1 className="text-4xl font-extrabold mb-4">
            FLACRON <span className="text-orange-500">BUILD</span>
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            AI-powered roofing cost estimation with professional reports for homeowners, contractors, inspectors, and insurance adjusters. Get accurate, data-driven estimates for roof repairs, replacements, and maintenance.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Real roofing cost estimates based on current market data and material prices. Actual costs can vary based on location, material availability, and contractor rates. Most accurate for properties in the United States.
          </p>
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow transition"
            onClick={onGetStarted}
          >
            Get Started
          </button>
        </div>
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);
      
      // Check if this is a new user who needs role selection
      if (firebaseUser) {
        const isNewUser = firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime;
        const hasRole = userRoleManager.getUserRole();
        
        console.log('=== APP AUTH STATE CHANGE ===');
        console.log('User:', firebaseUser.email);
        console.log('Is new user:', isNewUser);
        console.log('Has role:', hasRole);
        
        // If user is new and doesn't have a role, they need to complete setup
        if (isNewUser && !hasRole) {
          console.log('New user needs role selection - keeping login dialog open');
          setNeedsRoleSelection(true);
          setShowLogin(true);
        } else {
          setNeedsRoleSelection(false);
          setShowLogin(false);
        }
      } else {
        setNeedsRoleSelection(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!authChecked) {
    return <div>Loading...</div>;
  }

  // If user exists but needs role selection, show login dialog
  if (user && needsRoleSelection) {
    return (
      <>
        <LandingPage onGetStarted={() => setShowLogin(true)} />
        <LoginDialog 
          open={showLogin} 
          onOpenChange={(open) => {
            setShowLogin(open);
            // If dialog is closed but user still needs role selection, sign them out
            if (!open && needsRoleSelection) {
              console.log('User closed dialog without selecting role - signing out');
              const auth = getAuth();
              auth.signOut();
            }
          }} 
        />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage onGetStarted={() => setShowLogin(true)} />
        <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
      </>
    );
  }

  // Existing app content for logged-in users with complete profiles
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="pb-20">
          <Toaster />
          <Router />
          <Chatbot />
          <CookieConsent />
        </div>
        <Footer />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
