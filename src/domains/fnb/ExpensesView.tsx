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
  DollarSign, 
  TrendingDown, 
  ShoppingBag, 
  Tag,
  CheckCircle2,
  FileText
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
};

const EXPENSE_CATEGORIES = [
  "Bahan Baku & Bumbu",
  "Operasional & Peralatan",
  "Kebersihan & Sanitasi",
  "Listrik, Air, Gas & Internet",
  "Transportasi & Pengiriman",
  "Gaji & Bonus Staf",
  "Lain-lain"
];

export function ExpensesView() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Date Filter
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "month" | "custom" | "all">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Bahan Baku & Bumbu");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Kas Laci (Petty Cash)");
  const [staffName, setStaffName] = useState("");
  const [notes, setNotes] = useState("");

  // Helper local storage fallback
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
    try {
      // Try DB fetch
      const { data, error } = await supabase
        .from("store_expenses")
        .select("*")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback to local storage if DB table missing
        const localItems = getLocalExpenses();
        setExpenses(localItems);
      } else {
        setExpenses(data || []);
      }
    } catch (e) {
      setExpenses(getLocalExpenses());
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
    } else {
      setEditingExpense(null);
      setTitle("");
      setCategory(EXPENSE_CATEGORIES[0] || "Bahan Baku & Bumbu");
      setAmount("");
      setPaymentMethod("Kas Laci (Petty Cash)");
      setStaffName(user?.name || "Staf / Kasir");
      setNotes("");
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
      notes: notes.trim()
    };

    try {
      // Save to DB
      if (editingExpense) {
        await supabase
          .from("store_expenses")
          .update({
            title: newItem.title,
            category: newItem.category,
            amount: newItem.amount,
            payment_method: newItem.payment_method,
            staff_name: newItem.staff_name,
            notes: newItem.notes
          })
          .eq("id", editingExpense.id);
      } else {
        await supabase.from("store_expenses").insert([{
          ...newItem,
          tenant_id: user.id
        }]);
      }
    } catch (e) {
      console.error("DB error, fallback local storage:", e);
    }

    // Always update local storage for reliability
    const localCurrent = getLocalExpenses();
    let updatedLocal: ExpenseItem[];
    if (editingExpense) {
      updatedLocal = localCurrent.map(i => i.id === editingExpense.id ? newItem : i);
    } else {
      updatedLocal = [newItem, ...localCurrent];
    }
    saveLocalExpenses(updatedLocal);
    setExpenses(prev => editingExpense ? prev.map(i => i.id === editingExpense.id ? newItem : i) : [newItem, ...prev]);

    setIsSubmitting(false);
    setIsFormModalOpen(false);
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) return;

    try {
      await supabase.from("store_expenses").delete().eq("id", id);
    } catch (e) {}

    const updated = expenses.filter(i => i.id !== id);
    setExpenses(updated);
    saveLocalExpenses(updated);
  };

  // Date Filter Helpers
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  const isYesterday = (dateStr: string) => {
    const d = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
  };

  const isLast1Month = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(now.getDate() - 30);
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

  // Filtered List
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = 
      exp.title.toLowerCase().includes(search.toLowerCase()) ||
      exp.category.toLowerCase().includes(search.toLowerCase()) ||
      exp.staff_name.toLowerCase().includes(search.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory !== "all" && exp.category !== selectedCategory) {
      return false;
    }

    if (dateFilter === "today") return isToday(exp.created_at);
    if (dateFilter === "yesterday") return isYesterday(exp.created_at);
    if (dateFilter === "month") return isLast1Month(exp.created_at);
    if (dateFilter === "custom") return isInCustomRange(exp.created_at);

    return true;
  });

  // Calculate Metrics
  const totalAmount = filteredExpenses.reduce((sum, i) => sum + i.amount, 0);
  const totalCount = filteredExpenses.length;
  
  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  filteredExpenses.forEach(i => {
    categoryTotals[i.category] = (categoryTotals[i.category] || 0) + i.amount;
  });
  
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
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

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      {/* Header Utama */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="size-7 text-rose-600" /> Transaksi Belanja Manual & Pengeluaran Toko
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Catat pembelian bahan baku, operasional, gas, kebersihan, dan cetak laporan pengeluaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => handleOpenForm()}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="size-4" /> Catat Belanja Baru
          </Button>

          <Button
            onClick={() => setIsReportModalOpen(true)}
            variant="outline"
            className="border-slate-300 font-semibold flex items-center gap-2"
          >
            <Printer className="size-4" /> Cetak Laporan Belanja
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <DollarSign className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pengeluaran Belanja</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{formatRupiah(totalAmount)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <ShoppingBag className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Catatan Belanja</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{totalCount} <span className="text-sm font-normal text-slate-500">transaksi</span></h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Tag className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori Terbesar</p>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              {topCategory ? topCategory[0] : "-"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {topCategory ? formatRupiah(topCategory[1]) : "Rp 0"}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Periode, Kategori & Search */}
      <div className="mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setDateFilter("today")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                dateFilter === "today" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setDateFilter("yesterday")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                dateFilter === "yesterday" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Kemarin
            </button>
            <button
              onClick={() => setDateFilter("month")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                dateFilter === "month" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1 Bulan
            </button>
            <button
              onClick={() => setDateFilter("custom")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                dateFilter === "custom" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Custom
            </button>
            <button
              onClick={() => setDateFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                dateFilter === "all" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua
            </button>
          </div>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-brand"
              />
              <span className="text-xs text-slate-400 font-semibold">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-brand"
              />
            </div>
          )}
        </div>

        {/* Category Dropdown & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari belanjaan, staf, nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      {/* Tabel Riwayat Belanja Manual */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[350px]">
        <div className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="size-8 animate-spin mb-4 text-rose-600" />
              <p>Memuat data belanja manual...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Wallet className="size-12 mb-4 opacity-20" />
              <h2 className="mb-2 font-display text-lg font-bold text-slate-700">
                Belum Ada Catatan Belanja
              </h2>
              <p className="text-sm text-center max-w-sm">
                Klik tombol "+ Catat Belanja Baru" untuk memasukkan transaksi pengeluaran operasional toko.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 font-bold">
                <tr>
                  <th className="p-4">Waktu Transaksi</th>
                  <th className="p-4">Deskripsi / Kebutuhan Toko</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Sumber Dana</th>
                  <th className="p-4">Penanggung Jawab</th>
                  <th className="p-4 text-right">Nominal (Rp)</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-slate-400" />
                        {formatDate(item.created_at)}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                      {item.notes && <p className="text-[11px] text-slate-500 mt-0.5 italic">Nota: {item.notes}</p>}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{item.payment_method}</td>
                    <td className="p-4 font-semibold text-slate-700">{item.staff_name}</td>
                    <td className="p-4 text-right font-extrabold text-rose-600 text-sm">
                      {formatRupiah(item.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(item)} className="size-8 text-slate-500 hover:text-brand">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="size-8 text-slate-500 hover:text-rose-600">
                          <Trash2 className="size-3.5" />
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

      {/* Modal Form Catat / Edit Belanja Manual */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              {editingExpense ? "Edit Catatan Belanja" : "Catat Transaksi Belanja Manual"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-title" className="text-xs font-bold text-slate-700">Nama / Deskripsi Belanja</Label>
              <Input
                id="exp-title"
                required
                placeholder="Cth: Beli Gas 3kg 2 tabung & Es Batu"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-category" className="text-xs font-bold text-slate-700">Kategori</Label>
                <select
                  id="exp-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-amount" className="text-xs font-bold text-rose-700">Nominal Pengeluaran (Rp)</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  required
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-bold text-slate-900 border-rose-200 focus-visible:ring-rose-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-method" className="text-xs font-bold text-slate-700">Sumber Dana</Label>
                <select
                  id="exp-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="Kas Laci (Petty Cash)">Kas Laci (Petty Cash)</option>
                  <option value="Rekening Bank Toko">Rekening Bank Toko</option>
                  <option value="Dana Pribadi Owner">Dana Pribadi Owner</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-staff" className="text-xs font-bold text-slate-700">Staf Penanggung Jawab</Label>
                <Input
                  id="exp-staff"
                  required
                  placeholder="Cth: Budi (Kasir)"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-notes" className="text-xs font-semibold text-slate-600">Catatan Tambahan / No. Nota (Opsional)</Label>
              <Input
                id="exp-notes"
                placeholder="Cth: Nota No. 1284 Toko Sumber Rejeki"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="pt-3 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)} className="flex-1 font-semibold">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting || !title || !amount} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold">
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Simpan Catatan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pop-up Cetak Laporan Belanja Manual */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-slate-100">
          <div className="flex flex-col h-[85vh] max-h-[700px]">
            <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-800">Pratinjau Laporan Belanja Manual</h3>
                <p className="text-xs text-slate-500">
                  Filter: <span className="font-semibold uppercase">{dateFilter}</span> | Total: <span className="font-bold text-rose-600">{formatRupiah(totalAmount)}</span>
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6" id="expense-report-printable">
              <div className="bg-white shadow-sm p-8 mx-auto w-full border border-slate-200 font-sans text-slate-800">
                {/* Kop Laporan */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
                  <h1 className="text-2xl font-bold uppercase tracking-wide">LAPORAN BELANJA & PENGELUARAN TOKO</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Periode Filter: <span className="font-semibold uppercase">{dateFilter === 'all' ? 'Semua Waktu' : dateFilter === 'today' ? 'Hari Ini' : dateFilter === 'yesterday' ? 'Kemarin' : dateFilter === 'month' ? '1 Bulan' : 'Custom'}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
                </div>

                {/* Ringkasan Per Kategori */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Total Belanja</p>
                    <p className="text-xl font-bold text-rose-600 mt-1">{formatRupiah(totalAmount)}</p>
                  </div>
                  <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Jumlah Transaksi</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{totalCount} Catatan</p>
                  </div>
                </div>

                {/* Tabel Rincian Belanja */}
                <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wide">Rincian Belanja ({filteredExpenses.length})</h3>
                <table className="w-full text-xs text-left border-collapse border border-slate-200 mb-6">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="p-2 border-r border-slate-200">Waktu</th>
                      <th className="p-2 border-r border-slate-200">Deskripsi / Items</th>
                      <th className="p-2 border-r border-slate-200">Kategori</th>
                      <th className="p-2 border-r border-slate-200">Penanggung Jawab</th>
                      <th className="p-2 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((i) => (
                      <tr key={i.id} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200">{formatDate(i.created_at)}</td>
                        <td className="p-2 border-r border-slate-200 font-medium">{i.title}</td>
                        <td className="p-2 border-r border-slate-200">{i.category}</td>
                        <td className="p-2 border-r border-slate-200">{i.staff_name}</td>
                        <td className="p-2 text-right font-bold text-rose-600">{formatRupiah(i.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tanda Tangan */}
                <div className="mt-12 flex justify-between text-xs text-center">
                  <div>
                    <p className="text-slate-500 mb-12">Dibuat Oleh Staf,</p>
                    <p className="font-bold border-t border-slate-400 pt-1">Staf Operasional</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-12">Disetujui Oleh,</p>
                    <p className="font-bold border-t border-slate-400 pt-1">Manager / Owner</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 border-t border-slate-200 flex gap-2 flex-shrink-0">
              <Button 
                onClick={() => printDocument("expense-report-printable")}
                className="flex-1 bg-rose-600 text-white font-bold"
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
