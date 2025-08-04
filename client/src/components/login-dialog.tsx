import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Star, Shield, Users, User, HardHat, ClipboardCheck, Shield as ShieldIcon } from "lucide-react";
import { Check as CheckIcon } from "lucide-react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { useState, useEffect } from "react";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
  onStepChange?: (step: number) => void;
}

const provider = new GoogleAuthProvider();

const subscriptionPlans = [
  {
    id: "homeowner",
    name: "Homeowner",
    price: "$19.99",
    period: "month",
    yearlyPrice: "$199.99",
    description: "Limited access for homeowners",
    features: [
      "Homeowner template only",
      "Limited access",
      "Basic cost calculations",
      "Email support"
    ],
    icon: User,
    popular: false,
    planType: "limited"
  },
  {
    id: "contractor",
    name: "Contractor",
    price: "$97.99",
    period: "month",
    yearlyPrice: "$999.99",
    yearlyPeriod: "year",
    description: "Premium access for contractors",
    features: [
      "All templates",
      "Advanced features",
      "Priority support",
      "Detailed PDF reports",
      "Project comparison tools",
      "Custom branding"
    ],
    icon: HardHat,
    popular: true,
    planType: "premium"
  },
  {
    id: "inspector",
    name: "Inspector",
    price: "$97.99",
    period: "month",
    yearlyPrice: "$999.99",
    yearlyPeriod: "year",
    description: "Premium access for inspectors",
    features: [
      "All templates",
      "Advanced features",
      "Priority support",
      "Detailed PDF reports",
      "Project comparison tools",
      "Custom branding"
    ],
    icon: ClipboardCheck,
    popular: false,
    planType: "premium"
  },
  {
    id: "insurance-adjuster",
    name: "Insurance Adjuster",
    price: "$97.99",
    period: "month",
    yearlyPrice: "$999.99",
    yearlyPeriod: "year",
    description: "Premium access for insurance adjusters",
    features: [
      "All templates",
      "Advanced features",
      "Priority support",
      "Detailed PDF reports",
      "Project comparison tools",
      "Custom branding"
    ],
    icon: ShieldIcon,
    popular: false,
    planType: "premium"
  }
];

