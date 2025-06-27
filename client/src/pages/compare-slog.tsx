import Header from "@/components/header";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function capitalizeWords(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? "-" : `$${num.toLocaleString()}`;
}

export default function CompareSlogPage() {
  const [search, setSearch] = useState(window.location.search);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get("ids")?.split(",").filter(Boolean) || [];
    if (ids.length !== 2) {
      setError("Please select exactly two estimates to compare.");
      setLoading(false);
      return;
    }
    async function fetchEstimates() {
      setLoading(true);
      setError(null);
      try {
        const snaps = await Promise.all(ids.map(id => getDoc(doc(db, "estimates", id))));
        const data = snaps.map((snap, i) => snap.exists() ? { id: ids[i], ...snap.data() } : null);
        if (data.some(d => !d)) {
          setError("One or more estimates not found.");
        } else {
          setEstimates(data);
        }
      } catch (e) {
        setError("Failed to load estimates.");
      } finally {
        setLoading(false);
      }
    }
    fetchEstimates();
  }, [search]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
      <div className="text-lg text-blue-700 font-semibold">Loading comparison...</div>
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (estimates.length !== 2) return null;

  // Extract fields for comparison
  const [a, b] = estimates;
  const projectFields = [
    { label: "Name", key: "name" },
    { label: "Material Tier", key: "materialTier" },
    { label: "Location", key: "location" },
    { label: "Area", key: "area", isNumber: true },
    { label: "Unit", key: "unit" },
    { label: "Timeline", key: "timeline" },
    { label: "Type", key: "type" },
  ];
  const estimateFields = [
    { label: "Labor Cost", key: "laborCost", isCost: true },
    { label: "Permits Cost", key: "permitsCost", isCost: true },
    { label: "Contingency Cost", key: "contingencyCost", isCost: true },
    { label: "Materials Cost", key: "materialsCost", isCost: true },
    { label: "Total Cost", key: "totalCost", isCost: true, highlight: true },
  ];

  // Helper to get outline color
  function getOutline(valA: any, valB: any, opts: { isCost?: boolean, isNumber?: boolean, highlight?: boolean } = {}) {
    if (valA == null || valB == null) return "";
    if (opts.isCost || opts.highlight) {
      if (+valA < +valB) return "ring-2 ring-green-500";
      if (+valA > +valB) return "ring-2 ring-red-500";
    }
    if (opts.isNumber) {
      if (+valA < +valB) return "ring-2 ring-red-500";
      if (+valA > +valB) return "ring-2 ring-green-500";
    }
    return "";
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center py-8 px-2">
        <Button variant="outline" className="mb-6" onClick={() => navigate("/compare")}>Back to Compare</Button>
        <h1 className="text-2xl font-bold mb-8 text-center">Estimate Comparison</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {[a, b].map((est, idx) => (
            <Card key={est.id} className="p-8 rounded-2xl shadow-lg bg-white flex flex-col gap-6">
              <h2 className="text-3xl font-extrabold mb-2 text-center text-blue-700 tracking-tight">{est.project?.name || "Estimate"}</h2>
              <div className="mb-4">
                <div className="font-semibold text-lg mb-1 border-l-4 border-blue-500 pl-2">Generated On:</div>
                <div className="text-neutral-700 pl-2">{typeof est.createdAt?.toDate === 'function' ? est.createdAt.toDate().toLocaleString() : est.createdAt}</div>
              </div>
              <div>
                <div className="font-semibold text-lg mb-2 border-l-4 border-blue-500 pl-2">Project</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-neutral-50 rounded-lg">
                  {projectFields.map(f => (
                    <div key={f.key} className={`flex justify-between items-center py-2 px-3 rounded font-medium ${getOutline(a.project?.[f.key], b.project?.[f.key], f) && idx === 0 ? getOutline(a.project?.[f.key], b.project?.[f.key], f) : getOutline(b.project?.[f.key], a.project?.[f.key], f) && idx === 1 ? getOutline(b.project?.[f.key], a.project?.[f.key], f) : ''}`}>
                      <span className="text-neutral-500">{f.label}</span>
                      <span className="text-neutral-800">{f.isNumber ? (est.project?.[f.key]?.toLocaleString?.() ?? est.project?.[f.key]) : capitalizeWords(est.project?.[f.key] ?? "-")}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold text-lg mb-2 border-l-4 border-blue-500 pl-2">Estimate</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-neutral-50 rounded-lg">
                  {estimateFields.map(f => (
                    <div key={f.key} className={`flex justify-between items-center py-2 px-3 rounded font-medium ${getOutline(a.estimate?.[f.key], b.estimate?.[f.key], f) && idx === 0 ? getOutline(a.estimate?.[f.key], b.estimate?.[f.key], f) : getOutline(b.estimate?.[f.key], a.estimate?.[f.key], f) && idx === 1 ? getOutline(b.estimate?.[f.key], a.estimate?.[f.key], f) : ''} ${f.highlight ? 'text-blue-700 font-bold text-xl' : ''}`}>
                      <span className={`text-neutral-500 ${f.highlight ? 'font-bold' : ''}`}>{f.label}</span>
                      <span className={`${f.highlight ? 'text-blue-700 font-bold text-xl' : 'text-neutral-800'}`}>{f.isCost || f.highlight ? formatCurrency(est.estimate?.[f.key]) : est.estimate?.[f.key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
} 