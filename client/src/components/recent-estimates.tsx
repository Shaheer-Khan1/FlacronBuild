import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Building, Wrench, TrafficCone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

const projectTypeIcons = {
  residential: Home,
  commercial: Building,
  renovation: Wrench,
  infrastructure: TrafficCone,
};

export default function RecentEstimates() {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch estimates for the current user
  const fetchEstimates = async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "estimates"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(2)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEstimates(data);
    } catch (e: any) {
      setError("Failed to load recent estimates");
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid);
        fetchEstimates(user.uid);
      } else {
        setUserId(null);
        setEstimates([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for new estimate event
  useEffect(() => {
    const handler = () => {
      if (userId) fetchEstimates(userId);
    };
    window.addEventListener("estimate:created", handler);
    return () => window.removeEventListener("estimate:created", handler);
  }, [userId]);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-neutral-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-neutral-200 rounded w-20 mb-2"></div>
                    <div className="h-3 bg-neutral-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-neutral-500">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-neutral-800">Recent Estimates</h3>
          {estimates.length > 2 && (
            <Button variant="ghost" className="text-primary hover:text-blue-700 text-sm font-medium">
              View All
            </Button>
          )}
        </div>
      </div>

      <div className="divide-y divide-neutral-200">
        {estimates.length === 0 ? (
          <div className="px-6 py-8 text-center text-neutral-500">
            <p>Make estimates to see them here.</p>
          </div>
        ) : (
          estimates.map((item: any) => {
            const project = item.project || {};
            const Icon = projectTypeIcons[project.type as keyof typeof projectTypeIcons] || Home;
            const iconColors = {
              residential: "bg-primary/10 text-primary",
              commercial: "bg-secondary/10 text-secondary",
              renovation: "bg-yellow-500/10 text-yellow-600",
              infrastructure: "bg-purple-500/10 text-purple-600",
            };
            return (
              <div
                key={item.id}
                className="px-6 py-4 hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
                      iconColors[project.type as keyof typeof iconColors] || iconColors.residential
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-800">{project.name || "Estimate"}</div>
                      <div className="text-sm text-neutral-500">
                        {project.location || "-"} • {project.area ? project.area.toLocaleString() : "-"} {project.unit || ""} • {project.type || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-neutral-800">
                      {item.estimate?.total ? formatCurrency(item.estimate.total) : "Estimate"}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {item.createdAt?.toDate ?
                        formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true }) :
                        "Just now"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {estimates.length === 2 && (
        <div className="px-6 py-3 text-center">
          <Button variant="ghost" className="text-primary hover:text-blue-700 text-sm font-medium">
            View All
          </Button>
        </div>
      )}
    </Card>
  );
}
