import { projects, estimates, type Project, type InsertProject, type Estimate, type InsertEstimate } from "@shared/schema";

export interface IStorage {
  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Estimates
  createEstimate(estimate: InsertEstimate): Promise<Estimate>;
  getEstimate(id: number): Promise<Estimate | undefined>;
  getEstimatesByProjectId(projectId: number): Promise<Estimate[]>;
  getLatestEstimateByProjectId(projectId: number): Promise<Estimate | undefined>;
}

export class MemStorage implements IStorage {
  private projects: Map<number, Project>;
  private estimates: Map<number, Estimate>;
  private currentProjectId: number;
  private currentEstimateId: number;

  constructor() {
    this.projects = new Map();
    this.estimates = new Map();
    this.currentProjectId = 1;
    this.currentEstimateId = 1;
  }

  // Projects
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const now = new Date();
    const project: Project = { 
      id,
      name: insertProject.name,
      type: insertProject.type,
      location: insertProject.location,
      area: insertProject.area,
      unit: insertProject.unit || "sqft",
      materialTier: insertProject.materialTier || "standard",
      timeline: insertProject.timeline || null,
      status: insertProject.status || "draft",
      uploadedFiles: null,
      createdAt: now,
      updatedAt: now
    } as Project;
    this.projects.set(id, project);
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject: Project = {
      ...project,
      ...updates,
      updatedAt: new Date()
    } as Project;
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Estimates
  async createEstimate(insertEstimate: InsertEstimate): Promise<Estimate> {
    const id = this.currentEstimateId++;
    const estimate: Estimate = {
      id,
      projectId: insertEstimate.projectId,
      totalCost: insertEstimate.totalCost,
      materialsCost: insertEstimate.materialsCost,
      laborCost: insertEstimate.laborCost,
      permitsCost: insertEstimate.permitsCost,
      contingencyCost: insertEstimate.contingencyCost,
      regionMultiplier: insertEstimate.regionMultiplier || "1.0",
      createdAt: new Date()
    } as Estimate;
    this.estimates.set(id, estimate);
    return estimate;
  }

  async getEstimate(id: number): Promise<Estimate | undefined> {
    return this.estimates.get(id);
  }

  async getEstimatesByProjectId(projectId: number): Promise<Estimate[]> {
    return Array.from(this.estimates.values())
      .filter(estimate => estimate.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getLatestEstimateByProjectId(projectId: number): Promise<Estimate | undefined> {
    const estimates = await this.getEstimatesByProjectId(projectId);
    return estimates[0];
  }
}

export const storage = new MemStorage();
