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
import { ArrowLeft, ArrowRight, Save, Upload, Home, Building, Wrench, ClipboardCheck, Shield, HardHat, User, MapPin, Info, Brain, Zap, CheckCircle, Loader2, X } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import LoginDialog from "./login-dialog";
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { userRoleManager, type UserRole } from "@/lib/user-role";

const projectSchema = z.object({
  // Shared fields (All Roles)
  name: z.string().min(1, "Project name is required"),
  projectType: z.enum(["residential", "commercial", "renovation"]),
  userRole: z.enum(["inspector", "insurance-adjuster", "contractor", "homeowner"]),
  location: z.object({
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
  }),
  structureType: z.string().min(1, "Structure type is required"),
  roofPitch: z.string().min(1, "Roof pitch is required"),
  roofAge: z.number().min(1, "Roof age is required"),
  materialLayers: z.array(z.string()).min(1, "At least one material layer is required"),
  iceWaterShield: z.boolean(),
  felt: z.enum(["15lb", "30lb", "synthetic", "none"]),
  dripEdge: z.boolean(),
  gutterApron: z.boolean(),
  pipeBoots: z.array(z.object({
    size: z.string(),
    quantity: z.number().min(1),
  })).optional(),
  fascia: z.object({
    size: z.string().optional(),
    type: z.string().optional(),
    condition: z.string().optional(),
  }).optional(),
  gutter: z.object({
    size: z.string().optional(),
    type: z.string().optional(),
    condition: z.string().optional(),
  }).optional(),
  
  // Inspector-specific fields
  inspectorInfo: z.object({
    name: z.string().optional(),
    license: z.string().optional(),
    contact: z.string().optional(),
  }).optional(),
  inspectionDate: z.string().optional(),
  weatherConditions: z.enum([
    "clear-sunny",
    "partly-cloudy", 
    "overcast",
    "light-rain",
    "heavy-rain",
    "snow",
    "windy",
    "post-storm"
  ]).optional(),
  accessTools: z.array(z.string()).optional(),
  slopeDamage: z.array(z.object({
    slope: z.string(),
    damageType: z.enum(["wind", "tree", "sagging", "hail", "ice", "age", "installation", "other"]),
    severity: z.enum(["minor", "moderate", "severe"]),
    description: z.string(),
  })).optional(),
  ownerNotes: z.string().optional(),
  
  // Contractor-specific fields
  jobType: z.enum(["full-replace", "partial-repair"]).optional(),
  materialPreference: z.enum(["luxury", "standard", "eco"]).optional(),
  laborNeeds: z.object({
    workerCount: z.enum(["1-2", "3-5", "6+"]).optional(),
    steepAssist: z.boolean().optional(),
  }).optional(),
  lineItems: z.array(z.string()).optional(),
  localPermit: z.boolean().optional(),
  
  // Shared fields for all roles
  preferredLanguage: z.enum([
    "english",
    "spanish", 
    "french",
    "german",
    "italian",
    "portuguese",
    "chinese",
    "japanese"
  ]).optional(),
  preferredCurrency: z.enum([
    "USD",
    "EUR", 
    "GBP",
    "CAD",
    "AUD",
    "JPY",
    "CHF"
  ]).optional(),

  // Homeowner-specific fields
  homeownerInfo: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  budgetStyle: z.enum(["basic", "balanced", "premium"]).optional(),
  jurisdictionLocation: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
    address: z.string().optional(),
  }).optional(),
  
  // Insurance Adjuster-specific fields
  insuranceAdjusterInfo: z.object({
    companyName: z.string().optional(),
    adjusterId: z.string().optional(),
    claimTypesHandled: z.array(z.string()).optional(),
    jurisdiction: z.string().optional(),
  }).optional(),
  
  // PDF-required fields for insurance reports
  claimNumber: z.string().optional(),
  policyholderName: z.string().optional(),
  adjusterName: z.string().optional(),
  adjusterContact: z.string().optional(),
  dateOfLoss: z.string().optional(),
  damageCause: z.string().optional(),
  coverageMapping: z.object({
    covered: z.array(z.string()).optional(),
    excluded: z.array(z.string()).optional(),
    maintenance: z.array(z.string()).optional(),
  }).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const steps = [
  { id: 1, name: "Role & Project", description: "Select your role and project type" },
  { id: 2, name: "Location", description: "Project location details" },
  { id: 3, name: "Roof Details", description: "Structure and roof specifications" },
  { id: 4, name: "Materials", description: "Roofing materials and components" },
  { id: 5, name: "Role Specific", description: "Role-specific information" },
  { id: 6, name: "Review", description: "Confirm all details" },
];

const projectTypes = [
  { value: "residential", label: "Residential", description: "Houses, condos, townhomes", icon: Home },
  { value: "commercial", label: "Commercial", description: "Offices, retail, warehouses", icon: Building },
  { value: "renovation", label: "Renovation", description: "Roof repairs and improvements", icon: Wrench },
];

const userRoles = [
  { value: "inspector", label: "Inspector", description: "Roof inspection professional", icon: ClipboardCheck },
  { value: "insurance-adjuster", label: "Insurance Adjuster", description: "Insurance adjuster/company", icon: Shield },
  { value: "contractor", label: "Contractor", description: "Roofing contractor", icon: HardHat },
  { value: "homeowner", label: "Homeowner", description: "Property owner", icon: User },
];

const structureTypes = [
  "Single Family Home",
  "Multi-Family",
  "Townhouse",
  "Condominium",
  "Commercial Building",
  "Warehouse",
  "Office Building",
  "Retail Store",
];

const roofPitches = [
  "Flat (0-2/12)",
  "Low Slope (2-4/12)",
  "Conventional (4-9/12)",
  "Steep Slope (9-12/12)",
  "Mansard (>12/12)",
];

const materialOptions = [
  "Asphalt Shingles",
  "Metal Roofing",
  "Clay Tiles",
  "Concrete Tiles",
  "Slate",
  "Wood Shingles/Shakes",
  "Synthetic Materials",
  "Built-up Roofing (BUR)",
  "Modified Bitumen",
  "EPDM",
  "TPO",
  "PVC",
];

const damageTypes = [
  { value: "wind", label: "Wind Damage" },
  { value: "hail", label: "Hail Damage" },
  { value: "tree", label: "Tree Impact" },
  { value: "sagging", label: "Structural Sagging" },
  { value: "ice", label: "Ice Dam Damage" },
  { value: "age", label: "Age-Related Wear" },
  { value: "installation", label: "Installation Defect" },
  { value: "other", label: "Other Damage" },
];

const weatherConditions = [
  { value: "clear-sunny", label: "Clear & Sunny" },
  { value: "partly-cloudy", label: "Partly Cloudy" },
  { value: "overcast", label: "Overcast" },
  { value: "light-rain", label: "Light Rain" },
  { value: "heavy-rain", label: "Heavy Rain" },
  { value: "snow", label: "Snow" },
  { value: "windy", label: "Windy" },
  { value: "post-storm", label: "Post-Storm" },
];

const accessToolOptions = [
  "Standard Ladder",
  "Extension Ladder",
  "Safety Harness & Ropes",
  "Steep Assist Equipment",
  "Scaffolding",
  "Aerial Lift",
  "Drone Inspection",
  "Binoculars (Ground Level)",
];

const coverageOptions = [
  "Shingles/Roofing Material",
  "Structural Damage",
  "Ice & Water Shield",
  "Flashing Repairs",
  "Gutters & Downspouts",
  "Interior Water Damage",
  "Temporary Repairs",
  "Code Upgrades",
  "Permit Fees",
  "Debris Removal",
];

