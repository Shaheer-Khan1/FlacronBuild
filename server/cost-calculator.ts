import { z } from "zod";
import fetch from 'node-fetch';

export interface RealCostData {
  materialPrices: {
    concrete: number; // per cubic yard
    steel: number; // per ton
    lumber: number; // per board foot
    drywall: number; // per square foot
    roofing: number; // per square foot
    flooring: number; // per square foot
    electrical: number; // per square foot
    plumbing: number; // per fixture
    hvac: number; // per square foot
  };
  laborRates: {
    carpenter: number; // per hour
    electrician: number; // per hour
    plumber: number; // per hour
    general: number; // per hour
  };
  permitCosts: {
    residential: number; // base fee
    commercial: number; // base fee
    electrical: number; // per circuit
    plumbing: number; // per fixture
  };
}

export interface ProjectRequirements {
  type: 'residential' | 'commercial' | 'renovation' | 'infrastructure';
  area: number;
  location: string;
  materialTier: 'economy' | 'standard' | 'premium';
  timeline?: 'urgent' | 'standard' | 'flexible';
  
  // Detailed requirements
  stories?: number;
  bedrooms?: number;
  bathrooms?: number;
  garageSpaces?: number;
  foundationType?: 'slab' | 'crawl' | 'basement';
  roofType?: 'gable' | 'hip' | 'flat';
  exteriorMaterial?: 'vinyl' | 'brick' | 'stucco' | 'wood';
  
  // Role-based fields
  userRole?: 'inspector' | 'insurer' | 'contractor' | 'homeowner';
  role?: string;
  
  // Allow any additional properties from the form
  [key: string]: any;
}

// Real-time data sources for construction costs
export class RealCostCalculator {
  private geminiApiKey: string;

  constructor() {
    this.geminiApiKey = process.env.GEMINI_KEY || '';
    console.log('Gemini Key:', this.geminiApiKey ? this.geminiApiKey.slice(0, 8) + '...' : 'NOT SET');
  }

