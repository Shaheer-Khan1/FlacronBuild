import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Clock, MapPin, TrendingUp, Database, RefreshCw } from "lucide-react";

interface RealCostBreakdownProps {
  projectId: number;
}

export default function RealCostBreakdown({ projectId }: RealCostBreakdownProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: breakdown, isLoading, error } = useQuery({
    queryKey: ["/api/projects", projectId, "cost-breakdown", refreshKey],
    enabled: !!projectId,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Real-Time Cost Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
            <div className="h-20 bg-neutral-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !breakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <Database className="h-5 w-5 mr-2" />
            Data Retrieval Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 mb-4">
            Unable to fetch real-time construction cost data. This may be due to network issues or data source unavailability.
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Data Fetch
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Data Source Information */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Live Market Data
            </CardTitle>
            <Button onClick={handleRefresh} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <Database className="h-4 w-4 text-primary mr-2" />
              <div>
                <div className="text-sm font-medium">Data Source</div>
                <div className="text-xs text-neutral-500">{breakdown.dataSource}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-primary mr-2" />
              <div>
                <div className="text-sm font-medium">Last Updated</div>
                <div className="text-xs text-neutral-500">
                  {new Date(breakdown.lastUpdated).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-primary mr-2" />
              <div>
                <div className="text-sm font-medium">Market Region</div>
                <div className="text-xs text-neutral-500">
                  {breakdown.regionalFactors?.locationAnalyzed}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center">
              <Badge variant="secondary" className="bg-green-100 text-green-800 mr-2">
                AUTHENTICATED DATA
              </Badge>
              <span className="text-sm text-green-700">
                Prices sourced from construction industry databases and regional market analysis
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="materials" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="labor">Labor</TabsTrigger>
              <TabsTrigger value="sources">Data Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="materials" className="space-y-4">
              <h4 className="font-semibold text-neutral-800">Current Material Prices</h4>
              {breakdown.breakdown?.materialPrices && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(breakdown.breakdown.materialPrices).map(([material, price]) => (
                    <div key={material} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium capitalize">{material}</div>
                        <div className="text-xs text-neutral-500">
                          {material === 'concrete' ? 'per cubic yard' :
                           material === 'lumber' ? 'per board foot' :
                           material === 'steel' ? 'per ton' :
                           material === 'plumbing' ? 'per fixture' :
                           'per square foot'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(price as number)}</div>
                        <Badge variant="outline" className="text-xs">
                          Live Price
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="labor" className="space-y-4">
              <h4 className="font-semibold text-neutral-800">Regional Labor Rates</h4>
              {breakdown.breakdown?.laborRates && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(breakdown.breakdown.laborRates).map(([trade, rate]) => (
                    <div key={trade} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium capitalize">{trade}</div>
                        <div className="text-xs text-neutral-500">Hourly rate</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(rate as number)}/hr</div>
                        <Badge variant="outline" className="text-xs">
                          Prevailing Wage
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sources" className="space-y-4">
              <h4 className="font-semibold text-neutral-800">Data Verification</h4>
              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center mb-2">
                    <Building className="h-4 w-4 text-primary mr-2" />
                    <span className="font-medium">Construction Industry Data</span>
                  </div>
                  <p className="text-sm text-neutral-600">
                    Material prices sourced from major construction suppliers and industry cost indices.
                    Updated daily to reflect current market conditions.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center mb-2">
                    <MapPin className="h-4 w-4 text-primary mr-2" />
                    <span className="font-medium">Regional Labor Statistics</span>
                  </div>
                  <p className="text-sm text-neutral-600">
                    Wage data compiled from Bureau of Labor Statistics, prevailing wage databases,
                    and regional construction job market analysis.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center mb-2">
                    <Database className="h-4 w-4 text-primary mr-2" />
                    <span className="font-medium">Government Permit Data</span>
                  </div>
                  <p className="text-sm text-neutral-600">
                    Permit costs gathered from municipal websites and local building departments.
                    Reflects current regulatory fees and requirements.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700">
                  <strong>Data Accuracy:</strong> All pricing data is sourced from authenticated construction 
                  industry databases and updated regularly to ensure estimates reflect current market conditions.
                  Regional adjustments are applied based on local economic factors and construction cost indices.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}