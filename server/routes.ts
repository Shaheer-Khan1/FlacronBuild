import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSchema, insertEstimateSchema } from "@shared/schema";
import { realCostCalculator, type ProjectRequirements } from "./cost-calculator";
import { scrapingVerification } from "./scraping-verification";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-06-30.basil",
});

// Define the pricing for each role
const rolePricing = {
  homeowner: {
    monthly: 1999, // $19.99 in cents
    yearly: null, // No yearly option for homeowner
  },
  contractor: {
    monthly: 9799, // $97.99 in cents
    yearly: 99999, // $999.99 in cents
  },
  inspector: {
    monthly: 9799, // $97.99 in cents
    yearly: 99999, // $999.99 in cents
  },
  "insurance-adjuster": {
    monthly: 9799, // $97.99 in cents
    yearly: 99999, // $999.99 in cents
  },
};

// Define role names for dynamic product creation
const roleNames = {
  homeowner: "Homeowner Subscription",
  contractor: "Contractor Subscription", 
  inspector: "Inspector Subscription",
  "insurance-adjuster": "Insurance Adjuster Subscription",
};

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
    console.log('=== BACKEND: POST /api/projects ===');
    console.log('Raw request body:', req.body);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('uploadedFiles from request:', req.body.uploadedFiles);
    
    try {
      const projectData = insertProjectSchema.parse(req.body);
      console.log('Parsed project data:', projectData);
      const project = await storage.createProject(projectData);
      console.log('Created project:', project);
      res.status(201).json(project);
    } catch (error: any) {
      console.log('=== BACKEND: POST /api/projects ERROR ===');
      console.log('Error type:', typeof error);
      console.log('Error:', error);
      if (error instanceof z.ZodError) {
        console.log('Zod validation errors:', error.errors);
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
    console.log('=== BACKEND: POST /api/projects/:id/estimate ===');
    console.log('Project ID:', req.params.id);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body files:', req.body.files?.length || 0, 'files');
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      console.log('Retrieved project from database:', project?.id, project?.name);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Extract the full project data from uploadedFiles (which contains the original form data)
      let fullProjectData: any = {};
      console.log('=== BACKEND: Form Data Extraction ===');
      console.log('Project uploadedFiles:', project.uploadedFiles);
      if (project.uploadedFiles && project.uploadedFiles.length > 0) {
        try {
          fullProjectData = JSON.parse(project.uploadedFiles[0]);
          console.log('=== BACKEND: Successfully Parsed Form Data ===');
          console.log('Form data keys:', Object.keys(fullProjectData));
          console.log('User role:', fullProjectData.userRole);
          console.log('Form data size (chars):', JSON.stringify(fullProjectData).length);
          
          // Debug key form sections
          console.log('=== BACKEND: Form Data Verification ===');
          console.log('Has location:', !!fullProjectData.location);
          console.log('Has userRole:', !!fullProjectData.userRole);
          console.log('Has inspector fields:', !!(fullProjectData.inspectorInfo || fullProjectData.inspectionDate));
          console.log('Has insurer fields:', !!(fullProjectData.claimNumber || fullProjectData.policyholderName));
          console.log('Has contractor fields:', !!(fullProjectData.jobType || fullProjectData.materialPreference));
          console.log('Has homeowner fields:', !!(fullProjectData.homeownerInfo || fullProjectData.urgency));
          
        } catch (e: any) {
          console.log('=== BACKEND: Form Data Parsing Error ===');
          console.log('Parse error:', e.message);
          console.log('Raw uploadedFiles[0]:', project.uploadedFiles[0]);
          fullProjectData = {};
        }
      } else {
        console.log('=== BACKEND: No form data found in uploadedFiles ===');
      }

      // Convert project to requirements format for real cost calculator
      const projectRequirements: ProjectRequirements = {
        // Add the full project data first (includes userRole and all form fields)
        ...fullProjectData,
        // Then override with basic project fields
        type: project.type as any,
        area: project.area,
        location: project.location,
        materialTier: project.materialTier as any,
        timeline: project.timeline as any,
      };
      
      console.log('=== BACKEND: Project Requirements Prepared ===');
      console.log('Requirements userRole:', projectRequirements.userRole);
      console.log('Requirements keys count:', Object.keys(projectRequirements).length);

      // Extract images from req.body.files (if present)
      const images = Array.isArray(req.body.files) ? req.body.files : [];
      console.log('=== BACKEND: Image Processing ===');
      console.log('Received images count:', images.length);
      if (images.length > 0) {
        console.log('First image type:', typeof images[0]);
        console.log('First image object:', images[0]);
        // Check for base64 in a likely property (e.g., data, url, base64)
        const base64String = images[0]?.data || images[0]?.url || images[0]?.base64;
        if (typeof base64String === 'string') {
          console.log('First image property has base64:', base64String.includes('base64'));
        } else {
          console.log('First image does not have a string property to check for base64.');
        }
      }

      // Use real cost calculator with images
      console.log('=== BACKEND: Calling Gemini API ===');
      const realEstimate = await realCostCalculator.calculateRealCost(projectRequirements, images);
      console.log('=== BACKEND: Gemini API Response Received ===');
      console.log('Estimate total cost:', realEstimate.totalCost);
      console.log('Estimate materials cost:', realEstimate.materialsCost);
      console.log('Estimate labor cost:', realEstimate.laborCost);
      console.log('Estimate permits cost:', realEstimate.permitsCost);
      console.log('Estimate contingency cost:', realEstimate.contingencyCost);
      console.log('Estimate has breakdown:', !!realEstimate.breakdown);
      console.log('Estimate has report:', !!realEstimate.report);
      console.log('Estimate has imageAnalysis:', !!realEstimate.imageAnalysis);
      
      // Debug: Log the report structure to see what Gemini returned
      if (realEstimate.report) {
        console.log('=== BACKEND: Report Keys ===');
        const reportObj = realEstimate.report as any; // Cast to any for debugging
        console.log('Report keys:', Object.keys(reportObj));
        console.log('Report materialsCost:', reportObj.materialsCost);
        console.log('Report laborCost:', reportObj.laborCost);
        console.log('Report permitsCost:', reportObj.permitsCost);
      }
      
      // Prepare data for storage
      console.log('=== BACKEND: Preparing Data for Storage ===');
      const formInputDataForStorage = {
        ...fullProjectData,
        submittedAt: new Date().toISOString(),
        projectId: projectId,
        imageCount: images.length
      };
      
      const geminiResponseForStorage = {
        response: realEstimate,
        metadata: {
          apiCallTime: new Date().toISOString(),
          inputTokenCount: projectRequirements ? Object.keys(projectRequirements).length : 0,
          imageCount: images.length,
          userRole: projectRequirements.userRole
        }
      };
      
      console.log('Form input data size:', JSON.stringify(formInputDataForStorage).length, 'characters');
      console.log('Gemini response size:', JSON.stringify(geminiResponseForStorage).length, 'characters');
      
      // Create estimate with all data
      console.log('=== BACKEND: Creating Estimate Record ===');
      const savedEstimate = await storage.createEstimate({
        projectId,
        totalCost: (realEstimate.totalCost || 0).toString(),
        materialsCost: (realEstimate.materialsCost || 0).toString(),
        laborCost: (realEstimate.laborCost || 0).toString(),
        permitsCost: (realEstimate.permitsCost || 0).toString(),
        contingencyCost: (realEstimate.contingencyCost || 0).toString(),
        regionMultiplier: (realEstimate.regionMultiplier || 1.0).toString(),
        report: realEstimate.report,
        formInputData: formInputDataForStorage,
        geminiResponse: geminiResponseForStorage
      });

      console.log('=== BACKEND: Estimate Created Successfully ===');
      console.log('Saved estimate ID:', savedEstimate.id);
      console.log('Saved estimate has formInputData:', !!savedEstimate.formInputData);
      console.log('Saved estimate has geminiResponse:', !!savedEstimate.geminiResponse);

      // Include detailed breakdown in response
      const responseData = {
        ...savedEstimate,
        breakdown: realEstimate.breakdown,
        dataSource: realEstimate.dataSource,
        imageAnalysis: realEstimate.imageAnalysis
      };
      
      console.log('=== BACKEND: Sending Response ===');
      console.log('Response data keys:', Object.keys(responseData));
      res.json(responseData);
    } catch (error) {
      console.error("=== BACKEND: Cost Estimation Error ===");
      console.error("Error type:", typeof error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Full error:", error);
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
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get Stripe session details
  app.get("/api/stripe-session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Extract role from session metadata
      const role = session.metadata?.role;
      
      res.json({ 
        sessionId: session.id,
        role: role,
        billingPeriod: session.metadata?.billingPeriod,
        customerEmail: session.customer_email,
        customerName: session.metadata?.customerName
      });
    } catch (error) {
      console.error("Error retrieving session:", error);
      res.status(500).json({ 
        message: "Failed to retrieve session details",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create Stripe checkout session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { role, billingPeriod, customerEmail, customerName } = req.body;

      // Validate the request
      if (!role || !billingPeriod || !customerEmail) {
        return res.status(400).json({ 
          message: "Missing required fields: role, billingPeriod, customerEmail" 
        });
      }

      // Validate role
      if (!rolePricing[role as keyof typeof rolePricing]) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Validate billing period
      if (billingPeriod !== "monthly" && billingPeriod !== "yearly") {
        return res.status(400).json({ message: "Invalid billing period" });
      }

      // Check if yearly billing is available for this role
      if (billingPeriod === "yearly" && !rolePricing[role as keyof typeof rolePricing].yearly) {
        return res.status(400).json({ message: "Yearly billing not available for this role" });
      }

      // Get the price for the selected role and billing period
      const price = billingPeriod === "monthly" 
        ? rolePricing[role as keyof typeof rolePricing].monthly
        : rolePricing[role as keyof typeof rolePricing].yearly;

      if (!price) {
        return res.status(400).json({ message: "Invalid pricing configuration" });
      }

      // Create Stripe checkout session with dynamic pricing
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: roleNames[role as keyof typeof roleNames],
                description: `${roleNames[role as keyof typeof roleNames]} - ${billingPeriod === "monthly" ? "Monthly" : "Yearly"} billing`,
              },
              recurring: {
                interval: billingPeriod === "monthly" ? "month" : "year",
              },
              unit_amount: price,
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/cancel`,
        customer_email: customerEmail,
        metadata: {
          role: role,
          billingPeriod: billingPeriod,
          customerName: customerName || "",
        },
        subscription_data: {
          metadata: {
            role: role,
            billingPeriod: billingPeriod,
            customerName: customerName || "",
          },
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      console.error("Stripe key status:", process.env.STRIPE_SECRET_KEY ? "Present" : "Missing");
      res.status(500).json({ 
        message: "Failed to create checkout session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
