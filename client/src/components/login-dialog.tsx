'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import SignUpStepOne from './SignUpStepOne';
import ChoosePlanStep from './ChoosePlanStep';
import ProfileCompletionStep from './ProfileCompletionStep';
import ReviewSubscriptionStep from './ReviewSubscription';
import LoadingOverlay from './LoadingOverlay';
import { useRouter } from 'wouter';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
  onStepChange?: (step: number) => void;
}

const provider = new GoogleAuthProvider();

export const subscriptionPlans = [
  {
    id: 'homeowner',
    name: 'Homeowner',
    price: '$19.99',
    period: 'month',
    yearlyPrice: '$199.99',
    description: 'Limited access for homeowners',
    features: [
      'Homeowner template only',
      'Limited access',
      'Basic cost calculations',
      'Email support',
    ],
    icon: 'User',
    popular: false,
    planType: 'limited',
  },
  {
    id: 'contractor',
    name: 'Contractor',
    price: '$97.99',
    period: 'month',
    yearlyPrice: '$999.99',
    yearlyPeriod: 'year',
    description: 'Premium access for contractors',
    features: [
      'All templates',
      'Advanced features',
      'Priority support',
      'Detailed PDF reports',
      'Project comparison tools',
      'Custom branding',
    ],
    icon: 'HardHat',
    popular: true,
    planType: 'premium',
  },
  {
    id: 'inspector',
    name: 'Inspector',
    price: '$97.99',
    period: 'month',
    yearlyPrice: '$999.99',
    yearlyPeriod: 'year',
    description: 'Premium access for inspectors',
    features: [
      'All templates',
      'Advanced features',
      'Priority support',
      'Detailed PDF reports',
      'Project comparison tools',
      'Custom branding',
    ],
    icon: 'ClipboardCheck',
    popular: false,
    planType: 'premium',
  },
  {
    id: 'insurance-adjuster',
    name: 'Insurance Adjuster',
    price: '$97.99',
    period: 'month',
    yearlyPrice: '$999.99',
    yearlyPeriod: 'year',
    description: 'Premium access for insurance adjusters',
    features: [
      'All templates',
      'Advanced features',
      'Priority support',
      'Detailed PDF reports',
      'Project comparison tools',
      'Custom branding',
    ],
    icon: 'ShieldIcon',
    popular: false,
    planType: 'premium',
  },
];

