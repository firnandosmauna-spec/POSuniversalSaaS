import { useState, useEffect } from "react";
import { createFileRoute, Outlet, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/shared/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Calculator, 
  Plus,
  Receipt, 
  ChefHat, 
  Clock, 
  Users, 
  Settings, 
  Package, 
  FileText, 
  Building2, 
  Wallet, 
  Globe,
  Sun, 
  Moon, 
  Menu,
  X,
  LogOut,
  PanelLeftClose, 
  PanelLeftOpen,
  Printer,
  Store,
  WashingMachine,
  ShieldCheck,
  Eye,
  User,
  ChevronRight,
  HeadphonesIcon,
  RefreshCw,
  History
} from "lucide-react";

export const DOMAIN_LABELS: Record<string, string> = {
  PRINTING: "🖨️ POS Percetakan Digital",
  FNB: "🍽️ POS F&B Resto & Cafe",
  CAFE: "☕ POS Cafe & Coffee Shop",
  RETAIL: "🛍️ POS Retail & Toko",
  GROCERY: "🛒 POS Toko Kelontong",
  LAUNDRY: "🧺 POS Laundry",
  GYM: "🏋️ POS Gym & Fitness",
  SALON: "✂️ POS Salon & Barber",
  WORKSHOP: "🔧 POS Bengkel & Servis",
  PHARMACY: "💊 POS Apotek & Farmasi",
  DISTRIBUTOR: "📦 POS Distributor / Grosir",
  E_COMMERCE: "🌐 POS Toko Online",
};

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, isLoading, branches, activeBranchId, switchBusinessType, switchBranch, logout, isImpersonating, exitImpersonation } = useAuth();
  
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("pos_theme") as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("pos_theme", theme);
    } catch (e) {
      console.error("Failed to save theme preference:", e);
    }
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    document.addEventListener("toggleSidebar", handleToggle);
    return () => document.removeEventListener("toggleSidebar", handleToggle);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0b172a] dark:border-slate-800"></div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to landing page if no user is active
    return <Navigate to="/" replace />;
  }

  const getDomainMenu = () => {
    let baseMenu: any[] = [];
    switch (user?.businessType) {
      case "LAUNDRY":
        baseMenu = [
          { 
            name: "Dashboard Laundry", 
            icon: LayoutDashboard, 
            to: "/app/dashboard",
            colorClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 group-hover:bg-indigo-600 group-hover:text-white group-[.active]:bg-indigo-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Kasir & Penerimaan Laundry", 
            icon: WashingMachine, 
            to: "/app/pos",
            colorClass: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/50 group-hover:bg-cyan-600 group-hover:text-white group-[.active]:bg-cyan-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Riwayat & Nota Laundry", 
            icon: FileText, 
            to: "/app/sales",
            colorClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 group-hover:bg-blue-600 group-hover:text-white group-[.active]:bg-blue-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Layanan & Tarif Laundry", 
            icon: Package, 
            to: "/app/products",
            colorClass: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/50 group-hover:bg-purple-600 group-hover:text-white group-[.active]:bg-purple-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Pelanggan Laundry", 
            icon: Users, 
            to: "/app/customers",
            colorClass: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200/50 group-hover:bg-teal-600 group-hover:text-white group-[.active]:bg-teal-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Staf & Kurir Laundry", 
            icon: Users, 
            to: "/app/users",
            colorClass: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/50 group-hover:bg-sky-600 group-hover:text-white group-[.active]:bg-sky-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Pengaturan Laundry", 
            icon: Settings, 
            to: "/app/settings",
            colorClass: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 group-hover:bg-slate-700 group-hover:text-white group-[.active]:bg-slate-700 group-[.active]:text-white group-[.active]:shadow-md" 
          },
        ];
        break;

      case "PRINTING":
        baseMenu = [
          { 
            name: "Dashboard Percetakan", 
            icon: LayoutDashboard, 
            to: "/app/dashboard",
            colorClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 group-hover:bg-indigo-600 group-hover:text-white group-[.active]:bg-indigo-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Kasir & Kalkulator Cetak", 
            icon: Printer, 
            to: "/app/pos",
            colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 group-hover:bg-emerald-600 group-hover:text-white group-[.active]:bg-emerald-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Riwayat Transaksi", 
            icon: History, 
            to: "/app/sales",
            colorClass: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 group-hover:bg-slate-600 group-hover:text-white group-[.active]:bg-slate-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "SPK & Laporan Cetak", 
            icon: FileText, 
            to: "/app/sales",
            colorClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 group-hover:bg-blue-600 group-hover:text-white group-[.active]:bg-blue-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Shift Kasir", 
            icon: Clock, 
            to: "/app/shifts",
            colorClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 group-hover:bg-amber-600 group-hover:text-white group-[.active]:bg-amber-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Belanja & Pengeluaran", 
            icon: Wallet, 
            to: "/app/expenses",
            colorClass: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 group-hover:bg-rose-600 group-hover:text-white group-[.active]:bg-rose-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Bahan & Material Cetak", 
            icon: Package, 
            to: "/app/products",
            colorClass: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/50 group-hover:bg-purple-600 group-hover:text-white group-[.active]:bg-purple-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Pelanggan Percetakan", 
            icon: Users, 
            to: "/app/customers",
            colorClass: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200/50 group-hover:bg-teal-600 group-hover:text-white group-[.active]:bg-teal-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Operator & Pengguna", 
            icon: Users, 
            to: "/app/users",
            colorClass: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/50 group-hover:bg-sky-600 group-hover:text-white group-[.active]:bg-sky-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Pengaturan Percetakan", 
            icon: Settings, 
            to: "/app/settings",
            colorClass: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 group-hover:bg-slate-700 group-hover:text-white group-[.active]:bg-slate-700 group-[.active]:text-white group-[.active]:shadow-md" 
          },
        ];
        break;

      case "RETAIL":
      case "GROCERY":
      case "DISTRIBUTOR":
      case "E_COMMERCE":
        baseMenu = [
          { 
            name: "Dashboard Retail", 
            icon: LayoutDashboard, 
            to: "/app/dashboard",
            colorClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 group-hover:bg-indigo-600 group-hover:text-white group-[.active]:bg-indigo-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Kasir Retail POS", 
            icon: Calculator, 
            to: "/app/pos",
            colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 group-hover:bg-emerald-600 group-hover:text-white group-[.active]:bg-emerald-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Riwayat Transaksi", 
            icon: History, 
            to: "/app/sales",
            colorClass: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 group-hover:bg-slate-600 group-hover:text-white group-[.active]:bg-slate-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Laporan Penjualan", 
            icon: FileText, 
            to: "/app/sales",
            colorClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 group-hover:bg-blue-600 group-hover:text-white group-[.active]:bg-blue-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Stok & Produk Retail", 
            icon: Package, 
            to: "/app/products",
            colorClass: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/50 group-hover:bg-purple-600 group-hover:text-white group-[.active]:bg-purple-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Pelanggan", 
            icon: Users, 
            to: "/app/customers",
            colorClass: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200/50 group-hover:bg-teal-600 group-hover:text-white group-[.active]:bg-teal-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Kelola Kasir / Staf", 
            icon: Users, 
            to: "/app/users",
            colorClass: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/50 group-hover:bg-sky-600 group-hover:text-white group-[.active]:bg-sky-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Pengaturan Toko Retail", 
            icon: Settings, 
            to: "/app/settings",
            colorClass: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 group-hover:bg-slate-700 group-hover:text-white group-[.active]:bg-slate-700 group-[.active]:text-white group-[.active]:shadow-md" 
          },
        ];
        break;

      default:
        // F&B / Cafe & General POS
        baseMenu = [
          { 
            name: "Kasir POS F&B", 
            icon: Calculator, 
            to: "/app/pos",
            colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 group-hover:bg-emerald-600 group-hover:text-white group-[.active]:bg-emerald-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Riwayat Transaksi", 
            icon: History, 
            to: "/app/sales",
            colorClass: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 group-hover:bg-slate-600 group-hover:text-white group-[.active]:bg-slate-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Dashboard Resto", 
            icon: LayoutDashboard, 
            to: "/app/dashboard",
            colorClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 group-hover:bg-indigo-600 group-hover:text-white group-[.active]:bg-indigo-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Dapur & Bar (KDS)", 
            icon: ChefHat, 
            to: "/app/kitchen",
            colorClass: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border border-orange-200/50 group-hover:bg-orange-600 group-hover:text-white group-[.active]:bg-orange-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Shift Kasir", 
            icon: Clock, 
            to: "/app/shifts",
            colorClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 group-hover:bg-amber-600 group-hover:text-white group-[.active]:bg-amber-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Laporan Penjualan", 
            icon: FileText, 
            to: "/app/reports",
            colorClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 group-hover:bg-blue-600 group-hover:text-white group-[.active]:bg-blue-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Belanja & Pengeluaran", 
            icon: Wallet, 
            to: "/app/expenses",
            colorClass: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 group-hover:bg-rose-600 group-hover:text-white group-[.active]:bg-rose-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Kelola Produk", 
            icon: Package, 
            to: "/app/products",
            colorClass: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/50 group-hover:bg-purple-600 group-hover:text-white group-[.active]:bg-purple-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Pelanggan", 
            icon: Users, 
            to: "/app/customers",
            colorClass: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200/50 group-hover:bg-teal-600 group-hover:text-white group-[.active]:bg-teal-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Kelola Staf", 
            icon: Users, 
            to: "/app/users",
            colorClass: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/50 group-hover:bg-sky-600 group-hover:text-white group-[.active]:bg-sky-600 group-[.active]:text-white group-[.active]:shadow-md" 
          },
          { 
            name: "Pengaturan Toko", 
            icon: Settings, 
            to: "/app/settings",
            colorClass: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 group-hover:bg-slate-700 group-hover:text-white group-[.active]:bg-slate-700 group-[.active]:text-white group-[.active]:shadow-md" 
          },
        ];
        break;
    }

    // Filter menu based on User Role permissions (RBAC)
    const userRole = user?.role || "Owner Tenant";
    if (userRole !== "Owner Tenant") {
      try {
        const savedRoleAccess = localStorage.getItem(`pos_tenant_${user?.id}_role_access_${user?.businessType}`);
        if (savedRoleAccess) {
          const roleAccess = JSON.parse(savedRoleAccess);
          if (roleAccess[userRole]) {
            return baseMenu.filter((m) => roleAccess[userRole].includes(m.to));
          }
        } else {
          // Fallback defaults for Printing if no config saved yet
          if (user?.businessType === "PRINTING") {
            const defaultRoleAccess: Record<string, string[]> = {
              "Manager Percetakan": ["/app/dashboard", "/app/pos", "/app/sales", "/app/shifts", "/app/expenses", "/app/products", "/app/customers", "/app/users", "/app/settings"],
              "Kasir POS": ["/app/pos", "/app/sales", "/app/shifts", "/app/customers"],
              "Desainer Grafis": ["/app/dashboard", "/app/pos", "/app/sales", "/app/products"],
              "Operator Mesin Cetak": ["/app/dashboard", "/app/sales", "/app/products"],
            };
            if (defaultRoleAccess[userRole]) {
               return baseMenu.filter((m) => defaultRoleAccess[userRole]!.includes(m.to));
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse role access", e);
      }
    }

    // Legacy Fallback filters
    if (userRole === "Kasir") {
      return baseMenu.filter((m) => ["/app/pos", "/app/shifts", "/app/sales", "/app/customers"].includes(m.to));
    }
    if (userRole === "Koki / Operator") {
      return baseMenu.filter((m) => ["/app/kitchen", "/app/pos"].includes(m.to));
    }

    return baseMenu;
  };

  const domainMenuItems = getDomainMenu();

  return (
    <div className={`flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans ${theme}`}>
      {/* Backdrop Overlay saat Drawer Menu Terbuka */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[55] transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Drawer Off-Canvas Sidebar Menu (Hidden secara default, slide-out via Burger Menu) */}
      <aside 
        className={`fixed left-0 top-0 bottom-0 z-[60] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-64 shadow-2xl transition-transform duration-300 ease-in-out pb-12 md:pb-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        {/* Top Profile & Upgrade Section */}
        <div className="flex flex-col pt-6 pb-4 px-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                <User className="size-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[100px]">{user.name || "-"}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300 tracking-wide">LITE</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.role || "Owner"}</span>
              </div>
            </div>
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-slate-400 md:hidden -mt-2 -mr-2"
            >
              <X className="size-5" />
            </Button>
          </div>
          
          <Link to="/app/settings" onClick={() => setIsSidebarOpen(false)} className="mt-4 text-xs font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1">
            Upgrade Paket Langganan <ChevronRight className="size-3" />
          </Link>
        </div>
        
        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          <nav className="flex flex-col">
            {domainMenuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsSidebarOpen(false)}
                className="group flex items-center gap-4 px-6 py-3.5 text-[13px] font-bold transition-all duration-200 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white [&.active]:text-[#0b172a] [&.active]:dark:text-white"
              >
                <item.icon className="size-[18px] text-slate-700 dark:text-slate-400 group-[.active]:text-[#0b172a] group-[.active]:dark:text-white" />
                <span className="flex-1">{item.name}</span>
                {item.name.toLowerCase().includes("online") && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#10b981] text-white font-bold tracking-wide">Baru</span>
                )}
              </Link>
            ))}

            <button
               onClick={() => { setIsSidebarOpen(false); logout(); }}
               className="group flex items-center gap-4 px-6 py-3.5 text-[13px] font-bold transition-all duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="size-[18px]" />
              <span>Keluar / Logout</span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 flex flex-col gap-4 mt-auto border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <Link to="/app/settings" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-4 text-[13px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            <HeadphonesIcon className="size-[18px] text-slate-700 dark:text-slate-400" />
            Bantuan
          </Link>
          
          <div className="flex items-start gap-2 text-slate-500 mt-2">
            <RefreshCw className="size-3.5 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400">Pembaruan Terakhir:</span>
              <span className="text-[10px]">Jumat, 09 Oktober 2026 (08:30)</span>
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wide">
            APP POST. version v1.54.14
          </span>
        </div>
      </aside>

      {/* BOTTOM NAVIGATION BAR (KHUSUS MOBILE/HP) */}
      <div className="fixed bottom-0 left-0 right-0 h-14 md:h-16 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 flex items-center justify-around z-50 md:hidden pb-safe">
        
        {/* Tombol Menu (Sidebar) */}
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-1 p-1 text-slate-400 hover:text-slate-800 dark:text-slate-500 transition-colors w-16"
        >
          <Menu className="size-5 md:size-6" />
          <span className="text-[9px] md:text-[10px] font-bold">Menu</span>
        </button>

        {/* Tombol Dashboard */}
        <Link to="/app/dashboard" className="flex flex-col items-center justify-center gap-1 p-1 text-slate-400 hover:text-slate-800 dark:text-slate-500 transition-colors w-16 [&.active]:text-[#0b172a] dark:[&.active]:text-white">
          <LayoutDashboard className="size-5 md:size-6" />
          <span className="text-[9px] md:text-[10px] font-bold">Beranda</span>
        </Link>

        {/* Tombol Utama Kasir (Tengah, Besar) */}
        <Link to="/app/pos" className="relative -top-4 md:-top-5 flex flex-col items-center justify-center group w-16">
          <div className="bg-[#0b172a] text-white size-14 md:size-16 rounded-full shadow-xl flex items-center justify-center border-4 md:border-4 border-slate-50 dark:border-slate-950 group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300">
            <Plus className="size-6 md:size-8" />
          </div>
          <span className="text-[9px] md:text-[11px] font-extrabold text-slate-800 dark:text-slate-200 mt-1">POS Kasir</span>
        </Link>

        {/* Tombol Tema */}
        <button 
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center gap-1 p-1 text-slate-400 hover:text-slate-800 dark:text-slate-500 transition-colors w-16"
        >
          {theme === "light" ? <Moon className="size-5 md:size-6" /> : <Sun className="size-5 md:size-6" />}
          <span className="text-[9px] md:text-[10px] font-bold">Tema</span>
        </button>

        {/* Tombol Pengaturan */}
        <Link to="/app/settings" className="flex flex-col items-center justify-center gap-1 p-1 text-slate-400 hover:text-slate-800 dark:text-slate-500 transition-colors w-16 [&.active]:text-[#0b172a] dark:[&.active]:text-white">
          <Settings className="size-5 md:size-6" />
          <span className="text-[9px] md:text-[10px] font-bold">Setelan</span>
        </Link>
      </div>

      {/* Main Content Area (Take Full 100% Width) */}
      {/* Main Content Area (Take Full 100% Width). Menambahkan pb-16 di mobile agar konten tidak tertutup bottom nav */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:pb-0 pb-16">
        {/* Sticky Superadmin Preview Banner */}
        {isImpersonating && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md shrink-0 border-b border-amber-600">
            <div className="flex items-center gap-2">
              <Eye className="size-4 animate-pulse text-slate-950" />
              <span>
                <strong>MODUS PREVIEW SUPERADMIN:</strong> Memantau tenant <strong>{user?.name}</strong> ({DOMAIN_LABELS[user?.businessType || ""] || user?.businessType})
              </span>
            </div>
            <Link to="/superadmin">
              <button
                onClick={() => exitImpersonation()}
                className="bg-slate-950 hover:bg-slate-900 text-white px-3 py-1 text-[11px] font-extrabold rounded-none shadow-sm transition-all flex items-center gap-1"
              >
                ⬅️ Batal Preview & Kembali ke Superadmin
              </button>
            </Link>
          </div>
        )}

        <header className="hidden md:flex h-14 landscape:h-10 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 landscape:px-2 md:px-6 shrink-0 transition-all">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tombol Burger Menu Utama */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center gap-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors px-2.5 h-9 rounded-xl"
              title="Buka Menu Burger"
            >
              <Menu className="size-5 text-[#0b172a]" />
              <span className="text-xs font-bold hidden sm:inline">Menu</span>
            </Button>

            <Link to="/" className="flex items-center gap-2 group">
              <div className="grid size-8 place-items-center rounded-xl bg-[#0b172a] text-white font-display font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                U
              </div>
              <span className="font-display font-extrabold text-base text-slate-800 dark:text-white tracking-tight hidden lg:inline">
                UniversalPOS
              </span>
            </Link>

            {/* Branch Switcher (Multi-Cabang) */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 ml-1">
              <Building2 className="size-4 text-[#0b172a]" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">Cabang:</span>
              <select
                value={activeBranchId}
                onChange={(e) => switchBranch(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">📍 Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                    📍 {b.name} {b.is_main ? "(Pusat)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Tombol Kasir POS Shortcut - Disembunyikan di Mobile, Muncul di Web/Tablet (md:flex) */}
            <Link to="/app/pos" className="hidden md:block">
              <Button
                variant="outline"
                size="sm"
                className="p-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors font-bold text-xs h-9 flex items-center gap-1.5"
                title="Buka Kasir POS"
              >
                <Calculator className="size-4 text-emerald-600 dark:text-emerald-400" />
              </Button>
            </Link>

            {/* Tombol Dashboard (Icon Only) - Disembunyikan di Mobile */}
            <Link to="/app/dashboard" className="hidden md:block">
              <Button
                variant="outline"
                size="sm"
                className="p-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 transition-colors"
                title="Dashboard Utama"
              >
                <LayoutDashboard className="size-4" />
              </Button>
            </Link>

            {/* Tombol Pengaturan Tema Aplikasi - Disembunyikan di Mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="hidden md:flex p-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={theme === "light" ? "Beralih ke Mode Gelap (Dark)" : "Beralih ke Mode Terang (White)"}
            >
              {theme === "light" ? (
                <Moon className="size-4 text-slate-700 dark:text-slate-300" />
              ) : (
                <Sun className="size-4 text-amber-400" />
              )}
            </Button>

            {/* Quick Settings Icon Button */}
            <Link to="/app/settings" className="hidden md:block">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-slate-500 hover:text-[#0b172a] dark:text-slate-400 dark:hover:text-[#0b172a] rounded-xl"
                title="Pengaturan Toko"
              >
                <Settings className="size-4" />
              </Button>
            </Link>

            {/* Badge Indicator Domain POS Tenant Aktif */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#0b172a]/10 border border-[#0b172a]/30 text-[#0b172a] font-extrabold text-xs rounded-xl">
              {DOMAIN_LABELS[user.businessType] || `POS ${user.businessType}`}
            </div>
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-none">{user.name}</span>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#0b172a] mt-1">{user.role || "Owner Tenant"}</span>
              </div>
              <div className="size-8 rounded-full bg-[#0b172a]/10 grid place-items-center font-bold text-[#0b172a] text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout}
                className="px-2.5 py-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 border-red-200 dark:border-red-900 transition-colors font-bold text-xs h-9 flex items-center gap-1.5 shadow-xs"
                title="Keluar / Logout"
              >
                <LogOut className="size-4 text-red-600 dark:text-red-400" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
