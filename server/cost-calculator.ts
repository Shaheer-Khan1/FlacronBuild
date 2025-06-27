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

  async calculateRealCost(project: ProjectRequirements): Promise<{
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
  }> {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `For a construction project with the following details:
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

Return the answer in this format (all prices in US dollars, no commas in numbers):
Material_Cost=x\nLabor_Cost=y\nPermits=z\nTimeline=a\nContingency Suggestions=b`;

    const geminiResponse = await this.queryGemini(prompt);
    console.log('Gemini raw response:', geminiResponse);
    const parsed = this.parseGeminiResponse(geminiResponse);
    console.log('Parsed Gemini values:', parsed);
    
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
      contingencySuggestions: parsed.contingencySuggestions
    };
  }

  private async queryGemini(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;
    const body = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
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
    // Expecting format:
    // Material_Cost=x\nLabor_Cost=y\nPermits=z\nTimeline=a\nContingency Suggestions=b
    let materialsCost = 0, laborCost = 0, permitsCost = 0, contingencyCost = 0;
    let timeline = '', contingencySuggestions = '';
    const breakdown: any = {};
    response.split('\n').forEach(line => {
      if (line.startsWith('Material_Cost=')) {
        materialsCost = parseFloat(line.split('=')[1]);
        breakdown.materialsCost = materialsCost;
      } else if (line.startsWith('Labor_Cost=')) {
        laborCost = parseFloat(line.split('=')[1]);
        breakdown.laborCost = laborCost;
      } else if (line.startsWith('Permits=')) {
        permitsCost = parseFloat(line.split('=')[1]);
        breakdown.permitsCost = permitsCost;
      } else if (line.startsWith('Timeline=')) {
        timeline = line.split('=')[1];
        breakdown.timeline = timeline;
      } else if (line.startsWith('Contingency Suggestions=')) {
        contingencySuggestions = line.split('=')[1];
        breakdown.contingencySuggestions = contingencySuggestions;
        // Try to extract a contingency cost if present in the suggestion
        const match = contingencySuggestions.match(/\$([0-9,.]+)/);
        if (match) {
          contingencyCost = parseFloat(match[1].replace(/,/g, ''));
        }
      }
    });
    return { materialsCost, laborCost, permitsCost, contingencyCost, timeline, contingencySuggestions, breakdown };
  }
}

export const realCostCalculator = new RealCostCalculator();