export default function LoginDialog({ open, onOpenChange, message, onStepChange }: LoginDialogProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('contractor');
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const router = useRouter();

  const [roleData, setRoleData] = useState({
    budgetRange: '',
    timelineUrgency: '',
    preferredMaterials: '',
    businessName: '',
    crewSize: '',
    licenseNumber: '',
    jobTypesOffered: '',
    licenseId: '',
    experienceYears: '',
    toolsUsed: '',
    companyName: '',
    adjusterId: '',
    claimTypesHandled: '',
    jurisdiction: '',
    jurisdictionLocation: { lat: 0, lng: 0, address: '' },
  });

  useEffect(() => {
    if (onStepChange) {
      onStepChange(signupStep);
    }
  }, [signupStep, onStepChange]);

  // Prevent dialog closure during payment processing
  const handleOpenChange = (newOpen: boolean) => {
    if (isProcessingPayment) return; // Ignore close attempts during processing
    onOpenChange(newOpen);
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;
      console.log('=== GOOGLE AUTH ===', {
        user: isNewUser ? 'NEW USER' : 'EXISTING USER',
        email: user.email || 'N/A',
        displayName: user.displayName || 'N/A',
      });
      if (isNewUser) {
        setIsSignup(true);
        setIsGoogleAuth(true);
        setEmail(user.email || '');
        if (user.displayName) setFullName(user.displayName);
        setPassword('');
        setConfirmPassword('');
        setSignupStep(2);
      } else {
        handleOpenChange(false);
        router.navigate('/dashboard');
      }
    } catch (e: any) {
      console.error('=== GOOGLE AUTH ERROR ===', { error: e.message });
      setError(e.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isSignup) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      setSignupStep(2);
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      handleOpenChange(false);
      router.navigate('/dashboard');
    } catch (e: any) {
      setError(
        e.code === 'auth/user-not-found'
          ? 'No account found with this email'
          : e.message || 'Failed to sign in'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (signupStep === 1) setSignupStep(2);
    else if (signupStep === 2) setSignupStep(3);
    else if (signupStep === 3) setSignupStep(4);
  };

  const handlePrevStep = () => {
    if (signupStep === 2) setSignupStep(1);
    else if (signupStep === 3) setSignupStep(2);
    else if (signupStep === 4) setSignupStep(3);
  };

  const handleToggleMode = () => {
    if (isProcessingPayment) return; // Prevent mode toggle during processing
    setIsSignup((s) => !s);
    setSignupStep(1);
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setSelectedPlan('contractor');
    setSelectedBilling('monthly');
    setRoleData({
      budgetRange: '',
      timelineUrgency: '',
      preferredMaterials: '',
      businessName: '',
      crewSize: '',
      licenseNumber: '',
      jobTypesOffered: '',
      licenseId: '',
      experienceYears: '',
      toolsUsed: '',
      companyName: '',
      adjusterId: '',
      claimTypesHandled: '',
      jurisdiction: '',
      jurisdictionLocation: { lat: 0, lng: 0, address: '' },
    });
    setError(null);
    setIsProcessingPayment(false);
    setIsGoogleAuth(false);
  };

  const renderContent = () => {
    if (isSignup) {
      switch (signupStep) {
        case 1:
          return (
            <SignUpStepOne
              fullName={fullName}
              setFullName={setFullName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              error={error}
              loading={loading}
              handleEmailAuth={handleEmailAuth}
            />
          );
        case 2:
          return (
            <ChoosePlanStep
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
              selectedBilling={selectedBilling}
              setSelectedBilling={setSelectedBilling}
              loading={loading}
              handleNextStep={handleNextStep}
              handlePrevStep={handlePrevStep}
            />
          );
        case 3:
          return (
            <ProfileCompletionStep
              selectedPlan={selectedPlan}
              roleData={roleData}
              setRoleData={setRoleData}
              loading={loading}
              handleNextStep={handleNextStep}
              handlePrevStep={handlePrevStep}
            />
          );
        case 4:
          return (
            <ReviewSubscriptionStep
              fullName={fullName}
              email={email}
              password={password}
              isGoogleAuth={isGoogleAuth}
              selectedPlan={selectedPlan}
              selectedBilling={selectedBilling}
              error={error}
              loading={loading}
              isProcessingPayment={isProcessingPayment}
              setIsProcessingPayment={setIsProcessingPayment}
              setError={setError}
              handlePrevStep={handlePrevStep}
              roleData={roleData}
            />
          );
        default:
          return null;
      }
    } else {
      return (
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading || isProcessingPayment} className="w-full">
            Login
          </Button>
        </form>
      );
    }
  };

  return (
    <>
      <LoadingOverlay isProcessingPayment={isProcessingPayment} />
      <Dialog open={open && !isProcessingPayment} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl w-full px-8 py-6 overflow-hidden">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="text-base font-medium text-center">
              {isSignup
                ? signupStep === 1
                  ? 'Sign Up'
                  : signupStep === 2
                  ? 'Choose Plan'
                  : signupStep === 3
                  ? 'Your Profile'
                  : 'Review'
                : 'Login'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-gray-500">
              {isSignup
                ? signupStep === 1
                  ? 'Create a new account'
                  : signupStep === 2
                  ? 'Select your role and plan'
                  : signupStep === 3
                  ? 'Complete your profile information'
                  : 'Review your details before starting'
                : 'Sign in to your account'}
            </DialogDescription>
          </DialogHeader>
          {message && (
            <div className="text-center text-red-500 text-xs font-medium mb-2">
              {message}
            </div>
          )}
          {error && signupStep !== 4 && (
            <div className="text-center text-red-500 text-xs font-medium mb-2">
              {error}
            </div>
          )}
          {renderContent()}
          {!isSignup && (
            <>
              <div className="flex items-center my-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="mx-2 text-xs text-gray-400">OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <Button
                onClick={handleGoogle}
                disabled={loading || isProcessingPayment}
                variant="outline"
                className="w-full"
              >
                Continue with Google
              </Button>
            </>
          )}
          {isSignup && signupStep === 1 && (
            <>
              <div className="flex items-center my-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="mx-2 text-xs text-gray-400">OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <Button
                onClick={handleGoogle}
                disabled={loading || isProcessingPayment}
                variant="outline"
                className="w-full"
              >
                Continue with Google
              </Button>
            </>
          )}
          <div className="text-center mt-2">
            <button
              type="button"
              className="text-blue-600 underline text-xs hover:text-blue-800"
              onClick={handleToggleMode}
              disabled={loading || isProcessingPayment}
            >
              {isSignup
                ? 'Already have an account? Login'
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}