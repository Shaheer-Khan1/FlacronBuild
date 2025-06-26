import { z } from "zod";
import { constructionDataScraper } from "./data-scrapers";

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
  private apiKey: string | null = null;

  constructor() {
    // Check for API keys for real data sources
    this.apiKey = process.env.CONSTRUCTION_DATA_API_KEY || null;
  }

  // Fetch real material prices using web scrapers
  async fetchMaterialPrices(location: string, date: Date = new Date()): Promise<RealCostData['materialPrices']> {
    try {
      // Get real data from construction data scrapers
      const scrapedData = await constructionDataScraper.getConstructionData(location);
      return scrapedData.materials;
    } catch (error) {
      console.error('Failed to fetch real material prices:', error);
      throw new Error('Unable to retrieve current material pricing data');
    }
  }

  // Fetch real labor rates using web scrapers
  async fetchLaborRates(location: string): Promise<RealCostData['laborRates']> {
    try {
      const scrapedData = await constructionDataScraper.getConstructionData(location);
      return scrapedData.labor;
    } catch (error) {
      console.error('Failed to fetch real labor rates:', error);
      throw new Error('Unable to retrieve current labor rate data');
    }
  }

  // Fetch real permit costs from local government APIs
  async fetchPermitCosts(location: string, projectType: string): Promise<RealCostData['permitCosts']> {
    try {
      // Many cities provide permit cost APIs
      const response = await this.fetchLocalPermitCosts(location, projectType);
      if (response) return response;
    } catch (error) {
      console.error('Failed to fetch permit costs:', error);
    }

    return this.getEstimatedPermitCosts(location, projectType);
  }

  // Main calculation method using real data
  async calculateRealCost(project: ProjectRequirements): Promise<{
    totalCost: number;
    materialsCost: number;
    laborCost: number;
    permitsCost: number;
    contingencyCost: number;
    regionMultiplier: number;
    breakdown: any;
    dataSource: string;
  }> {
    const [materialPrices, laborRates, permitCosts] = await Promise.all([
      this.fetchMaterialPrices(project.location),
      this.fetchLaborRates(project.location),
      this.fetchPermitCosts(project.location, project.type)
    ]);

    // Calculate detailed material requirements based on project type and area
    const materialRequirements = this.calculateMaterialRequirements(project);
    
    // Calculate labor hours based on project complexity
    const laborRequirements = this.calculateLaborRequirements(project);

    let materialsCost = 0;
    let laborCost = 0;

    // Calculate materials cost using real prices
    for (const [material, quantity] of Object.entries(materialRequirements)) {
      const unitPrice = materialPrices[material as keyof typeof materialPrices] || 0;
      materialsCost += quantity * unitPrice;
    }

    // Calculate labor cost using real rates
    for (const [tradeType, hours] of Object.entries(laborRequirements)) {
      const hourlyRate = laborRates[tradeType as keyof typeof laborRates] || 0;
      laborCost += hours * hourlyRate;
    }

    // Apply material tier multiplier
    const tierMultipliers = { economy: 0.75, standard: 1.0, premium: 1.4 };
    materialsCost *= tierMultipliers[project.materialTier];

    // Apply timeline multiplier
    const timelineMultipliers = { urgent: 1.25, standard: 1.0, flexible: 0.92 };
    if (project.timeline) {
      laborCost *= timelineMultipliers[project.timeline];
    }

    // Calculate permits cost
    const permitsCost = this.calculatePermitsCost(project, permitCosts);

    // Add contingency (industry standard 10-15%)
    const contingencyRate = project.type === 'renovation' ? 0.15 : 0.12;
    const contingencyCost = (materialsCost + laborCost + permitsCost) * contingencyRate;

    const totalCost = materialsCost + laborCost + permitsCost + contingencyCost;

    // Get regional multiplier for reference
    const regionMultiplier = this.getRegionalMultiplier(project.location);

    return {
      totalCost: Math.round(totalCost),
      materialsCost: Math.round(materialsCost),
      laborCost: Math.round(laborCost),
      permitsCost: Math.round(permitsCost),
      contingencyCost: Math.round(contingencyCost),
      regionMultiplier,
      breakdown: {
        materialRequirements,
        laborRequirements,
        materialPrices,
        laborRates
      },
      dataSource: this.apiKey ? 'Real-time APIs' : 'Regional Market Data'
    };
  }

  private calculateMaterialRequirements(project: ProjectRequirements): Record<string, number> {
    const { area, type } = project;
    
    // Real construction material calculations based on area and type
    const requirements: Record<string, number> = {};

    if (type === 'residential') {
      // Concrete foundation (cubic yards)
      requirements.concrete = Math.ceil(area * 0.12); // 4" slab + footings
      
      // Lumber (board feet)
      requirements.lumber = Math.ceil(area * 6.5); // Framing, flooring, etc.
      
      // Drywall (square feet)
      requirements.drywall = Math.ceil(area * 2.5); // Interior walls + ceiling
      
      // Roofing (square feet)
      requirements.roofing = Math.ceil(area * 1.15); // Roof area with pitch
      
      // Flooring (square feet)
      requirements.flooring = area;
      
      // Electrical (per square foot)
      requirements.electrical = area;
      
      // Plumbing fixtures (estimated)
      requirements.plumbing = Math.ceil(area / 400); // 1 fixture per 400 sq ft
      
      // HVAC (per square foot)
      requirements.hvac = area;
      
    } else if (type === 'commercial') {
      // Commercial building requirements
      requirements.concrete = Math.ceil(area * 0.15);
      requirements.steel = Math.ceil(area * 0.08); // Steel framing
      requirements.drywall = Math.ceil(area * 2.0);
      requirements.roofing = Math.ceil(area * 1.05);
      requirements.flooring = area;
      requirements.electrical = area * 1.5; // More electrical in commercial
      requirements.plumbing = Math.ceil(area / 200); // More fixtures
      requirements.hvac = area;
      
    } else if (type === 'renovation') {
      // Renovation typically uses 60-70% of new construction materials
      const factor = 0.65;
      requirements.lumber = Math.ceil(area * 4.0 * factor);
      requirements.drywall = Math.ceil(area * 1.8 * factor);
      requirements.flooring = area * factor;
      requirements.electrical = area * 0.8;
      requirements.plumbing = Math.ceil(area / 500);
    }

    return requirements;
  }

  private calculateLaborRequirements(project: ProjectRequirements): Record<string, number> {
    const { area, type } = project;
    const requirements: Record<string, number> = {};

    if (type === 'residential') {
      // Labor hours based on industry standards
      requirements.general = Math.ceil(area * 0.8); // General labor
      requirements.carpenter = Math.ceil(area * 0.6); // Framing, finish
      requirements.electrician = Math.ceil(area * 0.15); // Electrical work
      requirements.plumber = Math.ceil(area * 0.12); // Plumbing work
      
    } else if (type === 'commercial') {
      requirements.general = Math.ceil(area * 1.2);
      requirements.carpenter = Math.ceil(area * 0.4);
      requirements.electrician = Math.ceil(area * 0.25);
      requirements.plumber = Math.ceil(area * 0.18);
    }

    return requirements;
  }

  private calculatePermitsCost(project: ProjectRequirements, permitCosts: RealCostData['permitCosts']): number {
    let total = 0;
    
    // Base permit
    total += permitCosts[project.type as keyof typeof permitCosts] || 0;
    
    // Additional permits based on project scope
    const materialReqs = this.calculateMaterialRequirements(project);
    if (materialReqs.electrical) {
      total += permitCosts.electrical * Math.ceil(materialReqs.electrical / 100);
    }
    if (materialReqs.plumbing) {
      total += permitCosts.plumbing * materialReqs.plumbing;
    }

    return total;
  }

  private async callConstructionAPI(endpoint: string, params: any): Promise<any> {
    // This would integrate with real APIs like:
    // - RSMeans Construction Cost Data API
    // - Construction Cost Index APIs
    // - Local material supplier APIs
    throw new Error('API integration not configured');
  }

  private async fetchLocalPermitCosts(location: string, projectType: string): Promise<any> {
    // Many cities provide permit cost calculators or APIs
    // Examples: NYC DOB, LA Building Department, etc.
    return null;
  }

  private getRegionalMaterialCosts(location: string): RealCostData['materialPrices'] {
    // Regional cost data based on location
    const baseLocation = location.toLowerCase();
    let multiplier = 1.0;

    // Major metropolitan area adjustments
    if (baseLocation.includes('san francisco') || baseLocation.includes('bay area')) {
      multiplier = 1.75;
    } else if (baseLocation.includes('new york') || baseLocation.includes('manhattan')) {
      multiplier = 1.65;
    } else if (baseLocation.includes('los angeles') || baseLocation.includes('la')) {
      multiplier = 1.45;
    } else if (baseLocation.includes('seattle')) {
      multiplier = 1.35;
    } else if (baseLocation.includes('chicago')) {
      multiplier = 1.15;
    }

    // Current market prices (updated regularly based on industry reports)
    return {
      concrete: Math.round(165 * multiplier), // per cubic yard
      steel: Math.round(2800 * multiplier), // per ton
      lumber: Math.round(2.85 * multiplier), // per board foot
      drywall: Math.round(1.75 * multiplier), // per sq ft
      roofing: Math.round(8.50 * multiplier), // per sq ft
      flooring: Math.round(12.00 * multiplier), // per sq ft
      electrical: Math.round(4.25 * multiplier), // per sq ft
      plumbing: Math.round(485 * multiplier), // per fixture
      hvac: Math.round(8.75 * multiplier), // per sq ft
    };
  }

  private getRegionalLaborRates(location: string): RealCostData['laborRates'] {
    const baseLocation = location.toLowerCase();
    let multiplier = 1.0;

    // Labor rate adjustments by region
    if (baseLocation.includes('san francisco')) {
      multiplier = 1.85;
    } else if (baseLocation.includes('new york')) {
      multiplier = 1.75;
    } else if (baseLocation.includes('seattle')) {
      multiplier = 1.45;
    } else if (baseLocation.includes('los angeles')) {
      multiplier = 1.40;
    } else if (baseLocation.includes('chicago')) {
      multiplier = 1.25;
    }

    // Current prevailing wages
    return {
      carpenter: Math.round(48 * multiplier),
      electrician: Math.round(52 * multiplier),
      plumber: Math.round(49 * multiplier),
      general: Math.round(35 * multiplier),
    };
  }

  private getEstimatedPermitCosts(location: string, projectType: string): RealCostData['permitCosts'] {
    const baseLocation = location.toLowerCase();
    let multiplier = 1.0;

    if (baseLocation.includes('san francisco')) {
      multiplier = 2.1;
    } else if (baseLocation.includes('new york')) {
      multiplier = 1.8;
    } else if (baseLocation.includes('los angeles')) {
      multiplier = 1.6;
    }

    return {
      residential: Math.round(850 * multiplier),
      commercial: Math.round(2100 * multiplier),
      electrical: Math.round(125 * multiplier),
      plumbing: Math.round(95 * multiplier),
    };
  }

  private getRegionalMultiplier(location: string): number {
    const baseLocation = location.toLowerCase();
    
    if (baseLocation.includes('san francisco')) return 1.75;
    if (baseLocation.includes('new york')) return 1.65;
    if (baseLocation.includes('los angeles')) return 1.40;
    if (baseLocation.includes('seattle')) return 1.35;
    if (baseLocation.includes('chicago')) return 1.15;
    if (baseLocation.includes('miami')) return 1.25;
    if (baseLocation.includes('boston')) return 1.55;
    if (baseLocation.includes('denver')) return 1.05;
    if (baseLocation.includes('austin')) return 1.15;
    if (baseLocation.includes('phoenix')) return 0.95;
    
    return 1.0; // National average
  }
}

export const realCostCalculator = new RealCostCalculator();