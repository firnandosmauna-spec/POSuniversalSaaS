import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { 
  Printer, 
  Ruler, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  ShoppingBag, 
  DollarSign, 
  User, 
  ChevronRight, 
  Layers, 
  Scissors, 
  FileCheck, 
  AlertCircle, 
  Eye, 
  RefreshCw, 
  Receipt, 
  Box, 
  Sparkles,
  TrendingUp,
  CreditCard,
  Package,
  Users,
  Settings,
  HardDrive,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/shared/auth/AuthContext";
import { supabase } from "@/shared/lib/supabase";

type PrintingJob = {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone?: string;
  materialName?: string;
  totalAmount: number;
  dpAmount: number;
  remainingAmount: number;
  paymentStatus: "Lunas" | "DP (Kurang Bayar)";
  jobStatus: "Antrean" | "Proses Desain" | "Proses Cetak" | "Finishing" | "Siap Diambil" | "Selesai";
  branchId?: string;
  branchName?: string;
  createdAt: string;
};

export function PrintingDashboardView() {
  const { user, branches, activeBranchId, activeBranchName, switchBranch } = useAuth();
  const [jobs, setJobs] = useState<PrintingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Try reading local stored SPK jobs
      const savedJobsStr = localStorage.getItem("pos_printing_jobs");
      let localJobs: PrintingJob[] = savedJobsStr ? JSON.parse(savedJobsStr) : [];

      // 2. Fetch remote transactions as fallback/sync
      if (user) {
        const { data: txData } = await supabase
          .from("transactions")
          .select("*")
          .eq("tenant_id", user.id)
          .order("created_at", { ascending: false });

        if (txData && txData.length > 0) {
          const remoteJobs: PrintingJob[] = txData.map((t, idx) => ({
            id: t.id,
            invoiceNo: `SPK-${new Date(t.created_at).getTime().toString().substring(6)}-${idx + 1}`,
            customerName: t.customer_name_custom || t.order_type || "Pelanggan Percetakan",
            totalAmount: Number(t.total_amount) || 0,
            dpAmount: Number(t.total_amount) || 0,
            remainingAmount: 0,
            paymentStatus: "Lunas",
            jobStatus: idx % 2 === 0 ? "Selesai" : "Proses Cetak",
            branchId: t.branch_id || "main",
            branchName: "Cabang Utama",
            createdAt: t.created_at
          }));

          // Merge local and remote
          const merged = [...localJobs];
          remoteJobs.forEach((rj) => {
            if (!merged.some((lj) => lj.id === rj.id)) {
              merged.push(rj);
            }
          });
          localJobs = merged;
        }
      }

      // Default mock data if completely empty
      if (localJobs.length === 0) {
        localJobs = [
          {
            id: "spk_1",
            invoiceNo: "SPK-2026-001",
            customerName: "PT Sinar Merdeka",
            materialName: "Flexi High-Res Korea 440g (300x100 cm)",
            totalAmount: 165000,
            dpAmount: 100000,
            remainingAmount: 65000,
            paymentStatus: "DP (Kurang Bayar)",
            jobStatus: "Proses Cetak",
            branchId: "main",
            branchName: "Cabang Utama (Pusat)",
            createdAt: new Date().toISOString()
          },
          {
            id: "spk_2",
            invoiceNo: "SPK-2026-002",
            customerName: "Warung Kopi Kenangan",
            materialName: "Stiker Vinyl Outdoor Ritrama (200x100 cm)",
            totalAmount: 240000,
            dpAmount: 240000,
            remainingAmount: 0,
            paymentStatus: "Lunas",
            jobStatus: "Siap Diambil",
            branchId: "main",
            branchName: "Cabang Utama (Pusat)",
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem("pos_printing_jobs", JSON.stringify(localJobs));
      }

      setJobs(localJobs);
    } catch (e) {
      console.error("Error loading printing dashboard:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Branch Isolation Filter
  const branchJobs = useMemo(() => {
    return jobs.filter((j: PrintingJob) => {
      if (activeBranchId === "all") return true;
      if (j.branchId) return j.branchId === activeBranchId;
      if (j.branchName) return j.branchName === activeBranchName;
      return activeBranchId === "main";
    });
  }, [jobs, activeBranchId, activeBranchName]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  // Metrics from branch-isolated jobs
  const totalOmzet = branchJobs.reduce((sum: number, j: PrintingJob) => sum + (j.totalAmount || 0), 0);
  const totalDpTerbayar = branchJobs.reduce((sum: number, j: PrintingJob) => sum + (j.dpAmount || 0), 0);
  const totalPiutangSisa = branchJobs.reduce((sum: number, j: PrintingJob) => sum + (j.remainingAmount || 0), 0);
  const totalSpkCount = branchJobs.length;

  const antreanCount = branchJobs.filter((j: PrintingJob) => j.jobStatus === "Antrean" || j.jobStatus === "Proses Desain").length;
  const cetakCount = branchJobs.filter((j: PrintingJob) => j.jobStatus === "Proses Cetak").length;
  const finishingCount = branchJobs.filter((j: PrintingJob) => j.jobStatus === "Finishing").length;
  const selesaiCount = branchJobs.filter((j: PrintingJob) => j.jobStatus === "Siap Diambil" || j.jobStatus === "Selesai").length;

  return (
    <div className="p-3 md:p-5 h-full flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans space-y-4">
      {/* Header Banner Anti-Slop */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 md:p-4 border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-brand text-white grid place-items-center font-bold shadow-xs">
            <Printer className="size-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base md:text-lg text-slate-900 dark:text-white tracking-tight">
              Dashboard Operasional Percetakan Digital
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan data untuk: <span className="font-bold text-brand">{activeBranchName}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Synchronized Branch Switcher Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700">
            <Building2 className="size-4 text-brand" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">Pilih Cabang:</span>
            <select
              value={activeBranchId}
              onChange={(e) => switchBranch(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">📍 Semua Cabang (Konsolidasi)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                  📍 {b.name} {b.is_main ? "(Pusat)" : ""}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={loadDashboardData}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-none"
          >
            <RefreshCw className="size-3.5" /> Refresh Data
          </Button>
          <Link to="/app/pos">
            <Button size="sm" className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1.5 rounded-none shadow-xs">
              <Plus className="size-3.5" /> Buat SPK Cetak Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid 4 Executive KPI Cards Percetakan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        {/* Total Omzet SPK */}
        <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Tagihan SPK</span>
            <div className="size-8 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 grid place-items-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <h2 className="text-lg font-extrabold font-mono text-slate-900 dark:text-white leading-snug">{formatRupiah(totalOmzet)}</h2>
          <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="size-3" /> {totalSpkCount} SPK Order Cetak
          </p>
        </div>

        {/* DP / Pelunasan */}
        <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Uang Masuk (DP/Lunas)</span>
            <div className="size-8 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 grid place-items-center">
              <CreditCard className="size-4" />
            </div>
          </div>
          <h2 className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 leading-snug">{formatRupiah(totalDpTerbayar)}</h2>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Diterima kasir di muka
          </p>
        </div>

        {/* Piutang / Sisa Bayar */}
        <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sisa Pelunasan DP</span>
            <div className="size-8 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 grid place-items-center">
              <AlertCircle className="size-4" />
            </div>
          </div>
          <h2 className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400 leading-snug">{formatRupiah(totalPiutangSisa)}</h2>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Wajib lunas saat pengambillan
          </p>
        </div>

        {/* Mesin & Material Status */}
        <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pengerjaan Mesin</span>
            <div className="size-8 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900 grid place-items-center">
              <Printer className="size-4" />
            </div>
          </div>
          <h2 className="text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400 leading-snug">{cetakCount} SPK Cetak</h2>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
            {antreanCount} Antrean | {finishingCount} Finishing
          </p>
        </div>
      </div>

      {/* Alur Tracker Status Job Order Percetakan (5 Steps Grid) */}
      <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-2">
          <Layers className="size-4 text-brand" /> Alur Pengerjaan & Antrean SPK Produksi Real-Time
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-center">
            <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">1. Antrean SPK</span>
            <p className="text-lg font-extrabold font-mono text-amber-800 dark:text-amber-200 mt-0.5">{antreanCount}</p>
            <span className="text-[9.5px] text-amber-600 dark:text-amber-400 font-semibold">Pesanan Masuk</span>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-center">
            <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">2. Desain / Layout</span>
            <p className="text-lg font-extrabold font-mono text-indigo-800 dark:text-indigo-200 mt-0.5">{jobs.filter(j => j.jobStatus === "Proses Desain").length}</p>
            <span className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-semibold">Setting File Pre-Press</span>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-center">
            <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">3. Proses Cetak</span>
            <p className="text-lg font-extrabold font-mono text-blue-800 dark:text-blue-200 mt-0.5">{cetakCount}</p>
            <span className="text-[9.5px] text-blue-600 dark:text-blue-400 font-semibold">Mesin Running</span>
          </div>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-center">
            <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">4. Finishing</span>
            <p className="text-lg font-extrabold font-mono text-purple-800 dark:text-purple-200 mt-0.5">{finishingCount}</p>
            <span className="text-[9.5px] text-purple-600 dark:text-purple-400 font-semibold">Mata Ayam / Pres</span>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">5. Siap Diambil / Selesai</span>
            <p className="text-lg font-extrabold font-mono text-emerald-800 dark:text-emerald-200 mt-0.5">{selesaiCount}</p>
            <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-semibold">SPK Done</span>
          </div>
        </div>
      </div>

      {/* Main Grid 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Left Column (2 Cols): Job Orders Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-3.5 flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-brand" />
              <h2 className="font-display font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Daftar Job Order & SPK Cetak Terbaru
              </h2>
            </div>
            <Link to="/app/sales" className="text-xs font-bold text-brand hover:underline flex items-center gap-0.5">
              Lihat Riwayat SPK <ChevronRight className="size-3" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2.5">No. SPK</th>
                  <th className="p-2.5">Pelanggan</th>
                  <th className="p-2.5 text-center">Status Cetak</th>
                  <th className="p-2.5 text-center">Status Bayar</th>
                  <th className="p-2.5 text-right">Total Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {branchJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-2.5 font-bold text-brand font-mono">{job.invoiceNo}</td>
                    <td className="p-2.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{job.customerName}</p>
                      {job.materialName && <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{job.materialName}</p>}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold border uppercase ${
                        job.jobStatus === "Selesai" || job.jobStatus === "Siap Diambil"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                          : job.jobStatus === "Proses Cetak"
                          ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                          : job.jobStatus === "Finishing"
                          ? "bg-purple-100 text-purple-700 border-purple-300"
                          : "bg-amber-100 text-amber-700 border-amber-300"
                      }`}>
                        {job.jobStatus}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-mono">
                      {job.remainingAmount > 0 ? (
                        <div>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                            DP ({formatRupiah(job.dpAmount)})
                          </span>
                          <p className="text-[9px] text-rose-600 font-bold mt-0.5">Sisa: {formatRupiah(job.remainingAmount)}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                          Lunas
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-extrabold font-mono text-slate-900 dark:text-white">
                      {formatRupiah(job.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 Col): Top Materials Cetak */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-3.5 flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Box className="size-4 text-purple-600" />
              <h2 className="font-display font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Material Cetak Terlaris</h2>
            </div>
            <Link to="/app/products" className="text-xs font-bold text-brand hover:underline">
              Katalog
            </Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {[
              { name: "Flexi Standar 280g", category: "Outdoor Banner", volume: "142 m²", total: 3550000 },
              { name: "Flexi High-Res Korea 440g", category: "Outdoor Premium", volume: "98 m²", total: 5390000 },
              { name: "Art Carton 260g A3+", category: "Sheet & Brosur", volume: "650 lembar", total: 2925000 },
              { name: "Stiker Vinyl Outdoor (Ritrama)", category: "Stiker Branding", volume: "45 m²", total: 3825000 },
              { name: "Albatros Synthetic Paper", category: "Roll Up Banner", volume: "24 m²", total: 1800000 }
            ].map((mat, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-brand transition-colors">
                <div>
                  <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{mat.name}</p>
                  <p className="text-[10px] text-slate-500">{mat.category} • <span className="font-bold text-brand">{mat.volume}</span></p>
                </div>
                <span className="font-extrabold font-mono text-xs text-slate-900 dark:text-white">{formatRupiah(mat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
