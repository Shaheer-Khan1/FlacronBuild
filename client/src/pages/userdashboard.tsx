import Header from "@/components/header";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Pencil, Trash2, Home, Building, Wrench, TrafficCone, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import LoginDialog from "@/components/login-dialog";

export default function UserDashboardPage() {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  const fetchEstimates = async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "estimates"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEstimates(data);
    } catch (e: any) {
      setError("Failed to load your estimates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid);
        fetchEstimates(user.uid);
      } else {
        setUserId(null);
        setEstimates([]);
        setLoginMessage("You need to login first");
        setLoginOpen(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this estimate?")) return;
    await deleteDoc(doc(db, "estimates", id));
    setEstimates(estimates.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
      <main className="flex-1 flex flex-col items-center py-8 px-2">
        <h1 className="text-2xl font-bold mb-2">My Estimates</h1>
        <p className="text-neutral-600 mb-8 text-center max-w-xl">Here are your recent project estimates. Click an icon to view, edit, or delete an estimate. Keep your projects organized and up to date!</p>
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
        ) : estimates.length === 0 ? (
          <div className="text-neutral-500">No estimates found. Make an estimate to see it here.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 w-full max-w-5xl">
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
                  <div className="rounded-t-2xl bg-blue-50 flex flex-col items-center py-4 px-4">
                    <Icon className={`h-8 w-8 ${iconColor} mb-1`} />
                    <span className="text-xl font-bold text-neutral-800 text-center truncate">{project.name || "Estimate"}</span>
                  </div>
                  <div className="flex flex-col gap-1 items-center text-sm text-neutral-700 py-4 px-4">
                    {project.location && (
                      <span className="flex items-center gap-1 text-blue-500"><MapPin className="h-4 w-4" />{project.location}</span>
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
                      <span className="sr-only">View</span>
                      <Eye className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:bg-yellow-100 text-black" title="Edit" onClick={() => navigate(`/estimate/${item.id}/edit`)}>
                      <span className="sr-only">Edit</span>
                      <Pencil className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:bg-red-100 text-black" title="Delete" onClick={() => handleDelete(item.id)}>
                      <span className="sr-only">Delete</span>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
} 