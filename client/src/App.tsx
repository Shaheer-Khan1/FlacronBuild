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
import { userRoleManager } from "./lib/user-role";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import Header from "@/components/header";
import LoginDialog from "@/components/login-dialog";
import IntroDesign from "./components/intro-desgin";

// ✅ Cookie Consent
function CookieConsent() {
  useEffect(() => {
    if (!localStorage.getItem("cookieConsent")) {
      window.alert(
        "This site uses cookies to enhance your experience. By continuing, you agree to our use of cookies."
      );
      localStorage.setItem("cookieConsent", "true");
    }
  }, []);
  return null;
}

// ✅ Router
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

// ✅ Responsive + Clean Footer
function Footer() {
  return (
    <footer className="relative w-full bg-gradient-to-b from-[#171D25] via-gray-950 to-black text-gray-400 border-t border-gray-800 py-14 overflow-hidden">
      {/* Subtle animated orb for premium touch */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-orange-500/10 via-transparent to-transparent blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-6">
        {/* Brand Name */}
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          <span className="text-white">FLACRON</span>{" "}
          <span className="text-orange-500">BUILD</span>
        </h2>

        {/* Tagline */}
        <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
          AI-powered construction cost estimation — built for precision, trust, and performance.
        </p>

        {/* Partner Mentions */}
        <div className="flex flex-wrap justify-center items-center gap-6 pt-4 text-xs md:text-sm text-gray-500">
          <span>
            <span className="text-white font-semibold">Powered by</span> IBM
          </span>
          <span className="text-gray-700">•</span>
          <span>
            <span className="text-white font-semibold">Distributed by</span> Microsoft
          </span>
          <span className="text-gray-700">•</span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent w-2/3 mx-auto my-6"></div>

        {/* Copyright */}
        <p className="text-xs md:text-sm text-gray-500">
          © {new Date().getFullYear()}{" "}
          <span className="text-white font-semibold">FLACRON BUILD</span>. All rights reserved.
        </p>
      </div>

      {/* Custom Animations */}
      <style>
        {`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          .animate-pulse-slow {
            animation: pulse-slow 8s ease-in-out infinite;
          }
        `}
      </style>
    </footer>
  );
}

// ✅ Landing Page
function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <IntroDesign onGetStarted={onGetStarted} />
      <Footer />
      <Chatbot />
    </div>
  );
}

// ✅ Main App
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);

      if (firebaseUser) {
        const isSuccessPage =
          window.location.pathname === "/success" ||
          new URLSearchParams(window.location.search).get("session_id");

        if (isSuccessPage) {
          setShowLogin(false);
          return;
        }

        const role = await userRoleManager.getUserRole();
        const isNewUser =
          firebaseUser.metadata.creationTime ===
          firebaseUser.metadata.lastSignInTime;

        if (!role && isNewUser) {
          setShowLogin(true);
        } else {
          setShowLogin(false);
        }
      }
    });

    const unsubscribeRole = userRoleManager.onRoleChange((role) => {
      if (role) {
        setShowLogin(false);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeRole();
    };
  }, []);

  if (!authChecked) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <>
        <LandingPage onGetStarted={() => setShowLogin(true)} />
        <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
      </>
    );
  }

  if (showLogin) {
    return (
      <>
        <LandingPage onGetStarted={() => setShowLogin(true)} />
        <LoginDialog
          open={showLogin}
          onOpenChange={(open) => {
            if (!open) {
              const auth = getAuth();
              auth.signOut();
            }
            setShowLogin(open);
          }}
        />
      </>
    );
  }

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