  async calculateRealCost(project: ProjectRequirements, imageUrls?: string[]): Promise<{
    totalCost: number;
    materialsCost: number;
    laborCost: number;
    permitsCost: number;
    contingencyCost: number;
    regionMultiplier: number;
    breakdown: any;
    dataSource: string;
    timeline: string;
    contingencySuggestions: string;
    report?: string;
    projectAnalysis?: string;
    marketConditions?: string;
    riskAssessment?: string;
    timelineScheduling?: string;
    recommendations?: string;
    imageAnalysis?: string[];
  }> {
    console.log('=== COST CALCULATOR: Received Project Data ===');
    console.log('Project object keys:', Object.keys(project));
    console.log('Project object size:', JSON.stringify(project).length, 'characters');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Extract userRole from project data
    const userRole = project.userRole || project.role || 'homeowner';
    console.log('=== COST CALCULATOR: Role Analysis ===');
    console.log('Extracted userRole:', userRole);
    console.log('project.userRole:', project.userRole);
    console.log('project.role:', project.role);
    
    // Debug all form data organized by role
    console.log('=== COST CALCULATOR: Form Data Verification ===');
    
    console.log('=== SHARED FIELDS ===');
    console.log('location:', project.location);
    console.log('structureType:', project.structureType);
    console.log('roofPitch:', project.roofPitch);
    console.log('roofAge:', project.roofAge);
    console.log('area:', project.area);
    console.log('materialTier:', project.materialTier);
    console.log('materialLayers:', project.materialLayers);
    console.log('iceWaterShield:', project.iceWaterShield);
    console.log('felt:', project.felt);
    console.log('dripEdge:', project.dripEdge);
    console.log('gutterApron:', project.gutterApron);
    console.log('pipeBoots:', project.pipeBoots);
    console.log('fascia:', project.fascia);
    console.log('gutter:', project.gutter);
    
    console.log('=== INSPECTOR FIELDS ===');
    console.log('inspectorInfo:', project.inspectorInfo);
    console.log('inspectionDate:', project.inspectionDate);
    console.log('weatherConditions:', project.weatherConditions);
    console.log('accessTools:', project.accessTools);
    console.log('slopeDamage:', project.slopeDamage);
    console.log('ownerNotes:', project.ownerNotes);
    
    console.log('=== INSURER FIELDS ===');
    console.log('claimNumber:', project.claimNumber);
    console.log('policyholderName:', project.policyholderName);
    console.log('adjusterName:', project.adjusterName);
    console.log('adjusterContact:', project.adjusterContact);
    console.log('dateOfLoss:', project.dateOfLoss);
    console.log('damageCause:', project.damageCause);
    console.log('coverageMapping:', project.coverageMapping);
    console.log('previousRepairs:', project.previousRepairs);
    
    console.log('=== CONTRACTOR FIELDS ===');
    console.log('jobType:', project.jobType);
    console.log('materialPreference:', project.materialPreference);
    console.log('laborNeeds:', project.laborNeeds);
    console.log('lineItems:', project.lineItems);
    console.log('localPermit:', project.localPermit);
    
    console.log('=== HOMEOWNER FIELDS ===');
    console.log('homeownerInfo:', project.homeownerInfo);
    console.log('urgency:', project.urgency);
    console.log('budgetStyle:', project.budgetStyle);
    console.log('preferredLanguage:', project.preferredLanguage);
    console.log('preferredCurrency:', project.preferredCurrency);
    
    console.log('=== COST CALCULATOR: Image Processing ===');
    console.log('Images received:', imageUrls ? imageUrls.length : 0);
    if (imageUrls && imageUrls.length > 0) {
      imageUrls.forEach((img, i) => {
        console.log(`Image ${i + 1} type:`, typeof img);
        console.log(`Image ${i + 1} object:`, img);
        // Check for base64 in a likely property (e.g., data, url, base64)
        const imgObj = img as any; // Cast to any to handle object properties
        const base64String = imgObj?.data || imgObj?.url || imgObj?.base64 || img;
        if (typeof base64String === 'string') {
          console.log(`Image ${i + 1} length:`, base64String.length);
          console.log(`Image ${i + 1} is base64:`, base64String.includes('base64'));
        } else {
          console.log(`Image ${i + 1} does not have a string property to check.`);
        }
      });
    }
    
    console.log('=== COST CALCULATOR: Building Prompt for Role:', userRole, '===');
    let prompt = this.buildRolePrompt(userRole, project);
    console.log('=== COST CALCULATOR: Generated Prompt Preview ===');
    console.log('Prompt length:', prompt.length, 'characters');
    console.log('Prompt starts with:', prompt.substring(0, 200), '...');

    // Build Gemini parts array with text and images
    const parts: any[] = [{ text: prompt }];
    
    // Process images for Gemini analysis if provided
    if (imageUrls && imageUrls.length > 0) {
      console.log('=== COST CALCULATOR: Adding Images to Gemini Request ===');
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        // Extract base64 string from object or use directly if it's a string
        const imgObj = imageUrl as any;
        const base64String = imgObj?.data || imgObj?.url || imgObj?.base64 || imageUrl;
        
        if (typeof base64String === 'string') {
          // Remove data:image/jpeg;base64, prefix if present
          const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
          parts.push({
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Data
            }
          });
          console.log(`Added image ${i + 1} to Gemini request (${base64Data.length} chars)`);
        } else {
          console.log(`Skipping image ${i + 1} - not a valid string format`);
        }
      }
    }

    console.log('=== COST CALCULATOR: Calling Gemini API ===');
    console.log('Gemini request parts count:', parts.length);
    console.log('Gemini request text part length:', parts[0].text.length);
    console.log('Gemini request image parts:', parts.length - 1);

    const geminiResponse = await this.queryGemini(parts);
    console.log('=== COST CALCULATOR: Gemini Response Received ===');
    console.log('Gemini response length:', geminiResponse.length, 'characters');
    console.log('Gemini response preview:', geminiResponse.substring(0, 500), '...');
    
    let reportJson;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanResponse = geminiResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Fix common JSON issues from Gemini
      // Fix unquoted number ranges like "estimatedDays": 5-8 -> "estimatedDays": "5-8"
      cleanResponse = cleanResponse.replace(/("estimatedDays":\s*)(\d+-\d+)([,\s}])/g, '$1"$2"$3');
      cleanResponse = cleanResponse.replace(/("totalHours":\s*)(\d+\.\d+)([,\s}])/g, '$1$2$3');
      
      console.log('=== COST CALCULATOR: Parsing JSON ===');
      console.log('Cleaned response length:', cleanResponse.length);
      console.log('Cleaned response preview:', cleanResponse.substring(0, 200), '...');
      
      reportJson = JSON.parse(cleanResponse);
      console.log('=== COST CALCULATOR: JSON Parsed Successfully ===');
      console.log('Report JSON keys:', Object.keys(reportJson));
      console.log('Materials cost:', reportJson.materialsCost);
      console.log('Labor cost:', reportJson.laborCost);
      console.log('Permits cost:', reportJson.permitsCost);
      
    } catch (e) {
      console.log('=== COST CALCULATOR: JSON Parse Error ===');
      console.log('Parse error:', e);
      console.log('Raw response causing error:', geminiResponse);
      throw new Error("Gemini did not return valid JSON: " + geminiResponse);
    }
    
    // Compose the breakdown and return
    console.log('=== COST CALCULATOR: Calculating Final Costs ===');
    
    // Extract costs from either direct fields or nested costEstimates structure
    let materialsCost = reportJson.materialsCost || reportJson.costEstimates?.materials?.total || 0;
    let laborCost = reportJson.laborCost || reportJson.costEstimates?.labor?.total || 0;
    let permitsCost = reportJson.permitsCost || 0;
    let equipmentCost = reportJson.costEstimates?.equipment?.total || 0;
    
    const baseCost = materialsCost + laborCost + permitsCost + equipmentCost;
    let contingencyCost = reportJson.contingencyCost;
    if (!contingencyCost || contingencyCost === 0) {
      contingencyCost = Math.round(baseCost * 0.07);
    }
    const totalCost = baseCost + contingencyCost;
    
    console.log('Base cost:', baseCost);
    console.log('Contingency cost:', contingencyCost);
    console.log('Total cost:', totalCost);
    
    const finalResult = {
      totalCost,
      materialsCost,
      laborCost,
      permitsCost,
      contingencyCost,
      regionMultiplier: 1.0, // Not used with Gemini
      breakdown: reportJson.breakdown || reportJson,
      dataSource: 'Gemini API',
      timeline: reportJson.timeline || reportJson.laborRequirements?.estimatedDays || 'Not specified',
      contingencySuggestions: reportJson.contingencySuggestions || 'Standard 7% contingency applied',
      report: reportJson,
      imageAnalysis: reportJson.imageAnalysis || imageUrls
    };
    
    console.log('=== COST CALCULATOR: Final Result ===');
    console.log('Final result keys:', Object.keys(finalResult));
    console.log('Final result size:', JSON.stringify(finalResult).length, 'characters');
    
    return finalResult;
  }

  private async queryGemini(parts: any[]): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`;
    const body = {
      contents: [
        {
          parts
        }
      ]
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch from Gemini API');
    }
    const data: any = await response.json();
    // Gemini returns the text in data.candidates[0].content.parts[0].text
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

  private parseGeminiResponse(response: string) {
    // Parse the Gemini response for the required fields
    let materialsCost = 0, laborCost = 0, permitsCost = 0, contingencyCost = 0;
    let timeline = '', contingencySuggestions = '', report = '';
    const breakdown: any = {};

    // Extract individual fields using regex patterns for better handling of multi-line content
    const materialMatch = response.match(/Material_Cost=([^\n\r]+)/);
    if (materialMatch) {
      materialsCost = parseFloat(materialMatch[1]);
        breakdown.materialsCost = materialsCost;
    }

    const laborMatch = response.match(/Labor_Cost=([^\n\r]+)/);
    if (laborMatch) {
      laborCost = parseFloat(laborMatch[1]);
        breakdown.laborCost = laborCost;
    }

    const permitsMatch = response.match(/Permits=([^\n\r]+)/);
    if (permitsMatch) {
      permitsCost = parseFloat(permitsMatch[1]);
        breakdown.permitsCost = permitsCost;
    }

    const timelineMatch = response.match(/Timeline=([^\n\r]+)/);
    if (timelineMatch) {
      timeline = timelineMatch[1];
        breakdown.timeline = timeline;
    }

    const contingencyMatch = response.match(/Contingency Suggestions=([^\n\r]+)/);
    if (contingencyMatch) {
      contingencySuggestions = contingencyMatch[1];
        // Try to extract a contingency cost if present in the suggestion
      const costMatch = contingencySuggestions.match(/\$([0-9,.]+)/);
      if (costMatch) {
        contingencyCost = parseFloat(costMatch[1].replace(/,/g, ''));
        }
      }

    // Extract the report content - everything after "Report=" until the end or next field (legacy support)
    const reportMatch = response.match(/Report=([\s\S]*?)(?:\n(?:Material_Cost|Labor_Cost|Permits|Timeline|Contingency Suggestions|Project Analysis|Market Conditions|Risk Assessment|Timeline Scheduling|Recommendations|imageAnalysis)=|$)/);
    if (reportMatch) {
      report = reportMatch[1].trim();
      breakdown.report = report;
    }

    return { 
      materialsCost, laborCost, permitsCost, contingencyCost, timeline, contingencySuggestions, report,
      breakdown 
    };
  }

  private buildRolePrompt(role: string, project: any) {
    console.log('buildRolePrompt called with role:', role);
    console.log('project data keys:', Object.keys(project));
    console.log('project.userRole:', project.userRole);
    switch (role) {
      case "inspector":
        return `You are a professional roof inspector conducting a thorough inspection. Generate a comprehensive Inspector Report based on this detailed project data: ${JSON.stringify(project)}

