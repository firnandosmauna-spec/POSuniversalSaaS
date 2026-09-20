import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/shared/auth/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Printer, 
  FileText, 
  Search, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Scissors, 
  Eye, 
  CreditCard, 
  Trash2, 
  Plus, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight, 
  Phone, 
  User, 
  Ruler, 
  Layers,
  Calendar,
  Sparkles,
  Receipt,
  ArrowRight,
  Download
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export interface PrintingCartItem {
  id: string;
  category: "OUTDOOR_INDOOR" | "SHEET_DOC" | "MERCHANDISE";
  jobTitle: string;
  material: { id: string; name: string; unitName: string };
  widthCm: number;
  heightCm: number;
  areaM2: number;
  quantity: number;
  unitPrice: number;
  finishings: { id: string; name: string; price: number }[];
  finishingCost: number;
  totalPrice: number;
  notes: string;
  fileStatus: "Ready" | "Perlu Desain" | "Re-Desain";
}

export interface PrintingJobOrder {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  items: PrintingCartItem[];
  totalAmount: number;
  dpAmount: number;
  remainingAmount: number;
  paymentStatus: "Lunas" | "DP (Kurang Bayar)";
  paymentMethod: string;
  jobStatus: "Antrean" | "Proses Desain" | "Proses Cetak" | "Finishing" | "Siap Diambil" | "Selesai";
  cashierName: string;
  branchId?: string;
  branchName: string;
  createdAt: string;
}

const JOB_STATUSES: PrintingJobOrder["jobStatus"][] = [
  "Antrean",
  "Proses Desain",
  "Proses Cetak",
  "Finishing",
  "Siap Diambil",
  "Selesai"
];

