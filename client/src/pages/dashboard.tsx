import { useState } from "react";
import Header from "@/components/header";
import EstimationForm from "@/components/estimation-form";
import { Hammer } from "lucide-react";
import FlacronBuildLogo from "../FlacronBuildLogo.webp";
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
            <div style={{ height: 90, width: 300, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={FlacronBuildLogo} 
                alt="FlacronBuild Logo" 
                style={{ height: 220, width: 'auto', objectFit: 'cover', objectPosition: 'center' }} 
              />
            </div>
          </div>
          <div className="text-neutral-600 text-base text-center max-w-2xl">
            AI-powered roofing cost estimation with professional reports for homeowners, contractors, inspectors, and insurance adjusters. Get accurate, data-driven estimates for roof repairs, replacements, and maintenance.
          </div>
        </div>
        <div className="mb-8 text-center text-base text-neutral-600 bg-neutral-100 rounded-lg py-3 px-4">
          <strong>Note:</strong> This tool provides professional roofing cost estimates based on current market data and material prices. Actual costs can vary ±15% depending on local conditions, material availability, and contractor rates. Most accurate for properties in the United States.
        </div>
        <div className="max-w-xl w-full mx-auto">
            <EstimationForm 
              onProjectUpdate={setCurrentProject}
              onEstimateUpdate={setCurrentEstimate}
              hasEstimate={!!currentEstimate}
            />
        </div>
        <div className="mt-12 space-y-8">
          {/* <LiveScrapingTest /> */}
        </div>
      </div>
    </div>
  );
}