ANALYSIS REQUIREMENTS:
- Use the specific roof details: ${project.structureType}, ${project.roofPitch} pitch, ${project.roofAge} years old
- Material analysis: ${JSON.stringify(project.materialLayers)} with ${project.felt} felt, ice/water shield: ${project.iceWaterShield}
- Weather conditions: ${project.weatherConditions || 'Standard inspection conditions'}
- Equipment used: ${JSON.stringify(project.accessTools || ['Standard ladder', 'Safety harness'])}
- Damage assessment: ${JSON.stringify(project.slopeDamage || [])}

Return a JSON object with these professional inspection fields:
{
  "inspectorNameContact": "${project.inspectorInfo?.name || 'Inspector name not provided'} - License: ${project.inspectorInfo?.license || 'License not provided'}",
  "inspectionDateTime": "${project.inspectionDate || new Date().toLocaleDateString()}",
  "addressGpsCoordinates": "${project.location?.city || project.location}, ${project.location?.country || ''} ${project.location?.zipCode || ''}",
  "structureOverview": "${project.structureType} structure with ${project.roofPitch} roof pitch, materials: ${project.materialLayers?.join(', ')}, age: ${project.roofAge} years",
  "slopeConditionTable": ["[Analyze each slope from provided damage data: ${JSON.stringify(project.slopeDamage)} - only include actual reported damage, do not invent conditions]"],
  "roofingComponents": "Felt: ${project.felt}, Ice/Water Shield: ${project.iceWaterShield ? 'Present' : 'Not present'}, Drip Edge: ${project.dripEdge ? 'Present' : 'Absent'}, Gutter condition: ${project.gutter?.condition || 'Not specified'}, Fascia condition: ${project.fascia?.condition || 'Not specified'}",
  "inspectorNotesEquipment": "Weather conditions: ${project.weatherConditions || 'Not specified'}, Equipment used: ${project.accessTools?.join(', ') || 'Standard equipment'}, Owner notes: ${project.ownerNotes || 'None provided'}",
  "annotatedPhotographicEvidence": [
    // For each uploaded image, return a string annotation describing what is visible in that image. The array length MUST match the number of uploaded images, and the order MUST match the upload order. Do not invent or omit any entries. Example: ["Image 1: ...", "Image 2: ...", ...]
  ],
  "materialsCost": [Calculate materials cost for ${project.area || 1000} sq ft with ${project.materialTier} tier materials],
  "laborCost": [Calculate labor for ${project.roofPitch} roof with complexity factors],
  "permitsCost": [Calculate permits for ${project.projectType} in ${project.location?.city || project.location}],
  "contingencyCost": [Calculate 7% contingency on total],
  "timeline": "[Estimate based on ${project.urgency || project.timeline} priority and scope]",
  "contingencySuggestions": "[Professional contingency recommendations for roof type and condition]"
}

