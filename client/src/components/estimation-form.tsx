import { useState, useEffect, useRef } from "react";
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
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import LoginDialog from "./login-dialog";

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

// Helper to save estimate to Firestore
async function addEstimateToFirestore(estimate: any, project: any) {
  const user = auth.currentUser;
  await addDoc(collection(db, "estimates"), {
    userId: user ? user.uid : null,
    userEmail: user ? user.email : null,
    createdAt: serverTimestamp(),
    estimate,
    project,
    projectName: project.name,
    totalCost: estimate.totalCost,
  });
}

// Helper to save PDF to Firestore
async function savePDFToFirestore(pdfData: any, project: any, estimate: any) {
  const user = auth.currentUser;
  if (!user) return;
  
  // Check PDF size (Firestore has 1MB limit)
  if (pdfData.size > 1024 * 1024) {
    console.warn('PDF too large for Firestore storage:', pdfData.size);
    return;
  }
  
  try {
    await addDoc(collection(db, "pdfs"), {
      userId: user.uid,
      createdAt: serverTimestamp(),
      fileName: pdfData.fileName,
      pdfBase64: pdfData.pdfBase64,
      size: pdfData.size,
      projectName: project.name,
      totalCost: estimate.totalCost,
      // Store reference data for easy retrieval
      projectData: {
        name: project.name,
        type: project.type,
        location: project.location,
        area: project.area,
        unit: project.unit
      }
    });
    console.log('✅ PDF saved to Firestore successfully');
    
    // Clear localStorage after successful PDF storage
    localStorage.removeItem("estimation-upload");
    console.log('🧹 Cleared localStorage after PDF storage');
  } catch (error) {
    console.error('❌ Failed to save PDF to Firestore:', error);
  }
}