export function PrintingSalesView() {
  const { user, activeBranchId, activeBranchName } = useAuth();
  const [jobs, setJobs] = useState<PrintingJobOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("today");

  // Selected SPK for Modal / Detail / Pelunasan
  const [selectedJob, setSelectedJob] = useState<PrintingJobOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPayRemainingModalOpen, setIsPayRemainingModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState<number>(0);
  const [paymentMethodsList, setPaymentMethodsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pos_payment_methods");
      if (saved) return saved.split(",").map(s => s.trim()).filter(Boolean);
    } catch(e) {}
    return ["Tunai", "QRIS", "Transfer Bank", "Debit / Kredit"];
  });
  const [payMethodInput, setPayMethodInput] = useState<string>(paymentMethodsList[0] || "Tunai");

  // Load SPK Jobs from localStorage and Supabase
  const loadJobs = async () => {
    setIsLoading(true);
    try {
      // 1. Get from localStorage
      const localStr = localStorage.getItem("pos_printing_jobs");
      let localJobs: PrintingJobOrder[] = localStr ? JSON.parse(localStr) : [];

      // 2. Fetch from Supabase as fallback
      if (user) {
        const { data: txData, error: txErr } = await supabase
          .from("transactions")
          .select("*")
          .eq("tenant_id", user.id)
          .order("created_at", { ascending: false });

        if (txErr) {
          console.warn("Supabase transaction query warning:", txErr.message);
        }

        if (txData && txData.length > 0) {
          const remoteJobs: PrintingJobOrder[] = txData.map((t, idx) => {
            const total = Number(t.total_amount) || 0;
            return {
              id: t.id,
              invoiceNo: t.invoice_no || `SPK-${new Date(t.created_at).getTime().toString().substring(6)}-${idx + 1}`,
              customerName: t.customer_name || t.customer_name_custom || "Pelanggan General",
              customerPhone: t.customer_phone || "-",
              items: t.items ? (typeof t.items === 'string' ? JSON.parse(t.items) : t.items) : [],
              totalAmount: total,
              dpAmount: Number(t.dp_amount) || total,
              remainingAmount: Number(t.remaining_amount) || 0,
              paymentStatus: t.payment_status || "Lunas",
              paymentMethod: t.payment_method || "cash",
              jobStatus: t.job_status || "Selesai",
              cashierName: t.cashier_name || "Kasir Operator",
              branchName: t.branch_name || "Outlet Utama",
              createdAt: t.created_at
            };
          });

          // Merge local and remote avoiding duplicate IDs
          const merged = [...localJobs];
          remoteJobs.forEach((rj) => {
            if (!merged.some((lj) => lj.id === rj.id)) {
              merged.push(rj);
            }
          });
          localJobs = merged;
        }
      }

      // Filter out mock data if real user
      if (user && user.id !== "tenant_demo") {
        const mockIds = ["spk_demo_1", "spk_demo_2", "spk_demo_3", "spk_demo_4"];
        localJobs = localJobs.filter(j => !mockIds.includes(j.id));
      }

      setJobs(localJobs);
    } catch (e) {
      console.error("Error loading SPK jobs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [user]);

  // Persist update to localStorage + Supabase cloud sync
  const updateJobsInStateAndStorage = (updated: PrintingJobOrder[]) => {
    setJobs(updated);
    try {
      localStorage.setItem("pos_printing_jobs", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  };

  // Update SPK Job Status (localStorage + Supabase)
  const handleStatusChange = (jobId: string, newStatus: PrintingJobOrder["jobStatus"]) => {
    const updated = jobs.map((j) => (j.id === jobId ? { ...j, jobStatus: newStatus } : j));
    updateJobsInStateAndStorage(updated);
    if (selectedJob && selectedJob.id === jobId) {
      setSelectedJob({ ...selectedJob, jobStatus: newStatus });
    }
    // Cloud sync
    if (user) {
      (async () => {
        try {
          await supabase
            .from("transactions")
            .update({ job_status: newStatus })
            .eq("id", jobId)
            .eq("tenant_id", user.id);
        } catch (err) {
          console.warn("Status cloud sync failed (saved locally):", err);
        }
      })();
    }
  };

  // Open Pelunasan Modal
  const handleOpenPayRemaining = (job: PrintingJobOrder) => {
    setSelectedJob(job);
    setPayAmountInput(job.remainingAmount);
    setPayMethodInput(paymentMethodsList[0] || "Tunai");
    setIsPayRemainingModalOpen(true);
  };

  // Process Pelunasan DP
  const handleConfirmPelunasan = () => {
    if (!selectedJob) return;
    const paid = Number(payAmountInput) || 0;
    const newRemaining = Math.max(0, selectedJob.remainingAmount - paid);
    const newDp = selectedJob.dpAmount + paid;
    const newPayStatus: PrintingJobOrder["paymentStatus"] = newRemaining === 0 ? "Lunas" : "DP (Kurang Bayar)";

    const updated = jobs.map((j) => {
      if (j.id === selectedJob.id) {
        return {
          ...j,
          dpAmount: newDp,
          remainingAmount: newRemaining,
          paymentStatus: newPayStatus,
          paymentMethod: payMethodInput
        };
      }
      return j;
    });

    updateJobsInStateAndStorage(updated);

    // Cloud sync pelunasan DP ke Supabase
    if (user) {
      (async () => {
        try {
          await supabase
            .from("transactions")
            .update({
              dp_amount: newDp,
              remaining_amount: newRemaining,
              payment_status: newPayStatus,
              payment_method: payMethodInput
            })
            .eq("id", selectedJob.id)
            .eq("tenant_id", user.id);
        } catch (err) {
          console.warn("Pelunasan cloud sync failed (saved locally):", err);
        }
      })();
    }

    setIsPayRemainingModalOpen(false);
    if (isDetailOpen && selectedJob) {
      setSelectedJob({
        ...selectedJob,
        dpAmount: newDp,
        remainingAmount: newRemaining,
        paymentStatus: newPayStatus
      });
    }
  };

  // Delete / Cancel SPK
  const handleDeleteJob = (jobId: string) => {
    if (confirm("Apakah Anda yakin ingin membatalkan/menghapus data SPK ini?")) {
      const updated = jobs.filter((j) => j.id !== jobId);
      updateJobsInStateAndStorage(updated);
      if (selectedJob && selectedJob.id === jobId) {
        setIsDetailOpen(false);
        setSelectedJob(null);
      }
    }
  };

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search
      const query = search.toLowerCase();
      const matchSearch =
        job.invoiceNo.toLowerCase().includes(query) ||
        job.customerName.toLowerCase().includes(query) ||
        job.customerPhone.toLowerCase().includes(query) ||
        job.items.some((i) => i.jobTitle.toLowerCase().includes(query) || i.material.name.toLowerCase().includes(query));

      // Status Filter
      const matchStatus = statusFilter === "ALL" || job.jobStatus === statusFilter;

      // Payment Filter
      const matchPayment =
        paymentFilter === "ALL" ||
        (paymentFilter === "LUNAS" && job.paymentStatus === "Lunas") ||
        (paymentFilter === "DP" && job.paymentStatus === "DP (Kurang Bayar)");

      // Date Filter
      const date = new Date(job.createdAt);
      const now = new Date();
      let matchDate = true;
      if (dateFilter === "today") {
        matchDate = date.toDateString() === now.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        matchDate = date >= weekAgo;
      } else if (dateFilter === "month") {
        matchDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }

      // Branch Isolation Filter
      const matchBranch =
        activeBranchId === "all" ||
        job.branchId === activeBranchId ||
        job.branchName === activeBranchName ||
        (!job.branchId && activeBranchId === "main");

      return matchSearch && matchStatus && matchPayment && matchDate && matchBranch;
    });
  }, [jobs, search, statusFilter, paymentFilter, dateFilter, activeBranchId, activeBranchName]);

  // Financial & Production Metrics Summary
  const metrics = useMemo(() => {
    const totalRevenue = filteredJobs.reduce((acc, j) => acc + j.totalAmount, 0);
    const totalReceived = filteredJobs.reduce((acc, j) => acc + j.dpAmount, 0);
    const totalRemaining = filteredJobs.reduce((acc, j) => acc + j.remainingAmount, 0);
    const countActive = filteredJobs.filter((j) => j.jobStatus !== "Selesai").length;
    const countCompleted = filteredJobs.filter((j) => j.jobStatus === "Selesai").length;

    let outdoorM2 = 0;
    let outdoorOmzet = 0;
    let sheetCount = 0;
    let sheetOmzet = 0;
    let merchCount = 0;
    let merchOmzet = 0;

    filteredJobs.forEach((j) => {
      (j.items || []).forEach((item) => {
        if (item.category === "OUTDOOR_INDOOR") {
          outdoorM2 += (item.areaM2 || 0) * (item.quantity || 1);
          outdoorOmzet += item.totalPrice || 0;
        } else if (item.category === "SHEET_DOC") {
          sheetCount += item.quantity || 1;
          sheetOmzet += item.totalPrice || 0;
        } else {
          merchCount += item.quantity || 1;
          merchOmzet += item.totalPrice || 0;
        }
      });
    });

    const paymentBreakdown = paymentMethodsList.map(method => {
      const total = filteredJobs.filter(j => j.paymentMethod === method || (method === 'Tunai' && j.paymentMethod === 'cash') || (method === 'QRIS' && j.paymentMethod === 'qris') || (method === 'Transfer Bank' && j.paymentMethod === 'transfer')).reduce((acc, j) => acc + j.dpAmount, 0);
      return { method, total };
    });

    return {
      totalRevenue,
      totalReceived,
      totalRemaining,
      countActive,
      countCompleted,
      outdoorM2,
      outdoorOmzet,
      sheetCount,
      sheetOmzet,
      merchCount,
      merchOmzet,
      paymentBreakdown
    };
  }, [filteredJobs, paymentMethodsList]);

  const handleExportCSV = () => {
    const headers = [
      "No SPK",
      "Nama Pelanggan",
      "Telepon",
      "Tanggal",
      "Total SPK (Rp)",
      "Uang Masuk (Rp)",
      "Sisa DP (Rp)",
      "Status Pembayaran",
      "Status Pekerjaan",
      "Kasir/Operator"
    ];
    const rows = filteredJobs.map((j) => [
      `"${j.invoiceNo}"`,
      `"${j.customerName}"`,
      `"${j.customerPhone}"`,
      `"${new Date(j.createdAt).toLocaleString("id-ID")}"`,
      j.totalAmount,
      j.dpAmount,
      j.remainingAmount,
      `"${j.paymentStatus}"`,
      `"${j.jobStatus}"`,
      `"${j.cashierName}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Penjualan_Percetakan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  const getStatusBadgeClass = (status: PrintingJobOrder["jobStatus"]) => {
    switch (status) {
      case "Antrean":
        return "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800";
      case "Proses Desain":
        return "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800";
      case "Proses Cetak":
        return "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800";
      case "Finishing":
        return "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800";
      case "Siap Diambil":
        return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800";
      case "Selesai":
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 md:p-5 space-y-4 overflow-y-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 md:p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-brand text-white grid place-items-center font-bold shadow-xs">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base md:text-lg text-slate-900 dark:text-white tracking-tight">
              SPK & Riwayat Cetak Percetakan
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsReportModalOpen(true)}
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand text-white font-semibold hover:bg-brand/90"
          >
            <Printer className="size-3.5" /> Cetak Laporan Penjualan
          </Button>
          <Button
            onClick={loadJobs}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
          >
            <RefreshCw className="size-3.5" /> Refresh Data
          </Button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Tagihan SPK
            </span>
            <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {formatRupiah(metrics.totalRevenue)}
            </span>
          </div>
          <div className="size-8 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 grid place-items-center">
            <DollarSign className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Uang Masuk (DP/Lunas)
            </span>
            <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {formatRupiah(metrics.totalReceived)}
            </span>
          </div>
          <div className="size-8 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 grid place-items-center">
            <CheckCircle2 className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Piutang / Sisa DP
            </span>
            <span className="text-base font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
              {formatRupiah(metrics.totalRemaining)}
            </span>
          </div>
          <div className="size-8 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 grid place-items-center">
            <Clock className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              SPK Aktif Produksi
            </span>
            <span className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
              {metrics.countActive} SPK
            </span>
          </div>
          <div className="size-8 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 grid place-items-center">
            <Printer className="size-4" />
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari No SPK, nama pelanggan, HP, atau nama bahan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-none focus:border-brand"
          />
        </div>

        {/* Status & Payment Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status SPK Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">Semua Status SPK</option>
            {JOB_STATUSES.map((st) => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">Semua Status Bayar</option>
            <option value="LUNAS">Status: Lunas</option>
            <option value="DP">Status: DP / Kurang Bayar</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e: any) => setDateFilter(e.target.value)}
            className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
            <option value="all">Semua Waktu</option>
          </select>
        </div>
      </div>

      {/* Main Table SPK Jobs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <th className="p-3">No. SPK / Waktu</th>
              <th className="p-3">Pelanggan & Kontak</th>
              <th className="p-3">Item & Bahan Cetak</th>
              <th className="p-3 text-right">Total Tagihan</th>
              <th className="p-3 text-center">Status Bayar</th>
              <th className="p-3 text-center">Status SPK Produksi</th>
              <th className="p-3 text-center">Aksi / Kontrol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="size-5 animate-spin text-brand" />
                    <span>Memuat data SPK percetakan...</span>
                  </div>
                </td>
              </tr>
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="size-8 text-slate-300 dark:text-slate-700" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Tidak ada data SPK cetak ditemukan
                    </span>
                    <span className="text-[11px]">Coba ubah kata kunci pencarian atau filter status di atas.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  {/* Invoice / Date */}
                  <td className="p-3 align-top">
                    <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <FileText className="size-3.5 text-brand" />
                      {job.invoiceNo}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(job.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="p-3 align-top">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <User className="size-3 text-slate-400" />
                      {job.customerName}
                    </div>
                    {job.customerPhone && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="size-3 text-slate-400" />
                        {job.customerPhone}
                      </div>
                    )}
                  </td>

                  {/* Items Summary */}
                  <td className="p-3 align-top">
                    <div className="space-y-1 max-w-xs">
                      {(job.items || []).map((item, idx) => (
                        <div key={idx} className="text-[11px] leading-tight">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {item.quantity}x {item.jobTitle}
                          </span>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Bahan: {item.material.name}{" "}
                            {item.widthCm > 0 && `(${item.widthCm}x${item.heightCm} cm = ${item.areaM2}m²)`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Total & Remaining */}
                  <td className="p-3 align-top text-right font-mono">
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {formatRupiah(job.totalAmount)}
                    </div>
                    {job.remainingAmount > 0 ? (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                        Sisa: {formatRupiah(job.remainingAmount)}
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                        DP: {formatRupiah(job.dpAmount)}
                      </div>
                    )}
                  </td>

                  {/* Payment Status Badge */}
                  <td className="p-3 align-top text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-extrabold border uppercase tracking-wider ${
                        job.paymentStatus === "Lunas"
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                      }`}
                    >
                      {job.paymentStatus}
                    </span>
                    {job.paymentStatus === "DP (Kurang Bayar)" && (
                      <button
                        onClick={() => handleOpenPayRemaining(job)}
                        className="block mx-auto mt-1 text-[9.5px] text-brand hover:underline font-bold"
                      >
                        + Lunasi
                      </button>
                    )}
                  </td>

                  {/* SPK Status Production Selector */}
                  <td className="p-3 align-top text-center">
                    <select
                      value={job.jobStatus}
                      onChange={(e) => handleStatusChange(job.id, e.target.value as any)}
                      className={`text-[10px] font-extrabold px-2 py-1 border rounded-none cursor-pointer focus:outline-hidden ${getStatusBadgeClass(
                        job.jobStatus
                      )}`}
                    >
                      {JOB_STATUSES.map((st) => (
                        <option key={st} value={st} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Action Buttons */}
                  <td className="p-3 align-top text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedJob(job);
                          setIsDetailOpen(true);
                        }}
                        className="h-7 px-2 text-[10px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 gap-1 rounded-none"
                      >
                        <Eye className="size-3" /> Detail
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteJob(job.id)}
                        className="h-7 px-1.5 text-[10px] border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-none"
                        title="Hapus SPK"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detail SPK Operator */}
      {isDetailOpen && selectedJob && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 text-slate-900 dark:text-slate-100 rounded-none font-sans overflow-hidden">
            <DialogHeader className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <DialogTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                  <Printer className="size-4 text-brand" />
                  Rincian SPK Operator #{selectedJob.invoiceNo}
                </DialogTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Dibuat pada {new Date(selectedJob.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
            </DialogHeader>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Customer Info Card */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                    Pelanggan / Klien
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white block mt-0.5">
                    {selectedJob.customerName}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{selectedJob.customerPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                    Status Pembayaran
                  </span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-extrabold border uppercase tracking-wider ${
                      selectedJob.paymentStatus === "Lunas"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                        : "bg-amber-100 text-amber-700 border-amber-300"
                    }`}
                  >
                    {selectedJob.paymentStatus}
                  </span>
                  {selectedJob.remainingAmount > 0 && (
                    <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
                      Sisa Tagihan: {formatRupiah(selectedJob.remainingAmount)}
                    </span>
                  )}
                </div>
              </div>

              {/* Items Detail Table */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Daftar Spesifikasi Cetakan SPK
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                  {(selectedJob.items || []).map((item, idx) => (
                    <div key={idx} className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900 dark:text-white">
                          {idx + 1}. {item.jobTitle}
                        </span>
                        <span className="font-mono">{formatRupiah(item.totalPrice)}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>
                          Bahan: <strong className="text-slate-800 dark:text-slate-200">{item.material.name}</strong>
                        </div>
                        <div>
                          Dimensi:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {item.widthCm > 0 ? `${item.widthCm}x${item.heightCm} cm (${item.areaM2}m²)` : "Standar"}
                          </strong>
                        </div>
                        <div>
                          Jumlah Qty: <strong className="text-slate-800 dark:text-slate-200">{item.quantity}</strong>
                        </div>
                      </div>
                      {item.finishings.length > 0 && (
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 p-1.5 border border-indigo-200 dark:border-indigo-900">
                          Finishing: {item.finishings.map((f) => f.name).join(", ")}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 p-1.5 italic">
                          Catatan Operator: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-100 dark:bg-slate-800/80 p-3 space-y-1 text-right font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Tagihan SPK:</span>
                  <span className="font-bold">{formatRupiah(selectedJob.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Nominal DP Terbayar:</span>
                  <span className="font-bold text-emerald-600">{formatRupiah(selectedJob.dpAmount)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-300 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Sisa Tagihan Pelunasan:</span>
                  <span className="font-extrabold text-amber-600">{formatRupiah(selectedJob.remainingAmount)}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-8 text-xs gap-1 border-slate-300 dark:border-slate-700 rounded-none"
                >
                  <Printer className="size-3.5" /> Cetak SPK / Struk
                </Button>
                {selectedJob.remainingAmount > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenPayRemaining(selectedJob)}
                    className="h-8 text-xs bg-amber-600 text-white hover:bg-amber-700 font-bold gap-1 rounded-none"
                  >
                    <CreditCard className="size-3.5" /> Process Pelunasan
                  </Button>
                )}
              </div>
              <Button
                onClick={() => setIsDetailOpen(false)}
                className="h-8 text-xs bg-brand text-white font-bold rounded-none"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Process Pelunasan DP */}
      {isPayRemainingModalOpen && selectedJob && (
        <Dialog open={isPayRemainingModalOpen} onOpenChange={setIsPayRemainingModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 text-slate-900 dark:text-slate-100 rounded-none font-sans">
            <DialogHeader className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="size-4 text-emerald-600" />
                Pelunasan Sisa Tagihan SPK #{selectedJob.invoiceNo}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="bg-amber-50 dark:bg-amber-950/50 p-3 border border-amber-200 dark:border-amber-900 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Klien:</span>
                  <strong className="text-slate-900 dark:text-white">{selectedJob.customerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Tagihan Wajib:</span>
                  <strong className="text-amber-600 font-mono font-extrabold">
                    {formatRupiah(selectedJob.remainingAmount)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Bayar Pelunasan (Rp)
                </label>
                <Input
                  type="number"
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(Number(e.target.value))}
                  className="h-9 font-mono font-bold text-sm bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={payMethodInput}
                  onChange={(e) => setPayMethodInput(e.target.value)}
                  className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  {paymentMethodsList.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPayRemainingModalOpen(false)}
                className="h-8 text-xs border-slate-300 rounded-none"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmPelunasan}
                className="h-8 text-xs bg-emerald-600 text-white font-bold hover:bg-emerald-700 rounded-none"
              >
                Simpan & Tandai Lunas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL LAPORAN PENJUALAN PERCETAKAN */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-none font-sans">
          <DialogHeader className="p-4 bg-slate-900 text-white flex flex-row items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <Printer className="size-5 text-brand" />
              <DialogTitle className="text-base font-bold text-white tracking-tight">
                Laporan Penjualan & Produksi Percetakan
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleExportCSV}
                variant="outline"
                className="h-8 text-xs gap-1.5 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                <Download className="size-3.5" /> Export CSV
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="h-8 text-xs gap-1.5 bg-brand text-white font-bold hover:bg-brand/90"
              >
                <Printer className="size-3.5" /> Cetak PDF / Printer
              </Button>
            </div>
          </DialogHeader>

          {/* Report Body Printable Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 print:bg-white print:p-0 print:text-black">
            {/* Header Dokumen Laporan */}
            <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  LAPORAN OMZET & SPK PERCETAKAN
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5">
                  Periode Filter: <strong className="text-brand uppercase">{dateFilter === "today" ? "Hari Ini" : dateFilter === "week" ? "Minggu Ini" : dateFilter === "month" ? "Bulan Ini" : "Semua Data"}</strong> | Outlet: Cabang Utama
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <div>Dicetak: {new Date().toLocaleString("id-ID")}</div>
                <div>Operator: Kasir Percetakan</div>
                <div>Total SPK: {filteredJobs.length} Transaksi</div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Omzet SPK</span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                  {formatRupiah(metrics.totalRevenue)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Uang Masuk (DP/Lunas)</span>
                <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {formatRupiah(metrics.totalReceived)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Piutang Sisa DP</span>
                <span className="text-base font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-1 block">
                  {formatRupiah(metrics.totalRemaining)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Status Selesai / Produksi</span>
                <span className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
                  {metrics.countCompleted} Selesai / {metrics.countActive} Aktif
                </span>
              </div>
            </div>

            {/* Production Breakdown & Payment Method Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Production Breakdown */}
              <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b pb-2 border-slate-100 dark:border-slate-800">
                  <Ruler className="size-4 text-brand" /> Rincian Volume & Category Omzet
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Outdoor & Indoor (Flexi/Stiker)</div>
                      <div className="text-[11px] text-slate-500 font-mono">{metrics.outdoorM2.toFixed(2)} m² cetak</div>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatRupiah(metrics.outdoorOmzet)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Sheet & Dokumen (A3+/Art Paper)</div>
                      <div className="text-[11px] text-slate-500 font-mono">{metrics.sheetCount} lembar</div>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatRupiah(metrics.sheetOmzet)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Merchandise & Aksesoris</div>
                      <div className="text-[11px] text-slate-500 font-mono">{metrics.merchCount} unit</div>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatRupiah(metrics.merchOmzet)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b pb-2 border-slate-100 dark:border-slate-800">
                  <CreditCard className="size-4 text-emerald-600" /> Distribusi Uang Masuk per Pembayaran
                </h3>
                <div className="space-y-2 text-xs">
                  {metrics.paymentBreakdown.map(p => (
                    <div key={p.method} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{p.method}</span>
                      <span className="font-mono font-extrabold text-slate-700 dark:text-slate-300">
                        {formatRupiah(p.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SPK Detailed Transaction Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                Rincian Transaksi SPK ({filteredJobs.length} Data)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                      <th className="p-2.5">No SPK</th>
                      <th className="p-2.5">Pelanggan</th>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Item & Bahan</th>
                      <th className="p-2.5 text-right">Total SPK</th>
                      <th className="p-2.5 text-right">Uang Masuk</th>
                      <th className="p-2.5 text-right">Sisa DP</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-400">
                          Tidak ada transaksi SPK untuk periode ini.
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map((j) => (
                        <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{j.invoiceNo}</td>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                            {j.customerName}
                            <div className="text-[10px] text-slate-400 font-normal">{j.customerPhone}</div>
                          </td>
                          <td className="p-2.5 text-slate-500 font-mono">
                            {new Date(j.createdAt).toLocaleDateString("id-ID")}
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">
                            {(j.items || []).map((it) => it.jobTitle).join(", ")}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatRupiah(j.totalAmount)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                            {formatRupiah(j.dpAmount)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-amber-600">
                            {formatRupiah(j.remainingAmount)}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-bold border ${
                                j.paymentStatus === "Lunas"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                  : "bg-amber-100 text-amber-700 border-amber-300"
                              }`}
                            >
                              {j.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature Box */}
            <div className="pt-6 flex justify-between items-end text-xs text-slate-600 dark:text-slate-400">
              <div>
                <div>Catatan: Laporan ini dihasilkan secara otomatis oleh Sistem POS Percetakan Multi-Tenant.</div>
              </div>
              <div className="text-center w-48 space-y-12">
                <div>Penanggung Jawab Outlet</div>
                <div className="border-b border-slate-400 dark:border-slate-600 font-bold text-slate-900 dark:text-white pb-1">
                  ( Kasir / Owner )
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReportModalOpen(false)}
              className="h-8 text-xs border-slate-300 rounded-none"
            >
              Tutup Modal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
