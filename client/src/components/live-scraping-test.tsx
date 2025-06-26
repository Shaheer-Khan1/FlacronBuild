import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Globe, Clock, AlertTriangle, RefreshCw } from "lucide-react";

export default function LiveScrapingTest() {
  const [testLocation, setTestLocation] = useState("San Francisco, CA");
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const verifyDataMutation = useMutation({
    mutationFn: async (location: string) => {
      const response = await apiRequest("GET", `/api/verify-data-sources/${encodeURIComponent(location)}`);
      return response.json();
    },
    onSuccess: (data) => {
      setVerificationResult(data);
    },
    onError: (error) => {
      console.error("Verification failed:", error);
    }
  });

  const handleVerifyData = () => {
    verifyDataMutation.mutate(testLocation);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Live Data Source Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter location to test (e.g., San Francisco, CA)"
              value={testLocation}
              onChange={(e) => setTestLocation(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleVerifyData}
              disabled={verifyDataMutation.isPending}
            >
              {verifyDataMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              Test Real Scraping
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This test will attempt to scrape live construction cost data from public sources.
              You'll see exactly which sources are accessible and whether we're using real data or fallback estimates.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {verificationResult && (
        <>
          {/* Main Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Verification Results for {verificationResult.location}</span>
                <Badge 
                  variant={verificationResult.verification.isUsingRealData ? "default" : "destructive"}
                  className="text-sm"
                >
                  {verificationResult.verification.isUsingRealData ? "REAL DATA FOUND" : "FALLBACK DATA"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-neutral-800">
                    {verificationResult.verification.sourcesAttempted}
                  </div>
                  <div className="text-sm text-neutral-600">Sources Tested</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {verificationResult.verification.successfulSources}
                  </div>
                  <div className="text-sm text-neutral-600">Successful Connections</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-xs text-neutral-600">Tested at</div>
                  <div className="text-sm font-medium">
                    {formatTimestamp(verificationResult.timestamp)}
                  </div>
                </div>
              </div>

              {verificationResult.verification.fallbackReason && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Using Fallback Data:</strong> {verificationResult.verification.fallbackReason}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Evidence List */}
          <Card>
            <CardHeader>
              <CardTitle>Real-time Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {verificationResult.verification.evidence.map((evidence: string, index: number) => (
                  <div key={index} className="flex items-center text-sm">
                    {evidence.startsWith('✓') ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
                    )}
                    <span className={evidence.startsWith('✓') ? 'text-green-700' : 'text-red-700'}>
                      {evidence.substring(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Scraping Attempts */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Network Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {verificationResult.scrapingAttempts.map((attempt: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {attempt.success && attempt.dataFound ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        ) : attempt.success ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mr-2" />
                        )}
                        <span className="font-medium text-sm">{attempt.url}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {attempt.status && (
                          <Badge variant="outline" className="text-xs">
                            HTTP {attempt.status}
                          </Badge>
                        )}
                        <Badge 
                          variant={attempt.success && attempt.dataFound ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {attempt.success && attempt.dataFound ? "Data Found" : 
                           attempt.success ? "Connected" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-xs text-neutral-600 space-y-1">
                      <div>Attempted at: {formatTimestamp(attempt.timestamp)}</div>
                      {attempt.error && (
                        <div className="text-red-600">Error: {attempt.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm font-medium text-neutral-800 mb-2">
                  {verificationResult.summary}
                </p>
                <p className="text-xs text-neutral-600">
                  This test proves whether FlacronBuild is using authentic construction cost data
                  scraped from real industry sources or falling back to regional estimates.
                  All network requests and data parsing attempts are logged and verified in real-time.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}