import Header from "@/components/header";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { downloadReportPDF } from "@/lib/pdf-storage";

function capitalizeWords(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? "-" : `$${num.toLocaleString()}`;
}

// Function to generate AI-like recommendations based on project data
function generateRecommendation(project: any, costData: any): {
  summary: string;
  priority: 'low' | 'medium' | 'high';
  timeline: string;
  icon: any;
  bgColor: string;
  textColor: string;
} {
  const roofAge = project.roofAge || 0;
  const urgency = project.urgency || 'medium';
  const hasIceShield = project.iceWaterShield || false;
  const hasDripEdge = project.dripEdge || false;
  const materialLayers = project.materialLayers || [];
  const structureType = project.structureType || '';
  const slopeDamage = project.slopeDamage || [];
  const totalCost = costData.totalCost || 0;

  let priority: 'low' | 'medium' | 'high' = 'medium';
  let timeline = '';
  let summary = '';
  let icon = Clock;
  let bgColor = 'bg-yellow-50';
  let textColor = 'text-yellow-800';

  // Analyze roof age
  if (roofAge > 25) {
    priority = 'high';
    timeline = 'within 6-12 months';
    summary = `Based on the roof age of ${roofAge} years, this roof has exceeded its typical lifespan. Immediate replacement is strongly recommended to prevent potential water damage and structural issues.`;
    icon = AlertTriangle;
    bgColor = 'bg-red-50';
    textColor = 'text-red-800';
  } else if (roofAge > 20) {
    priority = 'high';
    timeline = 'within 12-18 months';
    summary = `At ${roofAge} years old, this roof is nearing the end of its expected lifespan. Planning for replacement within the next 1-2 years is advisable.`;
    icon = AlertTriangle;
    bgColor = 'bg-red-50';
    textColor = 'text-red-800';
  } else if (roofAge > 15) {
    priority = 'medium';
    timeline = 'within 2-3 years';
    summary = `The roof is ${roofAge} years old and in the latter half of its expected lifespan. Begin planning for replacement and increase inspection frequency.`;
    icon = Clock;
    bgColor = 'bg-yellow-50';
    textColor = 'text-yellow-800';
  } else if (roofAge > 10) {
    priority = 'low';
    timeline = 'within 5-7 years';
    summary = `At ${roofAge} years old, this roof is in the middle of its expected lifespan. Regular maintenance and periodic inspections are recommended.`;
    icon = Clock;
    bgColor = 'bg-yellow-50';
    textColor = 'text-yellow-800';
  } else {
    priority = 'low';
    timeline = 'routine maintenance only';
    summary = `This ${roofAge}-year-old roof is relatively new. Focus on preventive maintenance and regular inspections to maximize lifespan.`;
    icon = CheckCircle;
    bgColor = 'bg-green-50';
    textColor = 'text-green-800';
  }

  // Adjust based on urgency and damage
  if (urgency === 'high' || slopeDamage.length > 0) {
    priority = 'high';
    timeline = 'immediate attention required';
    summary = `${summary} Urgent repairs are needed due to identified damage or high urgency rating. Immediate professional inspection and repair recommended.`;
    icon = AlertTriangle;
    bgColor = 'bg-red-50';
    textColor = 'text-red-800';
  }

  // Adjust based on protective features
  if (!hasIceShield && !hasDripEdge) {
    summary += ` Consider upgrading to include ice/water shield and drip edge protection during future work.`;
  }

  // Add cost context
  if (totalCost > 15000) {
    summary += ` Given the estimated cost of ${formatCurrency(totalCost)}, consider multiple quotes and explore financing options.`;
  }

  return {
    summary,
    priority,
    timeline,
    icon,
    bgColor,
    textColor
  };
}

