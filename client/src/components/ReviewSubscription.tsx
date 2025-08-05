'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { subscriptionPlans } from './login-dialog';

interface RoleData {
  budgetRange: string;
  timelineUrgency: string;
  preferredMaterials: string;
  businessName: string;
  crewSize: string;
  licenseNumber: string;
  jobTypesOffered: string;
  licenseId: string;
  experienceYears: string;
  toolsUsed: string;
  companyName: string;
  adjusterId: string;
  claimTypesHandled: string;
  jurisdiction: string;
  jurisdictionLocation: { lat: number; lng: number; address: string };
}

interface ReviewSubscriptionStepProps {
  fullName: string;
  email: string;
  password: string;
  isGoogleAuth: boolean;
  selectedPlan: string;
  selectedBilling: 'monthly' | 'yearly';
  error: string | null;
  loading: boolean;
  isProcessingPayment: boolean;
  setIsProcessingPayment: (value: boolean) => void;
  setError: (value: string | null) => void;
  handlePrevStep: () => void;
  roleData: RoleData;
}

export default function ReviewSubscriptionStep({
  fullName,
  email,
  password,
  isGoogleAuth,
  selectedPlan,
  selectedBilling,
  error,
  loading,
  isProcessingPayment,
  setIsProcessingPayment,
  setError,
  handlePrevStep,
  roleData,
}: ReviewSubscriptionStepProps) {
  const getPlanPrice = (plan: any) =>
    plan.id === 'homeowner' ? plan.price : selectedBilling === 'monthly' ? plan.price : plan.yearlyPrice;
  const getPlanPeriod = (plan: any) =>
    plan.id === 'homeowner' ? plan.period : selectedBilling === 'monthly' ? plan.period : plan.yearlyPeriod;

  const selectedPlanData = subscriptionPlans.find((p) => p.id === selectedPlan);
  const finalPrice = selectedPlanData ? getPlanPrice(selectedPlanData) : '';
  const finalPeriod = selectedPlanData ? getPlanPeriod(selectedPlanData) : '';

  const handleStartSubscription = async () => {
    setIsProcessingPayment(true);
    setError(null);
    try {
      const auth = getAuth();
      let currentUser = auth.currentUser;
      if (!currentUser && !isGoogleAuth) {
        if (!password) {
          throw new Error('Password is required to create an account');
        }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = result.user;
      }
      if (!currentUser) {
        throw new Error('No user authenticated');
      }

      // Mock user role manager
      const userRoleManager = {
        setUserRole: (role: string) => {
          console.log('=== ROLE SELECTED ===', {
            selectedRole: role,
            status: 'User role saved',
          });
        },
      };

      userRoleManager.setUserRole(selectedPlan);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedPlan,
          billingPeriod: selectedBilling,
          customerEmail: email || 'unknown@example.com',
          customerName: fullName || 'Unknown',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url; // Redirect to Stripe
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to process subscription');
      setIsProcessingPayment(false);
    }
    // Do not set isProcessingPayment to false here; let it persist until redirect
  };

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
            <span className="font-medium">{fullName || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{email || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Role:</span>
            <span className="font-medium">{selectedPlanData?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Billing:</span>
            <span className="font-medium">{selectedBilling === 'monthly' ? 'Monthly' : 'Yearly'}</span>
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
          disabled={loading || isProcessingPayment}
        >
          Back
        </Button>
        <Button
          onClick={handleStartSubscription}
          disabled={loading || isProcessingPayment}
          size="sm"
          className="flex-1"
        >
          {isProcessingPayment ? 'Processing...' : 'Start Subscription'}
        </Button>
      </div>
      {error && (
        <div className="text-red-500 text-sm text-center mt-2">{error}</div>
      )}
    </div>
  );
}