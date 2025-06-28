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
        <Card className="p-6 min-h-[350px] flex items-center justify-center">
          <div className="text-center text-neutral-500 w-full">
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

      {/* Download Status Note */}
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FileText className="h-5 w-5 text-green-600 mt-0.5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Report Downloaded and Saved
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Your cost estimate report has been automatically downloaded. 
                  You can access it again from{' '}
                  <a 
                    href="/my-estimates" 
                    className="font-medium underline hover:text-green-900"
                  >
                    My Estimates
                  </a>
                  {' '}page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
