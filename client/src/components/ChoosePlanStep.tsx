"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Check as CheckIcon, ClipboardCheck, HardHat, Shield as ShieldIcon, User } from "lucide-react";
import { subscriptionPlans } from "./login-dialog";

interface ChoosePlanStepProps {
  selectedPlan: string;
  setSelectedPlan: (value: string) => void;
  selectedBilling: "monthly" | "yearly";
  setSelectedBilling: (value: "monthly" | "yearly") => void;
  loading: boolean;
  handleNextStep: () => void;
  handlePrevStep: () => void;
}

export default function ChoosePlanStep({
  selectedPlan,
  setSelectedPlan,
  selectedBilling,
  setSelectedBilling,
  loading,
  handleNextStep,
  handlePrevStep,
}: ChoosePlanStepProps) {
  const getIcon = (iconName: string, planId: string) => {
    const icons = {
      User: (
        <User
          className={`w-5 h-5 ${
            selectedPlan === planId ? "text-blue-600" : "text-gray-600"
          }`}
        />
      ),
      HardHat: (
        <HardHat
          className={`w-5 h-5 ${
            selectedPlan === planId ? "text-blue-600" : "text-gray-600"
          }`}
        />
      ),
      ClipboardCheck: (
        <ClipboardCheck
          className={`w-5 h-5 ${
            selectedPlan === planId ? "text-blue-600" : "text-gray-600"
          }`}
        />
      ),
      ShieldIcon: (
        <ShieldIcon
          className={`w-5 h-5 ${
            selectedPlan === planId ? "text-blue-600" : "text-gray-600"
          }`}
        />
      ),
    };
    return icons[iconName as keyof typeof icons] || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center items-center gap-2 p-2 bg-gray-50 rounded-full w-fit mx-auto">
        <span
          className={`px-4 py-2 rounded-full cursor-pointer text-sm ${
            selectedBilling === "monthly"
              ? "bg-white shadow text-black"
              : "text-gray-600"
          }`}
          onClick={() => setSelectedBilling("monthly")}
        >
          Monthly
        </span>
        <span
          className={`px-4 py-2 rounded-full cursor-pointer text-sm ${
            selectedBilling === "yearly"
              ? "bg-white shadow text-black"
              : "text-gray-600"
          }`}
          onClick={() => setSelectedBilling("yearly")}
        >
          -15% Yearly
        </span>
      </div>
      <div className="grid grid-cols-4 gap-6">
        {subscriptionPlans.map((plan) => (
          <div
            key={plan.id}
            className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedPlan === plan.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.popular && (
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                Popular
              </span>
            )}
            <div className="flex flex-col items-center text-center">
              <div
                className={`p-3 rounded-lg mb-2 ${
                  selectedPlan === plan.id ? "bg-blue-100" : "bg-gray-100"
                }`}
              >
                {getIcon(plan.icon, plan.id)} {/* Pass plan.id to getIcon */}
              </div>
              <h4 className="font-medium text-sm mb-1 leading-tight">
                {plan.name}
              </h4>
              <div className="mb-2">
                <div className="text-lg font-bold">
                  {selectedBilling === "yearly" && plan.yearlyPrice
                    ? plan.yearlyPrice
                    : plan.price}
                </div>
                <div className="text-xs text-gray-500">
                  /{selectedBilling === "yearly" ? "year" : "month"}
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
        <Button
          variant="outline"
          onClick={handlePrevStep}
          disabled={loading}
          size="sm"
        >
          Back
        </Button>
        <Button
          onClick={handleNextStep}
          disabled={!selectedPlan || loading}
          size="sm"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}