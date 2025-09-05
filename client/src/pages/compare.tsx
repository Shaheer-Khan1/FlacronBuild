import Header from "@/components/header";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import LoginDialog from "@/components/login-dialog";
import { Home, Building, Wrench, TrafficCone, MapPin } from "lucide-react";
import { getUserReports } from "@/lib/pdf-storage";

export default function ComparePage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [, navigate] = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [dateFilter, setDateFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid);
        fetchReports();
      } else {
        setUserId(null);
        setReports([]);
        setLoginMessage("You need to login first");
        setLoginOpen(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('=== COMPARE PAGE: Fetching Reports ===');
      const userReports = await getUserReports();
      console.log('=== COMPARE PAGE: Reports Fetched ===');
      console.log('Total reports:', userReports.length);
      setReports(userReports);
    } catch (e: any) {
      console.error('Error fetching reports:', e);
      setError("Failed to load your reports");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length < 2) return [...prev, id];
      return prev;
    });
  };

  const handleCompare = () => {
    if (selected.length === 2) {
      navigate(`/compare/slog?ids=${selected.join(",")}`);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter((report: any) => {
    const project = report.projectData || {};
    let matches = true;
    if (dateFilter && report.timestamp) {
      const reportDate = new Date(report.timestamp).toISOString().split('T')[0];
      if (reportDate !== dateFilter) matches = false;
    }
    if (nameFilter && project.name && !project.name.toLowerCase().includes(nameFilter.toLowerCase())) matches = false;
    return matches;
  });

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
      <main className="flex-1 flex flex-col items-center py-8 px-2">
        <h1 className="text-2xl font-bold mb-4">Compare Estimates</h1>
        <p className="text-neutral-600 mb-8 text-center max-w-xl">Select two estimates to compare.</p>
        {/* Filter Bar */}
        <div className="w-full max-w-5xl mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 items-center w-full md:w-auto">
            <label className="text-sm font-medium text-orange-600">Date:</label>
            <input
              type="date"
              className="border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-colors"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <label className="text-sm font-medium text-orange-600">Project Name:</label>
            <input
              type="text"
              className="border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-colors"
              placeholder="Search by name"
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 w-full max-w-5xl mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-0 flex flex-col justify-between rounded-2xl shadow-md border border-neutral-200 bg-white min-h-[220px] animate-pulse">
                <div className="rounded-t-2xl bg-blue-50 flex flex-col items-center py-4 px-4">
                  <div className="h-8 w-8 bg-neutral-200 rounded-full mb-2" />
                  <div className="h-6 w-24 bg-neutral-200 rounded mb-1" />
                </div>
                <div className="flex flex-col gap-2 items-center text-sm text-neutral-700 py-4 px-4 w-full">
                  <div className="h-4 w-20 bg-neutral-200 rounded mb-1" />
                  <div className="h-4 w-24 bg-neutral-200 rounded mb-1" />
                  <div className="h-4 w-16 bg-neutral-200 rounded mb-1" />
                  <div className="h-5 w-28 bg-blue-100 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-neutral-500">No reports found. Create an estimate to see it here.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 w-full max-w-5xl mb-8">
            {filteredReports.map((report: any) => {
              const project = report.projectData || {};
              const typeIcons = {
                residential: Home,
                commercial: Building,
                renovation: Wrench,
                infrastructure: TrafficCone,
              };
              const iconColors = {
                residential: "text-primary",
                commercial: "text-secondary",
                renovation: "text-yellow-600",
                infrastructure: "text-purple-600",
              };
              const typeKey = (project.projectType as keyof typeof typeIcons) || 'residential';
              const Icon = typeIcons[typeKey];
              const iconColor = iconColors[typeKey];
              return (
                <Card key={report.id} className={`p-0 flex flex-col justify-between rounded-2xl shadow-md border border-neutral-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all min-h-[240px] cursor-pointer ${selected.includes(report.id) ? 'ring-2 ring-green-500' : ''}`} onClick={() => handleSelect(report.id)}>
                  <div className="rounded-t-2xl bg-blue-50 flex flex-col items-center py-4 px-4">
                    <Icon className={`h-8 w-8 ${iconColor} mb-1`} />
                    <span className="text-lg font-bold text-neutral-800 text-center truncate">
                      {project.name || "Project Report"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 items-center text-sm text-neutral-700 py-4 px-4">
                    <span className="text-xs text-neutral-500">
                      {report.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'Date not available'}
                    </span>
                    {project.location && (
                      <span className="flex items-center gap-1 text-blue-500 text-xs">
                        <MapPin className="h-3 w-3" />
                        {typeof project.location === 'string' 
                          ? project.location 
                          : project.location?.city 
                            ? `${project.location.city}, ${project.location.country}`
                            : 'Location not specified'
                        }
                      </span>
                    )}
                    <span className="text-neutral-700 text-xs">
                      Role: {project.userRole || 'Not specified'}
                    </span>
                    {report.geminiResponse && (
                      <span className="text-green-600 text-xs font-medium">✓ AI Analysis Complete</span>
                    )}
                    {report.pdfRef && (
                      <span className="text-blue-600 text-xs font-medium">📄 PDF Available</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        <Button
          variant="default"
          size="lg"
          className="mt-4 px-8 py-3 text-lg font-semibold shadow-md"
          disabled={selected.length !== 2}
          onClick={handleCompare}
        >
          Compare Selected
        </Button>
      </main>
    </div>
  );
} 