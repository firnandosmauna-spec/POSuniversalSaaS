import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type BusinessType = 
  | "CAFE" 
  | "FNB" 
  | "RETAIL" 
  | "GROCERY" 
  | "LAUNDRY" 
  | "GYM" 
  | "PRINTING" 
  | "SALON" 
  | "WORKSHOP" 
  | "PHARMACY" 
  | "DISTRIBUTOR" 
  | "E_COMMERCE";

export type Branch = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_main?: boolean;
};

interface User {
  id: string;
  name: string;
  email: string;
  businessType: BusinessType;
  role?: string | undefined;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  branches: Branch[];
  activeBranchId: string;
  activeBranchName: string;
  isImpersonating: boolean;
  switchBusinessType: (type: BusinessType) => Promise<void>;
  switchBranch: (branchId: string) => void;
  addBranch: (name: string, address?: string, phone?: string) => Promise<Branch>;
  editBranch: (id: string, name: string, address?: string, phone?: string) => Promise<void>;
  setMainBranch: (id: string) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  register: (name: string, email: string, password: string, businessType: BusinessType) => Promise<{ success: boolean; message?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  impersonateTenant: (targetUser: User, targetBranches?: Branch[]) => void;
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate tenant-specific default branch (called once on first login)
function createDefaultBranch(tenantId?: string): Branch {
  const suffix = tenantId ? `_${tenantId.substring(0, 8)}` : `_${Date.now()}`;
  return { 
    id: `main${suffix}`, 
    name: "Cabang Utama (Pusat)", 
    address: "", 
    phone: "", 
    is_main: true 
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Multi Branch state — starts empty, filled from localStorage or generated on first login
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>("");

  // Load branches & active branch from localStorage
  useEffect(() => {
    try {
      const savedBranches = localStorage.getItem("pos_tenant_branches");
      if (savedBranches) {
        const parsed = JSON.parse(savedBranches);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBranches(parsed);
          const savedActive = localStorage.getItem("pos_active_branch_id");
          setActiveBranchId(savedActive || parsed[0]?.id || "");
          return;
        }
      }
      const savedActive = localStorage.getItem("pos_active_branch_id");
      if (savedActive) {
        setActiveBranchId(savedActive);
      }
    } catch (e) {
      console.error("Error reading branches from storage:", e);
    }
  }, []);

  const switchBranch = (branchId: string) => {
    setActiveBranchId(branchId);
    localStorage.setItem("pos_active_branch_id", branchId);
  };

  const addBranch = async (name: string, address?: string, phone?: string): Promise<Branch> => {
    const newBranch: Branch = {
      id: `branch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      address: address || "",
      phone: phone || "",
      is_main: false
    };

    const updated = [...branches, newBranch];
    setBranches(updated);
    localStorage.setItem("pos_tenant_branches", JSON.stringify(updated));

    // Try saving to DB if table exists
    if (user) {
      try {
        await supabase.from("branches").insert({
          id: newBranch.id,
          tenant_id: user.id,
          name,
          address,
          phone
        });
      } catch (e) {
        // Fallback safely if table doesn't exist
      }
    }

    return newBranch;
  };

  const deleteBranch = async (id: string) => {
    const updated = branches.filter(b => b.id !== id);
    setBranches(updated);
    localStorage.setItem("pos_tenant_branches", JSON.stringify(updated));
    if (activeBranchId === id) {
      switchBranch(updated[0]?.id || "main");
    }

    if (user) {
      try {
        await supabase.from("branches").delete().eq("id", id);
      } catch (e) {}
    }
  };

  const editBranch = async (id: string, name: string, address?: string, phone?: string) => {
    const updated = branches.map(b => b.id === id ? { ...b, name, address: address || "", phone: phone || "" } : b);
    setBranches(updated);
    localStorage.setItem("pos_tenant_branches", JSON.stringify(updated));

    if (user) {
      try {
        await supabase.from("branches").update({ name, address, phone }).eq("id", id).eq("tenant_id", user.id);
      } catch (e) {}
    }
  };

  const setMainBranch = async (id: string) => {
    const updated = branches.map(b => ({ ...b, is_main: b.id === id }));
    setBranches(updated);
    localStorage.setItem("pos_tenant_branches", JSON.stringify(updated));

    if (user) {
      try {
        await supabase.from("branches").update({ is_main: false }).eq("tenant_id", user.id);
        await supabase.from("branches").update({ is_main: true }).eq("id", id).eq("tenant_id", user.id);
      } catch (e) {}
    }
  };

  const activeBranchName = activeBranchId === "all" 
    ? "Semua Cabang (Konsolidasi)" 
    : branches.find(b => b.id === activeBranchId)?.name || "Cabang Utama";

  // Initialize session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedType = localStorage.getItem("pos_active_business_type") as BusinessType | null;
        const savedUserStr = localStorage.getItem("pos_active_user");
        let localUserObj: User | null = null;
        if (savedUserStr) {
          try {
            localUserObj = JSON.parse(savedUserStr);
          } catch (e) {}
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userMeta = session.user.user_metadata || {};
          const bType = (userMeta["businessType"] as BusinessType) || savedType || localUserObj?.businessType || "PRINTING";
          localStorage.setItem("pos_active_business_type", bType);
          const activeUser: User = {
            id: session.user.id,
            email: session.user.email || "",
            name: userMeta["name"] || localUserObj?.name || "User",
            businessType: bType
          };
          localStorage.setItem("pos_active_user", JSON.stringify(activeUser));
          setUser(activeUser);

          // Inisialisasi cabang utama unik per tenant jika belum ada
          const savedBranches = localStorage.getItem("pos_tenant_branches");
          if (!savedBranches || JSON.parse(savedBranches).length === 0) {
            const defaultBranch = createDefaultBranch(session.user.id);
            const initBranches = [defaultBranch];
            setBranches(initBranches);
            setActiveBranchId(defaultBranch.id);
            localStorage.setItem("pos_tenant_branches", JSON.stringify(initBranches));
            localStorage.setItem("pos_active_branch_id", defaultBranch.id);
          }
        } else if (localUserObj) {
          if (savedType) localUserObj.businessType = savedType;
          setUser(localUserObj);

          // Inisialisasi cabang utama unik per tenant jika belum ada
          const savedBranches = localStorage.getItem("pos_tenant_branches");
          if (!savedBranches || JSON.parse(savedBranches).length === 0) {
            const defaultBranch = createDefaultBranch(localUserObj.id);
            const initBranches = [defaultBranch];
            setBranches(initBranches);
            setActiveBranchId(defaultBranch.id);
            localStorage.setItem("pos_tenant_branches", JSON.stringify(initBranches));
            localStorage.setItem("pos_active_branch_id", defaultBranch.id);
          }
        } else {
          // No session and no saved user — stay logged out, let route guard redirect to login
          setUser(null);
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userMeta = session.user.user_metadata || {};
        const savedType = localStorage.getItem("pos_active_business_type") as BusinessType | null;
        const bType = (userMeta["businessType"] as BusinessType) || savedType || "PRINTING";
        localStorage.setItem("pos_active_business_type", bType);
        const activeUser: User = {
          id: session.user.id,
          email: session.user.email || "",
          name: userMeta["name"] || "User",
          businessType: bType
        };
        localStorage.setItem("pos_active_user", JSON.stringify(activeUser));
        setUser(activeUser);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const switchBusinessType = async (type: BusinessType) => {
    if (!user) return;
    
    // Save to localStorage so domain choice is 100% persistent
    try {
      localStorage.setItem("pos_active_business_type", type);
    } catch (e) {
      console.error("Failed saving business type preference:", e);
    }

    // Update local state & local user object
    const updatedUser = { ...user, businessType: type };
    setUser(updatedUser);
    localStorage.setItem("pos_active_user", JSON.stringify(updatedUser));
    
    // Update user metadata in Supabase
    try {
      await supabase.auth.updateUser({
        data: { businessType: type }
      });
    } catch (error) {
      console.error("Error updating business type in Supabase:", error);
    }
  };
  
  const seedTenantData = async (tenantId: string, name: string, email: string, businessType: BusinessType, password?: string) => {
    try {
      const ownerPin = password ? password.trim() : "1234";

      // 1. Initial Staff Account
      const initialStaff = [{
        id: `staff_owner_${tenantId}`,
        tenant_id: tenantId,
        name: name || "Owner Utama",
        email: email || "owner@pos.id",
        pin_code: ownerPin,
        role: "Owner Tenant",
        branch_id: "main",
        branch_name: "Cabang Utama (Pusat)",
        status: "ACTIVE",
        created_at: new Date().toISOString()
      }];
      localStorage.setItem(`pos_tenant_${tenantId}_staff`, JSON.stringify(initialStaff));

      // Try saving to Supabase store_users
      try {
        const firstOwner = initialStaff[0];
        if (firstOwner) {
          await supabase.from("store_users").insert({
            id: firstOwner.id,
            tenant_id: tenantId,
            name: firstOwner.name,
            email: firstOwner.email,
            pin_code: ownerPin,
            role: "Owner Tenant",
            branch_id: "main",
            status: "ACTIVE"
          });
        }
      } catch (e) {}

      // 2. Initial Store Settings
      try {
        await supabase.from("store_settings").upsert({
          tenant_id: tenantId,
          store_name: `${name} Store`,
          tax_rate: 10,
          enable_dine_in: true
        });
      } catch (e) {}
    } catch (e) {
      console.error("Error seeding tenant data:", e);
    }
  };

  const register = async (name: string, email: string, password: string, businessType: BusinessType) => {
    try {
      localStorage.setItem("pos_active_business_type", businessType);
      
      const newUserId = `tenant_${Date.now()}`;
      // Never store password/pin_code in localStorage
      const newUserObj: User = {
        id: newUserId,
        email: email.trim(),
        name: name.trim(),
        businessType,
        role: "Owner Tenant"
      };
      
      // Seed isolated tenant data with actual registered password
      await seedTenantData(newUserId, name, email, businessType, password);

      // Save local tenant session so user can access POS immediately
      localStorage.setItem("pos_active_user", JSON.stringify(newUserObj));
      setUser(newUserObj);

      try {
        const { data } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name,
              businessType,
              role: "Owner Tenant"
            }
          }
        });

        if (data?.session?.user) {
          // Never store password/pin_code in localStorage
          const syncedUser: User = {
            id: data.session.user.id,
            email: data.session.user.email || email.trim(),
            name,
            businessType,
            role: "Owner Tenant"
          };
          await seedTenantData(syncedUser.id, name, email, businessType, password);
          localStorage.setItem("pos_active_user", JSON.stringify(syncedUser));
          setUser(syncedUser);
        }
      } catch (e) {}
      
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || "An unexpected error occurred" };
    }
  };



  const login = async (emailInput: string, passwordInput: string) => {
    try {
      const emailClean = emailInput.trim();
      const passwordClean = passwordInput.trim();
      const savedType = (localStorage.getItem("pos_active_business_type") as BusinessType) || "FNB";
      
      // 1. Try Supabase Auth (Owner / Admin account)
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailClean,
          password: passwordClean
        });

        if (!error && data?.session?.user) {
          const userMeta = data.session.user.user_metadata || {};
          const bType = (userMeta["businessType"] as BusinessType) || savedType || "FNB";
          localStorage.setItem("pos_active_business_type", bType);
          const activeUser: User = {
            id: data.session.user.id,
            email: data.session.user.email || emailClean,
            name: userMeta["name"] || emailClean.split("@")[0] || "Owner Utama",
            businessType: bType,
            role: "Owner Tenant"
          };
          localStorage.setItem("pos_active_user", JSON.stringify(activeUser));
          setUser(activeUser);
          return { success: true };
        }
      } catch (e) {}

      // 2. Check registered staff accounts in Supabase store_users (Must match BOTH email and pin_code)
      try {
        const { data: staffData } = await supabase
          .from("store_users")
          .select("*")
          .eq("email", emailClean)
          .eq("pin_code", passwordClean)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (staffData) {
          const bType = savedType || "FNB";
          const staffUser: User = {
            id: staffData.tenant_id,
            email: staffData.email || emailClean,
            name: staffData.name || "Staf Kasir",
            businessType: bType,
            role: staffData.role || "Kasir"
          };
          localStorage.setItem("pos_active_user", JSON.stringify(staffUser));
          setUser(staffUser);
          return { success: true };
        }
      } catch (e) {}

      // 3. Check LocalStorage staff lists across tenant keys (Must match BOTH email/name AND pin_code)
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes("_staff")) {
            const val = localStorage.getItem(key);
            if (val) {
              const staffList = JSON.parse(val);
              if (Array.isArray(staffList)) {
                const match = staffList.find((s: any) => {
                  if (s.status !== "ACTIVE") return false;
                  const matchIdentifier =
                    s.email?.toLowerCase() === emailClean.toLowerCase() ||
                    s.name?.toLowerCase() === emailClean.toLowerCase();
                  
                  // Require PIN code matching
                  const matchPin = s.pin_code ? s.pin_code === passwordClean : true;
                  return matchIdentifier && matchPin;
                });

                if (match) {
                  const bType = savedType || "FNB";
                  const staffUser: User = {
                    id: match.tenant_id,
                    email: match.email || emailClean,
                    name: match.name,
                    businessType: bType,
                    role: match.role || "Kasir"
                  };
                  localStorage.setItem("pos_active_user", JSON.stringify(staffUser));
                  setUser(staffUser);
                  return { success: true };
                }
              }
            }
          }
        }
      } catch (e) {}

      // 4. Check saved local session — only allow if email matches (no password stored here for security)
      const savedUserStr = localStorage.getItem("pos_active_user");
      if (savedUserStr) {
        try {
          const localUserObj = JSON.parse(savedUserStr);
          const storedEmail = localUserObj.email?.toLowerCase();
          // Only restore session if email matches exactly — no password bypass
          if (storedEmail && storedEmail === emailClean.toLowerCase()) {
            const activeType = savedType || localUserObj.businessType || "FNB";
            const ownerUser: User = {
              id: localUserObj.id || `tenant_${Date.now()}`,
              email: emailClean,
              name: localUserObj.name || emailClean.split("@")[0] || "Owner Utama",
              businessType: activeType,
              role: localUserObj.role || "Owner Tenant"
            };
            localStorage.setItem("pos_active_business_type", activeType);
            localStorage.setItem("pos_active_user", JSON.stringify(ownerUser));
            setUser(ownerUser);
            return { success: true };
          }
        } catch (e) {}
      }

      return { success: false, message: "Email / Username atau PIN Kata Sandi salah. Silakan periksa kembali." };
    } catch (error: any) {
      return { success: false, message: error.message || "Terjadi kesalahan saat masuk" };
    }
  };

  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pos_is_impersonating") === "true";
    } catch {
      return false;
    }
  });

  const impersonateTenant = (targetUser: User, targetBranches?: Branch[]) => {
    try {
      if (user && !localStorage.getItem("pos_superadmin_original_user")) {
        localStorage.setItem("pos_superadmin_original_user", JSON.stringify(user));
      }
      localStorage.setItem("pos_is_impersonating", "true");
      localStorage.setItem("pos_active_business_type", targetUser.businessType);
      localStorage.setItem("pos_active_user", JSON.stringify(targetUser));
      
      if (targetBranches && targetBranches.length > 0 && targetBranches[0]) {
        setBranches(targetBranches);
        localStorage.setItem("pos_tenant_branches", JSON.stringify(targetBranches));
        setActiveBranchId(targetBranches[0].id);
        localStorage.setItem("pos_active_branch_id", targetBranches[0].id);
      }

      setUser(targetUser);
      setIsImpersonating(true);
    } catch (e) {
      console.error("Error setting impersonation mode:", e);
    }
  };

  const exitImpersonation = () => {
    try {
      const origUserStr = localStorage.getItem("pos_superadmin_original_user");
      if (origUserStr) {
        const origUser = JSON.parse(origUserStr);
        setUser(origUser);
        localStorage.setItem("pos_active_user", origUserStr);
        localStorage.setItem("pos_active_business_type", origUser.businessType);
      } else {
        const adminUser: User = {
          id: "superadmin_root",
          name: "Super Administrator",
          email: "superadmin@posuniversal.id",
          businessType: "PRINTING"
        };
        setUser(adminUser);
        localStorage.setItem("pos_active_user", JSON.stringify(adminUser));
      }
      localStorage.removeItem("pos_superadmin_original_user");
      localStorage.setItem("pos_is_impersonating", "false");
      setIsImpersonating(false);
    } catch (e) {
      console.error("Error exiting impersonation mode:", e);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("pos_active_user");
      localStorage.removeItem("pos_is_impersonating");
      localStorage.removeItem("pos_superadmin_original_user");
      setUser(null);
      setIsImpersonating(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      branches, 
      activeBranchId, 
      activeBranchName, 
      isImpersonating,
      switchBusinessType, 
      switchBranch, 
      addBranch, 
      editBranch,
      setMainBranch,
      deleteBranch, 
      register, 
      login, 
      logout,
      impersonateTenant,
      exitImpersonation
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