// Component to render a single project report in the desired format
function ProjectReportCard({ report }: { report: any }) {
  const project = report.projectData || {};
  const costData = report.geminiResponse?.costBreakdown || {};
  const recommendation = generateRecommendation(project, costData);

  const handleViewPDF = async () => {
    console.log('=== COMPARE: View PDF clicked ===');
    console.log('Report:', report);
    
    if (report.pdfRef) {
      try {
        await downloadReportPDF(report, true); // Pass true for view mode
      } catch (error) {
        console.error('Error viewing PDF:', error);
        alert('Unable to view PDF. Please try downloading instead.');
      }
    } else {
      alert('PDF not available for this report.');
    }
  };

  const handleDownloadPDF = async () => {
    console.log('=== COMPARE: Download PDF clicked ===');
    console.log('Report:', report);
    
    if (report.pdfRef) {
      try {
        await downloadReportPDF(report, false); // Pass false for download mode
      } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Unable to download PDF. Please try again.');
      }
    } else {
      alert('PDF not available for this report.');
    }
  };

  return (
    <Card className="p-8 rounded-2xl shadow-lg bg-white">
      {/* Project Report Header */}
      <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center mb-4">
          <FileText className="h-8 w-8 text-blue-600 mr-3" />
          <h2 className="text-3xl font-extrabold text-blue-700 tracking-tight">Project Report</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-neutral-700">Project:</span>
              <span className="text-neutral-800">{project.name || "Home"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-neutral-700">Role:</span>
              <span className="text-neutral-800">{project.userRole || "homeowner"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-neutral-700">Location:</span>
              <span className="text-neutral-800">
                {typeof project.location === 'object' && project.location?.city 
                  ? `${project.location.city}, ${project.location.country} ${project.location.zipCode}` 
                  : project.location || "NY, USA 23415"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-neutral-700">Date:</span>
              <span className="text-neutral-800">
                {report.timestamp ? new Date(report.timestamp).toLocaleString() : new Date().toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button 
            variant="outline" 
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
            onClick={handleViewPDF}
          >
            <FileText className="h-4 w-4 mr-2" />
            View PDF
          </Button>
          <Button 
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleDownloadPDF}
          >
            <FileText className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Summary & Recommendations Section */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-blue-600 mb-4">Summary & Recommendations</h3>
        <div className={`p-4 rounded-lg border ${recommendation.bgColor} border-current`}>
          <div className="flex items-start gap-3">
            <recommendation.icon className={`h-6 w-6 ${recommendation.textColor} mt-1 flex-shrink-0`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-bold text-lg ${recommendation.textColor}`}>
                  {recommendation.priority.charAt(0).toUpperCase() + recommendation.priority.slice(1)} Priority
                </span>
                <span className="text-sm text-neutral-600">• {recommendation.timeline}</span>
              </div>
              <p className={`text-sm leading-relaxed ${recommendation.textColor}`}>
                {recommendation.summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Info Section */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-blue-600 mb-4">Project Info</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="space-y-3">
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Structure Type:</span>
              <span className="text-neutral-800">{project.structureType || "Single Family Home"}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Roof Age:</span>
              <span className="text-neutral-800">{project.roofAge || "20"}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Felt:</span>
              <span className="text-neutral-800">{project.felt || "synthetic"}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Drip Edge:</span>
              <span className="text-neutral-800">{project.dripEdge ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Area:</span>
              <span className="text-neutral-800">{project.area ? project.area.toLocaleString() : "-"}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Inspector Name:</span>
              <span className="text-neutral-800">{project.inspectorInfo?.name || ""}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Inspector Contact:</span>
              <span className="text-neutral-800">{project.inspectorInfo?.contact || ""}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Steep Assist:</span>
              <span className="text-neutral-800">No</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Roof Pitch:</span>
              <span className="text-neutral-800">{project.roofPitch || "Low Slope (2-4/12)"}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Material Layers:</span>
              <span className="text-neutral-800">
                {project.materialLayers?.length > 0 
                  ? project.materialLayers.join(", ") 
                  : "Metal Roofing, Clay Tiles"}
              </span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Ice/Water Shield:</span>
              <span className="text-neutral-800">{project.iceWaterShield ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Gutter Apron:</span>
              <span className="text-neutral-800">{project.gutterApron ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Urgency:</span>
              <span className="text-neutral-800">{project.urgency || "medium"}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Inspector License:</span>
              <span className="text-neutral-800">{project.inspectorInfo?.license || ""}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Worker Count:</span>
              <span className="text-neutral-800">-</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1">
              <span className="font-semibold text-neutral-700">Homeowner Name:</span>
              <span className="text-neutral-800">{project.policyholderName || "John"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown Section */}
      {Object.keys(costData).length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-blue-600 mb-4">Cost Estimate</h3>
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-700">Labor Cost:</span>
                <span className="text-neutral-800 font-medium">{formatCurrency(costData.laborCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-700">Materials Cost:</span>
                <span className="text-neutral-800 font-medium">{formatCurrency(costData.materialsCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-700">Permits Cost:</span>
                <span className="text-neutral-800 font-medium">{formatCurrency(costData.permitsCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-neutral-700">Contingency Cost:</span>
                <span className="text-neutral-800 font-medium">{formatCurrency(costData.contingencyCost)}</span>
              </div>
              <hr className="border-neutral-300" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-700 text-lg">Total Cost:</span>
                <span className="text-blue-700 font-bold text-xl">{formatCurrency(costData.totalCost)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function CompareSlogPage() {
  const [search, setSearch] = useState(window.location.search);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get("ids")?.split(",").filter(Boolean) || [];
    if (ids.length !== 2) {
      setError("Please select exactly two reports to compare.");
      setLoading(false);
      return;
    }
    async function fetchReports() {
      setLoading(true);
      setError(null);
      try {
        const snaps = await Promise.all(ids.map(id => getDoc(doc(db, "reports", id))));
        const data = snaps.map((snap, i) => snap.exists() ? { id: ids[i], ...snap.data() } : null);
        if (data.some(d => !d)) {
          setError("One or more reports not found.");
        } else {
          setReports(data);
        }
      } catch (e) {
        setError("Failed to load reports.");
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [search]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
      <div className="text-lg text-blue-700 font-semibold">Loading comparison...</div>
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (reports.length !== 2) return null;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <Button variant="outline" className="mb-6" onClick={() => navigate("/compare")}>
          Back to Compare
        </Button>
        <h1 className="text-2xl font-bold mb-8 text-center">Report Comparison</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
          {reports.map((report) => (
            <ProjectReportCard key={report.id} report={report} />
          ))}
        </div>
      </main>
    </div>
  );
} 