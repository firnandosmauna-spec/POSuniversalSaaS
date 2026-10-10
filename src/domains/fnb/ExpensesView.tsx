import { useState, useEffect } from "react";
import {
  Wallet,
  Receipt,
  Plus,
  Trash2,
  Pencil,
  Search,
  Calendar,
  Printer,
  Loader2,
  TrendingDown,
  ShoppingBag,
  Tag,
  AlertCircle,
  FileX,
  ChevronDown,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";

type ExpenseItem = {
  id: string;
  created_at: string;
  title: string;
  category: string;
  amount: number;
  payment_method: string;
  staff_name: string;
  notes?: string;
  invoice_code?: string;
};

const DEFAULT_EXPENSE_CATEGORIES = [
  "Bahan Baku & Bumbu",
  "Operasional & Peralatan",
  "Kebersihan & Sanitasi",
  "Listrik, Air, Gas & Internet",
  "Transportasi & Pengiriman",
  "Gaji & Bonus Staf",
  "Lain-lain",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Bahan Baku & Bumbu": "bg-orange-100 text-orange-800 border-orange-200",
  "Operasional & Peralatan": "bg-blue-100 text-blue-800 border-blue-200",
  "Kebersihan & Sanitasi": "bg-teal-100 text-teal-800 border-teal-200",
  "Listrik, Air, Gas & Internet": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Transportasi & Pengiriman": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Gaji & Bonus Staf": "bg-green-100 text-green-800 border-green-200",
  "Lain-lain": "bg-slate-100 text-slate-700 border-slate-200",
};

export function ExpensesView() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "month" | "custom" | "all">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Bahan Baku & Bumbu");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Kas Laci (Petty Cash)");
  const [staffName, setStaffName] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceCode, setInvoiceCode] = useState("");

  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    try {
      const savedCats = localStorage.getItem("pos_expense_categories");
      if (savedCats) {
        setCategories(JSON.parse(savedCats));
      } else {
        localStorage.setItem("pos_expense_categories", JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) return;
    const updated = [...categories, newCategoryName.trim()];
    setCategories(updated);
    localStorage.setItem("pos_expense_categories", JSON.stringify(updated));
    setNewCategoryName("");
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (categories.length <= 1) return; // minimal 1 category
    const updated = categories.filter(c => c !== catToRemove);
    setCategories(updated);
    localStorage.setItem("pos_expense_categories", JSON.stringify(updated));
    
    // Update states if active
    if (selectedCategory === catToRemove) setSelectedCategory("all");
    if (category === catToRemove) setCategory(updated[0]);
  };

  const getLocalExpenses = (): ExpenseItem[] => {
    try {
      const saved = localStorage.getItem("pos_store_expenses");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveLocalExpenses = (items: ExpenseItem[]) => {
    try {
      localStorage.setItem("pos_store_expenses", JSON.stringify(items));
    } catch {}
  };

  const fetchExpenses = async () => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("store_expenses")
        .select("*")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        const localItems = getLocalExpenses();
        setExpenses(localItems);
        if (localItems.length === 0) setFetchError("Koneksi database gagal. Data lokal ditampilkan.");
      } else {
        setExpenses(data || []);
        saveLocalExpenses(data || []);
      }
    } catch {
      const localItems = getLocalExpenses();
      setExpenses(localItems);
      setFetchError("Gagal terhubung ke server. Menampilkan data tersimpan lokal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const handleOpenForm = (item?: ExpenseItem) => {
    if (item) {
      setEditingExpense(item);
      setTitle(item.title);
      setCategory(item.category);
      setAmount(item.amount.toString());
      setPaymentMethod(item.payment_method);
      setStaffName(item.staff_name);
      setNotes(item.notes || "");
      setInvoiceCode(item.invoice_code || "");
    } else {
      setEditingExpense(null);
      setTitle("");
      setCategory(EXPENSE_CATEGORIES[0] || "Bahan Baku & Bumbu");
      setAmount("");
      setPaymentMethod("Kas Laci (Petty Cash)");
      setStaffName(user?.name || "");
      setNotes("");
      setInvoiceCode("");
    }
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !amount) return;

    setIsSubmitting(true);
    const numAmount = parseFloat(amount) || 0;

    const newItem: ExpenseItem = {
      id: editingExpense?.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: editingExpense?.created_at || new Date().toISOString(),
      title: title.trim(),
      category,
      amount: numAmount,
      payment_method: paymentMethod,
      staff_name: staffName.trim() || user.name,
      notes: notes.trim(),
      invoice_code: invoiceCode.trim(),
    };

    try {
      if (editingExpense) {
        await supabase.from("store_expenses").update({
          title: newItem.title,
          category: newItem.category,
          amount: newItem.amount,
          payment_method: newItem.payment_method,
          staff_name: newItem.staff_name,
          notes: newItem.notes,
          invoice_code: newItem.invoice_code,
        }).eq("id", editingExpense.id);
      } else {
        await supabase.from("store_expenses").insert([{ ...newItem, tenant_id: user.id }]);
      }
    } catch (e) {
      console.error("DB error, fallback local storage:", e);
    }

    const localCurrent = getLocalExpenses();
    const updatedLocal: ExpenseItem[] = editingExpense
      ? localCurrent.map((i) => (i.id === editingExpense.id ? newItem : i))
      : [newItem, ...localCurrent];
    saveLocalExpenses(updatedLocal);
    setExpenses((prev) =>
      editingExpense ? prev.map((i) => (i.id === editingExpense.id ? newItem : i)) : [newItem, ...prev]
    );

    setIsSubmitting(false);
    setIsFormModalOpen(false);
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;
    try {
      await supabase.from("store_expenses").delete().eq("id", id);
    } catch {}
    const updated = expenses.filter((i) => i.id !== id);
    setExpenses(updated);
    saveLocalExpenses(updated);
  };

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const isYesterday = (dateStr: string) => {
    const d = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
  };

  const isLast1Month = (dateStr: string) => {
    const d = new Date(dateStr);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    return d >= oneMonthAgo;
  };

  const isInCustomRange = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
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

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.title.toLowerCase().includes(search.toLowerCase()) ||
      exp.category.toLowerCase().includes(search.toLowerCase()) ||
      exp.staff_name.toLowerCase().includes(search.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedCategory !== "all" && exp.category !== selectedCategory) return false;
    if (dateFilter === "today") return isToday(exp.created_at);
    if (dateFilter === "yesterday") return isYesterday(exp.created_at);
    if (dateFilter === "month") return isLast1Month(exp.created_at);
    if (dateFilter === "custom") return isInCustomRange(exp.created_at);
    return true;
  });

  const totalAmount = filteredExpenses.reduce((sum, i) => sum + i.amount, 0);
  const totalCount = filteredExpenses.length;

  const categoryTotals: Record<string, number> = {};
  filteredExpenses.forEach((i) => {
    categoryTotals[i.category] = (categoryTotals[i.category] || 0) + i.amount;
  });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const DATE_FILTER_LABELS: Record<string, string> = {
    today: "Hari Ini",
    yesterday: "Kemarin",
    month: "30 Hari",
    custom: "Rentang Khusus",
    all: "Semua Data",
  };

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const printDocument = (elementId: string) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <div className="p-2 md:p-4 h-full flex flex-col gap-2 md:gap-3 overflow-y-auto">

      {/* Header: judul besar + aksi utama di satu baris */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 md:gap-3">
        <div>
          <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
            <div className="size-6 md:size-8 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center rounded-xl shadow-sm">
              <TrendingDown className="size-3.5 md:size-4" />
            </div>
            <h1 className="font-display text-lg md:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
              Pengeluaran Toko
            </h1>
          </div>
          <p className="text-[9px] md:text-xs text-slate-500 dark:text-slate-400 pl-8 md:pl-10 hidden md:block">
            Catat pembelian bahan baku, biaya operasional, dan cetak laporan.
          </p>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <Button
            onClick={() => setIsReportModalOpen(true)}
            variant="outline"
            className="border-slate-200 dark:border-slate-800 text-[9px] md:text-xs font-semibold h-8 md:h-9 gap-1 md:gap-1.5 px-2 md:px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
          >
            <Printer className="size-3 md:size-3.5" /> Cetak Laporan
          </Button>
          <Button
            onClick={() => handleOpenForm()}
            className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] md:text-xs font-bold h-8 md:h-9 gap-1 md:gap-1.5 px-2 md:px-4 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="size-3 md:size-3.5" /> Catat Belanja
          </Button>
        </div>
      </div>

      {/* Error Banner (hanya muncul saat ada masalah fetch) */}
      {fetchError && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-none text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Ringkasan 3 metrik - Modern Minimalist */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
        {/* Metrik utama: total pengeluaran */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-rose-500 to-rose-600 text-white p-3 md:p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 size-16 bg-white/10 rounded-full blur-xl"></div>
          <p className="text-[9px] md:text-xs font-semibold text-rose-100 uppercase tracking-wider relative z-10">Total Pengeluaran</p>
          <div className="mt-1 md:mt-2 relative z-10">
            <p className="text-xl md:text-2xl font-black leading-none">{formatRupiah(totalAmount)}</p>
            <p className="text-[8px] md:text-[10px] text-rose-200 mt-1 font-medium bg-rose-700/30 self-start inline-flex px-1.5 py-0.5 rounded-md">{DATE_FILTER_LABELS[dateFilter]}</p>
          </div>
        </div>

        {/* Metrik pendukung: jumlah transaksi */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 md:p-4 rounded-2xl flex flex-col justify-center shadow-sm">
          <p className="text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">Jumlah Transaksi</p>
          <p className="text-lg md:text-xl font-black text-slate-800 dark:text-white mt-1 leading-none">{totalCount}</p>
          <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">catatan belanja</p>
        </div>

        {/* Metrik pendukung: kategori terbesar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 md:p-4 rounded-2xl flex flex-col justify-center shadow-sm">
          <p className="text-[9px] md:text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">Pengeluaran Terbesar</p>
          {topCategory ? (
            <div className="mt-1">
              <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-white leading-tight truncate">{topCategory[0]}</p>
              <p className="text-[9px] md:text-[11px] font-mono font-bold text-rose-500 dark:text-rose-400 mt-0.5">{formatRupiah(topCategory[1])}</p>
            </div>
          ) : (
            <p className="text-[9px] md:text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Belum ada data</p>
          )}
        </div>
      </div>

      {/* Filter bar: periode + kategori + search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 md:p-2.5 flex flex-col lg:flex-row gap-2 rounded-2xl shadow-sm">

        {/* Periode */}
        <div className="flex items-center gap-1 flex-wrap">
          {(["today", "yesterday", "month", "custom", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-2.5 py-1 md:px-3 md:py-1.5 text-[9px] md:text-xs font-semibold rounded-lg transition-all border ${
                dateFilter === f
                  ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {DATE_FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Rentang khusus */}
        {dateFilter === "custom" && (
          <div className="flex items-center gap-1.5 mt-0.5 lg:mt-0">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Tanggal mulai"
              className="px-2 py-1 text-[9px] md:text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50"
            />
            <span className="text-[9px] md:text-[10px] text-slate-400 font-semibold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Tanggal akhir"
              className="px-2 py-1 text-[9px] md:text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50"
            />
          </div>
        )}

        {/* Spacer */}
        <div className="hidden lg:block flex-1" />

        {/* Kategori + Search */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Drawer>
            <DrawerTrigger asChild>
              <button
                className="flex items-center justify-between gap-1.5 px-2.5 py-1 text-[10px] md:text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all cursor-pointer shadow-sm hover:bg-slate-50"
              >
                <span className="truncate max-w-[120px]">{selectedCategory === 'all' ? 'Semua Kategori' : selectedCategory}</span>
                <ChevronDown className="size-3 opacity-50" />
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="mx-auto w-full max-w-md">
                <DrawerHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <DrawerTitle className="text-center font-bold text-slate-800 dark:text-slate-200">Filter Kategori</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                  <DrawerClose asChild>
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`flex items-center justify-between w-full p-3 rounded-xl border transition-all ${selectedCategory === 'all' ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}
                    >
                      <span className="font-semibold text-sm">Semua Kategori</span>
                      {selectedCategory === 'all' && <Check className="size-4" />}
                    </button>
                  </DrawerClose>
                  {categories.map((cat) => (
                    <DrawerClose asChild key={cat}>
                      <button
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex items-center justify-between w-full p-3 rounded-xl border transition-all ${selectedCategory === cat ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}
                      >
                        <span className="font-semibold text-sm">{cat}</span>
                        {selectedCategory === cat && <Check className="size-4" />}
                      </button>
                    </DrawerClose>
                  ))}
                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setIsManageCategoriesOpen(true)}
                      className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-300 transition-all font-semibold text-sm"
                    >
                      <Plus className="size-4" />
                      Kelola Kategori
                    </button>
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          <div className="relative w-full sm:w-auto mt-1 sm:mt-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-2 py-1 text-[10px] md:text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-rose-500/50 rounded-lg transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabel / State area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex-1 flex flex-col overflow-hidden min-h-[250px] rounded-2xl shadow-sm">

        {isLoading ? (
          /* Loading State */
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20 text-slate-400 dark:text-slate-600">
            <Loader2 className="size-7 animate-spin text-rose-500" />
            <p className="text-sm">Memuat catatan pengeluaran...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          /* Empty State: beda pesan untuk "kosong total" vs "hasil filter kosong" */
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20 text-slate-400 dark:text-slate-600">
            {expenses.length === 0 ? (
              <>
                <Wallet className="size-10 opacity-30" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Belum ada pengeluaran dicatat</p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Gunakan tombol "Catat Belanja" untuk mencatat pengeluaran pertama.</p>
                </div>
                <Button
                  onClick={() => handleOpenForm()}
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 rounded-none mt-1"
                >
                  <Plus className="size-3.5" /> Catat Belanja Pertama
                </Button>
              </>
            ) : (
              <>
                <FileX className="size-10 opacity-30" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Tidak ada catatan sesuai filter</p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                    Coba ubah periode, kategori, atau kata pencarian.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-[9px] md:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 sticky top-0 font-bold">
                <tr>
                  <th className="p-1.5 md:p-3">Waktu</th>
                  <th className="p-1.5 md:p-3">Kebutuhan Toko</th>
                  <th className="p-1.5 md:p-3">Kategori</th>
                  <th className="p-1.5 md:p-3 hidden sm:table-cell">Sumber Dana</th>
                  <th className="p-1.5 md:p-3 hidden sm:table-cell">Staf</th>
                  <th className="p-1.5 md:p-3 text-right">Nominal</th>
                  <th className="p-1.5 md:p-3 w-12 md:w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors"
                  >
                    <td className="p-1.5 md:p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <Calendar className="size-2.5 md:size-3 text-slate-300 dark:text-slate-600" />
                        {formatDate(item.created_at)}
                      </div>
                    </td>
                    <td className="p-1.5 md:p-3">
                      <p className="font-semibold text-slate-900 dark:text-white text-[9px] md:text-sm">{item.title}</p>
                      {item.invoice_code && (
                        <p className="text-[8px] md:text-xs text-brand font-mono font-bold mt-0.5">
                          #{item.invoice_code}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[8px] md:text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">
                          {item.notes}
                        </p>
                      )}
                      <div className="sm:hidden mt-0.5 text-[8px] text-slate-400 flex flex-col gap-0.5">
                        <span>Oleh: {item.staff_name}</span>
                        <span>Via: {item.payment_method}</span>
                      </div>
                    </td>
                    <td className="p-1.5 md:p-3">
                      <span
                        className={`inline-block text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-md ${
                          CATEGORY_COLORS[item.category] || "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="p-1.5 md:p-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{item.payment_method}</td>
                    <td className="p-1.5 md:p-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{item.staff_name}</td>
                    <td className="p-1.5 md:p-3 text-right font-mono font-bold text-[10px] md:text-sm text-rose-600 dark:text-rose-400">
                      {formatRupiah(item.amount)}
                    </td>
                    <td className="p-1 md:p-3">
                      <div className="flex items-center justify-end gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenForm(item)}
                          aria-label={`Edit ${item.title}`}
                          className="p-1 md:p-1.5 text-slate-400 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                        >
                          <Pencil className="size-3 md:size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Hapus ${item.title}`}
                          className="p-1 md:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
                        >
                          <Trash2 className="size-3 md:size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Total baris */}
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                    Total {totalCount} transaksi
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                    {formatRupiah(totalAmount)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl overflow-hidden p-4 md:p-5">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {editingExpense ? "Edit Catatan Belanja" : "Catat Pengeluaran Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="exp-title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nama / Deskripsi Belanja
              </Label>
              <Input
                id="exp-title"
                required
                placeholder="Cth: Gas 3kg 2 tabung, Es batu 10kg"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="exp-invoice" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Kode Invoice <span className="font-normal text-slate-400">(Opsional)</span>
              </Label>
              <Input
                id="exp-invoice"
                placeholder="Cth: INV-12345"
                value={invoiceCode}
                onChange={(e) => setInvoiceCode(e.target.value)}
                className="rounded-none uppercase font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-category" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kategori
                </Label>
                <Drawer>
                  <DrawerTrigger asChild>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand flex justify-between items-center rounded-none"
                    >
                      <span className="truncate">{category || "Pilih Kategori"}</span>
                      <ChevronDown className="size-3 opacity-50 shrink-0" />
                    </button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="mx-auto w-full max-w-md z-[60]">
                      <DrawerHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <DrawerTitle className="text-center font-bold text-slate-800 dark:text-slate-200">Kategori Pengeluaran</DrawerTitle>
                      </DrawerHeader>
                      <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                        {categories.map((cat) => (
                          <DrawerClose asChild key={cat}>
                            <button
                              type="button"
                              onClick={() => setCategory(cat)}
                              className={`flex items-center justify-between w-full p-3 rounded-xl border transition-all ${category === cat ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}
                            >
                              <span className="font-semibold text-sm">{cat}</span>
                              {category === cat && <Check className="size-4" />}
                            </button>
                          </DrawerClose>
                        ))}
                        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setIsManageCategoriesOpen(true)}
                            className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-300 transition-all font-semibold text-sm"
                          >
                            <Plus className="size-4" />
                            Kelola Kategori
                          </button>
                        </div>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-amount" className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Nominal (Rp)
                </Label>
                <Input
                  id="exp-amount"
                  type="number"
                  required
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-bold font-mono border-rose-300 dark:border-rose-800 focus-visible:ring-rose-400 rounded-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-method" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Sumber Dana
                </Label>
                <select
                  id="exp-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand rounded-none"
                >
                  <option value="Kas Laci (Petty Cash)">Kas Laci (Petty Cash)</option>
                  <option value="Rekening Bank Toko">Rekening Bank Toko</option>
                  <option value="Dana Pribadi Owner">Dana Pribadi Owner</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-staff" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Staf Penanggung Jawab
                </Label>
                <Input
                  id="exp-staff"
                  required
                  placeholder="Nama staf"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="rounded-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-notes" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                No. Nota / Catatan (opsional)
              </Label>
              <Input
                id="exp-notes"
                placeholder="Cth: Nota #1284, Toko Sumber Rejeki"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-none"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormModalOpen(false)}
                className="flex-1 font-semibold rounded-none"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !title || !amount}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-none"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                {editingExpense ? "Simpan Perubahan" : "Simpan Catatan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Cetak Laporan */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden bg-slate-100 dark:bg-slate-950 rounded-none">
          <div className="flex flex-col" style={{ height: "85vh", maxHeight: 720 }}>
            {/* Modal header */}
            <div className="bg-white dark:bg-slate-900 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Pratinjau Laporan Pengeluaran
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {DATE_FILTER_LABELS[dateFilter]} &middot; {totalCount} transaksi &middot;{" "}
                  <span className="font-bold text-rose-600 dark:text-rose-400">{formatRupiah(totalAmount)}</span>
                </p>
              </div>
              <Receipt className="size-6 text-slate-300 dark:text-slate-600" />
            </div>

            {/* Printable content */}
            <div className="flex-1 overflow-auto p-5" id="expense-report-printable">
              <div className="bg-white shadow-sm p-8 w-full border border-slate-200 font-sans text-slate-800">
                <div className="border-b-2 border-slate-900 pb-4 mb-6">
                  <h1 className="text-xl font-bold text-slate-900">LAPORAN BELANJA & PENGELUARAN TOKO</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Periode:{" "}
                    {dateFilter === "custom" && startDate
                      ? `${startDate} s/d ${endDate || "sekarang"}`
                      : DATE_FILTER_LABELS[dateFilter]}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Dicetak: {new Date().toLocaleString("id-ID")}</p>
                </div>

                {/* Ringkasan */}
                <div className="flex gap-8 mb-6 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total Pengeluaran</p>
                    <p className="text-xl font-black text-rose-600 mt-0.5">{formatRupiah(totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Jumlah Transaksi</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{totalCount} catatan</p>
                  </div>
                  {topCategory && (
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Kategori Terbesar</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{topCategory[0]}</p>
                      <p className="text-xs text-slate-500">{formatRupiah(topCategory[1])}</p>
                    </div>
                  )}
                </div>

                {/* Tabel detail */}
                <table className="w-full text-xs text-left border-collapse border border-slate-200 mb-8">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="p-2 border-r border-slate-200">Waktu</th>
                      <th className="p-2 border-r border-slate-200">Deskripsi</th>
                      <th className="p-2 border-r border-slate-200">Kategori</th>
                      <th className="p-2 border-r border-slate-200">Staf</th>
                      <th className="p-2 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((i) => (
                      <tr key={i.id} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 whitespace-nowrap">{formatDate(i.created_at)}</td>
                        <td className="p-2 border-r border-slate-200 font-medium">
                          {i.title}
                          {i.notes && <span className="block text-[10px] text-slate-400 italic">{i.notes}</span>}
                        </td>
                        <td className="p-2 border-r border-slate-200">{i.category}</td>
                        <td className="p-2 border-r border-slate-200">{i.staff_name}</td>
                        <td className="p-2 text-right font-bold text-rose-600">{formatRupiah(i.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                      <td colSpan={4} className="p-2 border-r border-slate-200">Total</td>
                      <td className="p-2 text-right text-rose-600">{formatRupiah(totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="flex justify-between text-xs text-center mt-12">
                  <div>
                    <p className="text-slate-500 mb-14">Dibuat Oleh,</p>
                    <p className="font-bold border-t border-slate-400 pt-1">Staf Operasional</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-14">Mengetahui,</p>
                    <p className="font-bold border-t border-slate-400 pt-1">Manager / Owner</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer aksi */}
            <div className="bg-white dark:bg-slate-900 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 flex-shrink-0">
              <Button
                onClick={() => printDocument("expense-report-printable")}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-none gap-1.5"
              >
                <Printer className="size-4" /> Cetak / Simpan PDF
              </Button>
              <Button
                onClick={() => setIsReportModalOpen(false)}
                variant="outline"
                className="flex-1 font-semibold rounded-none"
              >
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kelola Kategori Modal */}
      <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl overflow-hidden p-4 md:p-5 z-[70]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Kelola Kategori
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nama kategori baru..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="font-medium"
              />
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim() || categories.includes(newCategoryName.trim())} className="bg-rose-600 hover:bg-rose-700 text-white shrink-0 rounded-xl">
                Tambah
              </Button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center justify-between p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{cat}</span>
                  <button
                    onClick={() => handleRemoveCategory(cat)}
                    disabled={categories.length <= 1}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
