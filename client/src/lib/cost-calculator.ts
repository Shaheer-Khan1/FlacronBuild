export interface CostBreakdown {
  totalCost: number;
  materialsCost: number;
  laborCost: number;
  permitsCost: number;
  contingencyCost: number;
  regionMultiplier: number;
}

export interface ProjectInput {
  type: 'residential' | 'commercial' | 'renovation' | 'infrastructure';
  area: number;
  location: string;
  materialTier: 'economy' | 'standard' | 'premium';
  timeline?: 'urgent' | 'standard' | 'flexible';
}

// Base costs per sq ft by project type
const baseCosts = {
  residential: { materials: 85, labor: 45, permits: 3 },
  commercial: { materials: 120, labor: 65, permits: 8 },
  renovation: { materials: 65, labor: 55, permits: 2 },
  infrastructure: { materials: 200, labor: 85, permits: 15 }
};

// Material tier multipliers
const materialMultipliers = {
  economy: 0.7,
  standard: 1.0,
  premium: 1.35
};

// Regional multipliers (simplified)
const regionMultipliers: { [key: string]: number } = {
  "san francisco": 1.65,
  "oakland": 1.45,
  "palo alto": 1.75,
  "san jose": 1.55,
  "los angeles": 1.35,
  "chicago": 1.15,
  "new york": 1.85,
  "miami": 1.25,
  "seattle": 1.45,
  "austin": 1.15,
  "denver": 1.05,
  "phoenix": 0.95,
  "atlanta": 1.00,
  "dallas": 1.05,
  "boston": 1.55,
  "default": 1.0
};

// Timeline multipliers
const timelineMultipliers = {
  urgent: 1.25,     // Rush jobs cost more
  standard: 1.0,    // Normal timeline
  flexible: 0.92    // Cost-optimized timeline
};

export function calculateCostEstimate(project: ProjectInput): CostBreakdown {
  const projectType = project.type;
  const materialTier = project.materialTier;
  const area = project.area;
  
  // Get regional multiplier
  const locationKey = project.location.toLowerCase();
  const regionMultiplier = Object.keys(regionMultipliers).find(key => 
    locationKey.includes(key)
  ) ? regionMultipliers[Object.keys(regionMultipliers).find(key => 
    locationKey.includes(key)
  )!] : regionMultipliers.default;

  // Get timeline multiplier
  const timelineMultiplier = project.timeline ? timelineMultipliers[project.timeline] : 1.0;

  // Calculate base costs
  const baseCost = baseCosts[projectType];
  const materialMultiplier = materialMultipliers[materialTier];

  const materialsCost = Math.round(area * baseCost.materials * materialMultiplier * regionMultiplier * timelineMultiplier);
  const laborCost = Math.round(area * baseCost.labor * regionMultiplier * timelineMultiplier);
  const permitsCost = Math.round(area * baseCost.permits * regionMultiplier);
  const contingencyCost = Math.round((materialsCost + laborCost + permitsCost) * 0.07);
  const totalCost = materialsCost + laborCost + permitsCost + contingencyCost;

  return {
    totalCost,
    materialsCost,
    laborCost,
    permitsCost,
    contingencyCost,
    regionMultiplier
  };
}

export function getRegionalInsights(location: string) {
  const locationKey = location.toLowerCase();
  const multiplier = Object.keys(regionMultipliers).find(key => 
    locationKey.includes(key)
  ) ? regionMultipliers[Object.keys(regionMultipliers).find(key => 
    locationKey.includes(key)
  )!] : regionMultipliers.default;

  const laborCostVariation = Math.round((multiplier - 1) * 100);
  
  return {
    regionMultiplier: multiplier,
    laborCostVariation,
    materialAvailability: "Good supply, standard lead times",
    permitTimeline: "3-6 months typical timeline"
  };
}
