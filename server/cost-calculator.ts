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
}

// Real-time data sources for construction costs
export class RealCostCalculator {
  private geminiApiKey: string;

  constructor() {
    this.geminiApiKey = process.env.GEMINI_KEY || '';
    console.log('Gemini Key:', this.geminiApiKey ? this.geminiApiKey.slice(0, 8) + '...' : 'NOT SET');
  }

  async calculateRealCost(project: ProjectRequirements, images?: any[]): Promise<{
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
    executiveSummary?: string;
    projectAnalysis?: string;
    marketConditions?: string;
    riskAssessment?: string;
    timelineScheduling?: string;
    recommendations?: string;
    imageAnalysis?: any[];
  }> {
    const today = new Date().toISOString().split('T')[0];
    let prompt = `For a construction project with the following details:
Type: ${project.type}
Area: ${project.area}
Location: ${project.location}
Material Tier: ${project.materialTier}
Timeline: ${project.timeline || 'standard'}

Please provide:
- Real-time cost estimates for today (${today}) for:
  - Material_Cost (in US dollars, no commas)
  - Labor_Cost (in US dollars, no commas)
  - Permits (in US dollars, no commas)
- Timeline prediction (Timeline)
- Contingency suggestions (Contingency Suggestions)
- Comprehensive detailed construction project analysis in separate sections

Return the answer in this format (all prices in US dollars, no commas in numbers):
Material_Cost=x
Labor_Cost=y
Permits=z
Timeline=a
Contingency Suggestions=b
Executive Summary=Write a comprehensive 1-page executive summary including project overview and key findings, total investment summary, critical success factors, and risk assessment overview
Project Analysis=Write a detailed 2-3 page project analysis including detailed scope of work breakdown, construction methodology recommendations, material specifications and quality standards, labor requirements and skill levels needed, equipment and machinery requirements, and site preparation and foundation considerations
Market Conditions=Write a detailed 2-page market conditions and cost analysis including current construction market trends in ${project.location}, material price volatility analysis, labor market conditions and availability, seasonal impact on costs and timeline, comparison with regional averages, and historical cost trends and future projections
Risk Assessment=Write a comprehensive 1-2 page risk assessment and mitigation including weather and environmental risks, supply chain disruption risks, labor shortage risks, regulatory and permit risks, quality control challenges, budget overrun prevention strategies, and mitigation recommendations for each risk
Timeline Scheduling=Write a detailed 1-page timeline and scheduling analysis including detailed project phases and milestones, critical path analysis, seasonal considerations, permit approval timelines, material procurement schedules, and inspection and approval checkpoints
Recommendations=Write a comprehensive 1-page recommendations and next steps including value engineering opportunities, cost optimization suggestions, alternative material options, phasing recommendations, financing considerations, contractor selection criteria, and project management best practices

Make each section detailed and comprehensive with specific insights, data, and actionable recommendations. Use professional construction industry terminology and provide concrete examples where applicable.`;

    // If images are present, ask for analysis
    if (Array.isArray(images) && images.length > 0) {
      prompt += `\n\nFor each attached image, return a JSON array (one object per image) with these fields:\n- label: a short heading for the image\n- relevant: true if the image is relevant to the project, false otherwise\n- description: a detailed description. For renovation projects, describe what to renovate in the image and what costs to expect.\nReturn the array as 'imageAnalysis = ' followed by the JSON.`;
    }

    // Build Gemini parts array
    const parts: any[] = [{ text: prompt }];
    if (Array.isArray(images)) {
      for (const file of images) {
        if (file && file.data && file.type && file.data.startsWith('data:')) {
          // Extract base64 and mime type
          const base64 = file.data.split(',')[1];
          const mime = file.type;
          parts.push({
            inline_data: {
              mime_type: mime,
              data: base64
            }
          });
        }
      }
    }

    // Log the full Gemini API request body (including images)
    console.log('Gemini API request body:', JSON.stringify({
      contents: [
        {
          parts
        }
      ]
    }, null, 2));

    const geminiResponse = await this.queryGemini(parts);
    console.log('Gemini raw response:', geminiResponse);
    const parsed = this.parseGeminiResponse(geminiResponse);
    console.log('Parsed Gemini values:', parsed);

    // If images were sent, try to extract imageAnalysis JSON from the response
    let imageAnalysis: any[] | undefined = undefined;
    if (Array.isArray(images) && images.length > 0) {
      const match = geminiResponse.match(/imageAnalysis\s*=\s*(\[[\s\S]*?\])([\n\r]|$)/);
      if (match) {
        try {
          imageAnalysis = JSON.parse(match[1]);
        } catch (e) {
          imageAnalysis = undefined;
        }
      }
    }
    
    // Compose the breakdown and return
    const baseCost = parsed.materialsCost + parsed.laborCost + parsed.permitsCost;
    let contingencyCost = parsed.contingencyCost;
    if (!contingencyCost || contingencyCost === 0) {
      contingencyCost = Math.round(baseCost * 0.07);
      parsed.breakdown.contingencyCost = contingencyCost;
    }
    const totalCost = baseCost + contingencyCost;
    return {
      totalCost,
      materialsCost: parsed.materialsCost,
      laborCost: parsed.laborCost,
      permitsCost: parsed.permitsCost,
      contingencyCost,
      regionMultiplier: 1.0, // Not used with Gemini
      breakdown: parsed.breakdown,
      dataSource: 'Gemini API',
      timeline: parsed.timeline,
      contingencySuggestions: parsed.contingencySuggestions,
      report: parsed.report,
      executiveSummary: parsed.executiveSummary,
      projectAnalysis: parsed.projectAnalysis,
      marketConditions: parsed.marketConditions,
      riskAssessment: parsed.riskAssessment,
      timelineScheduling: parsed.timelineScheduling,
      recommendations: parsed.recommendations,
      imageAnalysis
    };
  }

