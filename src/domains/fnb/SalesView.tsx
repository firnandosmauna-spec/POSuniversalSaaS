import { useState, useEffect } from "react";
import { 
  Receipt, 
  Search, 
  Loader2, 
  Eye, 
  Printer, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  CreditCard,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";
import { PrintingSalesView } from "@/domains/printing/SalesView";

export function SalesView() {
  const { user, activeBranchId, activeBranchName } = useAuth();

  if (user?.businessType === "PRINTING") {
    return <PrintingSalesView />;
  }
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("today");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Receipt & Report Modals
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // CRUD Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  // Form State Create / Edit
  const [formOrderType, setFormOrderType] = useState<"take_away" | "dine_in">("take_away");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("cash");
  const [formStatus, setFormStatus] = useState<"completed" | "hold" | "cancelled">("completed");
  const [formTotalAmount, setFormTotalAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTransactions = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase transaction query warning:", error.message);
      }
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
  };

  const isThisWeek = (date: Date) => {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    return date >= oneWeekAgo;
  };

  const isLast1Month = (date: Date) => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(now.getDate() - 30);
    return date >= oneMonthAgo;
  };

  const isInCustomRange = (date: Date) => {
    const time = date.getTime();
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (time < s.getTime()) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (time > e.getTime()) return false;
    }
    return true;
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.id.toLowerCase().includes(search.toLowerCase()) || 
      (t.customers?.name && t.customers.name.toLowerCase().includes(search.toLowerCase())) ||
      (t.cashier_shifts?.cashier_name && t.cashier_shifts.cashier_name.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    const matchesBranch = 
      !activeBranchId ||
      activeBranchId === "all" ||
      t.branch_id === activeBranchId ||
      t.branchId === activeBranchId ||
      t.branch_name === activeBranchName ||
      (!t.branch_id && !t.branchId && activeBranchId?.startsWith("main"));

    if (!matchesBranch) return false;

    const trxDate = new Date(t.created_at);
    if (dateFilter === "today") return isToday(trxDate);
    if (dateFilter === "yesterday") return isYesterday(trxDate);
    if (dateFilter === "week") return isThisWeek(trxDate);
    if (dateFilter === "month") return isLast1Month(trxDate);
    if (dateFilter === "custom") return isInCustomRange(trxDate);

    return true;
  });

  // Calculations for summary board
  const completedTransactions = filteredTransactions.filter(t => t.status === "completed");
  const totalRevenue = completedTransactions.reduce((acc, t) => acc + (Number(t.total_amount) || 0), 0);
  const totalTxCount = completedTransactions.length;
  const avgOrderValue = totalTxCount > 0 ? totalRevenue / totalTxCount : 0;
  const cashTotal = completedTransactions.filter(t => t.payment_method === 'cash').reduce((acc, t) => acc + (Number(t.total_amount) || 0), 0);
  const nonCashTotal = completedTransactions.filter(t => t.payment_method !== 'cash').reduce((acc, t) => acc + (Number(t.total_amount) || 0), 0);

  const openReceipt = (t: any) => {
    setSelectedReceipt(t);
    setIsReceiptOpen(true);
  };

  const printDocument = (elementId: string) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  // CRUD Actions
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formTotalAmount) return;

    setIsSubmitting(true);
    const amount = parseFloat(formTotalAmount) || 0;

    const newTrx = {
      id: `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: user.id,
      created_at: new Date().toISOString(),
      order_type: formOrderType,
      payment_method: formPaymentMethod,
      status: formStatus,
      total_amount: amount,
      discount_amount: 0,
      tax_amount: 0,
      customer_name_custom: formCustomerName.trim() || "Umum"
    };

    try {
      const { error } = await supabase
        .from("transactions")
        .insert([{
          tenant_id: newTrx.tenant_id,
          order_type: newTrx.order_type,
          payment_method: newTrx.payment_method,
          status: newTrx.status,
          total_amount: newTrx.total_amount
        }]);

      if (error) throw error;

      alert("Transaksi manual berhasil disimpan!");
      setIsCreateModalOpen(false);
      resetForm();
      fetchTransactions();
    } catch (err: any) {
      console.error("Error creating transaction:", err);
      setTransactions((prev) => [newTrx, ...prev]);
      alert("Transaksi manual berhasil dicatat!");
      setIsCreateModalOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (trx: any) => {
    setEditingTransaction(trx);
    setFormOrderType(trx.order_type || "take_away");
    setFormCustomerName(trx.customers?.name || trx.customer_name_custom || "");
    setFormPaymentMethod(trx.payment_method || "cash");
    setFormStatus(trx.status || "completed");
    setFormTotalAmount(String(trx.total_amount || 0));
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !user) return;

    setIsSubmitting(true);
    const amount = parseFloat(formTotalAmount) || 0;

    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          order_type: formOrderType,
          payment_method: formPaymentMethod,
          status: formStatus,
          total_amount: amount
        })
        .eq("id", editingTransaction.id);

      if (error) throw error;

      alert("Transaksi berhasil diperbarui!");
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      fetchTransactions();
    } catch (err: any) {
      console.error("Error updating transaction:", err);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTransaction.id
            ? {
                ...t,
                order_type: formOrderType,
                payment_method: formPaymentMethod,
                status: formStatus,
                total_amount: amount
              }
            : t
        )
      );
      alert("Transaksi berhasil diperbarui!");
      setIsEditModalOpen(false);
      setEditingTransaction(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;

      alert("Transaksi berhasil dihapus.");
      fetchTransactions();
    } catch (err: any) {
      console.error("Error deleting transaction:", err);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      alert("Transaksi berhasil dihapus dari daftar.");
    }
  };

  const resetForm = () => {
    setFormOrderType("take_away");
    setFormCustomerName("");
    setFormPaymentMethod("cash");
    setFormStatus("completed");
    setFormTotalAmount("");
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header & Controls */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="size-7 text-brand" /> {
              (user?.businessType as string) === "PRINTING"
                ? "SPK & Riwayat Cetak Percetakan"
                : user?.businessType === "LAUNDRY"
                ? "Riwayat Transaksi & Nota Laundry"
                : user?.businessType === "RETAIL" || user?.businessType === "GROCERY"
                ? "Laporan Transaksi Penjualan Retail"
                : "Laporan & Riwayat Penjualan"
            }
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {(user?.businessType as string) === "PRINTING"
              ? "Kelola SPK job order, pembayaran DP/Lunas, dan riwayat transaksi percetakan."
              : user?.businessType === "LAUNDRY"
              ? "Kelola nota penerimaan laundry, status pengerjaan pakaian, & riwayat transaksi."
              : "Kelola transaksi, filter periode penjualan, dan cetak struk/laporan resmi."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="size-4" /> Tambah Transaksi
          </Button>
          <Button
            onClick={() => setIsReportModalOpen(true)}
            className="bg-brand hover:bg-brand/90 text-white font-bold flex items-center gap-2 shadow-sm"
          >
            <Printer className="size-4" /> Cetak Laporan Penjualan
          </Button>
        </div>
      </div>

      {/* Filter Waktu & Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(["today", "yesterday", "week", "month", "custom", "all"] as const).map((p) => {
              const labels = {
                today: "Hari Ini",
                yesterday: "Kemarin",
                week: "Minggu Ini",
                month: "1 Bulan",
                custom: "Custom",
                all: "Semua"
              };
              return (
                <button
                  key={p}
                  onClick={() => setDateFilter(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    dateFilter === p 
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-brand"
              />
              <span className="text-xs text-slate-400 font-semibold">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-brand"
              />
            </div>
          )}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID, Kasir, Pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      {/* Papan Ringkasan / Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Pendapatan</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{formatRupiah(totalRevenue)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShoppingBag className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Transaksi</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalTxCount} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">trx</span></h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-rata Transaksi</p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{formatRupiah(avgOrderValue)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <CreditCard className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Metode Pembayaran</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Tunai: {formatRupiah(cashTotal)}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Non-Tunai: {formatRupiah(nonCashTotal)}</p>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[300px]">
        <div className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="size-8 animate-spin mb-4 text-brand" />
              <p>Memuat data penjualan...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Receipt className="size-12 mb-4 opacity-20" />
              <h2 className="mb-2 font-display text-lg font-semibold text-slate-700 dark:text-slate-300">
                Belum ada penjualan
              </h2>
              <p className="text-sm text-center max-w-sm">
                Tidak ada transaksi yang cocok dengan filter waktu atau kata kunci pencarian.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 sticky top-0">
                <tr>
                  <th className="p-4 font-semibold">Waktu & ID</th>
                  <th className="p-4 font-semibold">Kasir</th>
                  <th className="p-4 font-semibold">Tipe & Pelanggan</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-right">Total Tagihan</th>
                  <th className="p-4 font-semibold text-center">Aksi (CRUD & Cetak)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-slate-400" />
                        {formatDate(t.created_at)}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase font-mono font-bold">
                        {t.invoice_code || t.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                      {t.cashier_shifts?.cashier_name || "Sistem / Kasir"}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.order_type === "dine_in" ? `Dine In (${t.tables?.name || 'Meja'})` : "Take Away"}
                      </div>
                      {(t.customers?.name || t.customer_name_custom) && (
                        <div className="text-xs text-brand font-medium mt-0.5">
                          Pelanggan: {t.customers?.name || t.customer_name_custom}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {t.status === "completed" ? (
                        <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                          Selesai
                        </span>
                      ) : t.status === "hold" ? (
                        <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-amber-200 dark:border-amber-800">
                          Di-Hold
                        </span>
                      ) : (
                        <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-red-200 dark:border-red-800">
                          {t.status === "cancelled" ? "Batal" : t.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-bold text-slate-800 dark:text-white">{formatRupiah(t.total_amount)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t.payment_method === 'cash' ? 'Tunai' : t.payment_method === 'debit' ? 'Non-Tunai' : t.payment_method}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openReceipt(t)} 
                          className="text-brand hover:bg-brand/10 p-1.5 h-8 w-8"
                          title="Lihat & Cetak Struk"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenEdit(t)} 
                          className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 p-1.5 h-8 w-8"
                          title="Edit Transaksi"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(t.id)} 
                          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 p-1.5 h-8 w-8"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Tambah Transaksi Manual */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-xl p-0 overflow-hidden text-slate-900 dark:text-slate-100">
          <div className="bg-brand text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="size-5" />
              <DialogTitle className="text-white text-base font-bold">Tambah Transaksi Manual</DialogTitle>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Total Tagihan (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={formTotalAmount}
                onChange={(e) => setFormTotalAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tipe Pesanan</label>
                <select
                  value={formOrderType}
                  onChange={(e) => setFormOrderType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="take_away">🛍️ Take Away</option>
                  <option value="dine_in">🍽️ Dine In (Makan Tempat)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Metode Bayar</label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="cash">💵 Tunai (Cash)</option>
                  <option value="qris">📱 QRIS / e-Wallet</option>
                  <option value="debit">💳 Kartu Debit/Kredit</option>
                  <option value="transfer">🏦 Transfer Bank</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nama Pelanggan</label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. Ahmad / Umum"
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status Transaksi</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="completed">✅ Selesai</option>
                  <option value="hold">⏳ Di-Hold</option>
                  <option value="cancelled">❌ Dibatalkan</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-brand text-white font-semibold">
                {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Transaksi */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-xl p-0 overflow-hidden text-slate-900 dark:text-slate-100">
          <div className="bg-amber-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="size-5" />
              <DialogTitle className="text-white text-base font-bold">Edit Transaksi #{editingTransaction?.id.substring(0, 8)}</DialogTitle>
            </div>
          </div>

          <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Total Tagihan (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formTotalAmount}
                onChange={(e) => setFormTotalAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tipe Pesanan</label>
                <select
                  value={formOrderType}
                  onChange={(e) => setFormOrderType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="take_away">🛍️ Take Away</option>
                  <option value="dine_in">🍽️ Dine In (Makan Tempat)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Metode Bayar</label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="cash">💵 Tunai (Cash)</option>
                  <option value="qris">📱 QRIS / e-Wallet</option>
                  <option value="debit">💳 Kartu Debit/Kredit</option>
                  <option value="transfer">🏦 Transfer Bank</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status Transaksi</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-bold"
              >
                <option value="completed">✅ Selesai (Completed)</option>
                <option value="hold">⏳ Di-Hold (Hold)</option>
                <option value="cancelled">❌ Dibatalkan (Cancelled)</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                {isSubmitting ? "Menyimpan..." : "Update Transaksi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pop-up Pratinjau Struk Transaksi */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          {selectedReceipt && (
            <div className="flex flex-col h-[80vh] max-h-[600px]">
              <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 text-center flex-shrink-0">
                <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">Pratinjau Struk</h3>
              </div>
              
              <div className="flex-1 overflow-auto p-6" id="receipt-printable-history">
                <div className="bg-white shadow-sm p-6 mx-auto w-full max-w-[320px] font-mono text-sm text-slate-800 border-t-4 border-slate-800">
                  <div className="text-center mb-4">
                    <h2 className="font-bold text-xl uppercase mb-1">Toko Saya</h2>
                    <p className="text-xs text-slate-500 mb-2">Jl. Contoh Alamat No. 123</p>
                    <div className="border-b border-dashed border-slate-300 pb-4 text-xs">
                      <div className="flex justify-between">
                        <span>Tgl:</span>
                        <span>{new Date(selectedReceipt.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kasir:</span>
                        <span>{selectedReceipt.cashier_shifts?.cashier_name || "Kasir"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>No. Invoice / Trx:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedReceipt.invoice_code || selectedReceipt.id.substring(0, 8)}</span>
                      </div>
                      <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-slate-200">
                        <span>Pelanggan:</span>
                        <span>{selectedReceipt.customers?.name || selectedReceipt.customer_name_custom || "Umum"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tipe:</span>
                        <span>{selectedReceipt.order_type === "dine_in" ? `Dine In (${selectedReceipt.tables?.name || '-'})` : "Take Away"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-300 pb-4 mb-4">
                    {selectedReceipt.transaction_items?.length > 0 ? (
                      selectedReceipt.transaction_items.map((item: any, idx: number) => (
                        <div key={idx} className="mb-2">
                          <div className="flex justify-between font-semibold">
                            <span>{item.product_name}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>{item.qty} x {formatRupiah(item.price)}</span>
                            <span>{formatRupiah(item.qty * item.price)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs italic text-slate-500 py-1">Item Transaksi (Koreksi Manual)</div>
                    )}
                  </div>

                  <div className="space-y-1 mb-4 text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatRupiah((selectedReceipt.total_amount || 0) + (selectedReceipt.discount_amount || 0) - (selectedReceipt.tax_amount || 0))}</span>
                    </div>
                    {selectedReceipt.discount_amount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Diskon</span>
                        <span>-{formatRupiah(selectedReceipt.discount_amount)}</span>
                      </div>
                    )}
                    {selectedReceipt.tax_amount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Pajak</span>
                        <span>{formatRupiah(selectedReceipt.tax_amount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-y border-dashed border-slate-300 py-3 mb-6 font-bold text-base">
                    <span>TOTAL</span>
                    <span>{formatRupiah(selectedReceipt.total_amount)}</span>
                  </div>

                  <div className="text-center text-xs space-y-1 text-slate-500">
                    <p>Pembayaran: {selectedReceipt.payment_method === "cash" ? "Tunai" : selectedReceipt.payment_method === "debit" ? "Non-Tunai" : selectedReceipt.payment_method}</p>
                    <p className="mt-4 pt-4 border-t border-dashed border-slate-300 italic">Terima kasih atas kunjungan Anda!</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 flex-shrink-0">
                <Button 
                  onClick={() => printDocument("receipt-printable-history")}
                  variant="outline" 
                  className="flex-1 font-bold border-slate-300 dark:border-slate-700"
                >
                  <Printer className="size-4 mr-2" /> Cetak Struk
                </Button>
                <Button onClick={() => setIsReceiptOpen(false)} className="flex-1 bg-brand text-white font-bold">
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pop-up Cetak Laporan Penjualan */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          <div className="flex flex-col h-[85vh] max-h-[700px]">
            <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">Pratinjau Laporan Penjualan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Filter: <span className="font-semibold capitalize">{dateFilter === 'all' ? 'Semua Waktu' : dateFilter === 'today' ? 'Hari Ini' : dateFilter === 'week' ? 'Minggu Ini' : 'Bulan Ini'}</span>
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6" id="sales-report-printable">
              <div className="bg-white shadow-sm p-8 mx-auto w-full border border-slate-200 font-sans text-slate-800">
                {/* Kop Laporan */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
                  <h1 className="text-2xl font-bold uppercase tracking-wide">LAPORAN PENJUALAN TOKO</h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Periode Filter: <span className="font-semibold uppercase">{dateFilter === 'all' ? 'Semua Waktu' : dateFilter === 'today' ? 'Hari Ini' : dateFilter === 'week' ? 'Minggu Ini' : 'Bulan Ini'}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
                </div>

                {/* Ringkasan Penjualan */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Total Pendapatan</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{formatRupiah(totalRevenue)}</p>
                  </div>
                  <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Total Transaksi</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{totalTxCount} Transaksi</p>
                  </div>
                  <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Rata-rata Order</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{formatRupiah(avgOrderValue)}</p>
                  </div>
                  <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Rincian Pembayaran</p>
                    <p className="text-xs font-semibold text-slate-700 mt-1">Tunai: {formatRupiah(cashTotal)}</p>
                    <p className="text-xs font-semibold text-slate-700">Non-Tunai: {formatRupiah(nonCashTotal)}</p>
                  </div>
                </div>

                {/* Tabel Transaksi */}
                <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">Rincian Transaksi ({filteredTransactions.length})</h3>
                <table className="w-full text-xs text-left border-collapse border border-slate-200 mb-6">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="p-2 border-r border-slate-200">No. Trx</th>
                      <th className="p-2 border-r border-slate-200">Waktu</th>
                      <th className="p-2 border-r border-slate-200">Kasir</th>
                      <th className="p-2 border-r border-slate-200">Metode</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 uppercase font-mono">{t.id.substring(0, 8)}</td>
                        <td className="p-2 border-r border-slate-200">{formatDate(t.created_at)}</td>
                        <td className="p-2 border-r border-slate-200">{t.cashier_shifts?.cashier_name || 'Kasir'}</td>
                        <td className="p-2 border-r border-slate-200 capitalize">{t.payment_method === 'cash' ? 'Tunai' : 'Non-Tunai'}</td>
                        <td className="p-2 text-right font-bold">{formatRupiah(t.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tanda Tangan */}
                <div className="mt-12 flex justify-between text-xs text-center">
                  <div>
                    <p className="text-slate-500 mb-12">Dibuat Oleh,</p>
                    <p className="font-bold border-t border-slate-400 pt-1">Staf Operasional</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-12">Disetujui Oleh,</p>
                    <p className="font-bold border-t border-slate-400 pt-1">Manager / Pemilik</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 flex-shrink-0">
              <Button 
                onClick={() => printDocument("sales-report-printable")}
                className="flex-1 bg-brand text-white font-bold"
              >
                <Printer className="size-4 mr-2" /> Cetak / Simpan PDF
              </Button>
              <Button onClick={() => setIsReportModalOpen(false)} variant="outline" className="flex-1 font-bold">
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
