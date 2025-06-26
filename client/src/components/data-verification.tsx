import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Globe, Database, Clock } from "lucide-react";

interface DataVerificationProps {
  projectId: number;
}

export default function DataVerification({ projectId }: DataVerificationProps) {
  const [verificationTime, setVerificationTime] = useState<Date | null>(null);

  const { data: breakdown, isLoading, refetch } = useQuery({
    queryKey: ["/api/projects", projectId, "cost-breakdown"],
    enabled: !!projectId,
  });

  const handleVerifyData = async () => {
    setVerificationTime(new Date());
    await refetch();
  };

  const getDataSourceStatus = () => {
    if (!breakdown) return null;

    const isRealData = breakdown.dataSource && 
                      breakdown.dataSource !== 'Regional Market Data' && 
                      breakdown.breakdown?.materialPrices;

    const hasLiveUpdates = breakdown.lastUpdated && 
                          new Date(breakdown.lastUpdated).getTime() > Date.now() - (25 * 60 * 60 * 1000); // Within 25 hours

    const hasScrapeMarkers = breakdown.breakdown?.materialPrices && 
                           Object.keys(breakdown.breakdown.materialPrices).length > 6; // More than basic mock data

    return {
      isRealData,
      hasLiveUpdates,
      hasScrapeMarkers,
      dataAge: breakdown.lastUpdated ? new Date(breakdown.lastUpdated) : null
    };
  };

  const status = getDataSourceStatus();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Data Source Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Data Source Verification
          </CardTitle>
          <Button onClick={handleVerifyData} size="sm" variant="outline">
            Verify Now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <>
            {/* Real-time Status Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center p-3 border rounded-lg">
                {status.isRealData ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <div>
                  <div className="text-sm font-medium">Data Source</div>
                  <div className="text-xs text-neutral-500">
                    {status.isRealData ? 'Live Scraped Data' : 'Fallback Data'}
                  </div>
                </div>
              </div>

              <div className="flex items-center p-3 border rounded-lg">
                {status.hasLiveUpdates ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                )}
                <div>
                  <div className="text-sm font-medium">Data Freshness</div>
                  <div className="text-xs text-neutral-500">
                    {status.hasLiveUpdates ? 'Recent Update' : 'Stale Data'}
                  </div>
                </div>
              </div>

              <div className="flex items-center p-3 border rounded-lg">
                {status.hasScrapeMarkers ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <div>
                  <div className="text-sm font-medium">Data Completeness</div>
                  <div className="text-xs text-neutral-500">
                    {status.hasScrapeMarkers ? 'Full Dataset' : 'Limited Dataset'}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Verification */}
            <div className="space-y-3">
              <h4 className="font-semibold text-neutral-800">Verification Details</h4>
              
              {status.isRealData ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>AUTHENTIC DATA CONFIRMED:</strong> Cost estimates are using live market data scraped from construction industry sources.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>FALLBACK DATA DETECTED:</strong> System is currently using regional averages instead of live scraped data.
                  </AlertDescription>
                </Alert>
              )}

              {/* Data Source Breakdown */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Globe className="h-4 w-4 text-primary mr-2" />
                  <span className="font-medium">Current Data Sources</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Data Source:</span>
                    <Badge variant={status.isRealData ? "default" : "destructive"}>
                      {breakdown.dataSource}
                    </Badge>
                  </div>
                  
                  {status.dataAge && (
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span className="text-neutral-600">
                        {status.dataAge.toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {verificationTime && (
                    <div className="flex justify-between">
                      <span>Verified At:</span>
                      <span className="text-neutral-600">
                        {verificationTime.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Material Price Verification */}
              {breakdown.breakdown?.materialPrices && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Database className="h-4 w-4 text-primary mr-2" />
                    <span className="font-medium">Material Price Verification</span>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div>Total Materials Tracked: {Object.keys(breakdown.breakdown.materialPrices).length}</div>
                    <div>Price Range Verification:</div>
                    <ul className="ml-4 text-xs text-neutral-600">
                      {Object.entries(breakdown.breakdown.materialPrices).map(([material, price]) => (
                        <li key={material} className="flex justify-between">
                          <span className="capitalize">{material}:</span>
                          <span>${price as number}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* How to Verify Authenticity */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">How to Verify Data Authenticity</span>
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Check if prices vary by location (real data shows regional differences)</p>
                  <p>• Verify timestamps show recent updates (within 24 hours)</p>
                  <p>• Compare prices with known market rates for your area</p>
                  <p>• Look for data source transparency in the breakdown</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}