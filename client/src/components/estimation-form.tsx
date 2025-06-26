import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, Save, Upload, Home, Building, Wrench, TrafficCone, MapPin, Info } from "lucide-react";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  type: z.enum(["residential", "commercial", "renovation", "infrastructure"]),
  location: z.string().min(1, "Location is required"),
  area: z.number().min(1, "Area must be greater than 0"),
  unit: z.enum(["sqft", "sqm"]),
  materialTier: z.enum(["economy", "standard", "premium"]),
  timeline: z.enum(["urgent", "standard", "flexible"]).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const steps = [
  { id: 1, name: "Project Type", description: "Select project category" },
  { id: 2, name: "Location & Size", description: "Project location and dimensions" },
  { id: 3, name: "Materials", description: "Material preferences" },
  { id: 4, name: "Timeline", description: "Project schedule" },
  { id: 5, name: "Review", description: "Confirm details" },
];

const projectTypes = [
  { value: "residential", label: "Residential", description: "Houses, condos, apartments", icon: Home },
  { value: "commercial", label: "Commercial", description: "Offices, retail, warehouses", icon: Building },
  { value: "renovation", label: "Renovation", description: "Remodeling, additions", icon: Wrench },
  { value: "infrastructure", label: "Infrastructure", description: "Roads, utilities, public works", icon: TrafficCone },
];

const materialTiers = [
  { value: "economy", label: "Economy", description: "Budget-friendly options" },
  { value: "standard", label: "Standard", description: "Most common choice" },
  { value: "premium", label: "Premium", description: "Higher-end finishes" },
];

interface EstimationFormProps {
  onProjectUpdate: (project: any) => void;
  onEstimateUpdate: (estimate: any) => void;
}

export default function EstimationForm({ onProjectUpdate, onEstimateUpdate }: EstimationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [savedProjectId, setSavedProjectId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      type: "residential",
      location: "",
      area: 0,
      unit: "sqft",
      materialTier: "standard",
      timeline: "standard",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: (project) => {
      setSavedProjectId(project.id);
      onProjectUpdate(project);
      toast({
        title: "Project saved",
        description: "Your project has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await apiRequest("PATCH", `/api/projects/${savedProjectId}`, data);
      return response.json();
    },
    onSuccess: (project) => {
      onProjectUpdate(project);
    },
  });

  const generateEstimateMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/estimate`);
      return response.json();
    },
    onSuccess: (estimate) => {
      onEstimateUpdate(estimate);
    },
  });

  // Auto-save functionality
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (savedProjectId && Object.keys(form.formState.dirtyFields).length > 0) {
        const timer = setTimeout(() => {
          updateProjectMutation.mutate(value as ProjectFormData);
        }, 2000);
        return () => clearTimeout(timer);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, savedProjectId, updateProjectMutation]);

  // Generate estimate when project changes
  useEffect(() => {
    if (savedProjectId) {
      generateEstimateMutation.mutate(savedProjectId);
    }
  }, [savedProjectId, form.watch("type"), form.watch("location"), form.watch("area"), form.watch("materialTier")]);

  const onSubmit = (data: ProjectFormData) => {
    if (savedProjectId) {
      updateProjectMutation.mutate(data);
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = () => {
    const data = form.getValues();
    if (savedProjectId) {
      updateProjectMutation.mutate(data);
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      {/* Progress Header */}
      <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-neutral-800">Project Estimation</h2>
          <span className="text-sm text-neutral-500">Step {currentStep} of {steps.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-neutral-500 mt-2">
          {steps.map((step) => (
            <span key={step.id} className={currentStep >= step.id ? "text-primary" : ""}>
              {step.name}
            </span>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Project Type */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Type</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {projectTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <div key={type.value} className="relative">
                              <input
                                type="radio"
                                id={type.value}
                                value={type.value}
                                checked={field.value === type.value}
                                onChange={() => field.onChange(type.value)}
                                className="peer sr-only"
                              />
                              <label
                                htmlFor={type.value}
                                className="flex items-center p-4 border-2 border-neutral-200 rounded-lg cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover:border-neutral-300 transition-colors"
                              >
                                <Icon className="text-primary mr-3 h-5 w-5" />
                                <div>
                                  <div className="font-medium text-neutral-800">{type.label}</div>
                                  <div className="text-sm text-neutral-500">{type.description}</div>
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Location & Size */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Project Location
                        <Info className="h-4 w-4 text-neutral-400 ml-1" />
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input placeholder="Enter city, state or zip code" {...field} />
                        </FormControl>
                        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                      </div>
                      <p className="text-xs text-neutral-500">We'll automatically detect regional cost variations</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Area</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2500"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sqft">Square Feet</SelectItem>
                            <SelectItem value="sqm">Square Meters</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-neutral-700 mb-2">
                    Upload Plans (Optional)
                    <span className="text-neutral-500 font-normal"> - PDF, DWG, or images</span>
                  </Label>
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                    <Upload className="mx-auto text-neutral-400 h-8 w-8 mb-2" />
                    <p className="text-sm text-neutral-600">Drop files here or click to browse</p>
                    <p className="text-xs text-neutral-500 mt-1">Max 10MB per file</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Materials */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="materialTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Quality Tier</FormLabel>
                      <div className="space-y-3">
                        {materialTiers.map((tier) => (
                          <div key={tier.value} className="relative">
                            <input
                              type="radio"
                              id={tier.value}
                              value={tier.value}
                              checked={field.value === tier.value}
                              onChange={() => field.onChange(tier.value)}
                              className="peer sr-only"
                            />
                            <label
                              htmlFor={tier.value}
                              className="flex items-center justify-between p-4 border-2 border-neutral-200 rounded-lg cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover:border-neutral-300 transition-colors"
                            >
                              <div>
                                <div className="font-medium text-neutral-800">{tier.label}</div>
                                <div className="text-sm text-neutral-500">{tier.description}</div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 4: Timeline */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="timeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Timeline</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timeline preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="urgent">Urgent (Rush job)</SelectItem>
                          <SelectItem value="standard">Standard (Normal schedule)</SelectItem>
                          <SelectItem value="flexible">Flexible (Cost-optimized)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">Review Project Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Project Name:</strong> {form.getValues("name")}
                  </div>
                  <div>
                    <strong>Type:</strong> {form.getValues("type")}
                  </div>
                  <div>
                    <strong>Location:</strong> {form.getValues("location")}
                  </div>
                  <div>
                    <strong>Area:</strong> {form.getValues("area")} {form.getValues("unit")}
                  </div>
                  <div>
                    <strong>Material Tier:</strong> {form.getValues("materialTier")}
                  </div>
                  <div>
                    <strong>Timeline:</strong> {form.getValues("timeline")}
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-neutral-200">
              <Button
                type="button"
                variant="ghost"
                onClick={handlePrev}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>

                {currentStep < steps.length ? (
                  <Button type="button" onClick={handleNext}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={createProjectMutation.isPending}>
                    Complete Project
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
