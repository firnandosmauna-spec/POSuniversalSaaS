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
  Trash2,
  RefreshCw,
  Package,
  Wallet
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
  const { user, activeBranchId, activeBranchName, branches } = useAuth();
  const [reportBranchId, setReportBranchId] = useState<string>("all");
  const [showMobileTable, setShowMobileTable] = useState(false);

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

  // Filter Modal State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "hold" | "cancelled">("all");
  const [filterPayment, setFilterPayment] = useState<"all" | "cash" | "qris" | "non_cash">("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const fetchTransactions = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          transaction_items(
            *,
            products(category, stock, name, price)
          )
        `)
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase transaction query warning:", error.message);
      }
      
      let fetchedTransactions = data || [];

      // Merge with localStorage transactions (offline/fallback POS transactions)
      try {
        const saved = localStorage.getItem(`pos_transactions_${user.id}`);
        if (saved) {
          const localTrx = JSON.parse(saved);
          const existingIds = new Set(fetchedTransactions.map((o: any) => o.id));
          const newLocalTrx = localTrx.filter((lt: any) => !existingIds.has(lt.id));
          fetchedTransactions = [...newLocalTrx, ...fetchedTransactions];
          fetchedTransactions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (e) {
        console.error("Failed to merge local transactions", e);
      }

      setTransactions(fetchedTransactions);
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

  const formatShortDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
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

    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    
    if (filterPayment !== "all") {
      if (filterPayment === "cash" && t.payment_method !== "cash") return false;
      if (filterPayment === "qris" && t.payment_method !== "qris") return false;
      if (filterPayment === "non_cash" && (t.payment_method === "cash" || t.payment_method === "qris")) return false;
    }

    const matchesBranch = 
      !reportBranchId ||
      reportBranchId === "all" ||
      t.branch_id === reportBranchId ||
      t.branchId === reportBranchId ||
      t.branch_name === (branches?.find(b => b.id === reportBranchId)?.name || activeBranchName) ||
      (!t.branch_id && !t.branchId && reportBranchId?.startsWith("main"));

    if (!matchesBranch) return false;

    const trxDate = new Date(t.created_at);
    if (dateFilter === "today") return isToday(trxDate);
    if (dateFilter === "yesterday") return isYesterday(trxDate);
    if (dateFilter === "week") return isThisWeek(trxDate);
    if (dateFilter === "month") return isLast1Month(trxDate);
    if (dateFilter === "custom") return isInCustomRange(trxDate);

    return true;
  });

  // Calculations for report
  let netSales = 0;
  let cashTotal = 0;
  let nonCashTotal = 0;

  filteredTransactions.forEach(t => {
    const amount = Number(t.total_amount) || 0;
    
    if (t.status !== "cancelled") {
      netSales += amount;
      if (t.payment_method === 'cash') cashTotal += amount;
      else nonCashTotal += amount;
    }
  });

  // Product Report Calculation
  const productSalesMap: Record<string, { name: string; price: number; qty: number; stock: number; revenue: number; category: string }> = {};

  filteredTransactions.forEach(t => {
    if (t.status === "cancelled") return;

    const items = t.transaction_items || t.items || [];
    items.forEach((item: any) => {
      const pName = item.product_name || item.products?.name || item.name || "Unknown Product";
      const pPrice = item.price || item.products?.price || 0;
      const pCategory = item.products?.category || "Lainnya";
      const qty = item.qty || item.quantity || 0;
      const stock = item.products?.stock ?? "-";
      const revenue = qty * pPrice;

      if (!productSalesMap[pName]) {
        productSalesMap[pName] = { name: pName, price: pPrice, qty: 0, stock: (stock as number), revenue: 0, category: pCategory };
      }
      
      productSalesMap[pName].qty += qty;
      productSalesMap[pName].revenue += revenue;
      if (item.products?.stock !== undefined) {
          productSalesMap[pName].stock = item.products.stock;
      }
    });
  });

  const productReportData = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty);

  // Group top products by category for the report
  const topProductsByCategory: Record<string, typeof productReportData> = {};
  productReportData.forEach(p => {
    if (!topProductsByCategory[p.category]) {
      topProductsByCategory[p.category] = [];
    }
    topProductsByCategory[p.category].push(p);
  });

  const totalTxCount = filteredTransactions.filter(t => t.status !== 'cancelled').length;
  const totalRevenue = netSales;
  const avgOrderValue = totalTxCount > 0 ? totalRevenue / totalTxCount : 0;

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
      id: crypto.randomUUID(),
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
    <div className="p-0 md:p-6 pb-24 md:pb-6 h-full flex flex-col overflow-y-auto bg-white md:bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header & Controls (Desktop Only) */}
      <div className="hidden md:flex mb-4 md:mb-6 flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 px-4 md:px-0 pt-4 md:pt-0">
        <div>
          <h1 className="font-display text-lg md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5 md:gap-2">
            <Receipt className="size-5 md:size-7 text-brand" /> {
              (user?.businessType as string) === "PRINTING"
                ? "SPK & Riwayat Cetak Percetakan"
                : user?.businessType === "LAUNDRY"
                ? "Riwayat Transaksi & Nota Laundry"
                : user?.businessType === "RETAIL" || user?.businessType === "GROCERY"
                ? "Laporan Transaksi Penjualan Retail"
                : "Laporan & Riwayat Penjualan"
            }
          </h1>
          <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 mt-0.5 md:mt-1 hidden md:block">
            {(user?.businessType as string) === "PRINTING"
              ? "Kelola SPK job order, pembayaran DP/Lunas, dan riwayat transaksi percetakan."
              : user?.businessType === "LAUNDRY"
              ? "Kelola nota penerimaan laundry, status pengerjaan pakaian, & riwayat transaksi."
              : "Kelola transaksi, filter periode penjualan, dan cetak struk/laporan resmi."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#0b172a] hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 md:gap-2 shadow-md rounded-xl text-[10px] md:text-sm h-9 md:h-11 px-3 md:px-5"
          >
            <Plus className="size-3 md:size-4" /> Tambah Transaksi
          </Button>
        </div>
      </div>

      {/* Filter Waktu & Search Bar */}
      <div className="mb-2 md:mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 bg-white dark:bg-slate-900 p-4 rounded-none md:rounded-xl md:border border-slate-100 dark:border-slate-800 shadow-none md:shadow-sm">
        <div className="flex flex-col w-full gap-3">
          
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-medium md:hidden">Outlet</span>
            <div className="flex items-center gap-2">
              <select 
                value={reportBranchId} 
                onChange={(e) => setReportBranchId(e.target.value)}
                className="appearance-none bg-transparent font-extrabold text-slate-700 text-sm focus:outline-none pr-4 bg-no-repeat"
                style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')", backgroundPosition: "right center", backgroundSize: "10px" }}
              >
                <option value="all">Semua Outlet</option>
                {branches?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-row justify-between w-full">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 md:pb-0 flex-1">
              <div className="shrink-0 relative flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-medium w-auto cursor-pointer">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span>{startDate ? formatShortDate(startDate) : "Mulai"}</span>
                  <span className="text-slate-400 font-normal">-</span>
                  <span>{endDate ? formatShortDate(endDate) : "Akhir"}</span>
                </div>
                <Calendar className="size-3.5 text-slate-600 ml-2" />
                
                {/* Invisible native inputs to handle clicks on mobile */}
                <div className="absolute inset-0 flex opacity-0 cursor-pointer">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateFilter("custom");
                    }}
                    className="w-1/2 h-full cursor-pointer"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateFilter("custom");
                    }}
                    className="w-1/2 h-full cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={() => setDateFilter("today")}
                className={`shrink-0 px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  dateFilter === "today" 
                    ? "bg-[#0b172a] border-[#0b172a] text-white" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Hari ini
              </button>
              <button
                onClick={() => setDateFilter("yesterday")}
                className={`shrink-0 px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  dateFilter === "yesterday" 
                    ? "bg-[#0b172a] border-[#0b172a] text-white" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Kemarin
              </button>
              <button
                onClick={() => setDateFilter("month")}
                className={`shrink-0 px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  dateFilter === "month" 
                    ? "bg-[#0b172a] border-[#0b172a] text-white" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                1 Bulan
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Table Container (Always visible now) */}
      <div className="flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex-1 flex-col overflow-hidden min-h-[300px]">
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
            <div className="w-full pb-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 p-3">
                {filteredTransactions.map(t => (
                  <div key={t.id} onClick={() => openReceipt(t)} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col relative overflow-hidden group">
                    {/* Status Ribbon (Decorative) */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      t.status === "completed" ? "bg-emerald-500" : 
                      t.status === "hold" ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    
                    <div className="flex justify-between items-start mb-4 pl-2">
                       <div className="flex flex-col">
                         <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-sm group-hover:text-brand transition-colors">
                            <Calendar className="size-4 text-slate-400" /> {formatDate(t.created_at)}
                         </div>
                         <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 font-semibold flex items-center gap-1">
                            <Receipt className="size-3" /> {t.invoice_code || t.id.substring(0, 8).toUpperCase()}
                         </div>
                       </div>
                       <div>
                          {t.status === "completed" ? (
                            <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800/50 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">Lunas</span>
                          ) : t.status === "hold" ? (
                            <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-1 rounded border border-amber-200 dark:border-amber-800/50 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">Di-Hold</span>
                          ) : (
                            <span className="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 px-2 py-1 rounded border border-red-200 dark:border-red-800/50 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">Batal</span>
                          )}
                       </div>
                    </div>

                    <div className="flex justify-between items-center mb-4 pl-2">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Pelanggan</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                            {t.customers?.name || t.customer_name_custom || "-"}
                          </span>
                       </div>
                       <div className="flex flex-col text-right">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Pesanan</span>
                          <span className="text-sm font-bold text-brand bg-brand/5 px-2 py-0.5 rounded-md inline-block">
                            {t.order_type === "dine_in" ? `Meja ${t.tables?.name || ''}` : t.order_type === "delivery" ? "Delivery" : "Takeaway"}
                          </span>
                       </div>
                    </div>

                    {/* Products List */}
                    <div className="mb-4 pl-2">
                       <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1 block">Produk</span>
                       <div className="space-y-1 mt-1 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                         {(t.transaction_items || t.items || []).map((item: any, idx: number) => (
                           <div key={idx} className="flex justify-between text-[11px] border-b border-dashed border-slate-100 dark:border-slate-700/50 pb-1.5 pt-1 last:border-0 last:pb-0">
                             <div className="flex gap-1.5 overflow-hidden">
                               <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">{item.qty || item.quantity || 1}x</span>
                               <span className="text-slate-600 dark:text-slate-400 truncate">{item.product_name || item.products?.name || item.name || "Produk"}</span>
                             </div>
                             <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 pl-2">
                               {formatRupiah((item.qty || item.quantity || 1) * (item.price || 0))}
                             </span>
                           </div>
                         ))}
                       </div>
                    </div>

                    <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 pl-2">
                       <div className="flex flex-col">
                         <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Total Belanja</span>
                         <div className="flex items-end gap-1.5">
                           <span className="text-lg font-extrabold text-[#0b172a] dark:text-white leading-none">
                              {formatRupiah(t.total_amount)}
                           </span>
                           <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 rounded uppercase">
                              {t.payment_method === 'cash' ? 'CASH' : t.payment_method === 'qris' ? 'QRIS' : t.payment_method === 'debit' ? 'CARD' : 'TRF'}
                           </span>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-1">
                         <Button 
                            variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openReceipt(t); }} 
                            className="h-8 w-8 text-brand hover:bg-brand/10 hover:text-brand bg-slate-50 dark:bg-slate-800/50"
                            title="Lihat Struk"
                         >
                            <Eye className="size-4" />
                         </Button>
                         <Button 
                            variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }} 
                            className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 bg-slate-50 dark:bg-slate-800/50"
                            title="Edit"
                         >
                            <Pencil className="size-4" />
                         </Button>
                         <Button 
                            variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} 
                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 bg-slate-50 dark:bg-slate-800/50"
                            title="Hapus"
                         >
                            <Trash2 className="size-4" />
                         </Button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-white overflow-hidden rounded-t-2xl sm:rounded-2xl absolute bottom-0 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 border-0 sm:border w-full shadow-2xl">
          <div className="flex justify-between items-center p-4 border-b border-slate-100">
            <DialogTitle className="font-bold text-lg text-slate-800">Filter</DialogTitle>
          </div>
          <div className="p-5 space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 mb-3 text-sm">Status</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${filterStatus === 'all' ? 'bg-[#0b172a] text-white border-[#0b172a]' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  Semua Status
                </button>
                <button 
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${filterStatus === 'completed' ? 'bg-[#0b172a] text-white border-[#0b172a]' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  Lunas
                </button>
                <button 
                  onClick={() => setFilterStatus('refund')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${filterStatus === 'refund' ? 'bg-[#0b172a] text-white border-[#0b172a]' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  Refund
                </button>
                <button 
                  onClick={() => setFilterStatus('cancelled')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${filterStatus === 'cancelled' ? 'bg-[#0b172a] text-white border-[#0b172a]' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  Batal
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-3 text-sm">Metode Pembayaran</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`size-5 rounded-full border-2 flex items-center justify-center ${filterPayment === 'all' ? 'border-blue-600' : 'border-slate-300'}`}>
                    {filterPayment === 'all' && <div className="size-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <span className="text-slate-700 text-sm">Semua Metode</span>
                  <input type="radio" className="hidden" checked={filterPayment === 'all'} onChange={() => setFilterPayment('all')} />
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`size-5 rounded-full border-2 flex items-center justify-center ${filterPayment === 'cash' ? 'border-blue-600' : 'border-slate-300'}`}>
                    {filterPayment === 'cash' && <div className="size-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <span className="text-slate-700 text-sm">Tunai</span>
                  <input type="radio" className="hidden" checked={filterPayment === 'cash'} onChange={() => setFilterPayment('cash')} />
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`size-5 rounded-full border-2 flex items-center justify-center ${filterPayment === 'qris' ? 'border-blue-600' : 'border-slate-300'}`}>
                    {filterPayment === 'qris' && <div className="size-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <span className="text-slate-700 text-sm">QRIS POST.</span>
                  <input type="radio" className="hidden" checked={filterPayment === 'qris'} onChange={() => setFilterPayment('qris')} />
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`size-5 rounded-full border-2 flex items-center justify-center ${filterPayment === 'non_cash' ? 'border-blue-600' : 'border-slate-300'}`}>
                    {filterPayment === 'non_cash' && <div className="size-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <span className="text-slate-700 text-sm">Non-Tunai</span>
                  <input type="radio" className="hidden" checked={filterPayment === 'non_cash'} onChange={() => setFilterPayment('non_cash')} />
                </label>
              </div>
            </div>
            
            <div className="pt-2">
              <Button onClick={() => setIsFilterModalOpen(false)} className="w-full bg-[#0b172a] hover:bg-slate-800 text-white font-bold h-12 rounded-lg">
                SIMPAN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Transaksi Manual */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl p-0 overflow-hidden text-slate-900 dark:text-slate-100 border-0 shadow-2xl">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Plus className="size-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Catat Transaksi Manual</DialogTitle>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="p-5 space-y-5 bg-slate-50/50 dark:bg-slate-900">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                Total Tagihan (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={formTotalAmount}
                onChange={(e) => setFormTotalAmount(e.target.value)}
                className="w-full px-3 h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Tipe Pesanan</label>
                <select
                  value={formOrderType}
                  onChange={(e) => setFormOrderType(e.target.value as any)}
                  className="w-full px-3 h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="take_away">🛍️ Bawa Pulang (Take Away)</option>
                  <option value="dine_in">🍽️ Makan di Tempat (Dine In)</option>
                  <option value="delivery">🛵 Pesan Antar (Delivery)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Metode Bayar</label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="w-full px-3 h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="cash">💵 Tunai (Cash)</option>
                  <option value="qris">📱 QRIS/e-Wallet</option>
                  <option value="debit">💳 Kartu Debit/Kredit</option>
                  <option value="transfer">🏦 Transfer Bank</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Nama Pelanggan</label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. Ahmad"
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                  className="w-full px-3 h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="completed">✅ Selesai</option>
                  <option value="hold">⏳ Di-Hold</option>
                  <option value="cancelled">❌ Dibatalkan</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-3 sm:justify-center">
              <Button type="button" variant="outline" className="flex-1 rounded-xl h-11 font-bold" onClick={() => setIsCreateModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#0b172a] hover:bg-slate-800 text-white font-bold rounded-xl h-11 shadow-md">
                {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Transaksi */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl p-0 overflow-hidden text-slate-900 dark:text-slate-100 border-0 shadow-2xl">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center">
                <Pencil className="size-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Edit Transaksi #{editingTransaction?.id.substring(0, 8)}</DialogTitle>
            </div>
          </div>

          <form onSubmit={handleEditSubmit} className="p-5 space-y-5 bg-slate-50/50 dark:bg-slate-900">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                Total Tagihan (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formTotalAmount}
                onChange={(e) => setFormTotalAmount(e.target.value)}
                className="w-full px-3 h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Tipe Pesanan</label>
                <select
                  value={formOrderType}
                  onChange={(e) => setFormOrderType(e.target.value as any)}
                  className="w-full px-3 h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="take_away">🛍️ Bawa Pulang (Take Away)</option>
                  <option value="dine_in">🍽️ Makan di Tempat (Dine In)</option>
                  <option value="delivery">🛵 Pesan Antar (Delivery)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Metode Bayar</label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="w-full px-3 h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="cash">💵 Tunai (Cash)</option>
                  <option value="qris">📱 QRIS/e-Wallet</option>
                  <option value="debit">💳 Kartu Debit/Kredit</option>
                  <option value="transfer">🏦 Transfer Bank</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 h-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="completed">✅ Selesai</option>
                <option value="hold">⏳ Di-Hold</option>
                <option value="cancelled">❌ Dibatalkan</option>
              </select>
            </div>

            <DialogFooter className="pt-4 flex gap-3 sm:justify-center">
              <Button type="button" variant="outline" className="flex-1 rounded-xl h-11 font-bold" onClick={() => setIsEditModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#0b172a] hover:bg-slate-800 text-white font-bold rounded-xl h-11 shadow-md">
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
                        <span>{selectedReceipt.order_type === "dine_in" ? `Makan di Tempat (${selectedReceipt.tables?.name || '-'})` : selectedReceipt.order_type === "delivery" ? "Pesan Antar" : "Bawa Pulang"}</span>
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

                {/* Tabel Produk Terjual Per Kategori */}
                <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">Rincian Penjualan Produk Terlaris</h3>
                
                {Object.entries(topProductsByCategory).map(([category, products]) => (
                  <div key={category} className="mb-6">
                    <div className="bg-slate-800 text-white text-xs font-bold uppercase px-3 py-1.5 inline-block mb-2">
                      Kategori: {category}
                    </div>
                    <table className="w-full text-xs text-left border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                          <th className="p-2 border-r border-slate-200">Produk</th>
                          <th className="p-2 border-r border-slate-200 text-right w-24">Harga</th>
                          <th className="p-2 border-r border-slate-200 text-center w-20">Jumlah</th>
                          <th className="p-2 border-r border-slate-200 text-center w-20">Stok</th>
                          <th className="p-2 text-right w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p, idx) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 uppercase font-semibold">{p.name}</td>
                            <td className="p-2 border-r border-slate-200 text-right">{formatRupiah(p.price)}</td>
                            <td className="p-2 border-r border-slate-200 text-center font-bold">{p.qty}</td>
                            <td className="p-2 border-r border-slate-200 text-center font-mono">{p.stock}</td>
                            <td className="p-2 text-right font-bold">{formatRupiah(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

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