  private async queryGemini(parts: any[]): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;
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
    let executiveSummary = '', projectAnalysis = '', marketConditions = '';
    let riskAssessment = '', timelineScheduling = '', recommendations = '';
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
      breakdown.contingencySuggestions = contingencySuggestions;
      // Try to extract a contingency cost if present in the suggestion
      const costMatch = contingencySuggestions.match(/\$([0-9,.]+)/);
      if (costMatch) {
        contingencyCost = parseFloat(costMatch[1].replace(/,/g, ''));
      }
    }

    // Extract the report content - everything after "Report=" until the end or next field (legacy support)
    const reportMatch = response.match(/Report=([\s\S]*?)(?:\n(?:Material_Cost|Labor_Cost|Permits|Timeline|Contingency Suggestions|Executive Summary|imageAnalysis)=|$)/);
    if (reportMatch) {
      report = reportMatch[1].trim();
      breakdown.report = report;
    }

    // Extract new separate report sections
    const executiveMatch = response.match(/Executive Summary=([\s\S]*?)(?:\n(?:Project Analysis|Market Conditions|Risk Assessment|Timeline Scheduling|Recommendations|imageAnalysis)=|$)/);
    if (executiveMatch) {
      executiveSummary = executiveMatch[1].trim();
      breakdown.executiveSummary = executiveSummary;
    }

    const projectMatch = response.match(/Project Analysis=([\s\S]*?)(?:\n(?:Market Conditions|Risk Assessment|Timeline Scheduling|Recommendations|imageAnalysis)=|$)/);
    if (projectMatch) {
      projectAnalysis = projectMatch[1].trim();
      breakdown.projectAnalysis = projectAnalysis;
    }

    const marketMatch = response.match(/Market Conditions=([\s\S]*?)(?:\n(?:Risk Assessment|Timeline Scheduling|Recommendations|imageAnalysis)=|$)/);
    if (marketMatch) {
      marketConditions = marketMatch[1].trim();
      breakdown.marketConditions = marketConditions;
    }

    const riskMatch = response.match(/Risk Assessment=([\s\S]*?)(?:\n(?:Timeline Scheduling|Recommendations|imageAnalysis)=|$)/);
    if (riskMatch) {
      riskAssessment = riskMatch[1].trim();
      breakdown.riskAssessment = riskAssessment;
    }

    const timelineSchedulingMatch = response.match(/Timeline Scheduling=([\s\S]*?)(?:\n(?:Recommendations|imageAnalysis)=|$)/);
    if (timelineSchedulingMatch) {
      timelineScheduling = timelineSchedulingMatch[1].trim();
      breakdown.timelineScheduling = timelineScheduling;
    }

    const recommendationsMatch = response.match(/Recommendations=([\s\S]*?)(?:\n(?:imageAnalysis)=|$)/);
    if (recommendationsMatch) {
      recommendations = recommendationsMatch[1].trim();
      breakdown.recommendations = recommendations;
    }

    return { 
      materialsCost, laborCost, permitsCost, contingencyCost, timeline, contingencySuggestions, report,
      executiveSummary, projectAnalysis, marketConditions, riskAssessment, timelineScheduling, recommendations,
      breakdown 
    };
  }
}

export const realCostCalculator = new RealCostCalculator();