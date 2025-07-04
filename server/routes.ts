import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSchema, insertEstimateSchema } from "@shared/schema";
import { realCostCalculator, type ProjectRequirements } from "./cost-calculator";
import { scrapingVerification } from "./scraping-verification";


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

  // Generate cost estimate using real data
  app.post("/api/projects/:id/estimate", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Convert project to requirements format for real cost calculator
      const projectRequirements: ProjectRequirements = {
        type: project.type as any,
        area: project.area,
        location: project.location,
        materialTier: project.materialTier as any,
        timeline: project.timeline as any
      };

      // Log the entire request body for debugging
      console.log('Full request body:', req.body);
      // Extract images from req.body.files (if present)
      const images = Array.isArray(req.body.files) ? req.body.files : [];
      console.log('Received files:', images);

      // Use real cost calculator with images
      const realEstimate = await realCostCalculator.calculateRealCost(projectRequirements, images);
      
      const savedEstimate = await storage.createEstimate({
        projectId,
        totalCost: realEstimate.totalCost.toString(),
        materialsCost: realEstimate.materialsCost.toString(),
        laborCost: realEstimate.laborCost.toString(),
        permitsCost: realEstimate.permitsCost.toString(),
        contingencyCost: realEstimate.contingencyCost.toString(),
        regionMultiplier: realEstimate.regionMultiplier.toString()
      });

      // Include detailed breakdown in response
      console.log('Gemini estimate response:', {
        ...savedEstimate,
        breakdown: realEstimate.breakdown,
        dataSource: realEstimate.dataSource,
        imageAnalysis: realEstimate.imageAnalysis
      });
      res.json({
        ...savedEstimate,
        breakdown: realEstimate.breakdown,
        dataSource: realEstimate.dataSource,
        imageAnalysis: realEstimate.imageAnalysis
      });
    } catch (error) {
      console.error("Cost estimation error:", error);
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

  // Get detailed cost breakdown with real data sources
  app.get("/api/projects/:id/cost-breakdown", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const projectRequirements: ProjectRequirements = {
        type: project.type as any,
        area: project.area,
        location: project.location,
        materialTier: project.materialTier as any,
        timeline: project.timeline as any
      };

      const realEstimate = await realCostCalculator.calculateRealCost(projectRequirements);
      
      res.json({
        breakdown: realEstimate.breakdown,
        dataSource: realEstimate.dataSource,
        lastUpdated: new Date().toISOString(),
        regionalFactors: {
          locationAnalyzed: project.location,
          marketConditions: "Current regional pricing",
          costDatabase: realEstimate.dataSource
        }
      });
    } catch (error) {
      console.error("Cost breakdown error:", error);
      res.status(500).json({ message: "Failed to get cost breakdown" });
    }
  });

  // Real-time data source verification endpoint
  app.get("/api/verify-data-sources/:location", async (req, res) => {
    try {
      const location = decodeURIComponent(req.params.location);
      console.log(`[VERIFICATION API] Testing data sources for ${location}`);
      
      const verification = await scrapingVerification.verifyRealScraping(location);
      
      res.json({
        location,
        timestamp: new Date().toISOString(),
        verification: {
          isUsingRealData: verification.isUsingRealData,
          sourcesAttempted: verification.attempts.length,
          successfulSources: verification.attempts.filter(a => a.success && a.dataFound).length,
          evidence: verification.evidence,
          fallbackReason: verification.fallbackReason
        },
        scrapingAttempts: verification.attempts.map(attempt => ({
          url: attempt.url,
          timestamp: attempt.timestamp,
          success: attempt.success,
          dataFound: attempt.dataFound,
          status: attempt.responseStatus,
          error: attempt.error
        })),
        summary: scrapingVerification.getVerificationSummary()
      });
    } catch (error) {
      console.error("Data verification error:", error);
      res.status(500).json({ 
        message: "Failed to verify data sources",
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
