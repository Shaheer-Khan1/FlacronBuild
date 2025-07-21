import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { userRoleManager } from "@/lib/user-role";

export default function SuccessPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Get session_id from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session_id');
    setSessionId(sessionIdParam);

    // Fetch session details from Stripe to get the user's role
    if (sessionIdParam) {
      fetch(`/api/stripe-session/${sessionIdParam}`)
        .then(response => response.json())
        .then(data => {
          if (data.role) {
            console.log('Setting user role:', data.role);
            userRoleManager.setUserRole(data.role);
          } else {
            console.error('No role found in session data:', data);
          }
        })
        .catch(error => {
          console.error('Error fetching session details:', error);
        });
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              Thank you for your subscription! Your payment has been processed successfully.
            </p>
            
            {sessionId && (
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-sm text-gray-600 break-all">
                  <strong>Session ID:</strong> {sessionId}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Button 
                onClick={() => navigate("/")} 
                className="w-full"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                onClick={() => navigate("/my-estimates")} 
                variant="outline" 
                className="w-full"
              >
                View My Estimates
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              You will receive a confirmation email shortly with your subscription details.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 