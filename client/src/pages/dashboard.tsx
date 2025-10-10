import { useState, useEffect } from "react";
import Header from "@/components/header";
import EstimationForm from "@/components/estimation-form";
import {
  HardHat,
  ClipboardCheck,
  Shield,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import FlacronBuildLogo from "../FlacronBuildLogo.webp";
import { userRoleManager, type UserRole } from "@/lib/user-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Chatbot from "@/components/chatbot";

const normalizeRole = (role: string): UserRole => {
  if (["inspector", "insurance-adjuster", "contractor", "homeowner"].includes(role))
    return role as UserRole;
  return "homeowner";
};

export default function Dashboard() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [currentFormField, setCurrentFormField] = useState<string | undefined>();

  useEffect(() => {
    // Load role and subscription state
    const init = async () => {
      const role =
        userRoleManager.getEffectiveRoleSync?.() ||
        userRoleManager.getUserRoleSync();
      if (role) setUserRole(role);

      const subscribed = await userRoleManager.isSubscribed();
      setIsSubscribed(subscribed);
    };

    init();

    // Listen for role changes
    const unsubscribe = userRoleManager.onRoleChange((newRole) => {
      if (newRole) setUserRole(newRole);
    });

    return unsubscribe;
  }, []);

  const handleFieldFocus = (fieldName: string) => {
    setCurrentFormField(fieldName);
  };

  const handleEstimateGenerated = (estimate: any) => {
    console.log("Estimate generated:", estimate);
  };

  const handleReportSaved = () => {
    console.log("Report saved");
  };

  // 🔒 Subscription Lock
  if (isSubscribed === false) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center p-8">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-700">
                Dashboard Locked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                You don’t have an active subscription. Please subscribe to unlock
                your professional dashboard and estimation tools.
              </p>
           
           
           
           
<Button
  onClick={async () => {
    try {
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      const role = (await userRoleManager.getUserRole()) || "homeowner";
      const billingPeriod = "monthly";

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          billingPeriod,
          customerEmail: user.email,
          customerName: user.displayName || "FlacronBuild User",
        }),
      });

      if (!response.ok) throw new Error("Failed to create Stripe session");

      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Stripe redirect error:", err);
      alert("Unable to start subscription. Please try again.");
    }
  }}
  className="w-full"
>
  Subscribe Now
  <ArrowRight className="ml-2 h-4 w-4" />
</Button>

           
           
           
           
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const renderRoleBasedDashboard = () => {
    if (!userRole) {
      return (
        <div className="max-w-xl w-full mx-auto">
          <Card className="text-center p-8">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-700">
                Loading your dashboard...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Please wait while we load your role and preferences.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const roleDisplayName = userRoleManager.getRoleDisplayName(userRole);
    const roleDescription = userRoleManager.getRoleDescription(userRole);
    const roleFeatures = userRoleManager.getRoleFeatures(userRole);

    return (
      <div className="space-y-8">
        {/* Role Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {roleDisplayName.split(" ").slice(1).join(" ")} Dashboard
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {roleDescription}
          </p>
        </div>

        {/* Role Features */}
        <div className="max-w-xl w-full mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                Your Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 text-left"
                  >
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estimation Form */}
        <div className="max-w-xl w-full mx-auto">
          <EstimationForm
            userRole={normalizeRole(userRole)}
            onEstimateGenerated={handleEstimateGenerated}
            onReportSaved={handleReportSaved}
            hasEstimate={false}
            disableRoleSelection={true}
            onFieldFocus={handleFieldFocus}
          />
        </div>

        {/* Quick Actions */}
        <div className="max-w-xl w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRole === "contractor" && (
              <>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <HardHat className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Detailed Estimate</h3>
                    <p className="text-sm text-gray-600">
                      Create professional bids
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <ArrowRight className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Bid Reports</h3>
                    <p className="text-sm text-gray-600">
                      Generate bid-ready reports
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {userRole === "inspector" && (
              <>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <ClipboardCheck className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Inspection Report</h3>
                    <p className="text-sm text-gray-600">
                      Create detailed inspections
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Certification</h3>
                    <p className="text-sm text-gray-600">
                      Generate certified reports
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {userRole === "insurance-adjuster" && (
              <>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Claim Analysis</h3>
                    <p className="text-sm text-gray-600">
                      Analyze insurance claims
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Coverage Review</h3>
                    <p className="text-sm text-gray-600">
                      Review policy coverage
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main return
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  
      
            <div className="mb-4 flex flex-col items-center justify-center">
              <div className="flex items-center mb-2">
                <div
                  style={{
                    height: 90,
                    width: 300,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={FlacronBuildLogo}
                    alt="FlacronBuild Logo"
                    style={{
                      height: 220,
                      width: "auto",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                  />
                </div>
              </div>
              {!userRole && (
                <div className="text-neutral-600 text-base text-center max-w-2xl">
                  AI-powered roofing cost estimation with professional reports for
                  homeowners, contractors, inspectors, and insurance adjusters. Get
                  accurate, data-driven estimates for roof repairs, replacements, and
                  maintenance.
                </div>
              )}
            </div>

            {!userRole && (
              <div className="mb-8 text-center text-base text-neutral-600 bg-neutral-100 rounded-lg py-3 px-4">
                <strong>Note:</strong> This tool provides professional roofing cost
                estimates based on current market data and material prices. Actual
                costs can vary ±15% depending on local conditions, material
                availability, and contractor rates.
              </div>
            )}

        {isSubscribed && renderRoleBasedDashboard()}

        <div className="mt-12 space-y-8"></div>

        <Chatbot
          onRoleSelect={async (role) => {
            try {
              await userRoleManager.setUserRole(role);
              window.location.reload();
            } catch (e: any) {
              window.alert(e.message || "Unable to change role");
            }
          }}
          onNavigateToPricing={() => {
            window.location.href = "/?show=pricing";
          }}
          onNavigateToSupport={() => {
            window.location.href = "/support";
          }}
          isFirstTimeUser={!localStorage.getItem("flacronbuild-onboarding-seen")}
          currentFormField={currentFormField}
        />
      </div>
    </div>
  );
}
