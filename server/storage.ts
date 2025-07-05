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
    console.log('=== STORAGE: Creating Project ===');
    console.log('Insert project data:', insertProject);
    console.log('Upload files being stored:', insertProject.uploadedFiles);
    
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
      uploadedFiles: insertProject.uploadedFiles || null,
      createdAt: now,
      updatedAt: now
    } as Project;
    
    this.projects.set(id, project);
    console.log('=== STORAGE: Project Created Successfully ===');
    console.log('Final project object:', project);
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    console.log(`=== STORAGE: Getting Project ${id} ===`);
    const project = this.projects.get(id);
    console.log('Retrieved project:', project);
    console.log('Project uploadedFiles:', project?.uploadedFiles);
    return project;
  }

  async getAllProjects(): Promise<Project[]> {
    console.log('=== STORAGE: Getting All Projects ===');
    const allProjects = Array.from(this.projects.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    console.log(`Retrieved ${allProjects.length} projects`);
    return allProjects;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    console.log(`=== STORAGE: Updating Project ${id} ===`);
    console.log('Update data:', updates);
    console.log('Update uploadedFiles:', updates.uploadedFiles);
    
    const project = this.projects.get(id);
    if (!project) {
      console.log('Project not found for update');
      return undefined;
    }
    
    const updatedProject: Project = {
      ...project,
      ...updates,
      uploadedFiles: updates.uploadedFiles !== undefined ? updates.uploadedFiles : project.uploadedFiles,
      updatedAt: new Date()
    } as Project;
    
    this.projects.set(id, updatedProject);
    console.log('=== STORAGE: Project Updated Successfully ===');
    console.log('Updated project object:', updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    console.log(`=== STORAGE: Deleting Project ${id} ===`);
    const deleted = this.projects.delete(id);
    console.log(`Project ${id} deletion result:`, deleted);
    return deleted;
  }

  // Estimates
  async createEstimate(insertEstimate: InsertEstimate): Promise<Estimate> {
    console.log('=== STORAGE: Creating Estimate ===');
    console.log('Insert estimate data:', insertEstimate);
    console.log('Estimate report data:', insertEstimate.report);
    console.log('Estimate formInputData:', insertEstimate.formInputData);
    console.log('Estimate geminiResponse:', insertEstimate.geminiResponse);
    
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
      report: insertEstimate.report || null,
      formInputData: insertEstimate.formInputData || null,
      geminiResponse: insertEstimate.geminiResponse || null,
      createdAt: new Date()
    } as Estimate;
    
    this.estimates.set(id, estimate);
    console.log('=== STORAGE: Estimate Created Successfully ===');
    console.log('Final estimate object:', estimate);
    console.log('Stored formInputData size:', JSON.stringify(estimate.formInputData || {}).length);
    console.log('Stored geminiResponse size:', JSON.stringify(estimate.geminiResponse || {}).length);
    return estimate;
  }

  async getEstimate(id: number): Promise<Estimate | undefined> {
    console.log(`=== STORAGE: Getting Estimate ${id} ===`);
    const estimate = this.estimates.get(id);
    console.log('Retrieved estimate:', estimate);
    if (estimate) {
      console.log('Estimate has formInputData:', !!estimate.formInputData);
      console.log('Estimate has geminiResponse:', !!estimate.geminiResponse);
      console.log('Estimate has report:', !!estimate.report);
    }
    return estimate;
  }

  async getEstimatesByProjectId(projectId: number): Promise<Estimate[]> {
    console.log(`=== STORAGE: Getting Estimates for Project ${projectId} ===`);
    const estimates = Array.from(this.estimates.values())
      .filter(estimate => estimate.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    console.log(`Retrieved ${estimates.length} estimates for project ${projectId}`);
    return estimates;
  }

  async getLatestEstimateByProjectId(projectId: number): Promise<Estimate | undefined> {
    console.log(`=== STORAGE: Getting Latest Estimate for Project ${projectId} ===`);
    const estimates = await this.getEstimatesByProjectId(projectId);
    const latest = estimates[0];
    console.log('Latest estimate:', latest);
    if (latest) {
      console.log('Latest estimate has all data:', {
        hasFormInputData: !!latest.formInputData,
        hasGeminiResponse: !!latest.geminiResponse,
        hasReport: !!latest.report
      });
    }
    return latest;
  }
}

export const storage = new MemStorage();