IMPORTANT DATA REQUIREMENTS:
- Use ONLY actual form data provided - do not generate random or fictional information
- For image analysis, describe only what is visible in uploaded images
- The annotatedPhotographicEvidence array MUST have one string per image, in the same order as uploaded, and no extra or missing entries
- Use actual names, dates, and information from the form data
- If information is not provided in the form, use "Not provided" or "Not specified"
- Do NOT include emojis in any field
- Do NOT invent details not present in the actual project data

Generate realistic, professional content using ALL the provided project details. Return ONLY the JSON object with no markdown formatting - pure JSON starting with {.`;

      case "insurer":
        return `You are an insurance adjuster conducting a comprehensive claim assessment. Generate a detailed Insurance Claim Report based on this project data: ${JSON.stringify(project)}

CLAIM ANALYSIS REQUIREMENTS:
Property Details:
- Structure: ${project.structureType}, ${project.roofAge} years old
- Materials: ${project.materialLayers?.join(', ')}
- Location: ${project.location?.city || project.location}, ${project.location?.country || ''} ${project.location?.zipCode || ''}
- Roof Area: ${project.area || 1000} sq ft, Pitch: ${project.roofPitch}

Claim Information:
- Claim Number: ${project.claimNumber || 'Pending'}
- Policyholder: ${project.policyholderName || 'Property owner'}
- Adjuster: ${project.adjusterName || 'Assigned adjuster'}
- Contact: ${project.adjusterContact || 'Contact pending'}
- Loss Date: ${project.dateOfLoss || 'Under investigation'}
- Cause: ${project.damageCause || 'Under investigation'}

Coverage Details:
- Covered Items: ${JSON.stringify(project.coverageMapping?.covered || [])}
- Excluded Items: ${JSON.stringify(project.coverageMapping?.excluded || [])}
- Maintenance Items: ${JSON.stringify(project.coverageMapping?.maintenance || [])}

IMAGE ANALYSIS REQUIREMENTS:
For each provided image, analyze and describe:
1. Visible Damage:
   - Type (wind, hail, water, etc.)
   - Location on roof
   - Severity (minor, moderate, severe)
   - Measurements if visible
2. Material Conditions:
   - Current state of roofing materials
   - Signs of aging or wear
   - Evidence of previous repairs
3. Insurance-Relevant Details:
   - Documentation of covered perils
   - Pre-existing conditions
   - Maintenance issues
4. Supporting Evidence:
   - Visible measurements or markers
   - Time/date stamps if present
   - Weather conditions visible
5. Professional Assessment:
   - Repair recommendations
   - Code compliance issues
   - Safety concerns

Return a JSON object with these EXACT insurance report sections:
{
  "claimMetadata": {
    "claimNumber": "${project.claimNumber || 'Not provided'}",
    "policyholder": "${project.policyholderName || 'Not provided'}",
    "adjusterName": "${project.adjusterName || 'Not provided'}",
    "adjusterContact": "${project.adjusterContact || 'Not provided'}",
    "dateOfLoss": "${project.dateOfLoss || 'Not provided'}",
    "dateOfInspection": "${new Date().toISOString().split('T')[0]}"
  },
  "inspectionSummary": {
    "propertyAddress": "${project.location?.city || project.location}, ${project.location?.country || ''} ${project.location?.zipCode || ''}",
    "structureType": "${project.structureType}",
    "roofAge": "${project.roofAge} years",
    "roofPitch": "${project.roofPitch}",
    "existingMaterials": "${project.materialLayers?.join(', ')}",
    "totalArea": "${project.area || 1000} sq ft",
    "weatherConditions": "${project.weatherConditions || 'Not recorded'}"
  },
  "coverageTable": {
    "coveredItems": ${JSON.stringify(project.coverageMapping?.covered || [])},
    "nonCoveredItems": ${JSON.stringify(project.coverageMapping?.excluded || [])},
    "maintenanceItems": ${JSON.stringify(project.coverageMapping?.maintenance || [])}
  },
  "stormDamageAssessment": {
    "primaryDamageCause": "${project.damageCause || 'Under investigation'}",
    "affectedComponents": ["${project.materialLayers?.join('", "')}"],
    "damageExtent": ${JSON.stringify(project.slopeDamage || [])},
    "impactedSystems": {
      "roofingSystem": ${JSON.stringify({
        "iceWaterShield": project.iceWaterShield ? "Damaged" : "N/A",
        "felt": project.felt,
        "dripEdge": project.dripEdge ? "Present" : "N/A",
        "gutterSystem": project.gutter?.condition || "Not specified",
        "fasciaCondition": project.fascia?.condition || "Not specified"
      })}
    }
  },
  "repairHistory": {
    "previousRepairs": "${project.previousRepairs || 'No prior repairs documented'}",
    "maintenanceRecords": "Documentation ${project.previousRepairs ? 'provided' : 'not provided'}"
  },
  "damageClassificationsTable": ${JSON.stringify(project.slopeDamage || []).replace(/"/g, '\\"')},
  "annotatedPhotos": [
    // For each uploaded image, return a string annotation describing what is visible in that image. The array length MUST match the number of uploaded images, and the order MUST match the upload order. Do not invent or omit any entries. Example: ["Image 1: ...", "Image 2: ...", ...]
  ],
  "legalCertificationNotes": {
    "propertyType": "${project.projectType}",
    "jurisdiction": "${project.location?.city || project.location}",
    "buildingCodes": "Local building codes and compliance requirements for ${project.location?.city || project.location}",
    "certificationStatement": "This report is prepared for insurance purposes by ${project.adjusterName || 'assigned adjuster'}, based on physical inspection and documentation review."
  }
}

IMPORTANT REQUIREMENTS:
1. Use ONLY actual form data - no fictional information
2. For photos, analyze ONLY uploaded images with focus on damage evidence
3. All measurements and conditions must be from actual form data
4. If information is missing, mark as "Not provided" or "Under investigation"
5. Format must match EXACTLY as shown above
6. NO emojis or informal language - this is a legal document
7. Include ALL sections even if some data is missing

IMPORTANT IMAGE ANALYSIS REQUIREMENTS:
1. Analyze ONLY the actual uploaded images
2. Describe ONLY visible damage and conditions
3. Include specific measurements ONLY if visible in the image
4. Note any visible evidence of covered perils
5. Document any visible pre-existing conditions
6. DO NOT invent or assume details not visible in the images
7. Use professional, insurance-appropriate terminology
8. The annotatedPhotos array MUST have one string per image, in the same order as uploaded, and no extra or missing entries

Generate comprehensive, insurance-focused content using ALL provided details. Return ONLY the JSON object with no markdown formatting - pure JSON starting with {.`;

      case "contractor":
        return `You are a professional roofing contractor analyzing a detailed project for estimation. Create a comprehensive contractor report using ALL the provided project data.

AVAILABLE PROJECT DATA TO USE:
- Location: ${project.location?.city || 'Not provided'}, ${project.location?.country || 'Not provided'} ${project.location?.zipCode || 'Not provided'}
- Structure: ${project.structureType || 'Not provided'}
- Roof Details: ${project.roofPitch || 'Not provided'} pitch, ${project.roofAge || 'Not provided'} years old
- Materials: ${project.materialLayers?.join(', ') || 'Not provided'}
- Job Type: ${project.jobType || 'Not provided'}
- Material Preference: ${project.materialPreference || 'Not provided'}
- Worker Count: ${project.laborNeeds?.workerCount || 'Not provided'}
- Steep Assist Needed: ${project.laborNeeds?.steepAssist ? 'Yes' : 'No'}
- Line Items Selected: ${project.lineItems?.join(', ') || 'Not provided'}
- Local Permit Required: ${project.localPermit ? 'Yes' : 'No'}
- Components: Ice Shield: ${project.iceWaterShield ? 'Yes' : 'No'}, Felt: ${project.felt || 'None'}, Drip Edge: ${project.dripEdge ? 'Yes' : 'No'}

Generate a detailed contractor report in JSON format with these exact sections:

{
  "projectDetails": {
    "address": "${project.location?.city || ''}, ${project.location?.country || ''} ${project.location?.zipCode || ''}",
    "type": "${project.projectType || 'Not specified'}",
    "dimensions": {
      "totalArea": ${project.area || 1200},
      "pitch": "${project.roofPitch || 'Not specified'}",
      "slopes": ${project.slopeDamage?.length || 1}
    }
  },
  "scopeOfWork": {
    "preparationTasks": [
      "Site assessment and safety setup",
      "Material delivery and staging",
      "Obtain ${project.localPermit ? 'required local permits' : 'permits if needed'}",
      "Weather monitoring and scheduling"
    ],
    "removalTasks": [
      ${project.jobType === 'full-replace' ? '"Complete removal of existing roofing materials"' : '"Partial removal of damaged sections"'},
      "Debris removal and disposal",
      "Deck inspection and repair preparation"
    ],
    "installationTasks": [
      ${project.lineItems?.includes('Underlayment & Felt') ? '"Install ' + (project.felt || '15lb') + ' felt underlayment",' : ''}
      ${project.iceWaterShield ? '"Install ice and water shield",' : ''}
      ${project.dripEdge ? '"Install drip edge and trim",' : ''}
      "Install ${project.materialLayers?.[0] || 'roofing materials'}",
      ${project.lineItems?.includes('Ridge Vents & Ventilation') ? '"Install ridge vents and ventilation",' : ''}
      ${project.lineItems?.includes('Flashing (All Types)') ? '"Install flashing systems",' : ''}
      "Final inspection and quality control"
    ],
    "finishingTasks": [
      "Site cleanup and debris removal",
      "Final walkthrough with client",
      "Warranty documentation"
    ]
  },
  "laborRequirements": {
    "crewSize": "${project.laborNeeds?.workerCount || '3-5'} workers",
    "estimatedDays": "${project.jobType === 'full-replace' ? '5-8' : '2-4'}",
    "specialEquipment": [
      ${project.laborNeeds?.steepAssist ? '"Steep assist equipment and safety gear",' : ''}
      "Roofing tools and fasteners",
      "Material hoisting equipment",
      "Safety equipment and fall protection"
    ],
    "safetyRequirements": [
      "OSHA compliant fall protection",
      "Hard hats and safety equipment",
      ${project.roofPitch?.includes('Steep') ? '"Additional steep roof safety measures",' : ''}
      "Weather monitoring protocols"
    ]
  },
  "materialBreakdown": {
    "lineItems": [
      ${project.lineItems?.map((item: string) => `{
        "item": "${item}",
        "quantity": ${item.includes('Shingles') ? (project.area || 1200) / 100 : item.includes('Underlayment') ? (project.area || 1200) / 100 : 1},
        "unit": "${item.includes('Shingles') || item.includes('Underlayment') ? 'squares' : item.includes('Linear') ? 'linear feet' : 'each'}",
        "notes": "Based on project specifications"
      }`).join(',') || `{
        "item": "Asphalt Shingles",
        "quantity": ${(project.area || 1200) / 100},
        "unit": "squares",
        "notes": "Standard grade materials"
      }`}
    ]
  },
  "costEstimates": {
    "materials": {
      "total": ${(project.area || 1200) * (project.materialPreference === 'luxury' ? 8 : project.materialPreference === 'eco' ? 4 : 6)},
      "breakdown": [
        {"category": "Roofing Materials", "amount": ${(project.area || 1200) * (project.materialPreference === 'luxury' ? 5 : project.materialPreference === 'eco' ? 2.5 : 3.5)}},
        {"category": "Underlayment & Accessories", "amount": ${(project.area || 1200) * 1.5}},
        {"category": "Flashing & Trim", "amount": ${(project.area || 1200) * 1}}
      ]
    },
    "labor": {
      "total": ${(project.area || 1200) * (project.laborNeeds?.steepAssist ? 4 : 3)},
      "ratePerHour": ${project.laborNeeds?.steepAssist ? 75 : 65},
      "totalHours": ${(project.area || 1200) / (project.laborNeeds?.steepAssist ? 80 : 100)}
    },
    "equipment": {
      "total": ${project.laborNeeds?.steepAssist ? 800 : 500},
      "items": [
        {"item": "Tool rental and equipment", "cost": ${project.laborNeeds?.steepAssist ? 500 : 300}},
        {"item": "Safety equipment", "cost": 200}
        ${project.laborNeeds?.steepAssist ? ',{"item": "Steep assist equipment", "cost": 300}' : ''}
      ]
    }
  },
  "imageAnalysis": [
    // For each uploaded image, return a string annotation describing what is visible in that image. The array length MUST match the number of uploaded images, and the order MUST match the upload order. Do not invent or omit any entries. Example: ["Image 1: ...", "Image 2: ...", ...]
  ]
}

Use ONLY the actual project data provided above. Do not invent values. Return pure JSON with no markdown formatting.

IMPORTANT IMAGE ANALYSIS REQUIREMENTS:
1. Analyze ONLY the actual uploaded images
2. Describe ONLY visible repair areas, material needs, and safety issues
3. The imageAnalysis array MUST have one string per image, in the same order as uploaded, and no extra or missing entries
4. Do NOT invent or assume details not visible in the images

Generate a detailed, contractor-focused report using ALL provided details. Return ONLY the JSON object with no markdown formatting - pure JSON starting with {.`;

      case "homeowner":
        return `You are a friendly roofing expert helping a homeowner understand their roof's condition. Create a comprehensive but easy-to-understand homeowner report using ALL the provided project data.

AVAILABLE PROJECT DATA TO USE:
- Location: ${project.location?.city || 'Not provided'}, ${project.location?.country || 'Not provided'} ${project.location?.zipCode || 'Not provided'}
- Structure: ${project.structureType || 'Not provided'}
- Roof Details: ${project.roofPitch || 'Not provided'} pitch, ${project.roofAge || 'Not provided'} years old
- Materials: ${project.materialLayers?.join(', ') || 'Not provided'}
- Homeowner Name: ${project.homeownerInfo?.name || 'Not provided'}
- Email: ${project.homeownerInfo?.email || 'Not provided'}
- Project Urgency: ${project.urgency || 'Not provided'}
- Budget Style: ${project.budgetStyle || 'Not provided'}
- Preferred Language: ${project.preferredLanguage || 'English'}
- Preferred Currency: ${project.preferredCurrency || 'USD'}
- Components: Ice Shield: ${project.iceWaterShield ? 'Yes' : 'No'}, Felt: ${project.felt || 'None'}, Drip Edge: ${project.dripEdge ? 'Yes' : 'No'}

Generate a friendly, easy-to-understand homeowner report in JSON format with these exact sections:

{
  "welcomeMessage": {
    "greeting": "Dear ${project.homeownerInfo?.name || 'Homeowner'},",
    "introduction": "Thank you for choosing FlacronBuild for your roofing assessment. We've carefully analyzed your ${project.structureType || 'home'} and prepared this easy-to-understand report to help you make informed decisions about your roof.",
    "ourCommitment": "Our goal is to provide you with clear, honest information about your roof's condition and help you understand your options moving forward."
  },
  "roofOverview": {
    "propertyType": "${project.structureType || 'Residential structure'}",
    "roofAge": "${project.roofAge ? project.roofAge + ' years old' : 'Age not specified'}",
    "roofStyle": "${project.roofPitch || 'Standard pitch'}",
    "currentMaterials": "${project.materialLayers?.join(', ') || 'Standard roofing materials'}",
    "overallCondition": "Based on the age and materials, your roof is ${project.roofAge > 20 ? 'reaching the end of its typical lifespan' : project.roofAge > 10 ? 'in the middle of its expected lifespan' : 'relatively new'}",
    "keyFeatures": [
      ${project.iceWaterShield ? '"Ice and water shield protection installed"' : '"Standard underlayment"'},
      ${project.dripEdge ? '"Drip edge protection in place"' : '"Basic edge protection"'},
      "Felt underlayment: ${project.felt || 'Standard grade'}"
    ]
  },
  "damageSummary": {
    "inspectionFindings": "We've identified ${project.slopeDamage?.length || 0} areas of concern that need your attention",
    "priorityLevel": "${project.urgency === 'high' ? 'High Priority - Immediate attention recommended' : project.urgency === 'medium' ? 'Medium Priority - Address within 6 months' : 'Low Priority - Monitor and plan for future repairs'}",
    "mainConcerns": [
      ${project.roofAge > 15 ? '"Age-related wear and material deterioration"' : '"Normal wear patterns for roof age"'},
      ${project.slopeDamage?.length > 0 ? '"Visible damage requiring professional attention"' : '"No major structural concerns identified"'},
      "Weather protection effectiveness"
    ],
    "whatThisMeans": "In simple terms, your roof ${project.roofAge > 20 || project.urgency === 'high' ? 'needs prompt attention to prevent water damage to your home' : project.roofAge > 10 ? 'is showing normal signs of aging and should be monitored closely' : 'appears to be in good condition for its age'}"
  },
  "repairSuggestions": {
    "immediateActions": [
      ${project.urgency === 'high' ? '"Contact a licensed roofer within 2 weeks"' : '"Schedule a professional inspection"'},
      ${project.slopeDamage?.length > 0 ? '"Address visible damage areas to prevent water intrusion"' : '"Continue regular maintenance and monitoring"'},
      "Monitor for leaks during heavy rain"
    ],
    "shortTermPlanning": [
      ${project.budgetStyle === 'premium' ? '"Consider high-quality materials for maximum longevity"' : project.budgetStyle === 'basic' ? '"Focus on essential repairs with cost-effective solutions"' : '"Balance quality and cost for best value"'},
      "Get quotes from 3 licensed contractors",
      "Plan timing around weather and personal schedule"
    ],
    "longTermOutlook": {
      "timeline": "${project.roofAge > 20 ? 'Replacement recommended within 1-2 years' : project.roofAge > 15 ? 'Start planning for replacement in 3-5 years' : 'Roof should last another 10-15 years with proper maintenance'}",
      "investmentGuidance": "For a roof of this age and condition, ${project.budgetStyle === 'premium' ? 'investing in premium materials will provide the best long-term value' : project.budgetStyle === 'basic' ? 'focus on necessary repairs to maintain protection' : 'a balanced approach offers good protection and value'}",
      "preventiveCare": "Regular maintenance can extend your roof's life and prevent costly emergency repairs"
    }
  },
  "budgetGuidance": {
    "estimatedRange": {
      "repairs": "${project.urgency === 'high' ? '$2,000 - $8,000' : project.urgency === 'medium' ? '$1,000 - $4,000' : '$500 - $2,000'}",
      "partialReplacement": "${(project.area || 1200) * (project.budgetStyle === 'premium' ? 8 : project.budgetStyle === 'basic' ? 4 : 6) * 0.5}",
      "fullReplacement": "${(project.area || 1200) * (project.budgetStyle === 'premium' ? 12 : project.budgetStyle === 'basic' ? 6 : 8)}"
    },
    "financingOptions": [
      "Home improvement loans",
      "Insurance claims (if applicable)",
      "Contractor payment plans",
      "Home equity line of credit"
    ],
    "costSavingTips": [
      "Get multiple quotes for comparison",
      "Consider timing repairs during off-season",
      "Bundle multiple home improvements",
      "Ask about material upgrade options"
    ]
  },
  "nextSteps": {
    "recommended": [
      "Schedule consultations with licensed contractors",
      "Review your homeowner's insurance policy",
      "Set aside budget for recommended repairs",
      "Create a timeline based on priority level"
    ],
    "questions": [
      "What is the warranty on materials and labor?",
      "How long will the project take?",
      "What permits are required?",
      "How will you protect my landscaping and property?"
    ],
    "warningSignsToWatch": [
      "Water stains on ceilings or walls",
      "Missing or damaged shingles after storms",
      "Granules in gutters",
      "Visible sagging or structural issues"
    ]
  },
  "imageAnalysis": [
    // For each uploaded image, return a string annotation describing what the homeowner is seeing in that image. The array length MUST match the number of uploaded images, and the order MUST match the upload order. Do not invent or omit any entries. Example: ["Image 1: ...", "Image 2: ...", ...]
  ]
}

Use ONLY the actual project data provided above. Write in friendly, non-technical language that any homeowner can understand. Return pure JSON with no markdown formatting.

IMPORTANT IMAGE ANALYSIS REQUIREMENTS:
1. Analyze ONLY the actual uploaded images
2. Describe ONLY what is visible in each image in simple, homeowner-friendly language
3. The imageAnalysis array MUST have one string per image, in the same order as uploaded, and no extra or missing entries
4. Do NOT invent or assume details not visible in the images

Generate a friendly, easy-to-understand report using ALL provided details. Return ONLY the JSON object with no markdown formatting - pure JSON starting with {.`;

      default:
        return "Return an empty JSON object.";
    }
  }
}

export const realCostCalculator = new RealCostCalculator();