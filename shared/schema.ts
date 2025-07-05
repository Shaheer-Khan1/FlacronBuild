import { pgTable, text, serial, integer, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // residential, commercial, renovation, infrastructure
  location: text("location").notNull(),
  area: integer("area").notNull(),
  unit: text("unit").notNull().default("sqft"), // sqft, sqm
  materialTier: text("material_tier").notNull().default("standard"), // economy, standard, premium
  timeline: text("timeline"), // urgent, standard, flexible
  status: text("status").notNull().default("draft"), // draft, completed
  uploadedFiles: json("uploaded_files").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  materialsCost: decimal("materials_cost", { precision: 12, scale: 2 }).notNull(),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }).notNull(),
  permitsCost: decimal("permits_cost", { precision: 12, scale: 2 }).notNull(),
  contingencyCost: decimal("contingency_cost", { precision: 12, scale: 2 }).notNull(),
  regionMultiplier: decimal("region_multiplier", { precision: 3, scale: 2 }).notNull().default("1.0"),
  report: json("report"), // Store full Gemini JSON response
  formInputData: json("form_input_data"), // Store complete form input data as JSON
  geminiResponse: json("gemini_response"), // Store raw Gemini API response as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstimateSchema = createInsertSchema(estimates).omit({
  id: true,
  createdAt: true,
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
