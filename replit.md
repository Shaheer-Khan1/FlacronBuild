# FlacronBuild - Smart Construction Cost Estimation Platform

## Overview

FlacronBuild is a modern full-stack web application designed to provide AI-powered construction cost estimation for various project types including residential, commercial, renovation, and infrastructure projects. The platform features a step-by-step form interface for project input and generates detailed cost breakdowns with regional pricing adjustments.

## System Architecture

The application follows a modern full-stack architecture with the following key components:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Development**: tsx for TypeScript execution in development

### Data Storage
- **Primary Database**: PostgreSQL (via Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Session Storage**: PostgreSQL-based session store

## Key Components

### Database Schema
The application uses two main database tables:

1. **Projects Table**: Stores project information including name, type, location, area, material tier, timeline, status, and uploaded files
2. **Estimates Table**: Stores cost calculations linked to projects, including total cost, materials cost, labor cost, permits cost, contingency cost, and regional multipliers

### Cost Calculation Engine
- Base costs per square foot categorized by project type (residential, commercial, renovation, infrastructure)
- Material tier multipliers (economy, standard, premium)
- Regional cost adjustments for major US cities
- Automatic contingency calculation (7% of base costs)

### Multi-Step Form Interface
- 5-step wizard interface for project input
- Project type selection with visual icons
- Location and size input with unit selection (sqft/sqm)
- Material tier selection
- Timeline preferences
- Review and confirmation step

### Real-Time Cost Preview
- Live cost calculations as users input project details
- Detailed cost breakdown showing materials, labor, permits, and contingency
- Regional cost indicators and multipliers
- PDF report generation capability

## Data Flow

1. **Project Creation**: Users complete the multi-step form, with data validated using Zod schemas
2. **Cost Calculation**: Backend calculates estimates using the cost calculation engine
3. **Data Persistence**: Projects and estimates are stored in PostgreSQL via Drizzle ORM
4. **Real-Time Updates**: Frontend receives updates via TanStack Query and displays live cost previews
5. **Report Generation**: Users can generate PDF reports using jsPDF

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm & drizzle-kit**: Database ORM and migration tools
- **@tanstack/react-query**: Server state management
- **react-hook-form & @hookform/resolvers**: Form handling and validation
- **zod**: Schema validation
- **tailwindcss**: Utility-first CSS framework

### UI Components
- **@radix-ui/***: Headless UI primitives for accessibility
- **shadcn/ui**: Pre-built component library
- **lucide-react**: Icon library
- **class-variance-authority**: Utility for component variants

### Development Tools
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling for server code

## Deployment Strategy

### Development Environment
- Replit environment with Node.js 20, web, and PostgreSQL 16 modules
- Vite development server with hot module replacement
- Development server runs on port 5000

### Production Build
- Frontend: Vite builds optimized static assets
- Backend: esbuild bundles server code for Node.js execution
- Assets served from `/dist/public` directory
- Server bundle output to `/dist/index.js`

### Database Configuration
- Uses DATABASE_URL environment variable for connection
- Drizzle migrations stored in `/migrations` directory
- Schema defined in `/shared/schema.ts` for type sharing

## Changelog

```
Changelog:
- June 26, 2025. Initial setup
- June 26, 2025. Implemented real construction cost data system using web scrapers instead of mock calculations. Added authentic pricing from construction industry sources, regional labor rates, and permit costs from government databases.
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```