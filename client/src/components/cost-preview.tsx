import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, FileText, Save } from "lucide-react";
import { generatePDFReport } from "@/lib/pdf-generator";

interface CostPreviewProps {
  project: any;
  estimate: any;
}

export default function CostPreview({ project, estimate }: CostPreviewProps) {
  const handleGeneratePDF = () => {
    if (project && estimate) {
      generatePDFReport(project, estimate);
    }
  };

  if (!project || !estimate) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="text-center text-neutral-500">
            <p>Complete the form to see cost estimate</p>
          </div>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getRegionStatus = (multiplier: string) => {
    const mult = parseFloat(multiplier);
    if (mult > 1.5) return { text: "High Cost Region", color: "bg-red-100 text-red-800" };
    if (mult > 1.2) return { text: "Above Average Cost", color: "bg-yellow-100 text-yellow-800" };
    if (mult < 0.9) return { text: "Low Cost Region", color: "bg-green-100 text-green-800" };
    return { text: "Average Cost Region", color: "bg-blue-100 text-blue-800" };
  };

  const regionStatus = getRegionStatus(estimate.regionMultiplier);

  const materialTierOptions = [
    {
      name: "Economy",
      description: "Budget-friendly options",
      multiplier: 0.7,
      current: project.materialTier === "economy",
    },
    {
      name: "Standard",
      description: "Most common choice",
      multiplier: 1.0,
      current: project.materialTier === "standard",
    },
    {
      name: "Premium",
      description: "Higher-end finishes",
      multiplier: 1.35,
      current: project.materialTier === "premium",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Estimate Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-800">Quick Estimate</h3>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Live Preview
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="text-center p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg">
            <div className="text-3xl font-bold text-neutral-800">
              {formatCurrency(estimate.totalCost)}
            </div>
            <div className="text-sm text-neutral-500">Estimated Total Cost</div>
            <div className="text-xs text-neutral-400 mt-1">±15% accuracy range</div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Materials</span>
              <span className="font-medium">{formatCurrency(estimate.materialsCost)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Labor</span>
              <span className="font-medium">{formatCurrency(estimate.laborCost)}</span>   
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Permits & Fees</span>
              <span className="font-medium">{formatCurrency(estimate.permitsCost)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Contingency (7%)</span>
              <span className="font-medium">{formatCurrency(estimate.contingencyCost)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-neutral-600">
                <MapPin className="h-4 w-4 text-primary mr-2" />
                <span>{project.location}</span>
              </div>
              <Badge className={regionStatus.color}>
                {regionStatus.text}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Regional Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Regional Insights</h3>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <div>
              <div className="text-sm font-medium text-neutral-800">Labor Cost</div>
              <div className="text-xs text-neutral-600">
                {parseFloat(estimate.regionMultiplier) > 1 
                  ? `${Math.round((parseFloat(estimate.regionMultiplier) - 1) * 100)}% above national average`
                  : `${Math.round((1 - parseFloat(estimate.regionMultiplier)) * 100)}% below national average`}
              </div>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <div>
              <div className="text-sm font-medium text-neutral-800">Material Availability</div>
              <div className="text-xs text-neutral-600">Good supply, standard lead times</div>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <div>
              <div className="text-sm font-medium text-neutral-800">Permit Process</div>
              <div className="text-xs text-neutral-600">3-6 months typical timeline</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Material Options */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Material Tier Options</h3>
        
        <div className="space-y-3">
          {materialTierOptions.map((tier) => {
            const baseCost = parseFloat(estimate.totalCost) / (project.materialTier === "economy" ? 0.7 : project.materialTier === "premium" ? 1.35 : 1.0);
            const tierCost = baseCost * tier.multiplier;
            const costDiff = tierCost - parseFloat(estimate.totalCost);
            const percentDiff = Math.round((costDiff / parseFloat(estimate.totalCost)) * 100);
            
            return (
              <div
                key={tier.name}
                className={`border rounded-lg p-3 hover:border-primary cursor-pointer transition-colors ${
                  tier.current ? "border-primary bg-primary/5" : "border-neutral-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-neutral-800">{tier.name}</div>
                    <div className="text-xs text-neutral-500">{tier.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-neutral-800">{formatCurrency(tierCost)}</div>
                    <div className="text-xs">
                      {tier.current ? (
                        <span className="text-neutral-500">Current selection</span>
                      ) : percentDiff > 0 ? (
                        <span className="text-secondary">+{percentDiff}% cost</span>
                      ) : (
                        <span className="text-accent">{percentDiff}% cost</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button className="w-full" onClick={handleGeneratePDF}>
          <FileText className="mr-2 h-4 w-4" />
          Generate Detailed Report
        </Button>
        <Button variant="outline" className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Save Estimate
        </Button>
      </div>
    </div>
  );
}
