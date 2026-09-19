import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  CreditCard, 
  ArrowUpRight, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Award, 
  ChefHat, 
  Utensils, 
  Calculator, 
  Loader2,
  Store,
  FileText,
  Wallet,
  Package,
  Users,
  Settings,
  Smartphone,
  Printer,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";

type Transaction = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  order_type: string;
  status: string;
  branch_id?: string;
  branchId?: string;
  branch_name?: string;
  customers?: { name: string } | null;
  cashier_shifts?: { cashier_name: string } | null;
  tables?: { name: string } | null;
  transaction_items?: { product_name: string; qty: number; price: number }[];
};

export function DashboardView() {
  const { user, branches, activeBranchId, activeBranchName, switchBranch } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Time Filter State
  const [period, setPeriod] = useState<"today" | "yesterday" | "month" | "custom" | "all">("today");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Fetch Transactions
      const { data: txData, error: txErr } = await supabase
        .from("transactions")
        .select(`
          *,
          customers ( name ),
          cashier_shifts ( cashier_name ),
          tables ( name ),
          transaction_items ( product_name, qty, price )
        `)
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (txErr) throw txErr;
      setTransactions(txData || []);

      // 2. Fetch Products
      const { data: prodData } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", user.id);
      setProducts(prodData || []);

      // 3. Fetch Tables
      const { data: tableData } = await supabase
        .from("tables")
        .select("*")
        .eq("tenant_id", user.id);
      setTables(tableData || []);

      // 4. Fetch Active Shift
      const { data: shiftData } = await supabase
        .from("cashier_shifts")
        .select("*")
        .eq("tenant_id", user.id)
        .eq("status", "open")
        .limit(1);
      setActiveShift(shiftData?.[0] || null);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Helpers
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  // Filter transactions by period and branch
  const filteredTx = transactions.filter((tx) => {
    const matchesBranch = 
      activeBranchId === "all" ||
      tx.branch_id === activeBranchId ||
      tx.branchId === activeBranchId ||
      tx.branch_name === activeBranchName ||
      (!tx.branch_id && !tx.branchId && (activeBranchId === "main" || activeBranchId === "all"));

    if (!matchesBranch) return false;
    if (!tx.created_at) return false;
    const txDate = new Date(tx.created_at);
    const now = new Date();

    if (period === "today") {
      return txDate.toDateString() === now.toDateString();
    }
    if (period === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      return txDate.toDateString() === yesterday.toDateString();
    }
    if (period === "month") {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    if (period === "custom") {
      if (!startDate && !endDate) return true;
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return txDate >= start && txDate <= end;
    }
    return true; // "all"
  });

  const completedTx = filteredTx.filter((t) => t.status === "completed" || t.status === "selesai");
  const totalRevenue = completedTx.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
  const totalTxCount = filteredTx.length;
  const avgOrderValue = completedTx.length > 0 ? totalRevenue / completedTx.length : 0;
  
  const cashRevenue = completedTx
    .filter(t => t.payment_method?.toLowerCase() === "cash" || t.payment_method?.toLowerCase() === "tunai")
    .reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
  const nonCashRevenue = totalRevenue - cashRevenue;
  const cashTxTotal = cashRevenue;
  const nonCashTxTotal = nonCashRevenue;

  // Calculate Top Selling Products safely
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  completedTx.forEach(t => {
    t.transaction_items?.forEach(item => {
      const existing = productSalesMap[item.product_name] || { name: item.product_name, qty: 0, revenue: 0 };
      existing.qty += item.qty;
      existing.revenue += item.qty * item.price;
      productSalesMap[item.product_name] = existing;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Table occupancy
  const occupiedTablesCount = tables.filter(t => t.status === "occupied").length;
  const availableTablesCount = tables.filter(t => t.status === "available" || !t.status).length;

  // Domain configuration helper
  const getDomainConfig = () => {
    switch (user?.businessType) {
      case "PRINTING":
        return {
          title: "Dashboard POS Percetakan Digital",
          subtitle: "Ringkasan omzet, SPK job order & operasional cetak real-time",
          mainIcon: Printer,
          topProductsTitle: "Material & Produk Cetak Terlaris",
          topProductsIcon: Printer,
          unitLabel: "lembar / m²",
        };
      case "RETAIL":
      case "GROCERY":
      case "DISTRIBUTOR":
      case "E_COMMERCE":
        return {
          title: `Dashboard POS ${user?.businessType === "GROCERY" ? "Toko Kelontong" : "Retail & Toko"}`,
          subtitle: "Ringkasan omzet, transaksi & penjualan retail real-time",
          mainIcon: Store,
          topProductsTitle: "Produk Retail Terlaris",
          topProductsIcon: Package,
          unitLabel: "pcs",
        };
      default:
        return {
          title: "Dashboard POS Resto & Cafe",
          subtitle: "Ringkasan omzet & operasional outlet real-time",
          mainIcon: ChefHat,
          topProductsTitle: "Menu & Produk Terlaris",
          topProductsIcon: Utensils,
          unitLabel: "porsi",
        };
    }
  };

  const domainConfig = getDomainConfig();
  const MainIconComp = domainConfig.mainIcon;
  const TopIconComp = domainConfig.topProductsIcon;

  return (
    <div className="p-4 md:p-5 h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header Banner Anti-Slop */}
      <div className="mb-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 p-3 md:p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm shrink-0 transition-all">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-brand text-white shadow-md">
            <MainIconComp className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
              {domainConfig.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {domainConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Filter Periode & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Synchronized Branch Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:border-brand/50 transition-colors">
            <Building2 className="size-3.5 text-brand" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Cabang:</span>
            <select
              value={activeBranchId}
              onChange={(e) => switchBranch(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="all" className="font-medium">📍 Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name} {b.is_main ? "(Pusat)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Periode Selector */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md shadow-inner">
            {(["today", "yesterday", "month", "custom", "all"] as const).map((p) => {
              const labels = {
                today: "Hari Ini",
                yesterday: "Kemarin",
                month: "1 Bulan",
                custom: "Custom",
                all: "Semua"
              };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-1 text-[10px] sm:text-xs font-medium rounded transition-all ${
                    period === p 
                      ? "bg-white dark:bg-slate-700 text-brand shadow-sm font-semibold" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-1 py-0.5 text-xs border-none bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-0 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-medium">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-1 py-0.5 text-xs border-none bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-0 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="size-8 animate-spin text-brand mb-2" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Memuat statistik dashboard...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Menu Aplikasi POS */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm shrink-0">
            <div className="grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3">
              {[
                { name: user?.businessType === "PRINTING" ? "Kasir Cetak" : "Kasir POS", icon: user?.businessType === "PRINTING" ? Printer : Calculator, to: "/app/pos", color: "from-emerald-500 to-teal-600 shadow-emerald-500/20" },
                { name: "Penjualan", icon: FileText, to: "/app/sales", color: "from-blue-600 to-indigo-600 shadow-blue-500/20" },
                { name: "Shift Kasir", icon: Clock, to: "/app/shifts", color: "from-amber-500 to-orange-500 shadow-amber-500/20" },
                { name: "Pengeluaran", icon: Wallet, to: "/app/expenses", color: "from-rose-500 to-pink-600 shadow-rose-500/20" },
                ...(user?.businessType === "FNB" || user?.businessType === "CAFE" 
                  ? [{ name: "Dapur & Bar", icon: ChefHat, to: "/app/kitchen", color: "from-orange-500 to-red-500 shadow-orange-500/20" }] 
                  : []),
                { name: "Produk", icon: Package, to: "/app/products", color: "from-purple-600 to-violet-600 shadow-purple-500/20" },
                { name: "Pelanggan", icon: Users, to: "/app/customers", color: "from-teal-500 to-emerald-600 shadow-teal-500/20" },
                { name: "Pengguna", icon: Users, to: "/app/users", color: "from-sky-500 to-blue-600 shadow-sky-500/20" },
                { name: "Pengaturan", icon: Settings, to: "/app/settings", color: "from-slate-700 to-slate-800 shadow-slate-500/20" },
                { name: "Dashboard", icon: LayoutDashboard, to: "/app/dashboard", color: "from-indigo-600 to-purple-600 shadow-indigo-500/20" },
              ].map((app) => (
                <Link key={app.to} to={app.to} className="flex flex-col items-center group py-0.5">
                  <div className={`size-10 rounded-xl bg-gradient-to-br ${app.color} text-white grid place-items-center shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer`}>
                    <app.icon className="size-4" />
                  </div>
                  <span className="text-[10px] font-medium text-center text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 group-hover:text-brand transition-colors">
                    {app.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Executive KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
            {/* Total Omzet */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Omzet</span>
                <div className="size-7 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100/50 group-hover:scale-110 transition-transform">
                  <DollarSign className="size-3.5" />
                </div>
              </div>
              <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-white leading-snug tracking-tight">{formatRupiah(totalRevenue)}</h2>
              <div className="mt-1.5 flex items-center text-[10px] text-emerald-700 bg-emerald-50 w-fit px-2 py-0.5 rounded-md font-medium gap-1">
                <ArrowUpRight className="size-3" />
                <span>{completedTx.length} pesanan</span>
              </div>
            </div>

            {/* Total Transaksi */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Transaksi</span>
                <div className="size-7 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/50 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="size-3.5" />
                </div>
              </div>
              <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-white leading-snug tracking-tight">{totalTxCount} <span className="text-xs font-medium text-slate-500">trx</span></h2>
              <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-50 w-fit px-2 py-0.5 rounded-md">
                Tertunda: <span className="font-bold text-amber-600 dark:text-amber-400">{filteredTx.filter(t => t.status === "hold").length}</span>
              </div>
            </div>

            {/* Rata-rata Pembelanjaan */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-rata Transaksi</span>
                <div className="size-7 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100/50 group-hover:scale-110 transition-transform">
                  <TrendingUp className="size-3.5" />
                </div>
              </div>
              <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-white leading-snug tracking-tight">{formatRupiah(avgOrderValue)}</h2>
              <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-50 w-fit px-2 py-0.5 rounded-md">
                Per pesanan
              </div>
            </div>

            {/* Breakdown Pembayaran */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Metode Bayar</span>
                <div className="size-7 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100/50 group-hover:scale-110 transition-transform">
                  <CreditCard className="size-3.5" />
                </div>
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-1 rounded px-1.5">
                  <span className="font-medium text-slate-600">Tunai</span>
                  <span className="font-bold font-mono text-slate-800">{formatRupiah(cashRevenue)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-1 rounded px-1.5">
                  <span className="font-medium text-slate-600">Non-Tunai</span>
                  <span className="font-bold font-mono text-slate-800">{formatRupiah(nonCashRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Halaman Flex Grid (Konten Utama) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3.5 min-h-0 overflow-hidden">
            
            {/* Kolom Kiri (2 Cols): Produk Terlaris & Transaksi Terbaru (Stacked Flex) */}
            <div className="lg:col-span-2 flex flex-col gap-3.5 min-h-0 overflow-hidden">
              
              {/* Produk Terlaris */}
              <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-4 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-amber-500" />
                    <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white">{domainConfig.topProductsTitle}</h2>
                  </div>
                  <Link to="/app/products" className="text-[11px] text-brand font-semibold hover:text-brand/80 flex items-center gap-1 transition-colors">
                    Katalog <ChevronRight className="size-3" />
                  </Link>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                  {topProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 text-xs py-6">
                      <TopIconComp className="size-8 mb-1.5 opacity-20" />
                      <p>Belum ada data penjualan produk.</p>
                    </div>
                  ) : (
                    topProducts.map((prod, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <div className="flex items-center gap-2.5">
                          <span className={`size-6 rounded-md font-bold text-[10px] flex items-center justify-center shadow-sm ${
                            idx === 0 ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300" :
                            idx === 1 ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                            idx === 2 ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs group-hover:text-brand transition-colors">{prod.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Terjual: <span className="font-medium text-slate-700">{prod.qty} {domainConfig.unitLabel}</span></p>
                          </div>
                        </div>
                        <div className="text-right font-extrabold text-slate-900 dark:text-white text-xs">
                          {formatRupiah(prod.revenue)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Transaksi Terbaru */}
              <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="size-4 text-brand" />
                    <h2 className="font-display font-bold text-slate-800 dark:text-slate-200 text-xs">Transaksi Terbaru</h2>
                  </div>
                  <Link to="/app/sales" className="text-[11px] text-brand font-bold hover:underline flex items-center gap-0.5">
                    Semua Riwayat <ChevronRight className="size-3" />
                  </Link>
                </div>

                <div className="flex-1 overflow-auto">
                  {filteredTx.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                      Belum ada transaksi pada periode ini.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2.5">Waktu & ID</th>
                          <th className="p-2.5">Kasir</th>
                          <th className="p-2.5">Pelanggan & Tipe</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTx.slice(0, 6).map(t => (
                          <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                              <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono uppercase">{t.id.substring(0, 8)}</div>
                            </td>
                            <td className="p-2.5 font-medium text-slate-700 dark:text-slate-300">{t.cashier_shifts?.cashier_name || 'Kasir'}</td>
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {user?.businessType === "PRINTING"
                                  ? "SPK Job Order"
                                  : t.order_type === "dine_in"
                                  ? `Dine In (${t.tables?.name || "Meja"})`
                                  : "Take Away"}
                              </div>
                              {t.customers?.name && <div className="text-[9px] text-brand">{t.customers.name}</div>}
                            </td>
                            <td className="p-2.5 text-center">
                              {t.status === 'completed' ? (
                                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-none text-[9px] font-bold border border-emerald-200 dark:border-emerald-800">
                                  Selesai
                                </span>
                              ) : (
                                <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-none text-[9px] font-bold border border-amber-200 dark:border-amber-800">
                                  {t.status}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                              {formatRupiah(t.total_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* Kolom Kanan (1 Col): Operasional Live (Shift Kasir & Status Meja) */}
            <div className="lg:col-span-1 flex flex-col gap-3.5 min-h-0 overflow-y-auto">
              
              {/* Widget Shift Kasir */}
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-brand" />
                    <h2 className="font-display font-bold text-xs text-slate-900 dark:text-white">Shift Kasir Aktif</h2>
                  </div>
                  <Link to="/app/shifts" className="text-[11px] text-brand font-bold hover:underline">
                    Kelola
                  </Link>
                </div>

                {activeShift ? (
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-none border border-emerald-200 dark:border-emerald-900 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase">Kasir Bertugas</span>
                      <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[9px] font-extrabold px-2 py-0.5 rounded-none border border-emerald-300 dark:border-emerald-700">
                        AKTIF
                      </span>
                    </div>
                    <p className="font-display font-extrabold text-base text-slate-900 dark:text-white">{activeShift.cashier_name}</p>
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-900">
                      <span>Kas Awal:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(activeShift.starting_cash)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/60 dark:bg-amber-950/30 p-3.5 rounded-none border border-amber-200 dark:border-amber-900 text-center space-y-1.5">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Shift Belum Dibuka</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">Buka shift untuk terima transaksi.</p>
                    <Link to="/app/shifts" className="inline-block mt-1">
                      <Button size="sm" className="bg-amber-600 text-white font-bold text-xs h-7 px-3 hover:bg-amber-700 rounded-none">
                        Buka Shift
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Widget Status Operasional Domain */}
              {user?.businessType === "PRINTING" ? (
                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-brand" />
                      <h2 className="font-display font-bold text-xs text-slate-900 dark:text-white">Status SPK Job Order Percetakan</h2>
                    </div>
                    <Link to="/app/pos" className="text-[11px] text-brand font-bold hover:underline">
                      Kasir Percetakan
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-none border border-amber-200 dark:border-amber-900">
                      <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400">Antrean Cetak</p>
                      <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">SPK Active</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-none border border-emerald-200 dark:border-emerald-900">
                      <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">Status File</p>
                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">Ready Print</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-indigo-600 dark:text-indigo-400" />
                      <h2 className="font-display font-bold text-xs text-slate-900 dark:text-white">Status Meja Dine-In</h2>
                    </div>
                    <Link to="/app/pos" className="text-[11px] text-brand font-bold hover:underline">
                      Denah
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-center">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-none border border-emerald-200 dark:border-emerald-900">
                      <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">Tersedia</p>
                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{availableTablesCount}</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-none border border-rose-200 dark:border-rose-900">
                      <p className="text-[10px] font-bold text-rose-800 dark:text-rose-400">Terisi</p>
                      <p className="text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5">{occupiedTablesCount}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
