import { useState } from "react";
import Header from "@/components/header";
import EstimationForm from "@/components/estimation-form";
import CostPreview from "@/components/cost-preview";
import RecentEstimates from "@/components/recent-estimates";

export default function Dashboard() {
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <EstimationForm 
              onProjectUpdate={setCurrentProject}
              onEstimateUpdate={setCurrentEstimate}
            />
          </div>
          <div>
            <CostPreview 
              project={currentProject}
              estimate={currentEstimate}
            />
          </div>
        </div>
        <div className="mt-12">
          <RecentEstimates />
        </div>
      </div>
    </div>
  );
}
