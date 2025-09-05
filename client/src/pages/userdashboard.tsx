import Header from "@/components/header";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Pencil, Trash2, Home, Building, Wrench, TrafficCone, MapPin, Download } from "lucide-react";
import { useLocation } from "wouter";
import LoginDialog from "@/components/login-dialog";
import { getUserPDFs, getUserReports, downloadReportPDF, formatFileSize } from "@/lib/pdf-storage";

export default function UserDashboardPage() {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [dateFilter, setDateFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');

  const fetchUserData = async (user: any) => {
    setLoading(true);
    setError(null);
    try {
      console.log('=== USER DASHBOARD: Fetching User Data ===');
      console.log('User:', { uid: user.uid, email: user.email });

      // Fetch reports from reports collection by userEmail
      const userReports = await getUserReports();
      console.log('=== USER DASHBOARD: Reports Fetched ===');
      console.log('Total reports:', userReports.length);
      userReports.forEach((report, index) => {
        console.log(`Report ${index + 1}:`, {
          id: report.id,
          projectName: report.projectData?.name,
          timestamp: report.timestamp,
          hasPdfRef: !!report.pdfRef
        });
      });
      setReports(userReports);

      // For backward compatibility, also fetch any old estimates (if they exist)
    try {
      const q = query(
        collection(db, "estimates"),
          where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
        const oldEstimates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('=== USER DASHBOARD: Legacy Estimates ===');
        console.log('Old estimates found:', oldEstimates.length);
        setEstimates(oldEstimates);
      } catch (legacyError) {
        console.log('No legacy estimates found or error fetching them:', legacyError);
        setEstimates([]);
      }

    } catch (e: any) {
      console.error('Error fetching user data:', e);
      setError("Failed to load your data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email);
        fetchUserData(user);
      } else {
        setUserId(null);
        setUserEmail(null);
        setEstimates([]);
        setReports([]);
        setLoginMessage("You need to login first");
        setLoginOpen(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteEstimate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this estimate?")) return;
    await deleteDoc(doc(db, "estimates", id));
    setEstimates(estimates.filter(e => e.id !== id));
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteDoc(doc(db, "reports", id));
      setReports(reports.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report. Please try again.');
    }
  };

  const handleDownloadReport = async (report: any) => {
    console.log('=== USER DASHBOARD: Download Report ===');
    console.log('Report to download:', report);
    await downloadReportPDF(report);
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
        <h1 className="text-2xl font-bold mb-2">My Estimates & Reports</h1>
        <p className="text-neutral-600 mb-8 text-center max-w-xl">
          Here are your recent project reports and estimates. Each report contains your form data, AI analysis, and downloadable PDF.
        </p>
        
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 w-full max-w-5xl">
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
                <div className="border-t border-neutral-100" />
                <div className="flex items-center justify-center gap-4 py-3">
                  <div className="h-6 w-6 bg-neutral-200 rounded-full" />
                  <div className="h-6 w-6 bg-neutral-200 rounded-full" />
                  <div className="h-6 w-6 bg-neutral-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : reports.length === 0 && estimates.length === 0 ? (
          <div className="text-neutral-500">No reports found. Create an estimate to see it here.</div>
        ) : (
          <div className="w-full max-w-5xl space-y-8">
            {/* Reports Section */}
            {filteredReports.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">My Project Reports</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
                      <Card key={report.id} className="p-0 flex flex-col justify-between rounded-2xl shadow-md border border-neutral-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all min-h-[240px]">
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
                        <div className="border-t border-neutral-100" />
                        <div className="flex items-center justify-center gap-3 py-3">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-blue-100 text-black" 
                            title="View Report"
                            onClick={() => navigate(`/report/${report.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {report.pdfRef && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="hover:bg-green-100 text-black" 
                              title="Download PDF"
                              onClick={() => handleDownloadReport(report)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-red-100 text-black" 
                            title="Delete Report"
                            onClick={() => handleDeleteReport(report.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legacy Estimates Section (if any exist) */}
            {estimates.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Legacy Estimates</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {estimates.map((item: any) => {
              const project = item.project || {};
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
              const typeKey = (project.type as keyof typeof typeIcons) || 'residential';
              const Icon = typeIcons[typeKey];
              const iconColor = iconColors[typeKey];
                    
              return (
                <Card key={item.id} className="p-0 flex flex-col justify-between rounded-2xl shadow-md border border-neutral-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all min-h-[220px]">
                        <div className="rounded-t-2xl bg-orange-50 flex flex-col items-center py-4 px-4">
                    <Icon className={`h-8 w-8 ${iconColor} mb-1`} />
                    <span className="text-xl font-bold text-neutral-800 text-center truncate">{project.name || "Estimate"}</span>
                  </div>
                  <div className="flex flex-col gap-1 items-center text-sm text-neutral-700 py-4 px-4">
                    {project.location && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <MapPin className="h-4 w-4" />
                              {typeof project.location === 'string' 
                                ? project.location 
                                : project.location?.city 
                                  ? `${project.location.city}, ${project.location.country} ${project.location.zipCode}`
                                  : 'Location not specified'
                              }
                            </span>
                    )}
                    {project.area && (
                      <span className="text-neutral-700">Area: {project.area.toLocaleString()} {project.unit || ""}</span>
                    )}
                    {project.type && (
                      <span className="text-neutral-700">Type: {project.type}</span>
                    )}
                    {typeof item.estimate?.totalCost !== 'undefined' && (
                      <div className="text-blue-600 font-bold text-base text-center mt-2">
                        Total Cost: ${Number(item.estimate.totalCost).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-neutral-100" />
                  <div className="flex items-center justify-center gap-4 py-3">
                    <Button variant="ghost" size="icon" className="hover:bg-blue-100 text-black" title="View" onClick={() => navigate(`/estimate/${item.id}`)}>
                      <Eye className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:bg-yellow-100 text-black" title="Edit" onClick={() => navigate(`/estimate/${item.id}/edit`)}>
                      <Pencil className="h-5 w-5" />
                    </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-red-100 text-black" title="Delete" onClick={() => handleDeleteEstimate(item.id)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 