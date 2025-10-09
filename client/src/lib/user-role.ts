import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
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
  private currentSubscriptionId: string | null = null;
  private listeners: ((role: UserRole | null) => void)[] = [];
  private unsubscribeSnapshot: (() => void) | null = null;
  private sessionOverrideRole: UserRole | null = null;

  static getInstance(): UserRoleManager {
    if (!UserRoleManager.instance) {
      UserRoleManager.instance = new UserRoleManager();
    }
    return UserRoleManager.instance;
  }

  // ✅ Set user role and optional subscription
  async setUserRole(
    role: UserRole,
    subscriptionId?: string,
    billingPeriod?: "monthly" | "yearly"
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const existingRole = this.currentRole || (await this.getUserRole());
    if (existingRole === "homeowner" && role !== "homeowner") {
      throw new Error("Homeowner accounts cannot change roles");
    }

    const roleData: UserRoleData = {
      role,
      lastUpdated: new Date().toISOString(),
      ...(subscriptionId && { subscriptionId }),
      ...(billingPeriod && { billingPeriod }),
    };

    await setDoc(doc(db, "userRoles", user.uid), roleData, { merge: true });

    this.currentRole = role;
    this.currentSubscriptionId = subscriptionId || null;
    this.notifyListeners(role);
  }

  // ✅ Check if user is subscribed
  async isSubscribed(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    try {
      const roleDoc = await getDoc(doc(db, "userRoles", user.uid));
      if (roleDoc.exists()) {
        const data = roleDoc.data() as UserRoleData;
        return !!data.subscriptionId; // true if present
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }

    return false;
  }

  // 🔄 Sync role from Firestore in real time
  private setupRoleListener(userId: string): void {
    this.unsubscribeSnapshot?.();

    const roleDocRef = doc(db, "userRoles", userId);
    this.unsubscribeSnapshot = onSnapshot(roleDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserRoleData;
        this.currentRole = data.role;
        this.currentSubscriptionId = data.subscriptionId || null;
        this.notifyListeners(data.role);
      }
    });
  }

  // ⚙️ Helpers
  getEffectiveRoleSync(): UserRole | null {
    return this.sessionOverrideRole || this.currentRole;
  }

  getUserRoleSync(): UserRole | null {
    return this.currentRole;
  }

  async getUserRole(): Promise<UserRole | null> {
    if (this.currentRole) return this.currentRole;
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const roleDoc = await getDoc(doc(db, "userRoles", user.uid));
      if (roleDoc.exists()) {
        const data = roleDoc.data() as UserRoleData;
        this.currentRole = data.role;
        this.currentSubscriptionId = data.subscriptionId || null;
        return data.role;
      }
    } catch (error) {
      console.error("Error fetching role:", error);
    }
    return null;
  }

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
    this.currentSubscriptionId = null;
    this.notifyListeners(null);
    this.unsubscribeSnapshot?.();
  }

  setSessionRole(role: UserRole | null): void {
    const baseRole = this.currentRole;
    if (baseRole === "homeowner" && role && role !== "homeowner") {
      throw new Error("Homeowner accounts cannot change roles");
    }
    this.sessionOverrideRole = role;
    this.notifyListeners(this.getEffectiveRoleSync());
  }

  onRoleChange(callback: (role: UserRole | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notifyListeners(role: UserRole | null): void {
    this.listeners.forEach((callback) => callback(role));
  }

  initialize(): void {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        this.clearUserRole();
      } else {
        this.setupRoleListener(user.uid);
      }
    });
  }

  // 👇 Role names, descriptions, and features
  getRoleDisplayName(role: UserRole): string {
    const names = {
      homeowner: "🏠 Homeowner",
      contractor: "🧱 Contractor",
      inspector: "🧑‍💼 Inspector",
      "insurance-adjuster": "💼 Insurance Adjuster",
    };
    return names[role];
  }

  getRoleDescription(role: UserRole): string {
    const descriptions = {
      homeowner: "Basic estimator with simplified interface and budget-friendly options",
      contractor: "Professional estimator with detailed breakdowns and bid-ready reports",
      inspector: "Comprehensive inspection tools with damage assessment and certification",
      "insurance-adjuster": "Insurance-focused tools with coverage analysis and claim management",
    };
    return descriptions[role];
  }

  getRoleFeatures(role: UserRole): string[] {
    const features = {
      homeowner: [
        "Basic Estimator (fewer fields)",
        "No cost breakdowns by unit",
        "Plain-language summary",
        "Budget suggestions only",
      ],
      contractor: [
        "Full estimator with labor, material, permit, equipment breakdown",
        "Editable line items",
        "Downloadable bid-ready report",
      ],
      inspector: [
        "Slope-by-slope damage input",
        "Component condition checklist",
        "Certification option",
        "Annotated photos included in report",
      ],
      "insurance-adjuster": [
        "Damage cause classification",
        "Coverage table (Covered / Not Covered)",
        "Claim number and metadata fields",
        "Legal certification block",
      ],
    };
    return features[role];
  }
}

export const userRoleManager = UserRoleManager.getInstance();
userRoleManager.initialize();
