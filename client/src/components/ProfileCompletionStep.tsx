
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import JurisdictionMapPicker from './JurisdictionMapPicker';

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

interface ProfileCompletionStepProps {
  selectedPlan: string;
  roleData: RoleData;
  setRoleData: (data: RoleData) => void;
  loading: boolean;
  handleNextStep: () => void;
  handlePrevStep: () => void;
}

export default function ProfileCompletionStep({
  selectedPlan,
  roleData,
  setRoleData,
  loading,
  handleNextStep,
  handlePrevStep,
}: ProfileCompletionStepProps) {
  const validateRoleFields = () => {
    if (selectedPlan === 'homeowner') {
      return roleData.budgetRange && roleData.timelineUrgency && roleData.preferredMaterials;
    } else if (selectedPlan === 'contractor') {
      return roleData.businessName && roleData.crewSize && roleData.licenseNumber && roleData.jobTypesOffered;
    } else if (selectedPlan === 'inspector') {
      return roleData.licenseId && roleData.experienceYears && roleData.toolsUsed;
    } else if (selectedPlan === 'insurance-adjuster') {
      return (
        roleData.companyName &&
        roleData.adjusterId &&
        roleData.claimTypesHandled &&
        roleData.jurisdiction &&
        roleData.jurisdictionLocation.lat !== 0
      );
    }
    return false;
  };

  const isRoleFieldsValid = validateRoleFields();

  return (
    <div className="space-y-3">
      <div className="text-center mb-3">
        <h3 className="text-sm font-medium text-gray-900">Complete Your Profile</h3>
        <p className="text-xs text-gray-600">
          Please provide some additional information for your {selectedPlan} account
        </p>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {selectedPlan === 'homeowner' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Budget Range <span className="text-red-500">*</span>
              </label>
              <select
                value={roleData.budgetRange}
                onChange={(e) => setRoleData({ ...roleData, budgetRange: e.target.value })}
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
                onChange={(e) => setRoleData({ ...roleData, timelineUrgency: e.target.value })}
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
                onChange={(e) => setRoleData({ ...roleData, preferredMaterials: e.target.value })}
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
        {selectedPlan === 'contractor' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Business Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter your business name"
                value={roleData.businessName}
                onChange={(e) => setRoleData({ ...roleData, businessName: e.target.value })}
                className={`text-sm ${!roleData.businessName ? 'border-red-300' : ''}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Crew Size <span className="text-red-500">*</span>
              </label>
              <select
                value={roleData.crewSize}
                onChange={(e) => setRoleData({ ...roleData, crewSize: e.target.value })}
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
                onChange={(e) => setRoleData({ ...roleData, licenseNumber: e.target.value })}
                className={`text-sm ${!roleData.licenseNumber ? 'border-red-300' : ''}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Job Types Offered <span className="text-red-500">*</span>
              </label>
              <select
                value={roleData.jobTypesOffered}
                onChange={(e) => setRoleData({ ...roleData, jobTypesOffered: e.target.value })}
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
        {selectedPlan === 'inspector' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                License ID / Cert # <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter your license or certification number"
                value={roleData.licenseId}
                onChange={(e) => setRoleData({ ...roleData, licenseId: e.target.value })}
                className={`text-sm ${!roleData.licenseId ? 'border-red-300' : ''}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Experience (Years) <span className="text-red-500">*</span>
              </label>
              <select
                value={roleData.experienceYears}
                onChange={(e) => setRoleData({ ...roleData, experienceYears: e.target.value })}
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
                onChange={(e) => setRoleData({ ...roleData, toolsUsed: e.target.value })}
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
        {selectedPlan === 'insurance-adjuster' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter your company name"
                value={roleData.companyName}
                onChange={(e) => setRoleData({ ...roleData, companyName: e.target.value })}
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
                onChange={(e) => setRoleData({ ...roleData, adjusterId: e.target.value })}
                className={`text-sm ${!roleData.adjusterId ? 'border-red-300' : ''}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Claim Types Handled <span className="text-red-500">*</span>
              </label>
              <select
                value={roleData.claimTypesHandled}
                onChange={(e) => setRoleData({ ...roleData, claimTypesHandled: e.target.value })}
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
                onChange={(e) => setRoleData({ ...roleData, jurisdiction: e.target.value })}
                className={`text-sm ${!roleData.jurisdiction ? 'border-red-300' : ''}`}
              />
              <JurisdictionMapPicker
                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
                value={roleData.jurisdictionLocation}
                onChange={(loc) =>
                  setRoleData({
                    ...roleData,
                    jurisdictionLocation: loc,
                    jurisdiction: loc.address || roleData.jurisdiction,
                  })
                }
              />
              {roleData.jurisdictionLocation.lat !== 0 && roleData.jurisdictionLocation.address && (
                <div className="mt-2 text-xs text-gray-600">
                  <strong>Selected:</strong> {roleData.jurisdictionLocation.address}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex space-x-2 pt-2">
        <Button variant="outline" onClick={handlePrevStep} size="sm" className="flex-1" disabled={loading}>
          Back
        </Button>
        <Button onClick={handleNextStep} disabled={!isRoleFieldsValid || loading} size="sm" className="flex-1">
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
}
