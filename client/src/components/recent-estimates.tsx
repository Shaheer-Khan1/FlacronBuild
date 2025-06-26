import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Building, Wrench, TrafficCone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const projectTypeIcons = {
  residential: Home,
  commercial: Building,
  renovation: Wrench,
  infrastructure: TrafficCone,
};

export default function RecentEstimates() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
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
            <p>Failed to load recent estimates</p>
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
          <Button variant="ghost" className="text-primary hover:text-blue-700 text-sm font-medium">
            View All
          </Button>
        </div>
      </div>

      <div className="divide-y divide-neutral-200">
        {!projects || projects.length === 0 ? (
          <div className="px-6 py-8 text-center text-neutral-500">
            <p>No recent estimates found</p>
            <p className="text-sm mt-2">Create your first project estimate to get started</p>
          </div>
        ) : (
          projects.slice(0, 5).map((project: any) => {
            const Icon = projectTypeIcons[project.type as keyof typeof projectTypeIcons] || Home;
            const iconColors = {
              residential: "bg-primary/10 text-primary",
              commercial: "bg-secondary/10 text-secondary",
              renovation: "bg-yellow-500/10 text-yellow-600",
              infrastructure: "bg-purple-500/10 text-purple-600",
            };

            return (
              <div
                key={project.id}
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
                      <div className="font-medium text-neutral-800">{project.name}</div>
                      <div className="text-sm text-neutral-500">
                        {project.location} • {project.area.toLocaleString()} {project.unit} • {project.type}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-neutral-800">
                      Estimate Pending
                    </div>
                    <div className="text-sm text-neutral-500">
                      Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