const lineItemOptions = [
  "Shingles/Roofing Material",
  "Underlayment & Felt",
  "Ice & Water Shield",
  "Drip Edge & Trim",
  "Gutters & Downspouts", 
  "Flashing (All Types)",
  "Ridge Vents & Ventilation",
  "Soffit & Fascia",
  "Pipe Boots & Penetrations",
  "Chimney Work & Flashing",
  "Skylight Installation",
  "Attic Insulation",
  "Deck Repair/Replacement",
  "Structural Reinforcement",
  "Emergency Tarping",
  "Debris Removal",
  "Permit & Inspection Fees",
  "Material Delivery",
];

const languageOptions = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "italian", label: "Italian" },
  { value: "portuguese", label: "Portuguese" },
  { value: "chinese", label: "Chinese" },
  { value: "japanese", label: "Japanese" },
];

const currencyOptions = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
];

interface EstimationFormProps {
  userRole?: string;
  onEstimateGenerated?: (estimate: any) => void;
  onReportSaved?: () => void;
  disableRoleSelection?: boolean;
  onFieldFocus?: (field: string) => void;
  hasEstimate?: boolean;
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

// Utility function to sanitize data for Firebase (remove undefined values)
function sanitizeForFirebase(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirebase).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const sanitizedValue = sanitizeForFirebase(value);
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      }
    }
    return sanitized;
  }
  
  return obj;
}

// Helper to save report to Firestore (input data, Gemini JSON, PDF ref)
async function saveReportToFirestore(project: any, estimate: any, pdfDocId: string) {
  const user = auth.currentUser;
  
  // Sanitize project data to remove undefined values
  const sanitizedProjectData = sanitizeForFirebase(project);
  const sanitizedGeminiResponse = sanitizeForFirebase(estimate?.report || null);
  
  console.log('=== ESTIMATION FORM: Saving Report to Firestore ===');
  console.log('Original project data size:', JSON.stringify(project).length);
  console.log('Sanitized project data size:', JSON.stringify(sanitizedProjectData).length);
  console.log('Has undefined values in original:', JSON.stringify(project).includes('undefined'));
  console.log('Has undefined values in sanitized:', JSON.stringify(sanitizedProjectData).includes('undefined'));
  
  await addDoc(collection(db, "reports"), {
    userId: user ? user.uid : null,
    userEmail: user ? user.email : null,
    createdAt: serverTimestamp(),
    projectData: sanitizedProjectData,
    geminiResponse: sanitizedGeminiResponse,
    pdfRef: pdfDocId,
  });
}

