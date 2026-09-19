import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Store,
  Layers,
  Sparkles,
  TrendingUp,
  KeyRound,
  Filter,
  DollarSign,
  ArrowRight,
  LogOut,
  ChevronRight,
  RefreshCw,
  UserCheck,
  UserPlus,
  UserX,
  Home,
  User,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, BusinessType, Branch } from "@/shared/auth/AuthContext";
import { DOMAIN_LABELS } from "@/routes/app";
import { Link, useNavigate } from "@tanstack/react-router";

export type TenantStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED";
export type SubscriptionPlan = "BASIC" | "PRO" | "ENTERPRISE";

export type TenantRecord = {
  id: string;
  name: string;
  email: string;
  businessType: BusinessType;
  status: TenantStatus;
  plan: SubscriptionPlan;
  monthlyFee: number;
  expiryDate: string;
  createdAt: string;
  branches: Branch[];
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  tenantName: string;
  role: "Superadmin" | "Owner Tenant" | "Manager Cabang" | "Kasir" | "Operator";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

const DEFAULT_TENANTS: TenantRecord[] = [
  {
    id: "tenant_printing_demo",
    name: "Cetak Kilat Jaya Digital",
    email: "percetakan@pos.id",
    businessType: "PRINTING",
    status: "ACTIVE",
    plan: "PRO",
    monthlyFee: 350000,
    expiryDate: "2026-12-31",
    createdAt: "2026-01-15",
    branches: [
      { id: "b1", name: "Cabang Percetakan Sudirman", address: "Jl. Sudirman No. 45", phone: "081234567890", is_main: true },
      { id: "b2", name: "Workshop Outdoor Merdeka", address: "Jl. Merdeka No. 12", phone: "081298765432" }
    ]
  },
  {
    id: "tenant_laundry_demo",
    name: "Clean & Fresh Laundry Express",
    email: "laundry@pos.id",
    businessType: "LAUNDRY",
    status: "ACTIVE",
    plan: "BASIC",
    monthlyFee: 150000,
    expiryDate: "2026-11-30",
    createdAt: "2026-02-01",
    branches: [
      { id: "l1", name: "Outlet Kiloan Kemang", address: "Jl. Kemang Raya No. 8", phone: "081311223344", is_main: true }
    ]
  },
  {
    id: "tenant_retail_demo",
    name: "Toko Kelontong & Minimarket Serba Ada",
    email: "retail@pos.id",
    businessType: "RETAIL",
    status: "ACTIVE",
    plan: "ENTERPRISE",
    monthlyFee: 750000,
    expiryDate: "2027-01-15",
    createdAt: "2026-01-05",
    branches: [
      { id: "r1", name: "Toko Utama Mangga Dua", address: "Ruko Mangga Dua A1", phone: "0811998877", is_main: true },
      { id: "r2", name: "Cabang Minimarket Kebayoran", address: "Jl. Kebayoran Baru 5", phone: "0811223344" },
      { id: "r3", name: "Gudang Grosir BSD", address: "Kawasan Industri BSD", phone: "0811556677" }
    ]
  },
  {
    id: "tenant_fnb_demo",
    name: "Resto & Cafe Sambal Nusantara",
    email: "fnb@pos.id",
    businessType: "FNB",
    status: "ACTIVE",
    plan: "PRO",
    monthlyFee: 350000,
    expiryDate: "2026-10-20",
    createdAt: "2026-03-10",
    branches: [
      { id: "f1", name: "Resto Senopati", address: "Jl. Senopati No. 88", phone: "082144556677", is_main: true }
    ]
  },
  {
    id: "tenant_pharmacy_demo",
    name: "Apotek Sehat Mandiri 24 Jam",
    email: "apotek@pos.id",
    businessType: "PHARMACY",
    status: "TRIAL",
    plan: "PRO",
    monthlyFee: 350000,
    expiryDate: "2026-09-25",
    createdAt: "2026-09-10",
    branches: [
      { id: "ph1", name: "Apotek Pusat Tebet", address: "Jl. Tebet Raya No. 10", phone: "081577889900", is_main: true }
    ]
  },
  {
    id: "tenant_workshop_demo",
    name: "Bengkel & Servis Auto Performance",
    email: "bengkel@pos.id",
    businessType: "WORKSHOP",
    status: "SUSPENDED",
    plan: "BASIC",
    monthlyFee: 150000,
    expiryDate: "2026-08-15",
    createdAt: "2026-04-01",
    branches: [
      { id: "w1", name: "Bengkel Pluit", address: "Jl. Pluit Selatan No. 3", phone: "0818990011", is_main: true }
    ]
  }
];

const DEFAULT_USERS: UserRecord[] = [
  {
    id: "usr_superadmin",
    name: "Super Administrator Root",
    email: "superadmin@posuniversal.id",
    tenantName: "Pusat System SaaS",
    role: "Superadmin",
    status: "ACTIVE",
    createdAt: "2026-01-01"
  },
  {
    id: "usr_1",
    name: "Ibu Rina Wijaya",
    email: "percetakan@pos.id",
    tenantName: "Cetak Kilat Jaya Digital",
    role: "Owner Tenant",
    status: "ACTIVE",
    createdAt: "2026-01-15"
  },
  {
    id: "usr_2",
    name: "Hendra Setiawan",
    email: "laundry@pos.id",
    tenantName: "Clean & Fresh Laundry Express",
    role: "Owner Tenant",
    status: "ACTIVE",
    createdAt: "2026-02-01"
  },
  {
    id: "usr_3",
    name: "Budi Santoso",
    email: "budi@retail.com",
    tenantName: "Toko Kelontong & Minimarket Serba Ada",
    role: "Manager Cabang",
    status: "ACTIVE",
    createdAt: "2026-02-10"
  },
  {
    id: "usr_4",
    name: "Siti Nurhaliza",
    email: "siti@fnb.com",
    tenantName: "Resto & Cafe Sambal Nusantara",
    role: "Kasir",
    status: "ACTIVE",
    createdAt: "2026-03-12"
  }
];

export function SuperadminView() {
  const { user, impersonateTenant, exitImpersonation, isImpersonating, logout } = useAuth();
  const navigate = useNavigate();

  // Active Section Tab (TENANTS or USERS)
  const [activeTab, setActiveTab] = useState<"TENANTS" | "USERS">("TENANTS");

  // Superadmin Login Security Gate State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pos_superadmin_unlocked") === "true";
    } catch {
      return false;
    }
  });
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Master Tenants list
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Master Users list
  const [users, setUsers] = useState<UserRecord[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);

  // User Add Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userNameInput, setUserNameInput] = useState("");
  const [userEmailInput, setUserEmailInput] = useState("");
  const [userRoleInput, setUserRoleInput] = useState<UserRecord["role"]>("Owner Tenant");
  const [userTenantInput, setUserTenantInput] = useState("Cetak Kilat Jaya Digital");

  // Form State Add/Edit Tenant
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formBusinessType, setFormBusinessType] = useState<BusinessType>("RETAIL");
  const [formPlan, setFormPlan] = useState<SubscriptionPlan>("PRO");
  const [formStatus, setFormStatus] = useState<TenantStatus>("ACTIVE");
  const [formExpiry, setFormExpiry] = useState("2027-12-31");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_superadmin_tenants");
      if (saved) {
        setTenants(JSON.parse(saved));
      } else {
        setTenants(DEFAULT_TENANTS);
        localStorage.setItem("pos_superadmin_tenants", JSON.stringify(DEFAULT_TENANTS));
      }

      const savedUsers = localStorage.getItem("pos_superadmin_users");
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      } else {
        setUsers(DEFAULT_USERS);
        localStorage.setItem("pos_superadmin_users", JSON.stringify(DEFAULT_USERS));
      }
    } catch (e) {
      setTenants(DEFAULT_TENANTS);
      setUsers(DEFAULT_USERS);
    }
  }, []);

  const saveTenants = (updated: TenantRecord[]) => {
    setTenants(updated);
    try {
      localStorage.setItem("pos_superadmin_tenants", JSON.stringify(updated));
    } catch (e) {}
  };

  const saveUsers = (updated: UserRecord[]) => {
    setUsers(updated);
    try {
      localStorage.setItem("pos_superadmin_users", JSON.stringify(updated));
    } catch (e) {}
  };

  const handleSuperadminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = usernameInput.trim().toLowerCase();
    const p = passwordInput.trim();

    const isValidUser = u === "admin" || u === "superadmin" || u === "superadmin@posuniversal.id" || u === "root";
    const isValidPass = p === "admin" || p === "superadmin" || p === "1234" || p === "123456" || p.length >= 4;

    if (isValidUser && isValidPass) {
      setIsUnlocked(true);
      localStorage.setItem("pos_superadmin_unlocked", "true");
      sessionStorage.setItem("pos_superadmin_unlocked", "true");
      setLoginError("");
    } else {
      setLoginError("Username atau Password Superadmin salah. Gunakan Username: admin / superadmin & Password: admin / 1234");
    }
  };

  // Superadmin Logout & Navigate to Landing Page Directly
  const handleSuperadminLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari Superadmin Control Center?")) {
      try {
        localStorage.removeItem("pos_superadmin_unlocked");
        sessionStorage.removeItem("pos_superadmin_unlocked");
        setIsUnlocked(false);
        setUsernameInput("");
        setPasswordInput("");
        if (isImpersonating) {
          exitImpersonation();
        }
        await logout();
      } catch (e) {}
      navigate({ to: "/" });
    }
  };

  // Preview Mode: Impersonate Target Tenant
  const handlePreviewTenant = (tenant: TenantRecord) => {
    const targetUser = {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      businessType: tenant.businessType,
    };
    impersonateTenant(targetUser, tenant.branches);
    navigate({ to: "/app/dashboard" });
  };

  // Quick Change Status
  const handleToggleStatus = (tenantId: string, currentStatus: TenantStatus) => {
    const nextStatus: TenantStatus =
      currentStatus === "ACTIVE" ? "SUSPENDED" : currentStatus === "SUSPENDED" ? "ACTIVE" : "ACTIVE";
    const updated = tenants.map((t) => (t.id === tenantId ? { ...t, status: nextStatus } : t));
    saveTenants(updated);
  };

  // Submit Add Tenant
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const monthlyFee = formPlan === "BASIC" ? 150000 : formPlan === "PRO" ? 350000 : 750000;
    const newTenant: TenantRecord = {
      id: `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: formName.trim(),
      email: formEmail.trim(),
      businessType: formBusinessType,
      status: formStatus,
      plan: formPlan,
      monthlyFee,
      expiryDate: formExpiry,
      createdAt: new Date().toISOString().split("T")[0] || "",
      branches: [
        {
          id: `b_${Date.now()}`,
          name: `Cabang Utama - ${formName.trim()}`,
          address: "Alamat Utama",
          phone: "0812xxxx",
          is_main: true,
        },
      ],
    };

    const updated = [newTenant, ...tenants];
    saveTenants(updated);
    setIsAddModalOpen(false);
    resetForm();
  };

  // Submit Add User
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNameInput.trim() || !userEmailInput.trim()) return;

    const newUser: UserRecord = {
      id: `usr_${Date.now()}`,
      name: userNameInput.trim(),
      email: userEmailInput.trim(),
      tenantName: userTenantInput,
      role: userRoleInput,
      status: "ACTIVE",
      createdAt: new Date().toISOString().split("T")[0] || "",
    };

    const updated = [newUser, ...users];
    saveUsers(updated);
    setIsAddUserModalOpen(false);
    setUserNameInput("");
    setUserEmailInput("");
  };

  const handleToggleUserStatus = (userId: string) => {
    const updated = users.map((u) =>
      u.id === userId ? { ...u, status: u.status === "ACTIVE" ? ("INACTIVE" as const) : ("ACTIVE" as const) } : u
    );
    saveUsers(updated);
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) return;
    const updated = users.filter((u) => u.id !== userId);
    saveUsers(updated);
  };

  // Submit Edit Tenant
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    const monthlyFee = formPlan === "BASIC" ? 150000 : formPlan === "PRO" ? 350000 : 750000;
    const updated = tenants.map((t) =>
      t.id === editingTenant.id
        ? {
            ...t,
            name: formName.trim(),
            email: formEmail.trim(),
            businessType: formBusinessType,
            plan: formPlan,
            status: formStatus,
            expiryDate: formExpiry,
            monthlyFee,
          }
        : t
    );

    saveTenants(updated);
    setIsEditModalOpen(false);
    setEditingTenant(null);
  };

  const handleOpenEdit = (tenant: TenantRecord) => {
    setEditingTenant(tenant);
    setFormName(tenant.name);
    setFormEmail(tenant.email);
    setFormBusinessType(tenant.businessType);
    setFormPlan(tenant.plan);
    setFormStatus(tenant.status);
    setFormExpiry(tenant.expiryDate);
    setIsEditModalOpen(true);
  };

  const handleDeleteTenant = (tenantId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tenant ini dari sistem?")) return;
    const updated = tenants.filter((t) => t.id !== tenantId);
    saveTenants(updated);
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormBusinessType("RETAIL");
    setFormPlan("PRO");
    setFormStatus("ACTIVE");
    setFormExpiry("2027-12-31");
  };

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchDomain = domainFilter === "ALL" || t.businessType === domainFilter;
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchSearch && matchDomain && matchStatus;
  });

  // Filtered users
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.tenantName.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate SaaS Superadmin Metrics
  const totalTenantsCount = tenants.length;
  const activeTenantsCount = tenants.filter((t) => t.status === "ACTIVE").length;
  const trialTenantsCount = tenants.filter((t) => t.status === "TRIAL").length;
  const suspendedTenantsCount = tenants.filter((t) => t.status === "SUSPENDED" || t.status === "EXPIRED").length;
  const totalMrrRevenue = tenants
    .filter((t) => t.status === "ACTIVE" || t.status === "TRIAL")
    .reduce((sum, t) => sum + t.monthlyFee, 0);
  const totalBranchesAggregate = tenants.reduce((sum, t) => sum + (t.branches?.length || 1), 0);

  // If Lock Screen is active
  if (!isUnlocked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-100 font-sans p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="size-14 bg-brand text-white grid place-items-center rounded-none shadow-lg">
              <ShieldCheck className="size-8" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl tracking-tight text-white">
                Superadmin Control Center
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Silakan masuk dengan Username dan Password Superadmin untuk mengakses sistem billing & multi-tenant.
              </p>
            </div>
          </div>

          <form onSubmit={handleSuperadminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Username / Email Superadmin
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan Username (e.g. admin / superadmin)"
                  className="bg-slate-950 border-slate-800 text-sm font-medium text-white rounded-none h-11 pl-10 focus:border-brand"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan Password (e.g. admin / 1234)"
                  className="bg-slate-950 border-slate-800 text-sm font-medium text-white rounded-none h-11 pl-10 focus:border-brand"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 font-medium">
                {loginError}
              </div>
            )}

            <div className="bg-slate-950/70 border border-slate-800 p-3 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">🔑 Kredensial Default Login Superadmin:</p>
              <p>• Username: <code className="text-brand font-mono font-bold">admin</code> atau <code className="text-brand font-mono font-bold">superadmin</code></p>
              <p>• Password: <code className="text-brand font-mono font-bold">admin</code> atau <code className="text-brand font-mono font-bold">1234</code></p>
            </div>

            <Button
              type="submit"
              className="w-full bg-brand hover:bg-brand/90 text-white font-extrabold text-xs py-3 rounded-none shadow-md gap-2"
            >
              <ShieldCheck className="size-4" /> Masuk Control Center
            </Button>
          </form>

          <div className="pt-2 text-center border-t border-slate-800">
            <Link to="/">
              <span className="text-xs text-slate-400 hover:text-white font-medium inline-flex items-center gap-1.5 cursor-pointer">
                <Home className="size-3.5" /> Kembali ke Landing Page
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto p-4 md:p-8 space-y-6 font-sans">
      {/* Top Superadmin Control Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm rounded-none">
        <div className="flex items-center gap-4">
          <div className="size-12 bg-slate-900 text-brand grid place-items-center rounded-none font-bold shadow-md">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Superadmin Billing & Multi-Tenant Control
              <span className="text-xs bg-brand/20 text-brand px-2.5 py-0.5 border border-brand/40 font-mono">
                SAAS MASTER PANEL
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kontrol penuh berlangganan tenant, kelola pengguna sistem, manajemen cabang, & Live Preview 1-Klik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isImpersonating && (
            <Button
              onClick={() => {
                exitImpersonation();
                navigate({ to: "/superadmin" });
              }}
              variant="outline"
              className="border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 font-bold text-xs gap-1.5 rounded-none"
            >
              <LogOut className="size-3.5" /> Batal Preview
            </Button>
          )}

          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand hover:bg-brand/90 text-white font-extrabold text-xs px-4 py-2.5 rounded-none shadow-md gap-2"
          >
            <Plus className="size-4" /> Onboard Tenant
          </Button>

          <Button
            onClick={() => setIsAddUserModalOpen(true)}
            variant="outline"
            className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-extrabold text-xs px-4 py-2.5 rounded-none gap-2"
          >
            <UserPlus className="size-4 text-brand" /> Tambah User
          </Button>

          {/* Tombol Keluar Langsung Kembali Ke Landing Page */}
          <Button
            onClick={handleSuperadminLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-none shadow-md gap-2"
            title="Keluar Superadmin & Kembali ke Landing Page"
          >
            <LogOut className="size-4" /> Keluar ke Landing Page
          </Button>
        </div>
      </div>

      {/* Aggregate SaaS Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Revenue */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Estimasi Omset MRR SaaS</span>
            <div className="size-8 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 grid place-items-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
            Rp {totalMrrRevenue.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="size-3" /> Berdasarkan berlangganan bulanan aktif
          </p>
        </div>

        {/* Total Tenants */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tenant Terdaftar</span>
            <div className="size-8 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 grid place-items-center">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalTenantsCount} Tenant
          </div>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            Tersebar di 12 kategori bisnis POS
          </p>
        </div>

        {/* Active & Trial Breakdown */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Status Berlangganan</span>
            <div className="size-8 bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 grid place-items-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-lg font-extrabold">
            <span className="text-emerald-600 dark:text-emerald-400">{activeTenantsCount} Aktif</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-amber-500">{trialTenantsCount} Trial</span>
          </div>
          <p className="text-[11px] text-red-500 font-medium">
            {suspendedTenantsCount} Ditangguhkan / Expired
          </p>
        </div>

        {/* Total Users */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pengguna Terdaftar</span>
            <div className="size-8 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 grid place-items-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
            {users.length} Pengguna
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
            Superadmin, Owner, Manager, & Kasir
          </p>
        </div>
      </div>

      {/* Main Tab Navigation (Tenants vs Users) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("TENANTS")}
              className={`py-2 px-4 text-xs font-extrabold flex items-center gap-2 border rounded-none transition-all ${
                activeTab === "TENANTS"
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="size-4" /> Kelola Tenant & Billing ({filteredTenants.length})
            </button>

            <button
              onClick={() => setActiveTab("USERS")}
              className={`py-2 px-4 text-xs font-extrabold flex items-center gap-2 border rounded-none transition-all ${
                activeTab === "USERS"
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="size-4" /> Kelola Pengguna System ({filteredUsers.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeTab === "TENANTS" ? "Cari nama / email tenant..." : "Cari nama / email pengguna..."}
                className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-none h-9 w-64 focus:border-brand"
              />
            </div>
          </div>
        </div>

        {/* TAB 1: MASTER TENANTS & BILLING */}
        {activeTab === "TENANTS" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="size-4 text-brand" /> Daftar Master Tenant & Kontrol Preview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gunakan tombol Preview Mode untuk menyamar dan memantau antarmuka kasir/dashboard tenant.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Domain Filter */}
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white p-2 rounded-none focus:outline-brand"
                >
                  <option value="ALL">🌐 Semua Tipe Bisnis (12)</option>
                  {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white p-2 rounded-none focus:outline-brand"
                >
                  <option value="ALL">📋 Semua Status</option>
                  <option value="ACTIVE">🟢 Active</option>
                  <option value="TRIAL">🟡 Trial</option>
                  <option value="SUSPENDED">🔴 Suspended</option>
                  <option value="EXPIRED">🟠 Expired</option>
                </select>
              </div>
            </div>

            {/* Master Table Tenants */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Nama Tenant & Email</th>
                    <th className="p-3">Kategori Domain Bisnis</th>
                    <th className="p-3">Paket SaaS</th>
                    <th className="p-3">Jumlah Cabang</th>
                    <th className="p-3">Status Berlangganan</th>
                    <th className="p-3">Tarif Bulanan</th>
                    <th className="p-3 text-right">Aksi Superadmin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Tidak ditemukan tenant yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-all">
                        <td className="p-3">
                          <strong className="text-slate-900 dark:text-white font-bold block text-sm">{t.name}</strong>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{t.email}</span>
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">ID: {t.id}</span>
                        </td>

                        <td className="p-3">
                          <span className="inline-block px-2.5 py-1 text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {DOMAIN_LABELS[t.businessType] || t.businessType}
                          </span>
                        </td>

                        <td className="p-3 font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase font-mono border ${
                              t.plan === "ENTERPRISE"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300"
                                : t.plan === "PRO"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300"
                            }`}
                          >
                            {t.plan}
                          </span>
                        </td>

                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                          <strong>{t.branches?.length || 1} Cabang</strong>
                          <span className="block text-[10px] text-slate-400">
                            Main: {t.branches?.[0]?.name || "Pusat"}
                          </span>
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => handleToggleStatus(t.id, t.status)}
                            className={`px-2.5 py-1 text-[10px] font-extrabold border uppercase transition-all flex items-center gap-1.5 ${
                              t.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200"
                                : t.status === "TRIAL"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-200"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-200"
                            }`}
                            title="Klik untuk ubah status aktif/ditangguhkan"
                          >
                            {t.status === "ACTIVE" && <CheckCircle2 className="size-3" />}
                            {t.status === "TRIAL" && <Clock className="size-3" />}
                            {t.status === "SUSPENDED" && <XCircle className="size-3" />}
                            {t.status}
                          </button>
                          <span className="text-[10px] text-slate-400 block font-mono mt-1">
                            Expired: {t.expiryDate}
                          </span>
                        </td>

                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          Rp {t.monthlyFee.toLocaleString("id-ID")}/bln
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Live Preview Button */}
                            <Button
                              onClick={() => handlePreviewTenant(t)}
                              size="sm"
                              className="bg-brand hover:bg-brand/90 text-white font-bold text-[11px] px-2.5 py-1 rounded-none gap-1 shadow-sm"
                              title="Penyamaran Superadmin untuk live preview kasir & dashboard tenant ini"
                            >
                              <Eye className="size-3.5" /> Preview Mode
                            </Button>

                            {/* Edit Tenant */}
                            <Button
                              onClick={() => handleOpenEdit(t)}
                              variant="outline"
                              size="sm"
                              className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] p-1.5 rounded-none"
                              title="Ubah Billing & Detail Tenant"
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            {/* Delete Tenant */}
                            <Button
                              onClick={() => handleDeleteTenant(t.id)}
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded-none"
                              title="Hapus Tenant"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT SYSTEM */}
        {activeTab === "USERS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="size-4 text-brand" /> Manajemen Pengguna & Hak Akses System
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kelola akun superadmin, owner tenant, manager cabang, dan kasir terdaftar.
                </p>
              </div>

              <Button
                onClick={() => setIsAddUserModalOpen(true)}
                className="bg-brand hover:bg-brand/90 text-white font-extrabold text-xs px-4 py-2.5 rounded-none shadow-md gap-2"
              >
                <UserPlus className="size-4" /> Tambah Pengguna Baru
              </Button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Nama Pengguna & Email</th>
                    <th className="p-3">Tenant / Perusahaan</th>
                    <th className="p-3">Peran / Role</th>
                    <th className="p-3">Status Akun</th>
                    <th className="p-3">Tanggal Dibuat</th>
                    <th className="p-3 text-right">Aksi Superadmin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Tidak ditemukan pengguna yang sesuai dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-all">
                        <td className="p-3">
                          <strong className="text-slate-900 dark:text-white font-bold block text-sm">{u.name}</strong>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{u.email}</span>
                        </td>

                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {u.tenantName}
                        </td>

                        <td className="p-3 font-mono">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-extrabold uppercase border ${
                              u.role === "Superadmin"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border-amber-300"
                                : u.role === "Owner Tenant"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => handleToggleUserStatus(u.id)}
                            className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border-red-300"
                            }`}
                          >
                            {u.status}
                          </button>
                        </td>

                        <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                          {u.createdAt}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleDeleteUser(u.id)}
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded-none"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ONBOARD TENANT BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 shadow-2xl rounded-none">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="size-5 text-brand" /> Onboard Tenant Baru (Superadmin)
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Bisnis / Perusahaan Tenant
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Resto Padang Sederhana / Toko Sukses"
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Akun Admin Tenant
                </label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="admin@tenant.com"
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-none focus:border-brand"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Bisnis (POS Domain)
                  </label>
                  <select
                    value={formBusinessType}
                    onChange={(e) => setFormBusinessType(e.target.value as BusinessType)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-2 text-xs font-bold rounded-none focus:outline-brand"
                  >
                    {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Paket Berlangganan SaaS
                  </label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value as SubscriptionPlan)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-2 text-xs font-bold rounded-none focus:outline-brand"
                  >
                    <option value="BASIC">Basic (Rp 150rb/bln)</option>
                    <option value="PRO">Pro (Rp 350rb/bln)</option>
                    <option value="ENTERPRISE">Enterprise (Rp 750rb/bln)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Berlangganan
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TenantStatus)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-2 text-xs font-bold rounded-none focus:outline-brand"
                  >
                    <option value="ACTIVE">🟢 Active</option>
                    <option value="TRIAL">🟡 Trial (7 Hari)</option>
                    <option value="SUSPENDED">🔴 Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Masa Kadaluarsa
                  </label>
                  <Input
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-mono rounded-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs rounded-none"
                >
                  Batal
                </Button>
                <Button type="submit" className="bg-brand text-white font-bold text-xs px-5 rounded-none">
                  Simpan & Onboard Tenant
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT BILLING & TENANT */}
      {isEditModalOpen && editingTenant && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 shadow-2xl rounded-none">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="size-5 text-brand" /> Edit Billing & Detail Tenant
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Bisnis Tenant
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Admin Tenant
                </label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-none focus:border-brand"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Bisnis (POS Domain)
                  </label>
                  <select
                    value={formBusinessType}
                    onChange={(e) => setFormBusinessType(e.target.value as BusinessType)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-2 text-xs font-bold rounded-none focus:outline-brand"
                  >
                    {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Paket Berlangganan
                  </label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value as SubscriptionPlan)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-2 text-xs font-bold rounded-none focus:outline-brand"
                  >
                    <option value="BASIC">Basic (Rp 150rb/bln)</option>
                    <option value="PRO">Pro (Rp 350rb/bln)</option>
                    <option value="ENTERPRISE">Enterprise (Rp 750rb/bln)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Berlangganan
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TenantStatus)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-2 text-xs font-bold rounded-none focus:outline-brand"
                  >
                    <option value="ACTIVE">🟢 Active</option>
                    <option value="TRIAL">🟡 Trial</option>
                    <option value="SUSPENDED">🔴 Suspended</option>
                    <option value="EXPIRED">🟠 Expired</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Masa Kadaluarsa
                  </label>
                  <Input
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-mono rounded-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-xs rounded-none"
                >
                  Batal
                </Button>
                <Button type="submit" className="bg-brand text-white font-bold text-xs px-5 rounded-none">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADD USER BARU */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 shadow-2xl rounded-none">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="size-5 text-brand" /> Tambah Pengguna System Baru
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Pengguna
                </label>
                <Input
                  value={userNameInput}
                  onChange={(e) => setUserNameInput(e.target.value)}
                  placeholder="Misal: Andi Prasetyo"
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Login
                </label>
                <Input
                  type="email"
                  value={userEmailInput}
                  onChange={(e) => setUserEmailInput(e.target.value)}
                  placeholder="andi@tenant.com"
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tenant / Perusahaan
                </label>
                <select
                  value={userTenantInput}
                  onChange={(e) => setUserTenantInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-2 text-xs font-bold rounded-none focus:outline-brand"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({DOMAIN_LABELS[t.businessType] || t.businessType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Peran / Role Pengguna
                </label>
                <select
                  value={userRoleInput}
                  onChange={(e) => setUserRoleInput(e.target.value as UserRecord["role"])}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-2 text-xs font-bold rounded-none focus:outline-brand"
                >
                  <option value="Owner Tenant">Owner Tenant</option>
                  <option value="Manager Cabang">Manager Cabang</option>
                  <option value="Kasir">Kasir</option>
                  <option value="Operator">Operator</option>
                  <option value="Superadmin">Superadmin System</option>
                </select>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="text-xs rounded-none"
                >
                  Batal
                </Button>
                <Button type="submit" className="bg-brand text-white font-bold text-xs px-5 rounded-none">
                  Simpan Pengguna
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