export default function LoginDialog({ open, onOpenChange, message, onStepChange }: LoginDialogProps) {
  const [isSignup, setIsSignup] = React.useState(false);
  const [signupStep, setSignupStep] = React.useState(1);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [selectedPlan, setSelectedPlan] = React.useState("contractor");
  const [selectedBilling, setSelectedBilling] = React.useState<"monthly" | "yearly">("monthly");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  
  // Role-specific form fields
  const [roleData, setRoleData] = React.useState({
    // Homeowner fields
    budgetRange: "",
    timelineUrgency: "",
    preferredMaterials: "",
    
    // Contractor fields
    businessName: "",
    crewSize: "",
    licenseNumber: "",
    jobTypesOffered: "",
    
    // Inspector fields
    licenseId: "",
    experienceYears: "",
    toolsUsed: "",
    
    // Insurance Adjuster fields
    companyName: "",
    adjusterId: "",
    claimTypesHandled: "",
    jurisdiction: "",
    jurisdictionLocation: { lat: 0, lng: 0, address: "" }
  });

  // Validation function for role-specific fields
  const validateRoleFields = () => {
    if (selectedPlan === "homeowner") {
      return roleData.budgetRange && roleData.timelineUrgency && roleData.preferredMaterials;
    } else if (selectedPlan === "contractor") {
      return roleData.businessName && roleData.crewSize && roleData.licenseNumber && roleData.jobTypesOffered;
    } else if (selectedPlan === "inspector") {
      return roleData.licenseId && roleData.experienceYears && roleData.toolsUsed;
    } else if (selectedPlan === "insurance-adjuster") {
      return roleData.companyName && roleData.adjusterId && roleData.claimTypesHandled && roleData.jurisdictionLocation.lat !== 0;
    }
    return false;
  };

  const isRoleFieldsValid = validateRoleFields();

  // Notify parent component when step changes
  React.useEffect(() => {
    if (onStepChange) {
      onStepChange(signupStep);
    }
  }, [signupStep, onStepChange]);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if the user is new by looking at metadata
      const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;
      
      console.log('=== GOOGLE AUTH ===');
      console.log('User Status:', isNewUser ? 'NEW USER' : 'EXISTING USER');
      console.log('Email:', user.email);
      console.log('Display Name:', user.displayName);
      console.log('Creation Time:', user.metadata.creationTime);
      console.log('Last Sign In:', user.metadata.lastSignInTime);
      
      if (isNewUser) {
        console.log('Setting up new user flow...');
        // For new users, show role selection immediately
        setIsSignup(true);
        setEmail(user.email || '');
        if (user.displayName) {
          setFullName(user.displayName);
        }
        // Skip to plan selection step
        setSignupStep(2);
        console.log('New user setup complete - dialog should stay open');
        // Keep dialog open for plan selection - DO NOT call onOpenChange(false)
        // The dialog will stay open and show the role selection
      } else {
        console.log('Existing user - closing dialog');
        // Existing user, just close the dialog
        onOpenChange(false);
      }
    } catch (e: any) {
      console.error('=== GOOGLE AUTH ERROR ===');
      console.error('Error:', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate passwords match for signup
    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    // Validate password length for signup
    if (isSignup && password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    if (isSignup) {
      // For signup, move to next step instead of creating account immediately
      setSignupStep(2);
      return;
    }
    
    setLoading(true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (signupStep === 1) {
      setSignupStep(2);
    } else if (signupStep === 2) {
      setSignupStep(3);
    } else if (signupStep === 3) {
      setSignupStep(4);
    }
  };

  const handlePrevStep = () => {
    if (signupStep === 2) {
      setSignupStep(1);
    } else if (signupStep === 3) {
      setSignupStep(2);
    } else if (signupStep === 4) {
      setSignupStep(3);
    }
  };

  const handleStartSubscription = async () => {
    setLoading(true);
    setError(null);
    try {
      // For Google users, we don't need to create account again
      const currentUser = auth.currentUser;
      if (!currentUser) {
        // Only create account if no user is signed in (email signup flow)
        await createUserWithEmailAndPassword(auth, email, password);
      }
      
      // Save the user role immediately
      const { userRoleManager } = await import("@/lib/user-role");
      userRoleManager.setUserRole(selectedPlan as any);
      
      console.log('=== ROLE SELECTED ===');
      console.log('Selected role:', selectedPlan);
      console.log('User role saved to localStorage');
      
      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedPlan,
          billingPeriod: selectedBilling,
          customerEmail: email,
          customerName: fullName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Close the dialog before redirecting
      onOpenChange(false);
      
      // Redirect to Stripe checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsSignup(s => !s);
    setSignupStep(1);
    // Reset form fields when switching modes
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setSelectedPlan("contractor");
    setSelectedBilling("monthly");
    setRoleData({
      budgetRange: "",
      timelineUrgency: "",
      preferredMaterials: "",
      businessName: "",
      crewSize: "",
      licenseNumber: "",
      jobTypesOffered: "",
      licenseId: "",
      experienceYears: "",
      toolsUsed: "",
      companyName: "",
      adjusterId: "",
      claimTypesHandled: "",
      jurisdiction: "",
      jurisdictionLocation: { lat: 0, lng: 0, address: "" }
    });
    setError(null);
  };

  const getPlanPrice = (plan: any) => {
    if (plan.id === "homeowner") {
      return plan.price;
    }
    return selectedBilling === "monthly" ? plan.price : plan.yearlyPrice;
  };

  const getPlanPeriod = (plan: any) => {
    if (plan.id === "homeowner") {
      return plan.period;
    }
    return selectedBilling === "monthly" ? plan.period : plan.yearlyPeriod;
  };

  const renderSignupStep = () => {
    switch (signupStep) {
      case 1:
        return (
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoFocus
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button type="submit" disabled={loading}>
              Continue
            </Button>
          </form>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            {/* Billing Toggle */}
            <div className="flex justify-center items-center gap-2 p-2 bg-gray-50 rounded-full w-fit mx-auto">
              <span 
                className={`px-4 py-2 rounded-full cursor-pointer text-sm ${
                  selectedBilling === 'monthly' ? 'bg-white shadow text-black' : 'text-gray-600'
                }`}
                onClick={() => setSelectedBilling('monthly')}
              >
                Monthly
              </span>
              <span 
                className={`px-4 py-2 rounded-full cursor-pointer text-sm ${
                  selectedBilling === 'yearly' ? 'bg-white shadow text-black' : 'text-gray-600'
                }`}
                onClick={() => setSelectedBilling('yearly')}
              >
                -15% Yearly
              </span>
            </div>

            {/* Plan Cards - Horizontal Layout */}
            <div className="grid grid-cols-4 gap-6">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPlan === plan.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <span className="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-lg mb-2 ${selectedPlan === plan.id ? 'bg-primary/10' : 'bg-gray-100'}`}>
                      <plan.icon className={`w-5 h-5 ${selectedPlan === plan.id ? 'text-primary' : 'text-gray-600'}`} />
                    </div>
                    <h4 className="font-medium text-sm mb-1 leading-tight">{plan.name}</h4>
                    <div className="mb-2">
                      <div className="text-lg font-bold">
                        {selectedBilling === 'yearly' && plan.yearlyPrice ? plan.yearlyPrice : plan.price}
                      </div>
                      <div className="text-xs text-gray-500">
                        /{selectedBilling === 'yearly' ? 'year' : 'month'}
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs">
                          <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="leading-tight text-left">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={handlePrevStep} disabled={loading} size="sm">
                Back
              </Button>
              <Button onClick={handleNextStep} disabled={!selectedPlan || loading} size="sm">
                Continue
              </Button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-3">
            <div className="text-center mb-3">
              <h3 className="text-sm font-medium text-gray-900">Complete Your Profile</h3>
              <p className="text-xs text-gray-600">Please provide some additional information for your {selectedPlan} account</p>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {selectedPlan === "homeowner" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Budget Range <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={roleData.budgetRange}
                      onChange={(e) => setRoleData({...roleData, budgetRange: e.target.value})}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !roleData.budgetRange ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select budget range</option>
                      <option value="under-5000">Under $5,000</option>
                      <option value="5000-10000">$5,000 - $10,000</option>
                      <option value="10000-20000">$10,000 - $20,000</option>
                      <option value="20000-50000">$20,000 - $50,000</option>
                      <option value="over-50000">Over $50,000</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Timeline Urgency <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={roleData.timelineUrgency}
                      onChange={(e) => setRoleData({...roleData, timelineUrgency: e.target.value})}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !roleData.timelineUrgency ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select urgency</option>
                      <option value="low">Low - No rush</option>
                      <option value="medium">Medium - Within 3 months</option>
                      <option value="high">High - Immediate need</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Preferred Materials <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={roleData.preferredMaterials}
                      onChange={(e) => setRoleData({...roleData, preferredMaterials: e.target.value})}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !roleData.preferredMaterials ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select materials</option>
                      <option value="asphalt">Asphalt Shingles</option>
                      <option value="metal">Metal Roofing</option>
                      <option value="tile">Tile Roofing</option>
                      <option value="slate">Slate Roofing</option>
                      <option value="wood">Wood Shakes</option>
                    </select>
                  </div>
                </>
              )}
              
              {selectedPlan === "contractor" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your business name"
                      value={roleData.businessName}
                      onChange={(e) => setRoleData({...roleData, businessName: e.target.value})}
                      className={`text-sm ${!roleData.businessName ? 'border-red-300' : ''}`}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Crew Size <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={roleData.crewSize}
                      onChange={(e) => setRoleData({...roleData, crewSize: e.target.value})}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !roleData.crewSize ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select crew size</option>
                      <option value="1-2">1-2 people</option>
                      <option value="3-5">3-5 people</option>
                      <option value="6-10">6-10 people</option>
                      <option value="10+">10+ people</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your license number"
                      value={roleData.licenseNumber}
                      onChange={(e) => setRoleData({...roleData, licenseNumber: e.target.value})}
                      className={`text-sm ${!roleData.licenseNumber ? 'border-red-300' : ''}`}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Job Types Offered <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={roleData.jobTypesOffered}
                      onChange={(e) => setRoleData({...roleData, jobTypesOffered: e.target.value})}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !roleData.jobTypesOffered ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select job types</option>
                      <option value="residential">Residential only</option>
                      <option value="commercial">Commercial only</option>
                      <option value="both">Both residential & commercial</option>
                      <option value="specialized">Specialized (metal, tile, etc.)</option>
                    </select>
                  </div>
                </>
              )}
              
              {selectedPlan === "inspector" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      License ID / Cert # <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your license or certification number"
                      value={roleData.licenseId}
                      onChange={(e) => setRoleData({...roleData, licenseId: e.target.value})}
                      className={`text-sm ${!roleData.licenseId ? 'border-red-300' : ''}`}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Experience (Years) <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={roleData.experienceYears}
                      onChange={(e) => setRoleData({...roleData, experienceYears: e.target.value})}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !roleData.experienceYears ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select experience</option>
                      <option value="0-2">0-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="6-10">6-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Tools Used <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={roleData.toolsUsed}
                      onChange={(e) => setRoleData({...roleData, toolsUsed: e.target.value})}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !roleData.toolsUsed ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select tools</option>
                      <option value="basic">Basic tools (ladder, camera)</option>
                      <option value="advanced">Advanced tools (drones, moisture meters)</option>
                      <option value="comprehensive">Comprehensive (all tools + software)</option>
                    </select>
                  </div>
                </>
              )}
              
              {selectedPlan === "insurance-adjuster" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your company name"
                      value={roleData.companyName}
                      onChange={(e) => setRoleData({...roleData, companyName: e.target.value})}
                      className={`text-sm ${!roleData.companyName ? 'border-red-300' : ''}`}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Adjuster ID <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your adjuster ID"
                      value={roleData.adjusterId}
                      onChange={(e) => setRoleData({...roleData, adjusterId: e.target.value})}
                      className={`text-sm ${!roleData.adjusterId ? 'border-red-300' : ''}`}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Claim Types Handled <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={roleData.claimTypesHandled}
                      onChange={(e) => setRoleData({...roleData, claimTypesHandled: e.target.value})}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !roleData.claimTypesHandled ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select claim types</option>
                      <option value="residential">Residential claims</option>
                      <option value="commercial">Commercial claims</option>
                      <option value="both">Both residential & commercial</option>
                      <option value="specialized">Specialized claims (hail, wind, etc.)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Jurisdiction (Location) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your jurisdiction/state"
                      value={roleData.jurisdiction}
                      onChange={(e) => setRoleData({...roleData, jurisdiction: e.target.value})}
                      className={`text-sm ${!roleData.jurisdiction ? 'border-red-300' : ''}`}
                    />
                    {/* Google Maps Picker */}
                    <JurisdictionMapPicker
                      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                      value={roleData.jurisdictionLocation}
                      onChange={(loc: { lat: number; lng: number; address: string }) => {
                        setRoleData({
                          ...roleData,
                          jurisdictionLocation: loc,
                          jurisdiction: loc.address || '' // auto-fill the jurisdiction field
                        });
                      }}
                    />
                    {roleData.jurisdictionLocation && (
                      <div className="mt-2 text-xs text-gray-600">
                        <strong>Selected:</strong> {roleData.jurisdictionLocation.address || `${roleData.jurisdictionLocation.lat}, ${roleData.jurisdictionLocation.lng}`}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex space-x-2 pt-2">
              <Button 
                variant="outline" 
                onClick={handlePrevStep}
                size="sm"
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleNextStep}
                disabled={!isRoleFieldsValid}
                size="sm"
                className="flex-1"
              >
                Next
              </Button>
            </div>
            {!isRoleFieldsValid && (
              <p className="text-xs text-red-500 text-center mt-2">
                Please fill in all required fields to continue
              </p>
            )}
          </div>
        );
      
      case 4:
        const selectedPlanData = subscriptionPlans.find(p => p.id === selectedPlan);
        const finalPrice = selectedPlanData ? getPlanPrice(selectedPlanData) : "";
        const finalPeriod = selectedPlanData ? getPlanPeriod(selectedPlanData) : "";
        
        return (
          <div className="space-y-3">
            <div className="text-center mb-3">
              <h3 className="text-sm font-medium text-gray-900">Review Your Subscription</h3>
              <p className="text-xs text-gray-600">Please review your details before starting</p>
            </div>
            
            <div className="bg-gray-50 rounded-md p-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium">{selectedPlanData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Billing:</span>
                  <span className="font-medium">{selectedBilling === "monthly" ? "Monthly" : "Yearly"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost:</span>
                  <span className="font-medium">{finalPrice}/{finalPeriod}</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 pt-2">
              <Button 
                variant="outline" 
                onClick={handlePrevStep}
                size="sm"
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleStartSubscription}
                disabled={loading}
                size="sm"
                className="flex-1"
              >
                {loading ? "Processing..." : "Start Subscription"}
              </Button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full px-8 py-6 overflow-hidden">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="text-base font-medium text-center">
            {isSignup 
              ? signupStep === 1 
                ? "Sign Up" 
                : signupStep === 2 
                  ? "Choose Plan" 
                  : signupStep === 3
                    ? "Your Profile"
                    : "Review"
              : "Login"
            }
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-gray-500">
            {isSignup 
              ? signupStep === 1 
                ? "Create a new account" 
                : signupStep === 2 
                  ? "Select your role and plan" 
                  : "Review your details before starting"
              : "Sign in to your account"
            }
          </DialogDescription>
        </DialogHeader>
        
        {message && <div className="text-center text-red-500 text-xs font-medium mb-2">{message}</div>}
        
        {isSignup ? renderSignupStep() : (
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
              Login
          </Button>
        </form>
        )}
        
        {!isSignup && (
          <>
        <div className="flex items-center my-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="mx-2 text-xs text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full">
          Continue with Google
        </Button>
          </>
        )}
        
        {(isSignup && signupStep === 1) && (
          <>
        <div className="flex items-center my-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="mx-2 text-xs text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full">
          Continue with Google
        </Button>
          </>
        )}
        
        <div className="text-center mt-2">
          <button
            type="button"
            className="text-primary underline text-xs"
            onClick={handleToggleMode}
          >
            {isSignup ? "Already have an account? Login" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 

function JurisdictionMapPicker({ apiKey, value, onChange }: {
  apiKey: string;
  value: { lat: number; lng: number; address: string };
  onChange: (loc: { lat: number; lng: number; address: string }) => void;
}) {
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey, libraries: ['places'] });
  const [marker, setMarker] = useState(value || null);
  useEffect(() => { if (value) setMarker(value); }, [value]);
  
  // Auto-fill jurisdiction field when marker/address changes
  useEffect(() => {
    if (marker && marker.address) {
      const jurisdictionInput = document.querySelector('input[placeholder="Enter your jurisdiction/state"]') as HTMLInputElement;
      if (jurisdictionInput && jurisdictionInput.value !== marker.address) {
        jurisdictionInput.value = marker.address;
        jurisdictionInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, [marker]);

  // Auto-detect user location on load if no marker is set
  useEffect(() => {
    if (isLoaded && !marker) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const address = results[0].formatted_address;
                setMarker({ lat, lng, address });
                onChange({ lat, lng, address });
              } else {
                setMarker({ lat, lng, address: '' });
                onChange({ lat, lng, address: '' });
              }
            });
          },
          (error) => {
            // User denied or error, do nothing
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    }
  }, [isLoaded, marker, onChange]);

  return isLoaded ? (
    <div className="my-2">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '200px' }}
        center={marker || { lat: 37.7749, lng: -122.4194 }}
        zoom={marker ? 12 : 4}
        onClick={async (e) => {
          const lat = e.latLng?.lat();
          const lng = e.latLng?.lng();
          let address = '';
          if (lat && lng) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                address = results[0].formatted_address;
                setMarker({ lat, lng, address });
                onChange({ lat, lng, address });
              } else {
                setMarker({ lat, lng, address: '' });
                onChange({ lat, lng, address: '' });
              }
            });
          }
        }}
      >
        {marker && <Marker position={{ lat: marker.lat, lng: marker.lng }} />}
      </GoogleMap>
    </div>
  ) : <div>Loading map...</div>;
} 