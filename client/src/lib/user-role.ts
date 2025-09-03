import { auth, db } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc, onSnapshot } from "firebase/firestore";

export type UserRole = "homeowner" | "contractor" | "inspector" | "insurance-adjuster";

interface UserRoleData {
  role: UserRole;
  subscriptionId?: string;
  billingPeriod?: "monthly" | "yearly";
  lastUpdated: string;
}

export class UserRoleManager {
  private static instance: UserRoleManager;
  private currentRole: UserRole | null = null;
  private listeners: ((role: UserRole | null) => void)[] = [];
  private unsubscribeSnapshot: (() => void) | null = null;

  static getInstance(): UserRoleManager {
    if (!UserRoleManager.instance) {
      UserRoleManager.instance = new UserRoleManager();
    }
    return UserRoleManager.instance;
  }

  // Set user role and persist to Firebase
  async setUserRole(role: UserRole, subscriptionId?: string, billingPeriod?: "monthly" | "yearly"): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const roleData: UserRoleData = {
      role,
      lastUpdated: new Date().toISOString(),
      ...(subscriptionId && { subscriptionId }),
      ...(billingPeriod && { billingPeriod })
    };

    await setDoc(doc(db, "userRoles", user.uid), roleData);
    this.currentRole = role;
    this.notifyListeners(role);
  }

  // Get current role (from cache or Firebase)
  async getUserRole(): Promise<UserRole | null> {
    if (this.currentRole) return this.currentRole;

    const user = auth.currentUser;
    if (!user) return null;

    try {
      const roleDoc = await getDoc(doc(db, "userRoles", user.uid));
      if (roleDoc.exists()) {
        const data = roleDoc.data() as UserRoleData;
        this.currentRole = data.role;
        return data.role;
      }
    } catch (error) {
      console.error("Error fetching role:", error);
    }
    return null;
  }

  // Get role synchronously (cached only)
  getUserRoleSync(): UserRole | null {
    return this.currentRole;
  }

  // Clear role
  async clearUserRole(): Promise<void> {
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteDoc(doc(db, "userRoles", user.uid));
      } catch (error) {
        console.error("Error deleting role:", error);
      }
    }
    this.currentRole = null;
    this.notifyListeners(null);
    this.unsubscribeSnapshot?.();
  }

  // Subscribe to role changes
  onRoleChange(callback: (role: UserRole | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notifyListeners(role: UserRole | null): void {
    this.listeners.forEach(callback => callback(role));
  }

  // Initialize with auth state monitoring
  initialize(): void {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        this.clearUserRole();
      } else {
        this.setupRoleListener(user.uid);
      }
    });
  }

  // Real-time role sync from Firebase
  private setupRoleListener(userId: string): void {
    this.unsubscribeSnapshot?.();
    
    const roleDocRef = doc(db, "userRoles", userId);
    this.unsubscribeSnapshot = onSnapshot(roleDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserRoleData;
        this.currentRole = data.role;
        this.notifyListeners(data.role);
      }
    });
  }

  // Helper methods
  getRoleDisplayName(role: UserRole): string {
    const names = {
      homeowner: "🏠 Homeowner",
      contractor: "🧱 Contractor", 
      inspector: "🧑‍💼 Inspector",
      "insurance-adjuster": "💼 Insurance Adjuster"
    };
    return names[role];
  }

  getRoleDescription(role: UserRole): string {
    const descriptions = {
      homeowner: "Basic estimator with simplified interface and budget-friendly options",
      contractor: "Professional estimator with detailed breakdowns and bid-ready reports",
      inspector: "Comprehensive inspection tools with damage assessment and certification",
      "insurance-adjuster": "Insurance-focused tools with coverage analysis and claim management"
    };
    return descriptions[role];
  }

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

export const userRoleManager = UserRoleManager.getInstance();
userRoleManager.initialize();