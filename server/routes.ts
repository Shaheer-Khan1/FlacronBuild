import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSchema, insertEstimateSchema } from "@shared/schema";


export async function registerRoutes(app: Express): Promise<Server> {
  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get single project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Create project
  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Update project
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Generate cost estimate
  app.post("/api/projects/:id/estimate", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const estimate = calculateCostEstimate(project);
      const savedEstimate = await storage.createEstimate({
        projectId,
        ...estimate
      });

      res.json(savedEstimate);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate estimate" });
    }
  });

  // Get project estimates
  app.get("/api/projects/:id/estimates", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const estimates = await storage.getEstimatesByProjectId(projectId);
      res.json(estimates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch estimates" });
    }
  });

  // Get latest estimate for project
  app.get("/api/projects/:id/estimate/latest", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const estimate = await storage.getLatestEstimateByProjectId(projectId);
      if (!estimate) {
        return res.status(404).json({ message: "No estimate found for project" });
      }
      res.json(estimate);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest estimate" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Cost calculation service
function calculateCostEstimate(project: any) {
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
    "default": 1.0
  };

  const projectType = project.type as keyof typeof baseCosts;
  const materialTier = project.materialTier as keyof typeof materialMultipliers;
  const area = project.area;
  
  // Get regional multiplier
  const locationKey = project.location.toLowerCase();
  const regionMultiplier = Object.keys(regionMultipliers).find(key => 
    locationKey.includes(key)
  ) ? regionMultipliers[Object.keys(regionMultipliers).find(key => 
    locationKey.includes(key)
  )!] : regionMultipliers.default;

  // Calculate base costs
  const baseCost = baseCosts[projectType];
  const materialMultiplier = materialMultipliers[materialTier];

  const materialsCost = Math.round(area * baseCost.materials * materialMultiplier * regionMultiplier);
  const laborCost = Math.round(area * baseCost.labor * regionMultiplier);
  const permitsCost = Math.round(area * baseCost.permits * regionMultiplier);
  const contingencyCost = Math.round((materialsCost + laborCost + permitsCost) * 0.07);
  const totalCost = materialsCost + laborCost + permitsCost + contingencyCost;

  return {
    totalCost: totalCost.toString(),
    materialsCost: materialsCost.toString(),
    laborCost: laborCost.toString(),
    permitsCost: permitsCost.toString(),
    contingencyCost: contingencyCost.toString(),
    regionMultiplier: regionMultiplier.toString()
  };
}
