import { useState } from "react";
import Header from "@/components/header";
import EstimationForm from "@/components/estimation-form";
import CostPreview from "@/components/cost-preview";
import RecentEstimates from "@/components/recent-estimates";
import { Hammer } from "lucide-react";
// import LiveScrapingTest from "@/components/live-scraping-test";

export default function Dashboard() {
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex flex-col items-center justify-center">
          <div className="flex items-center mb-2">
            <Hammer className="text-primary w-8 h-8 mr-2" />
            <span className="text-2xl font-bold text-neutral-800">FlacronBuild</span>
          </div>
          <div className="text-neutral-600 text-base text-center max-w-2xl">
            AI-powered construction cost estimation for residential, commercial, and infrastructure projects. Get fast, data-driven estimates for your next build.
          </div>
        </div>
        <div className="mb-8 text-center text-base text-neutral-600 bg-neutral-100 rounded-lg py-3 px-4">
          <strong>Note:</strong> This tool provides the best available construction cost estimate. Actual prices can vary ±15%. Results are most accurate for well-known areas in the United States.
        </div>
        <div className={`grid gap-8 ${currentEstimate ? "lg:grid-cols-3" : "justify-center"}`}>
          <div className={currentEstimate ? "lg:col-span-2" : "max-w-xl w-full mx-auto"}>
            <EstimationForm 
              onProjectUpdate={setCurrentProject}
              onEstimateUpdate={setCurrentEstimate}
              hasEstimate={!!currentEstimate}
            />
          </div>
          {currentEstimate && (
            <div>
              <CostPreview 
                project={currentProject}
                estimate={currentEstimate}
              />
            </div>
          )}
        </div>
        <div className="mt-12 space-y-8">
          <RecentEstimates />
          {/* <LiveScrapingTest /> */}
        </div>
      </div>
    </div>
  );
}
