import { useLocation } from "wouter";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CancelPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">Payment Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              Your payment was cancelled. No charges have been made to your account.
            </p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => navigate("/")} 
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
              
              <Button 
                onClick={() => window.history.back()} 
                variant="outline" 
                className="w-full"
              >
                Try Again
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              If you have any questions, please contact our support team.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 