import { auth } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export type UserRole = "homeowner" | "contractor" | "inspector" | "insurance-adjuster";

interface UserRoleData {
  role: UserRole;
  subscriptionId?: string;
  billingPeriod?: "monthly" | "yearly";
  lastUpdated: string;
}

const USER_ROLE_KEY = "flacron_user_role";

export class UserRoleManager {
  private static instance: UserRoleManager;
  private currentRole: UserRole | null = null;
  private listeners: ((role: UserRole | null) => void)[] = [];

  static getInstance(): UserRoleManager {
    if (!UserRoleManager.instance) {
      UserRoleManager.instance = new UserRoleManager();
    }
    return UserRoleManager.instance;
  }

  // Set user role (called after successful subscription)
  setUserRole(role: UserRole, subscriptionId?: string, billingPeriod?: "monthly" | "yearly"): void {
    const roleData: UserRoleData = {
      role,
      subscriptionId,
      billingPeriod,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(USER_ROLE_KEY, JSON.stringify(roleData));
    this.currentRole = role;
    this.notifyListeners(role);
  }

  // Get user role from localStorage
  getUserRole(): UserRole | null {
    if (this.currentRole) {
      return this.currentRole;
    }

    try {
      const stored = localStorage.getItem(USER_ROLE_KEY);
      if (stored) {
        const roleData: UserRoleData = JSON.parse(stored);
        this.currentRole = roleData.role;
        return roleData.role;
      }
    } catch (error) {
      console.error("Error parsing stored user role:", error);
    }

    return null;
  }

  // Clear user role (called on logout)
  clearUserRole(): void {
    localStorage.removeItem(USER_ROLE_KEY);
    this.currentRole = null;
    this.notifyListeners(null);
  }

  // Subscribe to role changes
  onRoleChange(callback: (role: UserRole | null) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(role: UserRole | null): void {
    this.listeners.forEach(callback => callback(role));
  }

  // Initialize role management with auth state
  initialize(): void {
    onAuthStateChanged(auth, (user: User | null) => {
      if (!user) {
        this.clearUserRole();
      }
    });
  }

  // Get role display name
  getRoleDisplayName(role: UserRole): string {
    const displayNames = {
      homeowner: "🏠 Homeowner",
      contractor: "🧱 Contractor", 
      inspector: "🧑‍💼 Inspector",
      "insurance-adjuster": "💼 Insurance Adjuster"
    };
    return displayNames[role];
  }

  // Get role description
  getRoleDescription(role: UserRole): string {
    const descriptions = {
      homeowner: "Basic estimator with simplified interface and budget-friendly options",
      contractor: "Professional estimator with detailed breakdowns and bid-ready reports",
      inspector: "Comprehensive inspection tools with damage assessment and certification",
      "insurance-adjuster": "Insurance-focused tools with coverage analysis and claim management"
    };
    return descriptions[role];
  }

  // Get role features
  getRoleFeatures(role: UserRole): string[] {
    const features = {
      homeowner: [
        "Basic Estimator (fewer fields)",
        "No cost breakdowns by unit", 
        "Plain-language summary",
        "Budget suggestions only"
      ],
      contractor: [
        "Full estimator with labor, material, permit, equipment breakdown",
        "Editable line items",
        "Downloadable bid-ready report"
      ],
      inspector: [
        "Slope-by-slope damage input",
        "Component condition checklist", 
        "Certification option",
        "Annotated photos included in report"
      ],
      "insurance-adjuster": [
        "Damage cause classification",
        "Coverage table (Covered / Not Covered)",
        "Claim number and metadata fields",
        "Legal certification block"
      ]
    };
    return features[role];
  }
}

// Export singleton instance
export const userRoleManager = UserRoleManager.getInstance();

// Initialize on module load
userRoleManager.initialize(); 