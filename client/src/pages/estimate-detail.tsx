import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Header from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generatePDFReport } from "@/lib/pdf-generator";

function capitalizeWords(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function renderField(label: string, value: any, idx: number = 0, highlightTotal = false) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && value.toDate) {
    value = value.toDate().toLocaleString();
  }
  
  // Skip problematic fields that contain complex objects
  const skipFields = ['breakdown', 'imageanalysis', 'image_analysis', 'datasource', 'data_source'];
  if (skipFields.includes(label.toLowerCase())) {
    return null;
  }
  
  if (typeof value === "object" && !Array.isArray(value)) {
    // Check if the object contains complex nested objects that can't be rendered
    const hasComplexObjects = Object.values(value).some(v => 
      typeof v === "object" && v !== null && !Array.isArray(v) && typeof (v as any).toDate !== "function"
    );
    
    if (hasComplexObjects) {
      // Skip rendering objects with complex nested structures
      return null;
    }
    
    return (
      <div className="mb-4">
        <div className="font-semibold text-lg mb-2 border-l-4 border-blue-500 pl-2">{capitalizeWords(label)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-neutral-50 rounded-lg">
          {Object.entries(value).map(([k, v], i) => renderField(k, v, i))}
        </div>
      </div>
    );
  }
  
  // Handle arrays by converting to string
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    // Convert array to readable string
    const displayValue = value.join(", ");
    return (
      <div className={`flex justify-between items-center py-2 px-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'} rounded`}> 
        <span className="text-neutral-500 font-medium">{capitalizeWords(label.replace(/([A-Z])/g, ' $1'))}</span>
        <span className="font-semibold text-neutral-800">{displayValue}</span>
      </div>
    );
  }
  
  let displayValue = value;
  if (typeof value === "number" && /cost/i.test(label)) {
    displayValue = `$${value.toLocaleString()}`;
  }
  if (typeof value === "string" && /cost/i.test(label) && !isNaN(Number(value))) {
    displayValue = `$${Number(value).toLocaleString()}`;
  }
  if (typeof displayValue === "string" && !displayValue.startsWith("$") && displayValue.length > 0) {
    displayValue = displayValue.charAt(0).toUpperCase() + displayValue.slice(1);
  }
  
  // Only highlight total cost
  const isTotalCost = /total ?cost/i.test(label);
  return (
    <div className={`flex justify-between items-center py-2 px-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'} rounded`}> 
      <span className={`text-neutral-500 font-medium ${isTotalCost && highlightTotal ? 'text-lg text-blue-700 font-bold' : ''}`}>{capitalizeWords(label.replace(/([A-Z])/g, ' $1'))}</span>
      <span className={`${isTotalCost && highlightTotal ? 'text-blue-700 font-bold text-xl' : 'font-semibold text-neutral-800'}`}>{displayValue}</span>
    </div>
  );
}

export default function EstimateDetailPage() {
  const [match, params] = useRoute("/estimate/:id");
  const [, navigate] = useLocation();
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEstimate() {
      setLoading(true);
      setError(null);
      try {
        if (!params || !params.id) {
          setError("Invalid estimate ID.");
          setLoading(false);
          return;
        }
        const ref = doc(db, "estimates", params.id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setEstimate({ id: snap.id, ...snap.data() });
        } else {
          setError("Estimate not found.");
        }
      } catch (e: any) {
        setError("Failed to load estimate.");
      } finally {
        setLoading(false);
      }
    }
    if (params && params.id) fetchEstimate();
  }, [params?.id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!estimate) return null;

  // Exclude nested objects for top-level, show them as sections
  const { project, estimate: est, createdAt } = estimate;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center py-8 px-2">
        <Button variant="outline" className="mb-6" onClick={() => navigate("/my-estimates")}>
          &larr; Back
        </Button>
        <Card className="max-w-2xl w-full p-8 rounded-2xl shadow-lg bg-white">
          <h2 className="text-3xl font-extrabold mb-6 text-center text-blue-700 tracking-tight">{project?.name || "Estimate Detail"}</h2>
          {createdAt && (
            <div className="mb-8">
              <div className="font-semibold text-lg mb-1 border-l-4 border-blue-500 pl-2">Generated On:</div>
              <div className="text-neutral-700 pl-2">{typeof createdAt.toDate === 'function' ? createdAt.toDate().toLocaleString() : createdAt}</div>
            </div>
          )}
          {project && (
            <div className="mb-8">
              {renderField('Project', project)}
            </div>
          )}
          {/* Estimate section at the bottom */}
          {est && (
            <div className="mt-12">
              <div className="font-semibold text-lg mb-2 border-l-4 border-blue-500 pl-2">Estimate</div>
              {/* Other fields first */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-neutral-50 rounded-lg mb-4 mt-0">
                {Object.entries(Object.fromEntries(Object.entries(est).filter(([k]) => !["dataSource", "createdAt", "id", "regionMultiplier", "projectId"].includes(k))))
                  .filter(([k]) => !/total ?cost/i.test(k))
                  .map(([k, v], i) => renderField(k, v, i, false))}
              </div>
              {/* Highlight only total cost at the bottom */}
              {Object.entries(Object.fromEntries(Object.entries(est).filter(([k]) => !["dataSource", "createdAt", "id", "regionMultiplier", "projectId"].includes(k))))
                .filter(([k]) => /total ?cost/i.test(k)).map(([k, v], i) => renderField(k, v, i, true))}
            </div>
          )}
        </Card>
        <Button
          variant="default"
          size="lg"
          className="mt-8 px-8 py-3 text-lg font-semibold shadow-md"
          onClick={() => {
            if (project && est) {
              const user = auth.currentUser;
              let username = "User";
              if (user) {
                if (user.displayName) {
                  username = user.displayName.replace(/\s+/g, "");
                } else if (user.email) {
                  username = user.email.split("@")[0];
                }
              }
              generatePDFReport(project, est, { openInNewTab: true, username });
            }
          }}
        >
          Open Report
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="mt-4 px-8 py-3 text-lg font-semibold shadow-md"
          onClick={() => {
            if (project && est) {
              const user = auth.currentUser;
              let username = "User";
              if (user) {
                if (user.displayName) {
                  username = user.displayName.replace(/\s+/g, "");
                } else if (user.email) {
                  username = user.email.split("@")[0];
                }
              }
              generatePDFReport(project, est, { openInNewTab: false, username });
            }
          }}
        >
          Download Report
        </Button>
      </main>
    </div>
  );
} 