export default function EstimationForm({ onProjectUpdate, onEstimateUpdate, hasEstimate }: EstimationFormProps & { hasEstimate?: boolean }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [savedProjectId, setSavedProjectId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEstimating, setIsEstimating] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Generate estimate after project is created (files will be passed separately)
      generateEstimateMutation.mutate({ projectId: project.id, files: uploadedFiles });
      
      toast({
        title: "Project saved",
        description: "Your project has been saved successfully.",
      });
    },
    onError: () => {
      setIsEstimating(false);
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
    mutationFn: async ({ projectId, files }: { projectId: number; files?: any[] }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/estimate`, { files });
      return response.json();
    },
    onSuccess: async (estimate) => {
      console.log('Gemini estimate response:', estimate);
      onEstimateUpdate(estimate);
      
      // Save to Firestore
      try {
        await addEstimateToFirestore(estimate, form.getValues());
      } catch (e) {
        console.error('Failed to save estimate to Firestore', e);
      }
      
      // Auto-generate and download PDF
      try {
        console.log('🚀 Auto-generating PDF after Gemini response...');
        const { generatePDFReport } = await import('../lib/pdf-generator');
        const projectData = form.getValues();
        
        // Get uploaded files from localStorage for PDF generation
        const storedFiles = localStorage.getItem("estimation-upload");
        const uploadedFilesForPDF = storedFiles ? JSON.parse(storedFiles) : [];
        
        // Generate PDF with auto-download and get PDF data for Firestore
        const pdfData = await generatePDFReport(projectData, estimate, { 
          openInNewTab: false, // Don't open in new tab, just download
          username: auth.currentUser?.displayName || auth.currentUser?.email || 'User'
        });
        
        console.log('✅ PDF auto-generated and downloaded successfully');
        console.log('📊 PDF size:', pdfData.size, 'bytes');
        
        // Save PDF to Firestore
        await savePDFToFirestore(pdfData, projectData, estimate);
        
        toast({
          title: "Estimate Complete!",
          description: "Your cost estimate has been generated, downloaded, and saved to your account.",
        });
      } catch (error) {
        console.error('❌ Failed to auto-generate PDF:', error);
        toast({
          title: "Estimate Complete",
          description: "Your cost estimate has been generated. You can download the PDF report from the results page.",
          variant: "default",
        });
      }
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

  // Load files from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("estimation-upload");
    if (stored) {
      setUploadedFiles(JSON.parse(stored));
    }
  }, []);

  // Store files in localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("estimation-upload", JSON.stringify(uploadedFiles));
  }, [uploadedFiles]);

  // Handle isEstimating state
  useEffect(() => {
    if (!generateEstimateMutation.isPending) {
      setIsEstimating(false);
    }
  }, [generateEstimateMutation.isPending]);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArr = Array.from(files);
    const fileDataArr = await Promise.all(
      fileArr.map(
        file =>
          new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: reader.result,
              });
            };
            reader.readAsDataURL(file);
          })
      )
    );
    setUploadedFiles(prev => [...prev, ...fileDataArr]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove a file
  const handleRemoveFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = (data: ProjectFormData) => {
    // Check if user is logged in
    if (!auth.currentUser) {
      setLoginMessage("Please login to get your estimate");
      setLoginOpen(true);
      return;
    }
    setIsEstimating(true);
    // Attach uploaded files from localStorage
    const files = uploadedFiles;
    const payload = { ...data, files };
    
    if (savedProjectId) {
      // Update existing project, then generate estimate
      updateProjectMutation.mutate(payload);
      generateEstimateMutation.mutate({ projectId: savedProjectId, files });
    } else {
      // Create new project, estimate will be generated in createProjectMutation.onSuccess
      createProjectMutation.mutate(payload);
    }
    
    // Files will persist in localStorage for now
  };

  const handleNext = async () => {
    // Check if user is logged in
    if (!auth.currentUser) {
      setLoginMessage("Please login to continue with your estimate");
      setLoginOpen(true);
      return;
    }

    let fieldsToValidate: ("name" | "type" | "location" | "area" | "unit" | "materialTier" | "timeline")[] = [];
    if (currentStep === 1) fieldsToValidate = ["name", "type"];
    if (currentStep === 2) fieldsToValidate = ["location", "area", "unit"];
    if (currentStep === 3) fieldsToValidate = ["materialTier"];
    if (currentStep === 4) fieldsToValidate = ["timeline"];
    // Step 5 is review

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid && currentStep < steps.length) {
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

  const handleNewProject = () => {
    form.reset();
    setCurrentStep(1);
    setSavedProjectId(null);
    onProjectUpdate(null);
    onEstimateUpdate(null);
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <>
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
                            <Input placeholder="Enter city or state" {...field} />
                          </FormControl>
                          <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                        </div>
                        <p className="text-xs text-neutral-500">Please enter exact name for better results</p>
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
                              value={field.value === 0 ? "" : field.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === "" ? 0 : parseInt(val));
                              }}
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
                      <span className="text-neutral-500 font-normal"> - Images only</span>
                    </Label>
                    <div
                      className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mx-auto text-neutral-400 h-8 w-8 mb-2" />
                      <p className="text-sm text-neutral-600">Drop images here or click to browse</p>
                      <p className="text-xs text-neutral-500 mt-1">Max 10MB per file</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />
                    </div>
                    {uploadedFiles.length > 0 && (
                      <ul className="mt-2 text-left">
                        {uploadedFiles.map((file, idx) => (
                          <li key={idx} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
                            <span>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</span>
                            <button type="button" className="text-red-500 ml-2 text-xs" onClick={() => handleRemoveFile(idx)}>Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
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
                  disabled={currentStep === 1 || hasEstimate}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                <div className="flex space-x-3">
                  {!hasEstimate ? (
                    <>
                      {currentStep < steps.length ? (
                        <Button type="button" onClick={handleNext}>
                          Continue
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button type="submit" disabled={createProjectMutation.isPending || isEstimating} style={isEstimating ? { backgroundColor: '#ccc', color: '#fff', borderColor: '#ccc' } : {}}>
                          {isEstimating ? 'Calculating with AI...' : 'Get Estimate'}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button type="button" variant="default" onClick={handleNewProject}>
                      New Project Estimate
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
    </>
  );
}
