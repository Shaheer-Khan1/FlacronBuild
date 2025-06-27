import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Header from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function capitalizeWords(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

export default function EstimateEditPage() {
  const [match, params] = useRoute("/estimate/:id/edit");
  const [, navigate] = useLocation();
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

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
          const data = { id: snap.id, ...snap.data() };
          setEstimate(data);
          setForm({
            ...data,
            project: { ...data.project },
            estimate: { ...data.estimate },
          });
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

  const handleChange = (section: string, key: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const handleTopChange = (key: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, "estimates", params.id);
      await updateDoc(ref, {
        ...form,
        project: { ...form.project },
        estimate: { ...form.estimate },
      });
      navigate(`/estimate/${params.id}`);
    } catch (e: any) {
      setError("Failed to update estimate.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!estimate) return null;

  const { project, estimate: est, createdAt } = form;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center py-8 px-2">
        <Button variant="outline" className="mb-6" onClick={() => navigate(`/my-estimates`)}>
          &larr; Cancel
        </Button>
        <div className="mb-6 text-center text-neutral-600 text-base">
          <span className="font-semibold">Note:</span> For estimate calculation, use the <a href="/" className="text-blue-600 underline hover:text-blue-800">calculator</a>
        </div>
        <Card className="max-w-2xl w-full p-8 rounded-2xl shadow-lg bg-white">
          <h2 className="text-3xl font-extrabold mb-6 text-center text-blue-700 tracking-tight">Edit Estimate</h2>
          {createdAt && (
            <div className="mb-8">
              <div className="font-semibold text-lg mb-1 border-l-4 border-blue-500 pl-2">Generated On:</div>
              <div className="text-neutral-700 pl-2">{typeof createdAt.toDate === 'function' ? createdAt.toDate().toLocaleString() : createdAt}</div>
            </div>
          )}
          {project && (
            <div className="mb-8">
              <div className="font-semibold text-lg mb-2 border-l-4 border-blue-500 pl-2">Project</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-neutral-50 rounded-lg">
                {Object.entries(project).map(([k, v], i) => (
                  <div key={k} className="flex flex-col py-2 px-3">
                    <label className="text-neutral-500 font-medium mb-1">{capitalizeWords(k.replace(/([A-Z])/g, ' $1'))}</label>
                    <input
                      className="border rounded px-2 py-1 font-semibold text-neutral-800"
                      value={v ?? ''}
                      onChange={e => handleChange('project', k, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {est && (
            <div className="mt-12">
              <div className="font-semibold text-lg mb-2 border-l-4 border-blue-500 pl-2">Estimate</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 bg-neutral-50 rounded-lg">
                {Object.entries(est)
                  .filter(([k]) => !["createdAt", "dataSource", "projectId", "id", "regionMultiplier", "breakdown"].includes(k))
                  .map(([k, v], i) => (
                    <div key={k} className="flex flex-col py-2 px-3">
                      <label className="text-neutral-500 font-medium mb-1">{capitalizeWords(k.replace(/([A-Z])/g, ' $1'))}</label>
                      <input
                        className="border rounded px-2 py-1 font-semibold text-neutral-800"
                        value={v ?? ''}
                        onChange={e => handleChange('estimate', k, e.target.value)}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
        <Button variant="default" size="lg" className="mt-8 px-8 py-3 text-lg font-semibold shadow-md" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Confirm'}
        </Button>
      </main>
    </div>
  );
} 