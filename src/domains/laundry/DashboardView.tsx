import { useState, useEffect } from "react";
import {
  WashingMachine,
  Shirt,
  Sparkles,
  Clock,
  CheckCircle2,
  TrendingUp,
  Package,
  Users,
  Calendar,
  ChevronRight,
  Calculator,
  ArrowUpRight,
  AlertCircle,
  MapPin,
  CircleDollarSign,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/shared/auth/AuthContext";
import { LaundryJobOrder } from "./POSView";

export function LaundryDashboardView() {
  const { user, activeBranchId, activeBranchName, branches, switchBranch } = useAuth();
  const currentBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const [jobs, setJobs] = useState<LaundryJobOrder[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_laundry_jobs");
      if (saved) {
        setJobs(JSON.parse(saved));
      } else {
        setJobs([]);
      }
    } catch (e) {}
  }, [currentBranch]);

  // Update status
  const handleUpdateStatus = (jobId: string, newStatus: LaundryJobOrder["jobStatus"]) => {
    const updated = jobs.map((j) => (j.id === jobId ? { ...j, jobStatus: newStatus } : j));
    setJobs(updated);
    try {
      localStorage.setItem("pos_laundry_jobs", JSON.stringify(updated));
    } catch (e) {}
  };

  // Metrics
  const totalRevenue = jobs.reduce((sum, j) => sum + j.totalAmount, 0);
  const activeProcessingCount = jobs.filter(
    (j) => j.jobStatus === "Antrean" || j.jobStatus === "Proses Cuci" || j.jobStatus === "Pengeringan" || j.jobStatus === "Setrika & Packing"
  ).length;
  const readyPickupCount = jobs.filter((j) => j.jobStatus === "Siap Diambil").length;
  
  // Calculate total weightwashed today (kg)
  const totalKgToday = jobs.reduce((sum, j) => {
    const kgItems = j.items.filter((i) => i.service.unitName === "kg");
    return sum + kgItems.reduce((s, i) => s + i.weightOrQty, 0);
  }, 0);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto p-4 md:p-6 space-y-6 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-none">
        <div className="flex items-center gap-3.5">
          <div className="size-12 bg-slate-900 text-white dark:bg-white dark:text-slate-900 grid place-items-center rounded-none font-bold">
            <WashingMachine className="size-6" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-lg md:text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Dashboard Usaha Laundry
              <span className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-0.5 border border-slate-300 dark:border-slate-700 font-mono">
                {currentBranch?.name || "Cabang Utama"}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring antrean pencetakan, status rak pakaian, pengeringan, setrika uap, & statistik kiloan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Synchronized Branch Switcher Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700">
            <Building2 className="size-4 text-slate-700 dark:text-slate-300" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">Pilih Cabang:</span>
            <select
              value={activeBranchId}
              onChange={(e) => switchBranch(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold">📍 Semua Cabang (Konsolidasi)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                  📍 {b.name} {b.is_main ? "(Pusat)" : ""}
                </option>
              ))}
            </select>
          </div>

          <Link to="/app/pos">
            <Button className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs px-5 py-2.5 rounded-none gap-2">
              <Calculator className="size-4" /> Buka Kasir Laundry
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Omset Laundry</span>
            <div className="size-8 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white grid place-items-center">
              <CircleDollarSign className="size-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-900 dark:text-white">
            Rp {totalRevenue.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="size-3" /> Rekapitulasi nota laundry aktif
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Dalam Proses Cuci/Setrika</span>
            <div className="size-8 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white grid place-items-center">
              <WashingMachine className="size-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-900 dark:text-white">
            {activeProcessingCount} Nota
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            Pakaian sedang dibilas, dikeringkan & disetrika
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Siap Diambil Pelanggan</span>
            <div className="size-8 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white grid place-items-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-900 dark:text-white">
            {readyPickupCount} Nota
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            Tersimpan rapi di Rak Penyimpanan
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Timbangan Kiloan Hari Ini</span>
            <div className="size-8 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white grid place-items-center">
              <Shirt className="size-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-900 dark:text-white">
            {totalKgToday} kg
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            Total berat pakaian masuk hari ini
          </p>
        </div>
      </div>

      {/* Laundry Status Pipeline Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none space-y-4">
        <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Clock className="size-4 text-slate-900 dark:text-white" /> Pipeline Status Pengerjaan Laundry
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(
            [
              { status: "Antrean", label: "Antrean Cuci" },
              { status: "Proses Cuci", label: "Proses Cuci" },
              { status: "Pengeringan", label: "Pengeringan" },
              { status: "Setrika & Packing", label: "Setrika & Packing" },
              { status: "Siap Diambil", label: "Siap Diambil" },
            ] as const
          ).map((st) => {
            const count = jobs.filter((j) => j.jobStatus === st.status).length;
            return (
              <div key={st.status} className="p-3 border-l-4 border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase font-mono block text-slate-500 dark:text-slate-400">{st.label}</span>
                <span className="font-mono text-lg font-extrabold block text-slate-900 dark:text-white">{count} Nota</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Laundry Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Package className="size-4 text-slate-900 dark:text-white" /> Daftar Nota & Job Order Laundry Terbaru
          </h3>
          <Link to="/app/sales">
            <Button variant="ghost" size="sm" className="text-xs text-slate-900 dark:text-white hover:bg-slate-100 font-bold gap-1 rounded-none border border-slate-300">
              Lihat Semua Transaksi <ChevronRight className="size-3.5" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">No. Nota</th>
                <th className="p-3">Pelanggan</th>
                <th className="p-3">Rincian Layanan</th>
                <th className="p-3">Status Bayar</th>
                <th className="p-3">Status Pengerjaan Mesin</th>
                <th className="p-3 text-right">Total Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Belum ada data nota order laundry.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-all">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {job.invoiceNo}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {new Date(job.createdAt).toLocaleDateString("id-ID")}
                      </span>
                    </td>

                    <td className="p-3">
                      <strong className="text-slate-900 dark:text-white block">{job.customerName}</strong>
                      <span className="text-[11px] text-slate-500 font-mono">{job.customerPhone}</span>
                    </td>

                    <td className="p-3">
                      {job.items.map((item, i) => (
                        <div key={i} className="text-[11px]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.service.name}
                          </span>{" "}
                          <span className="text-slate-500 font-mono">
                            ({item.weightOrQty} {item.service.unitName}) - {item.rackLocation}
                          </span>
                        </div>
                      ))}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-extrabold border uppercase ${
                          job.paymentStatus === "Lunas"
                            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white border-slate-300 dark:border-slate-600"
                            : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {job.paymentStatus}
                      </span>
                      {job.remainingAmount > 0 && (
                        <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                          Sisa: Rp {job.remainingAmount.toLocaleString("id-ID")}
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <select
                        value={job.jobStatus}
                        onChange={(e) => handleUpdateStatus(job.id, e.target.value as LaundryJobOrder["jobStatus"])}
                        className="bg-transparent border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 p-1 rounded-none"
                      >
                        <option value="Antrean">Antrean Cuci</option>
                        <option value="Proses Cuci">Proses Cuci</option>
                        <option value="Pengeringan">Pengeringan Mesin</option>
                        <option value="Setrika & Packing">Setrika & Packing</option>
                        <option value="Siap Diambil">Siap Diambil</option>
                        <option value="Selesai">Selesai (Diambil)</option>
                      </select>
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      Rp {job.totalAmount.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