// AI Loading Animation Component
function AILoadingOverlay() {
  const [currentPhase, setCurrentPhase] = useState(0);
  
  const phases = [
    { icon: Brain, text: "AI is analyzing your project details...", color: "text-orange-500" },
    { icon: Zap, text: "Processing roof specifications and materials...", color: "text-black" },
    { icon: MapPin, text: "Calculating regional cost factors...", color: "text-orange-600" },
    { icon: CheckCircle, text: "Generating comprehensive cost breakdown...", color: "text-black" },
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % phases.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  const currentPhaseData = phases[currentPhase];
  const IconComponent = currentPhaseData.icon;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-black rounded-full mx-auto mb-4 flex items-center justify-center">
            <Brain className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-neutral-800 mb-2">AI Cost Analysis</h3>
          <p className="text-sm text-neutral-600">Our AI is calculating your roofing estimate</p>
        </div>
        
        {/* Current Phase */}
        <div className="flex items-center space-x-4 mb-6">
          <div className={`w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center transition-all duration-500 ${currentPhaseData.color}`}>
            <IconComponent className="h-6 w-6 animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-800 transition-all duration-500">
              {currentPhaseData.text}
            </p>
          </div>
        </div>
        
        {/* Progress Indicators */}
        <div className="flex justify-center space-x-2 mb-6">
          {phases.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentPhase ? 'bg-orange-500 scale-125' : 
                index < currentPhase ? 'bg-black' : 'bg-neutral-300'
              }`}
            />
          ))}
        </div>
        
        {/* Animated Progress Bar */}
        <div className="w-full bg-neutral-200 rounded-full h-2 mb-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-black rounded-full animate-pulse transition-all duration-1000" 
               style={{ width: `${((currentPhase + 1) / phases.length) * 100}%` }}>
          </div>
        </div>
        
        {/* Bottom Text */}
        <div className="text-center">
          <p className="text-xs text-neutral-500 mb-2">
            Please wait while we process your information...
          </p>
          <div className="flex items-center justify-center space-x-1">
            <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
            <span className="text-xs text-orange-500 font-medium">Processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function EstimationForm({ userRole, onEstimateGenerated, onReportSaved, disableRoleSelection, onFieldFocus, hasEstimate }: EstimationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [savedProjectId, setSavedProjectId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEstimating, setIsEstimating] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jurisdictionLocation, setJurisdictionLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("homeowner");

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  // Listen for user role changes like the dashboard does
  useEffect(() => {
    const role = userRoleManager.getUserRoleSync();
    console.log('🔍 EstimationForm: Initial role from userRoleManager:', role);
    if (role) {
      setCurrentUserRole(role);
    }

    // Listen for role changes
    const unsubscribe = userRoleManager.onRoleChange((newRole) => {
      console.log('🔔 EstimationForm: Role changed to:', newRole);
      if (newRole) {
        setCurrentUserRole(newRole);
      }
    });

    return unsubscribe;
  }, []);

  // Use the current user role from state, fallback to prop, then default
  const effectiveUserRole = currentUserRole || userRole || "homeowner";

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      projectType: "residential",
      userRole: effectiveUserRole as "inspector" | "insurance-adjuster" | "contractor" | "homeowner",
      location: {
        country: "",
        city: "",
        zipCode: "",
      },
      structureType: "",
      roofPitch: "",
      roofAge: 0,
      materialLayers: [],
      iceWaterShield: false,
      felt: "none",
      dripEdge: false,
      gutterApron: false,
      pipeBoots: [],
      fascia: {
        size: "",
        type: "",
        condition: "",
      },
      gutter: {
        size: "",
        type: "",
        condition: "",
      },
      // Inspector defaults
      inspectorInfo: {
        name: "",
        license: "",
        contact: "",
      },
      inspectionDate: "",
      weatherConditions: undefined,
      accessTools: [],
      slopeDamage: [],
      ownerNotes: "",
      // Contractor defaults
      jobType: undefined,
      materialPreference: undefined,
      laborNeeds: {
        workerCount: undefined,
        steepAssist: false,
      },
      lineItems: [],
      localPermit: false,
      // Shared defaults for all roles
      preferredLanguage: undefined,
      preferredCurrency: undefined,
      
      // Homeowner defaults
      homeownerInfo: {
        name: "",
        email: "",
      },
      urgency: undefined,
      budgetStyle: undefined,
      jurisdictionLocation: {
        lat: undefined,
        lng: undefined,
        address: '',
      },
      // Insurance Adjuster defaults
      insuranceAdjusterInfo: {
        companyName: "",
        adjusterId: "",
        claimTypesHandled: [],
        jurisdiction: "",
      },
      // PDF-required fields defaults
      claimNumber: "",
      policyholderName: "",
      adjusterName: "",
      adjusterContact: "",
      dateOfLoss: "",
      damageCause: "",
      coverageMapping: {
        covered: [],
        excluded: [],
        maintenance: [],
      },
    },
  });

  // Update form when user role changes
  useEffect(() => {
    console.log('🔄 EstimationForm: Updating userRole to:', effectiveUserRole);
    form.setValue("userRole", effectiveUserRole as "inspector" | "insurance-adjuster" | "contractor" | "homeowner");
  }, [effectiveUserRole, form]);

  const selectedRole = form.watch("userRole");
  
  // Debug logging for role changes
  useEffect(() => {
    console.log('📋 EstimationForm: selectedRole is now:', selectedRole);
    console.log('📋 EstimationForm: effectiveUserRole is:', effectiveUserRole);
  }, [selectedRole, effectiveUserRole]);

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      // Calculate approximate area from roof details
      const estimatedArea = Math.max(800, 1000); // Default minimum area for roofing projects
      
      // Map material layers to material tier
      const getMaterialTier = (layers: string[]) => {
        const premiumMaterials = ['Slate', 'Clay Tiles', 'Metal Roofing'];
        const hasPremium = layers.some(layer => premiumMaterials.includes(layer));
        return hasPremium ? 'premium' : 'standard';
      };
      
      // Ensure location is properly formatted
      const location = data.location 
        ? `${data.location.city || ''}, ${data.location.country || ''} ${data.location.zipCode || ''}`.trim()
        : 'Location not specified';

      // Transform the complex form data to simple database schema
      const projectData = {
        name: data.name || 'Untitled Project', // Ensure name is never null
        type: data.projectType || 'residential', // Ensure type is never null
        location: location, // Location is now guaranteed to be a string
        area: estimatedArea, // Area is guaranteed to be a number
        unit: "sqft", // Default unit
        materialTier: getMaterialTier(data.materialLayers || []),
        timeline: data.urgency || "standard",
        status: "draft",
        // Store the full form data in uploadedFiles as JSON for now
        uploadedFiles: [JSON.stringify({ ...data, userRole: data.userRole })]
      };
      
      console.log('=== FRONTEND: Create Project Mutation ===');
      console.log('Transformed project data being sent to backend:', projectData);
      console.log('Original form data userRole:', data.userRole);
      console.log('JSON.stringify of uploadedFiles:', JSON.stringify(projectData.uploadedFiles));

      // Validate required fields before sending
      if (!projectData.name || !projectData.type || !projectData.location || !projectData.area) {
        throw new Error('Missing required fields');
      }

      const response = await apiRequest("POST", "/api/projects", projectData);
      return response.json();
    },
    onSuccess: (project) => {
      console.log('=== FRONTEND: Create Project Success ===');
      console.log('Created project response:', project);
      console.log('Project ID:', project.id);
      console.log('Uploaded files for estimate:', uploadedFiles);
      
      setSavedProjectId(project.id);
      
      // Generate estimate after project is created (files will be passed separately)
      generateEstimateMutation.mutate({ projectId: project.id, files: uploadedFiles });
      
      toast({
        title: "Project saved",
        description: "Your project has been saved successfully.",
      });
    },
    onError: (error) => {
      setIsEstimating(false);
      console.error('Project creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      // Calculate approximate area from roof details
      const estimatedArea = Math.max(800, 1000); // Default minimum area for roofing projects
      
      // Map material layers to material tier
      const getMaterialTier = (layers: string[]) => {
        const premiumMaterials = ['Slate', 'Clay Tiles', 'Metal Roofing'];
        const hasPremium = layers.some(layer => premiumMaterials.includes(layer));
        return hasPremium ? 'premium' : 'standard';
      };
      
      // Transform the complex form data to simple database schema
      const projectData = {
        name: data.name || 'Untitled Project',
        type: data.projectType || 'residential',
        location: `${data.location.city}, ${data.location.country} ${data.location.zipCode}`,
        area: estimatedArea,
        unit: "sqft",
        materialTier: getMaterialTier(data.materialLayers || []),
        timeline: data.urgency || "standard",
        status: "draft",
        // Store the full form data in uploadedFiles as JSON for now
        uploadedFiles: [JSON.stringify({ ...data, userRole: data.userRole })]
      };
      
      console.log('=== FRONTEND: Update Project Mutation ===');
      console.log('Transformed project data being sent to backend:', projectData);
      console.log('Original form data userRole:', data.userRole);
      console.log('JSON.stringify of uploadedFiles:', JSON.stringify(projectData.uploadedFiles));

      // Validate required fields before sending
      if (!projectData.name || !projectData.type || !projectData.location || !projectData.area) {
        throw new Error('Missing required fields');
      }

      const response = await apiRequest("PATCH", `/api/projects/${savedProjectId}`, projectData);
      return response.json();
    },
    onSuccess: (project) => {
      toast({
        title: "Project updated",
        description: "Your project has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Project update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateEstimateMutation = useMutation({
    mutationFn: async ({ projectId, files }: { projectId: number; files?: any[] }) => {
      console.log('=== FRONTEND: Generate Estimate Mutation ===');
      console.log('Project ID:', projectId);
      console.log('Files being sent:', files);
      const response = await apiRequest("POST", `/api/projects/${projectId}/estimate`, { files });
      return response.json();
    },
    onSuccess: async (estimate) => {
      console.log('=== FRONTEND: Estimate Generated Successfully ===');
      console.log('Estimate data:', estimate);
      
      if (onEstimateGenerated) {
        onEstimateGenerated(estimate);
      }
      
      // Save to Firestore
      try {
        await addEstimateToFirestore(estimate, form.getValues());
        console.log('✅ Estimate saved to Firestore');
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
          openInNewTab: false,
          username: auth.currentUser?.email || 'User'
        });
        
        // Save PDF to Firestore if user is logged in
        let pdfDocId = null;
        if (pdfData) {
          const pdfDocRef = await addDoc(collection(db, "pdfs"), {
            userId: auth.currentUser?.uid,
            createdAt: serverTimestamp(),
            fileName: pdfData.fileName,
            pdfBase64: pdfData.pdfBase64,
            fileSize: pdfData.fileSize,
            timestamp: pdfData.timestamp,
            projectType: projectData.projectType,
            uploadedBy: pdfData.uploadedBy,
            projectData: {
              name: projectData.name,
              type: projectData.projectType,
              role: projectData.userRole,
              location: projectData.location,
              totalCost: estimate.totalCost
            }
          });
          pdfDocId = pdfDocRef.id;
          // Save report to Firestore (input, Gemini JSON, PDF ref)
          await saveReportToFirestore(projectData, estimate, pdfDocId);

          if (onReportSaved) {
            onReportSaved();
          }
          console.log('✅ PDF saved to Firestore');
        }
        
        // Clear localStorage after successful PDF storage
        localStorage.removeItem("estimation-upload");
        console.log('✅ PDF generation, storage, and report record completed');

        // Show success message
        toast({
          title: "Estimate Generated",
          description: "Your estimate and PDF report are ready.",
        });
      } catch (error) {
        console.error('PDF generation error:', error);
        toast({
          title: "Error",
          description: "Failed to generate PDF report. Please try again.",
          variant: "destructive",
        });
      } finally {
        // Always clear the loading state
        setIsEstimating(false);
      }
    },
    onError: (error) => {
      console.error('=== FRONTEND: Estimate Generation Error ===');
      console.error('Error:', error);
      setIsEstimating(false);
      toast({
        title: "Error",
        description: "Failed to generate estimate. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter(file => file.size <= maxSize);
    
    if (validFiles.length !== files.length) {
      toast({
        title: "File size limit exceeded",
        description: "Some files were too large (max 10MB per file).",
        variant: "destructive",
      });
    }
    
    const filePromises = validFiles.map(file => {
      return new Promise((resolve) => {
            const reader = new FileReader();
        reader.onload = () => resolve({
                name: file.name,
                size: file.size,
          type: file.type,
          data: reader.result
              });
            reader.readAsDataURL(file);
      });
    });
    
    const processedFiles = await Promise.all(filePromises);
    setUploadedFiles(prev => [...prev, ...processedFiles]);
    
    // Store in localStorage for persistence
    localStorage.setItem("estimation-upload", JSON.stringify([...uploadedFiles, ...processedFiles]));
  };

  const handleRemoveFile = (idx: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== idx);
    setUploadedFiles(newFiles);
    localStorage.setItem("estimation-upload", JSON.stringify(newFiles));
  };

  const onSubmit = (data: ProjectFormData) => {
    console.log('=== FRONTEND: Form Submit ===');
    console.log('Original form data:', data);
    console.log('userRole from form:', data.userRole);
    console.log('projectType from form:', data.projectType);
    console.log('location from form:', data.location);
    console.log('materialLayers from form:', data.materialLayers);
    console.log('urgency from form:', data.urgency);
    
    // Check if we're on the final step
    if (currentStep !== 6) {
      console.log('❌ Form submitted but not on final step. Current step:', currentStep);
      return;
    }
    
    // Validate the complete form before submitting
    console.log('🔍 Validating complete form...');
    const formData = form.getValues();
    console.log('Complete form data:', formData);
    
    // Check for required fields
    const requiredFields = ['name', 'userRole', 'projectType', 'location', 'structureType', 'roofPitch', 'roofAge', 'materialLayers'];
    const missingFields = requiredFields.filter(field => {
      const value = formData[field as keyof ProjectFormData];
      if (field === 'location') {
        const location = value as any;
        return !location?.country || !location?.city || !location?.zipCode;
      }
      if (field === 'materialLayers') {
        return !Array.isArray(value) || value.length === 0;
      }
      return !value;
    });
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      toast({
        title: "Missing Information",
        description: `Please fill in all required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      setIsEstimating(false);
      return;
    }
    
    console.log('✅ All required fields present, proceeding with estimate...');
    setIsEstimating(true);
    
    // Check if user is logged in for saving estimate
    const user = auth.currentUser;
    if (!user) {
      setLoginMessage("Please log in to save your estimate and generate a PDF report.");
      setLoginOpen(true);
      setIsEstimating(false);
      return;
    }

    if (savedProjectId) {
      updateProjectMutation.mutate(data);
    } else {
      createProjectMutation.mutate(data);
    }
  };

  // Map each step to the fields that should be validated
  const stepFields: Record<number, (keyof ProjectFormData)[]> = {
    1: ["name", "userRole", "projectType"],
    2: ["location"], // Validate the whole location object
    3: ["structureType", "roofPitch", "roofAge"],
    4: ["materialLayers", "felt", "iceWaterShield", "dripEdge", "gutterApron"],
    // Step 5 and 6 are role-specific or review, so skip validation here
    5: [], // Role-specific fields - validated separately
    6: [], // Review step - final validation in onSubmit
  };

  const handleNext = async () => {
    const fieldsToValidate = stepFields[currentStep] || [];
    const isValid = fieldsToValidate.length > 0 ? await form.trigger(fieldsToValidate as any) : true;
    console.log('Next clicked. Validation result:', isValid);
    console.log('Current form values:', form.getValues());
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNewProject = () => {
    window.location.reload();
  };

  // Load files from localStorage on component mount
  useEffect(() => {
    const storedFiles = localStorage.getItem("estimation-upload");
    if (storedFiles) {
      setUploadedFiles(JSON.parse(storedFiles));
    }
  }, []);

  // At the start of the EstimationForm component, after props destructuring:
  const handleFieldFocus = (fieldName: string) => {
    if (typeof onFieldFocus === 'function') {
      onFieldFocus(fieldName);
    }
  };

  const updateMapFromAddress = async (address: string) => {
    if (!address) return;
    
    const geocoder = new window.google.maps.Geocoder();
    try {
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(status);
          }
        });
      });

      if (results[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        const address = results[0].formatted_address;
        
        setJurisdictionLocation({ lat, lng, address });
        form.setValue('jurisdictionLocation', { lat, lng, address });

        // Parse address components
        const components = results[0].address_components;
        let city = '', country = '', zip = '';
        components.forEach((comp: any) => {
          if (comp.types.includes('locality')) city = comp.long_name;
          if (!city && comp.types.includes('administrative_area_level_2')) city = comp.long_name;
          if (!city && comp.types.includes('sublocality')) city = comp.long_name;
          if (comp.types.includes('country')) country = comp.long_name;
          if (comp.types.includes('postal_code')) zip = comp.long_name;
        });

        // Only update fields that weren't the source of this update
        const sourceField = form.getValues();
        if (!sourceField.location?.city && city) {
          form.setValue('location.city', city, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
        if (!sourceField.location?.country && country) {
          form.setValue('location.country', country, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
        if (!sourceField.location?.zipCode && zip) {
          form.setValue('location.zipCode', zip, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  // Watch location fields for changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!name) return;

      // Only proceed if it's a location field change
      if (!name.startsWith('location.')) return;

      const location = form.getValues('location');
      if (!location) return;

      // Build address string based on available fields
      const addressParts = [];
      if (location.city) addressParts.push(location.city);
      if (location.country) addressParts.push(location.country);
      if (location.zipCode) addressParts.push(location.zipCode);

      // Only geocode if we have enough information
      if (addressParts.length > 0) {
        updateMapFromAddress(addressParts.join(', '));
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const detectUserLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location detection. Please enter your location manually.",
        variant: "destructive"
      });
      return;
    }

    if (!isLoaded) {
      toast({
        title: "Map not ready",
        description: "Please wait for the map to load and try again.",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        
        try {
          const geocoder = new google.maps.Geocoder();
          const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results) {
                resolve(results);
              } else {
                reject(status);
              }
            });
          });

          if (results[0]) {
            const address = results[0].formatted_address;
            setJurisdictionLocation({ lat, lng, address });
            form.setValue('jurisdictionLocation', { lat, lng, address });

            // Parse address components
            const components = results[0].address_components;
            let city = '', country = '', zip = '';
            components.forEach((comp: any) => {
              if (comp.types.includes('locality')) city = comp.long_name;
              if (!city && comp.types.includes('administrative_area_level_2')) city = comp.long_name;
              if (!city && comp.types.includes('sublocality')) city = comp.long_name;
              if (comp.types.includes('country')) country = comp.long_name;
              if (comp.types.includes('postal_code')) zip = comp.long_name;
            });

            // Update form fields
            if (city) form.setValue('location.city', city, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            if (country) form.setValue('location.country', country, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            if (zip) form.setValue('location.zipCode', zip, { shouldDirty: true, shouldTouch: true, shouldValidate: true });

            toast({
              title: "Location detected",
              description: "Your location has been automatically filled in.",
              variant: "default"
            });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          toast({
            title: "Location detection failed",
            description: "Could not determine your exact location. Please enter it manually.",
            variant: "destructive"
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let message = "Please enter your location manually.";
        if (error.code === 1) {
          message = "Location access was denied. Please enter your location manually or allow location access and try again.";
        }
        toast({
          title: "Location detection failed",
          description: message,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  // Try to detect location when component mounts and map is loaded
  useEffect(() => {
    if (!jurisdictionLocation && isLoaded) {
      detectUserLocation();
    }
  }, [isLoaded]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
      
      <Card>
        <CardContent className="p-8">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-neutral-800">Real Estate Calculator</h2>
              {hasEstimate && (
                <Button onClick={handleNewProject} variant="outline" size="sm">
                  New Project
                </Button>
              )}
        </div>
            <Progress value={(currentStep / steps.length) * 100} className="mb-4" />
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-neutral-800">{steps[currentStep - 1].name}</h3>
                <p className="text-sm text-neutral-600">{steps[currentStep - 1].description}</p>
              </div>
              <span className="text-sm text-neutral-500">Step {currentStep} / {steps.length}</span>
        </div>
      </div>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Step 1: Role & Project Type */}
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
                    name="userRole"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Your Role</FormLabel>
                        <div className="p-3 border rounded bg-neutral-50 text-base font-medium">
                          {userRoles.find(r => r.value === userRole)?.label || userRole}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <Select value={field.value} onValueChange={val => field.onChange(val)}>
                          <FormControl>
                            <SelectTrigger onFocus={() => handleFieldFocus('projectType')}>
                              <SelectValue placeholder="Select project type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center">
                                  <type.icon className="mr-2 h-4 w-4" />
                                  <div className="flex flex-col items-start">
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-xs text-neutral-500">{type.description}</div>
                      </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

              {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                      name="location.country"
                  render={({ field }) => (
                    <FormItem>
                          <FormLabel>Country</FormLabel>
                        <FormControl>
                            <Input placeholder="USA" {...field} onFocus={() => handleFieldFocus('location.country')} />
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                  <FormField
                    control={form.control}
                      name="location.city"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>City</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter city" {...field} onFocus={() => handleFieldFocus('location.city')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                      name="location.zipCode"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} onFocus={() => handleFieldFocus('location.zipCode')} />
                          </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-neutral-700 mb-2">
                      Upload Photos (Optional)
                      <span className="text-neutral-500 font-normal"> - Damage or roof images</span>
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
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Location (Map)</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={detectUserLocation}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Detect My Location
                    </Button>
                  </div>
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '300px' }}
                      center={jurisdictionLocation || { lat: 37.7749, lng: -122.4194 }}
                      zoom={jurisdictionLocation ? 12 : 4}
                      onClick={async (e) => {
                        const lat = e.latLng?.lat();
                        const lng = e.latLng?.lng();
                        if (lat && lng) {
                          const geocoder = new window.google.maps.Geocoder();
                          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                            if (status === 'OK' && results && results[0]) {
                              const address = results[0].formatted_address;
                              setJurisdictionLocation({ lat, lng, address });
                              form.setValue('jurisdictionLocation', { lat, lng, address });

                              // Parse address components
                              const components = results[0].address_components;
                              let city = '', country = '', zip = '';
                              components.forEach((comp: any) => {
                                if (comp.types.includes('locality')) city = comp.long_name;
                                if (!city && comp.types.includes('administrative_area_level_2')) city = comp.long_name;
                                if (!city && comp.types.includes('sublocality')) city = comp.long_name;
                                if (comp.types.includes('country')) country = comp.long_name;
                                if (comp.types.includes('postal_code')) zip = comp.long_name;
                              });

                              if (city) form.setValue('location.city', city, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                              if (country) form.setValue('location.country', country, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                              if (zip) form.setValue('location.zipCode', zip, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                            }
                          });
                        }
                      }}
                    >
                      {jurisdictionLocation && (
                        <Marker position={{ lat: jurisdictionLocation.lat, lng: jurisdictionLocation.lng }} />
                      )}
                    </GoogleMap>
                  ) : (
                    <div>Loading map...</div>
                  )}
                  {jurisdictionLocation && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Selected:</strong> {jurisdictionLocation.address || `${jurisdictionLocation.lat}, ${jurisdictionLocation.lng}`}
                    </div>
                  )}
                </div>
              </div>
            )}

              {/* Step 3: Roof Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                      name="structureType"
                  render={({ field }) => (
                    <FormItem>
                          <FormLabel>Structure Type</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isEstimating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select structure type" />
                            </SelectTrigger>
                            <SelectContent>
                              {structureTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="roofPitch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roof Pitch</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isEstimating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select roof pitch" />
                            </SelectTrigger>
                            <SelectContent>
                              {roofPitches.map((pitch) => (
                                <SelectItem key={pitch} value={pitch}>
                                  {pitch}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="roofAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Roof Age (years)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10"
                            {...field}
                            value={field.value === 0 ? "" : field.value}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? undefined : parseInt(val));
                            }}
                            onFocus={() => handleFieldFocus('roofAge')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

               {/* Step 4: Materials */}
               {currentStep === 4 && (
                 <div className="space-y-6">
                   <FormField
                     control={form.control}
                     name="materialLayers"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Material Layers (Bottom to Top)</FormLabel>
                         <div className="space-y-2">
                           <Select
                             onValueChange={(value) => {
                               if (!field.value) field.onChange([value]);
                               else if (!field.value.includes(value)) {
                                 field.onChange([...field.value, value]);
                               }
                             }}
                             disabled={isEstimating}
                           >
                             <SelectTrigger>
                               <SelectValue placeholder="Add material layer" />
                             </SelectTrigger>
                             <SelectContent>
                               {materialOptions.map((material) => (
                                 <SelectItem key={material} value={material}>
                                   {material}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>

                           {/* Show selected layers */}
                           {field.value && field.value.length > 0 && (
                             <div className="space-y-1">
                               {field.value.map((layer, index) => (
                                 <div key={index} className="flex items-center justify-between bg-neutral-50 p-2 rounded-md">
                                   <span className="text-sm">{index + 1}. {layer}</span>
                                   <Button
                                     type="button"
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => {
                                       const newLayers = [...field.value];
                                       newLayers.splice(index, 1);
                                       field.onChange(newLayers);
                                     }}
                                   >
                                     <X className="h-4 w-4" />
                                   </Button>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="felt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Felt Type</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isEstimating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="15lb">15 lb</SelectItem>
                              <SelectItem value="30lb">30 lb</SelectItem>
                              <SelectItem value="synthetic">Synthetic</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="iceWaterShield"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3" onFocus={() => handleFieldFocus('iceWaterShield')}>
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Ice/Water Shield</FormLabel>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dripEdge"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3" onFocus={() => handleFieldFocus('dripEdge')}>
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Drip Edge</FormLabel>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gutterApron"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3" onFocus={() => handleFieldFocus('gutterApron')}>
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Gutter Apron</FormLabel>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                 </div>
               )}

               {/* Step 5: Role-Specific Information */}
               {currentStep === 5 && (
                 <div className="space-y-6">
                   <h3 className="text-lg font-semibold text-neutral-800">
                     {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}-Specific Information
                   </h3>

                   {/* Inspector Fields */}
                   {selectedRole === "inspector" && (
                     <div className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="inspectorInfo.name"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Inspector Name</FormLabel>
                               <FormControl>
                                 <Input placeholder="Full name" {...field} onFocus={() => handleFieldFocus('inspectorInfo.name')} />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="inspectorInfo.license"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>License Number</FormLabel>
                               <FormControl>
                                 <Input placeholder="License #" {...field} onFocus={() => handleFieldFocus('inspectorInfo.license')} />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="inspectionDate"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Date of Inspection</FormLabel>
                               <FormControl>
                                 <Input type="date" {...field} onFocus={() => handleFieldFocus('inspectionDate')} />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="weatherConditions"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Weather Conditions</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select weather conditions" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   <SelectItem value="clear-sunny">Clear and Sunny</SelectItem>
                                   <SelectItem value="partly-cloudy">Partly Cloudy</SelectItem>
                                   <SelectItem value="overcast">Overcast</SelectItem>
                                   <SelectItem value="light-rain">Light Rain</SelectItem>
                                   <SelectItem value="heavy-rain">Heavy Rain</SelectItem>
                                   <SelectItem value="snow">Snow</SelectItem>
                                   <SelectItem value="windy">Windy</SelectItem>
                                   <SelectItem value="post-storm">Post-Storm</SelectItem>
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                       
                       {/* Slope Damage Section */}
                       <div className="space-y-4">
                         <Label className="text-base">Slope Damage Assessment</Label>
                         {form.watch("slopeDamage")?.map((_, index) => (
                           <Card key={index} className="p-4">
                             <CardContent className="space-y-4">
                               <FormField
                                 control={form.control}
                                 name={`slopeDamage.${index}.slope`}
                                 render={({ field }) => (
                                   <FormItem>
                                     <FormLabel>Slope Identifier</FormLabel>
                                     <FormControl>
                                       <Input placeholder="e.g. North, South, Front, etc." {...field} onFocus={() => handleFieldFocus(`slopeDamage.${index}.slope`)} />
                                     </FormControl>
                                     <FormMessage />
                                   </FormItem>
                                 )}
                               />

                               <FormField
                                 control={form.control}
                                 name={`slopeDamage.${index}.damageType`}
                                 render={({ field }) => (
                                   <FormItem>
                                     <FormLabel>Damage Type</FormLabel>
                                     <Select
                                       value={field.value}
                                       onValueChange={field.onChange}
                                       disabled={isEstimating}
                                     >
                                       <FormControl>
                                         <SelectTrigger>
                                           <SelectValue placeholder="Select damage type" />
                                         </SelectTrigger>
                                       </FormControl>
                                       <SelectContent>
                                         {damageTypes.map((type) => (
                                           <SelectItem key={type.value} value={type.value}>
                                             {type.label}
                                           </SelectItem>
                                         ))}
                                       </SelectContent>
                                     </Select>
                                     <FormMessage />
                                   </FormItem>
                                 )}
                               />

                               <FormField
                                 control={form.control}
                                 name={`slopeDamage.${index}.severity`}
                                 render={({ field }) => (
                                   <FormItem>
                                     <FormLabel>Damage Severity</FormLabel>
                                     <Select
                                       value={field.value}
                                       onValueChange={field.onChange}
                                       disabled={isEstimating}
                                     >
                                       <FormControl>
                                         <SelectTrigger>
                                           <SelectValue placeholder="Select severity" />
                                         </SelectTrigger>
                                       </FormControl>
                                       <SelectContent>
                                         <SelectItem value="minor">Minor</SelectItem>
                                         <SelectItem value="moderate">Moderate</SelectItem>
                                         <SelectItem value="severe">Severe</SelectItem>
                                       </SelectContent>
                                     </Select>
                                     <FormMessage />
                                   </FormItem>
                                 )}
                               />

                               <FormField
                                 control={form.control}
                                 name={`slopeDamage.${index}.description`}
                                 render={({ field }) => (
                                   <FormItem>
                                     <FormLabel>Damage Description</FormLabel>
                                     <FormControl>
                                       <Input placeholder="Detailed description of damage" {...field} onFocus={() => handleFieldFocus(`slopeDamage.${index}.description`)} />
                                     </FormControl>
                                     <FormMessage />
                                   </FormItem>
                                 )}
                               />

                               <Button
                                 type="button"
                                 variant="destructive"
                                 onClick={() => {
                                   const currentDamage = form.getValues("slopeDamage") || [];
                                   form.setValue(
                                     "slopeDamage",
                                     currentDamage.filter((_, i) => i !== index)
                                   );
                                 }}
                               >
                                 Remove Slope
                               </Button>
                             </CardContent>
                           </Card>
                         ))}

                         <Button
                           type="button"
                           variant="outline"
                           onClick={() => {
                             const currentDamage = form.getValues("slopeDamage") || [];
                             form.setValue("slopeDamage", [
                               ...currentDamage,
                               {
                                 slope: "",
                                 damageType: "wind",
                                 severity: "minor",
                                 description: ""
                               }
                             ]);
                           }}
                         >
                           Add Slope Damage
                         </Button>
                              </div>

                       <FormField
                         control={form.control}
                         name="ownerNotes"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Owner Notes</FormLabel>
                             <FormControl>
                               <Input placeholder="Additional notes from owner" {...field} onFocus={() => handleFieldFocus('ownerNotes')} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       
                       {/* Language and Currency Preferences */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="preferredLanguage"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Preferred Language</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select language" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   {languageOptions.map((language) => (
                                     <SelectItem key={language.value} value={language.value}>
                                       {language.label}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="preferredCurrency"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Preferred Currency</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select currency" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   {currencyOptions.map((currency) => (
                                     <SelectItem key={currency.value} value={currency.value}>
                                       {currency.label}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                     </div>
                   )}

                   {/* Contractor Fields */}
                   {selectedRole === "contractor" && (
                     <div className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="jobType"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Job Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isEstimating}
                      >
                        <FormControl>
                          <SelectTrigger>
                                     <SelectValue placeholder="Select job type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                                   <SelectItem value="full-replace">Full Replace</SelectItem>
                                   <SelectItem value="partial-repair">Partial Repair</SelectItem>
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="materialPreference"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Material Preference</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select material preference" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   <SelectItem value="luxury">Luxury</SelectItem>
                                   <SelectItem value="standard">Standard</SelectItem>
                                   <SelectItem value="eco">Eco</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
                       
                       {/* Labor Needs */}
                       <div className="space-y-3">
                         <h4 className="font-medium">Labor Needs</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField
                             control={form.control}
                             name="laborNeeds.workerCount"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Worker Count</FormLabel>
                                 <Select
                                   value={field.value}
                                   onValueChange={field.onChange}
                                   disabled={isEstimating}
                                 >
                                   <FormControl>
                                     <SelectTrigger>
                                       <SelectValue placeholder="Select worker count" />
                                     </SelectTrigger>
                                   </FormControl>
                                   <SelectContent>
                                     <SelectItem value="1-2">1-2 Workers</SelectItem>
                                     <SelectItem value="3-5">3-5 Workers</SelectItem>
                                     <SelectItem value="6+">6+ Workers</SelectItem>
                                   </SelectContent>
                                 </Select>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                           <FormField
                             control={form.control}
                             name="laborNeeds.steepAssist"
                             render={({ field }) => (
                               <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4" onFocus={() => handleFieldFocus('laborNeeds.steepAssist')}>
                                 <div className="space-y-0.5">
                                   <FormLabel className="text-base">Steep Assist</FormLabel>
                                   <div className="text-sm text-neutral-500">Requires steep assist equipment?</div>
                                 </div>
                                 <FormControl>
                                   <input
                                     type="checkbox"
                                     checked={field.value || false}
                                     onChange={field.onChange}
                                     className="h-4 w-4 text-primary"
                                   />
                                 </FormControl>
                               </FormItem>
                             )}
                           />
                         </div>
                       </div>
                       
                       {/* Line Items */}
                       <FormField
                         control={form.control}
                         name="lineItems"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Line Items to Include</FormLabel>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded p-3">
                               {lineItemOptions.map((item) => (
                                 <div key={item} className="flex items-center space-x-2">
                                   <input
                                     type="checkbox"
                                     id={`lineitem-${item}`}
                                     checked={field.value?.includes(item) || false}
                                     onChange={(e) => {
                                       const current = field.value || [];
                                       if (e.target.checked) {
                                         field.onChange([...current, item]);
                                       } else {
                                         field.onChange(current.filter((i: string) => i !== item));
                                       }
                                     }}
                                     onFocus={() => handleFieldFocus('lineItems')}
                                     className="h-4 w-4"
                                   />
                                   <label htmlFor={`lineitem-${item}`} className="text-sm">
                                     {item}
                                   </label>
                                 </div>
                               ))}
                             </div>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       
                       <FormField
                         control={form.control}
                         name="localPermit"
                         render={({ field }) => (
                           <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4" onFocus={() => handleFieldFocus('localPermit')}>
                             <div className="space-y-0.5">
                               <FormLabel className="text-base">Local Permit Required</FormLabel>
                               <div className="text-sm text-neutral-500">Does this job require local permits?</div>
                             </div>
                             <FormControl>
                               <input
                                 type="checkbox"
                                 checked={field.value}
                                 onChange={field.onChange}
                                 className="h-4 w-4 text-primary"
                               />
                             </FormControl>
                           </FormItem>
                         )}
                       />
                       
                       {/* Language and Currency Preferences */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="preferredLanguage"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Preferred Language</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select language" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   {languageOptions.map((language) => (
                                     <SelectItem key={language.value} value={language.value}>
                                       {language.label}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="preferredCurrency"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Preferred Currency</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select currency" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   {currencyOptions.map((currency) => (
                                     <SelectItem key={currency.value} value={currency.value}>
                                       {currency.label}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                     </div>
                   )}

                   {/* Homeowner Fields */}
                   {selectedRole === "homeowner" && (
                     <div className="space-y-4">
                       {/* Homeowner Info */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="homeownerInfo.name"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Your Name</FormLabel>
                               <FormControl>
                                 <Input placeholder="John Smith" {...field} onFocus={() => handleFieldFocus('homeownerInfo.name')} />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="homeownerInfo.email"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Email Address</FormLabel>
                               <FormControl>
                                 <Input type="email" placeholder="john@example.com" {...field} onFocus={() => handleFieldFocus('homeownerInfo.email')} />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="urgency"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Project Urgency</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select urgency" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   <SelectItem value="low">Low</SelectItem>
                                   <SelectItem value="medium">Medium</SelectItem>
                                   <SelectItem value="high">High</SelectItem>
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="budgetStyle"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Budget Style</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select budget style" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   <SelectItem value="basic">Basic</SelectItem>
                                   <SelectItem value="balanced">Balanced</SelectItem>
                                   <SelectItem value="premium">Premium</SelectItem>
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                       
                       {/* Preferences */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="preferredLanguage"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Preferred Language</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select language" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   {languageOptions.map((language) => (
                                     <SelectItem key={language.value} value={language.value}>
                                       {language.label}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="preferredCurrency"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Preferred Currency</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select currency" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   {currencyOptions.map((currency) => (
                                     <SelectItem key={currency.value} value={currency.value}>
                                       {currency.label}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                     </div>
                   )}

                   {/* Insurance Adjuster Fields */}
                   {selectedRole === "insurance-adjuster" && (
                     <div className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="insuranceAdjusterInfo.companyName"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Company Name</FormLabel>
                               <FormControl>
                                 <Input placeholder="Enter company name" {...field} onFocus={() => handleFieldFocus('insuranceAdjusterInfo.companyName')} />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="insuranceAdjusterInfo.adjusterId"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Adjuster ID</FormLabel>
                               <FormControl>
                                 <Input placeholder="Enter adjuster ID" {...field} onFocus={() => handleFieldFocus('insuranceAdjusterInfo.adjusterId')} />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="insuranceAdjusterInfo.jurisdiction"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Jurisdiction (Location)</FormLabel>
                                 <FormControl>
                                 <Input placeholder="Enter jurisdiction/location" {...field} onFocus={() => handleFieldFocus('insuranceAdjusterInfo.jurisdiction')} />
                                 </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="insuranceAdjusterInfo.claimTypesHandled"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Claim Types Handled</FormLabel>
                               <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-3">
                                 {[
                                   "Wind Damage",
                                   "Hail Damage", 
                                   "Water Damage",
                                   "Fire Damage",
                                   "Storm Damage",
                                   "Vandalism",
                                   "Theft",
                                   "Other"
                                 ].map((claimType) => (
                                   <div key={claimType} className="flex items-center space-x-2">
                                     <input
                                       type="checkbox"
                                       id={`claim-${claimType}`}
                                       checked={field.value?.includes(claimType) || false}
                                       onChange={(e) => {
                                         const current = field.value || [];
                                         if (e.target.checked) {
                                           field.onChange([...current, claimType]);
                                         } else {
                                           field.onChange(current.filter((item: string) => item !== claimType));
                                         }
                                       }}
                                       onFocus={() => handleFieldFocus('insuranceAdjusterInfo.claimTypesHandled')}
                                       className="h-4 w-4"
                                     />
                                     <label htmlFor={`claim-${claimType}`} className="text-sm">
                                       {claimType}
                                     </label>
                                   </div>
                                 ))}
                               </div>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                       
                       {/* PDF-required fields */}
                       <div className="space-y-4">
                         <h4 className="font-medium text-base border-b pb-2">Claim Information</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="claimNumber"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Claim Number</FormLabel>
                               <FormControl>
                                 <Input placeholder="Enter claim number" {...field} onFocus={() => handleFieldFocus('claimNumber')} />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                             name="policyholderName"
                           render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Policyholder Name</FormLabel>
                               <FormControl>
                                   <Input placeholder="Enter policyholder name" {...field} onFocus={() => handleFieldFocus('policyholderName')} />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                       
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField
                             control={form.control}
                             name="adjusterName"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Adjuster Name</FormLabel>
                                 <FormControl>
                                   <Input placeholder="Enter adjuster name" {...field} onFocus={() => handleFieldFocus('adjusterName')} />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                           <FormField
                             control={form.control}
                             name="adjusterContact"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Adjuster Contact</FormLabel>
                                 <FormControl>
                                   <Input placeholder="Enter adjuster contact info" {...field} onFocus={() => handleFieldFocus('adjusterContact')} />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField
                             control={form.control}
                             name="dateOfLoss"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Date of Loss</FormLabel>
                                 <FormControl>
                                   <Input type="date" {...field} onFocus={() => handleFieldFocus('dateOfLoss')} />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                           <FormField
                             control={form.control}
                             name="damageCause"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Primary Damage Cause</FormLabel>
                                 <Select
                                   value={field.value}
                                   onValueChange={field.onChange}
                                   disabled={isEstimating}
                                 >
                                   <FormControl>
                                     <SelectTrigger>
                                       <SelectValue placeholder="Select damage cause" />
                                     </SelectTrigger>
                                   </FormControl>
                                   <SelectContent>
                                     <SelectItem value="wind">Wind</SelectItem>
                                     <SelectItem value="hail">Hail</SelectItem>
                                     <SelectItem value="water">Water</SelectItem>
                                     <SelectItem value="fire">Fire</SelectItem>
                                     <SelectItem value="storm">Storm</SelectItem>
                                     <SelectItem value="vandalism">Vandalism</SelectItem>
                                     <SelectItem value="theft">Theft</SelectItem>
                                     <SelectItem value="other">Other</SelectItem>
                                   </SelectContent>
                                 </Select>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                         </div>
                       </div>
                       
                       {/* Coverage Mapping */}
                       <div className="space-y-4">
                         <h4 className="font-medium text-base border-b pb-2">Coverage Analysis</h4>
                         <div className="space-y-3">
                         <FormField
                           control={form.control}
                             name="coverageMapping.covered"
                           render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Covered Items</FormLabel>
                                 <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-3">
                                   {[
                                     "Roof replacement",
                                     "Gutter replacement", 
                                     "Fascia repair",
                                     "Drip edge installation",
                                     "Ice/water shield",
                                     "Ventilation repair",
                                     "Flashing repair",
                                     "Other structural damage"
                                   ].map((item) => (
                                     <div key={item} className="flex items-center space-x-2">
                                       <input
                                         type="checkbox"
                                         id={`covered-${item}`}
                                         checked={field.value?.includes(item) || false}
                                         onChange={(e) => {
                                           const current = field.value || [];
                                           if (e.target.checked) {
                                             field.onChange([...current, item]);
                                           } else {
                                             field.onChange(current.filter((i: string) => i !== item));
                                           }
                                         }}
                                         onFocus={() => handleFieldFocus('coverageMapping.covered')}
                                         className="h-4 w-4"
                                       />
                                       <label htmlFor={`covered-${item}`} className="text-sm">
                                         {item}
                                       </label>
                                     </div>
                                   ))}
                                 </div>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                           
                           <FormField
                             control={form.control}
                             name="coverageMapping.excluded"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Non-Covered Items</FormLabel>
                                 <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-3">
                                   {[
                                     "Pre-existing damage",
                                     "Wear and tear",
                                     "Maintenance items",
                                     "Cosmetic damage",
                                     "Code upgrades",
                                     "Permits and fees",
                                     "Debris removal",
                                     "Landscaping damage"
                                   ].map((item) => (
                                     <div key={item} className="flex items-center space-x-2">
                                       <input
                                         type="checkbox"
                                         id={`excluded-${item}`}
                                         checked={field.value?.includes(item) || false}
                                         onChange={(e) => {
                                           const current = field.value || [];
                                           if (e.target.checked) {
                                             field.onChange([...current, item]);
                                           } else {
                                             field.onChange(current.filter((i: string) => i !== item));
                                           }
                                         }}
                                         onFocus={() => handleFieldFocus('coverageMapping.excluded')}
                                         className="h-4 w-4"
                                       />
                                       <label htmlFor={`excluded-${item}`} className="text-sm">
                                         {item}
                                       </label>
                       </div>
                                   ))}
                     </div>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                           
                           <FormField
                             control={form.control}
                             name="coverageMapping.maintenance"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Maintenance Items</FormLabel>
                                 <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-3">
                                   {[
                                     "Gutter cleaning",
                                     "Roof cleaning",
                                     "Minor repairs",
                                     "Preventive maintenance",
                                     "Regular inspections",
                                     "Ventilation maintenance",
                                     "Sealant application",
                                     "General upkeep"
                                   ].map((item) => (
                                     <div key={item} className="flex items-center space-x-2">
                                       <input
                                         type="checkbox"
                                         id={`maintenance-${item}`}
                                         checked={field.value?.includes(item) || false}
                                         onChange={(e) => {
                                           const current = field.value || [];
                                           if (e.target.checked) {
                                             field.onChange([...current, item]);
                                           } else {
                                             field.onChange(current.filter((i: string) => i !== item));
                                           }
                                         }}
                                         onFocus={() => handleFieldFocus('coverageMapping.maintenance')}
                                         className="h-4 w-4"
                                       />
                                       <label htmlFor={`maintenance-${item}`} className="text-sm">
                                         {item}
                                       </label>
                                     </div>
                                   ))}
                                 </div>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                         </div>
                       </div>
                       
                       {/* Language and Currency Preferences */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="preferredLanguage"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Preferred Language</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select language" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   {languageOptions.map((language) => (
                                     <SelectItem key={language.value} value={language.value}>
                                       {language.label}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="preferredCurrency"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Preferred Currency</FormLabel>
                               <Select
                                 value={field.value}
                                 onValueChange={field.onChange}
                                 disabled={isEstimating}
                               >
                                 <FormControl>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select currency" />
                                   </SelectTrigger>
                                 </FormControl>
                                 <SelectContent>
                                   {currencyOptions.map((currency) => (
                                     <SelectItem key={currency.value} value={currency.value}>
                                       {currency.label}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </div>
                     </div>
                   )}

                   {/* Error message for unsupported roles */}
                   {!["inspector", "contractor", "homeowner", "insurance-adjuster"].includes(selectedRole) && (
                     <div className="text-center py-8">
                       <div className="text-red-600 font-medium mb-2">No Questions Available</div>
                       <p className="text-gray-600">There are no specific questions configured for the selected role: <strong>{selectedRole}</strong></p>
                     </div>
                   )}
                 </div>
               )}

               {/* Step 6: Review */}
               {currentStep === 6 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">Review Project Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Project Name:</strong> {form.getValues("name")}
                  </div>
                  <div>
                       <strong>Role:</strong> {form.getValues("userRole")}
                  </div>
                  <div>
                       <strong>Project Type:</strong> {form.getValues("projectType")}
                  </div>
                  <div>
                       <strong>Location:</strong> {form.getValues("location.city")}, {form.getValues("location.country")} {form.getValues("location.zipCode")}
                  </div>
                  <div>
                       <strong>Structure Type:</strong> {form.getValues("structureType")}
                  </div>
                  <div>
                       <strong>Roof Pitch:</strong> {form.getValues("roofPitch")}
                  </div>
                     <div>
                       <strong>Roof Age:</strong> {form.getValues("roofAge")} years
                </div>
                     <div>
                       <strong>Material Layers:</strong> {form.getValues("materialLayers").length} layers
                     </div>
                   </div>
                   {uploadedFiles.length > 0 && (
                     <div>
                       <strong>Uploaded Files:</strong> {uploadedFiles.length} file(s)
                     </div>
                   )}
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

                <div className="flex gap-2">
                    {currentStep < steps.length ? (
                    <Button type="button" onClick={handleNext} disabled={hasEstimate}>
                      Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                    <Button 
                      type="submit" 
                      disabled={isEstimating || hasEstimate}
                      onClick={async () => {
                        console.log('🔘 Generate Estimate button clicked! Current step:', currentStep, 'isEstimating:', isEstimating, 'hasEstimate:', hasEstimate);
                        
                        // Check form validation state
                        const formState = form.formState;
                        console.log('📋 Form state:', {
                          isValid: formState.isValid,
                          errors: formState.errors,
                          isDirty: formState.isDirty,
                          isSubmitting: formState.isSubmitting
                        });
                        
                        // Try to trigger validation manually
                        const isValid = await form.trigger();
                        console.log('🔍 Manual validation result:', isValid);
                        
                        if (!isValid) {
                          console.log('❌ Form validation failed. Errors:', form.formState.errors);
                        } else {
                          console.log('✅ Form is valid, should proceed to onSubmit');
                        }
                      }}
                    >
                      {isEstimating ? "Generating..." : "Generate Estimate"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    
    {/* AI Loading Overlay */}
    {isEstimating && <AILoadingOverlay />}
    </div>
  );
}
