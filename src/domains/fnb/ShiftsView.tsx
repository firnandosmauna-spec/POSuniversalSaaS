import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Clock, Plus, LogOut, CheckCircle2, Wallet, Receipt, Calculator, Loader2, Pencil, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/shared/lib/supabase";
import { printWithWebBluetoothSafe } from "@/shared/lib/bluetoothPrinterSafe";
import { useAuth } from "@/shared/auth/AuthContext";

type Shift = {
  id: string;
  cashier_name: string;
  starting_cash: number;
  expected_ending_cash: number | null;
  actual_ending_cash: number | null;
  status: "open" | "closed";
  start_time: string;
  end_time: string | null;
};

export function ShiftsView() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CRUD Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editStartingCash, setEditStartingCash] = useState("");
  const [editActualCash, setEditActualCash] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);

  // Forms
  const [cashierName, setCashierName] = useState(user?.name || "");
  const [startingCash, setStartingCash] = useState("");
  const [actualEndingCash, setActualEndingCash] = useState("");
  const [staffList, setStaffList] = useState<{id: string, name: string, role: string}[]>([]);

  useEffect(() => {
    if (user?.name && staffList.length === 0) {
      if (user?.name) setCashierName(user.name);
    }
  }, [user, staffList]);

  // Fetch staff users
  useEffect(() => {
    const fetchStaff = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("store_users")
          .select("id, name, role")
          .eq("tenant_id", user.id);
        
        if (!error && data) {
          setStaffList(data);
          // Set default selected to current user if found, or first staff
          const currentStaff = data.find(s => s.name === user?.name);
          if (currentStaff) {
            setCashierName(currentStaff.name);
          } else if (data.length > 0) {
            setCashierName(data[0]?.name || "");
          }
        }
      } catch (err) {
        console.error("Error fetching staff:", err);
      }
    };
    fetchStaff();
  }, [user]);

  // Close shift data
  const [cashSales, setCashSales] = useState<number>(0);

  // Date Filters
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "month" | "custom">("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const tenantStorageKey = user ? `pos_tenant_${user.id}_shifts` : "pos_tenant_demo_shifts";

  const fetchShifts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let loadedShifts: Shift[] = [];
      const { data, error } = await supabase
        .from("cashier_shifts")
        .select("*")
        .eq("tenant_id", user.id)
        .order("start_time", { ascending: false });

      if (!error && data && data.length > 0) {
        loadedShifts = data as Shift[];
        localStorage.setItem(tenantStorageKey, JSON.stringify(loadedShifts));
      } else {
        const saved = localStorage.getItem(tenantStorageKey);
        if (saved) {
          loadedShifts = JSON.parse(saved) as Shift[];
        }
      }
      
      setShifts(loadedShifts);
      const openShift = loadedShifts.find(s => s.status === "open");
      setActiveShift(openShift || null);
    } catch (error) {
      console.warn("Error fetching shifts from Supabase (using local fallback):", error);
      const saved = localStorage.getItem(tenantStorageKey);
      if (saved) {
        const loadedShifts = JSON.parse(saved) as Shift[];
        setShifts(loadedShifts);
        const openShift = loadedShifts.find(s => s.status === "open");
        setActiveShift(openShift || null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [user]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!cashierName) {
      toast.error("Silakan pilih Nama Kasir terlebih dahulu.");
      return;
    }
    if (startingCash === "") {
      toast.error("Silakan isi Uang Kas Awal terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const safeId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : 'shift-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
      const newShift: Shift = {
        id: safeId,
        cashier_name: cashierName.trim(),
        starting_cash: parseFloat(startingCash) || 0,
        expected_ending_cash: null,
        actual_ending_cash: null,
        status: "open",
        start_time: new Date().toISOString(),
        end_time: null
      };

      // 1. Update local state immediately for 100% reliable UI operation
      const updatedShifts = [newShift, ...shifts];
      setShifts(updatedShifts);
      setActiveShift(newShift);
      localStorage.setItem(tenantStorageKey, JSON.stringify(updatedShifts));
      
      setIsOpenShiftModalOpen(false);
      setCashierName("");
      setStartingCash("");

      // 2. Sync to Supabase asynchronously
      try {
        await supabase
          .from("cashier_shifts")
          .insert({
            id: newShift.id,
            tenant_id: user.id,
            cashier_name: newShift.cashier_name,
            starting_cash: newShift.starting_cash,
            status: "open",
            start_time: newShift.start_time
          });
      } catch (error) {
        console.warn("Supabase shift insert optional sync failure:", error);
      }
    } catch (e) {
      console.error("Error opening shift:", e);
      toast.error("Terjadi kesalahan saat membuka shift.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const prepareCloseShift = async () => {
    if (!activeShift || !user) return;
    try {
      let totalCashSales = 0;

      // Try fetching cash sales from Supabase transactions
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("total_amount")
          .eq("tenant_id", user.id)
          .eq("shift_id", activeShift.id)
          .eq("payment_method", "cash")
          .eq("status", "completed");

        if (!error && data) {
          totalCashSales = data.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
        }
      } catch (err) {
        console.warn("Supabase transactions calculation error:", err);
      }

      // Fallback: Check local transactions if Supabase returns 0 or errored
      if (totalCashSales === 0) {
        try {
          const localTrxKey = `pos_tenant_${user.id}_transactions`;
          const savedTrx = localStorage.getItem(localTrxKey);
          if (savedTrx) {
            const trxs = JSON.parse(savedTrx);
            totalCashSales = trxs
              .filter((t: any) => (t.shift_id === activeShift.id || !t.shift_id) && (t.payment_method === "cash" || t.payment_method === "Tunai") && t.status === "completed")
              .reduce((acc: number, curr: any) => acc + Number(curr.total_amount || curr.total || 0), 0);
          }
        } catch (e) {}
      }

      setCashSales(totalCashSales);
      setIsCloseShiftModalOpen(true);
    } catch (error) {
      console.error(error);
      setIsCloseShiftModalOpen(true);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeShift) return;

    if (actualEndingCash === "") {
      toast.error("Silakan isi Uang Fisik Akhir (Real) terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    
    const expected = activeShift.starting_cash + cashSales;
    const actual = parseFloat(actualEndingCash) || 0;
    const nowIso = new Date().toISOString();

    // 1. Update local state & LocalStorage immediately
    const updatedShifts = shifts.map((s) =>
      s.id === activeShift.id
        ? {
            ...s,
            expected_ending_cash: expected,
            actual_ending_cash: actual,
            end_time: nowIso,
            status: "closed" as const
          }
        : s
    );

    setShifts(updatedShifts);
    setActiveShift(null);
    localStorage.setItem(tenantStorageKey, JSON.stringify(updatedShifts));
    
    setIsCloseShiftModalOpen(false);
    setActualEndingCash("");

    // 2. Sync to Supabase asynchronously
    try {
      await supabase
        .from("cashier_shifts")
        .update({
          expected_ending_cash: expected,
          actual_ending_cash: actual,
          end_time: nowIso,
          status: "closed"
        })
        .eq("id", activeShift.id);
    } catch (error) {
      console.warn("Supabase shift update optional sync failure:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift);
    setEditStartingCash(String(shift.starting_cash || 0));
    setEditActualCash(String(shift.actual_ending_cash || 0));
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift || !user) return;
    setIsSubmitting(true);

    const newStart = parseFloat(editStartingCash) || 0;
    const newActual = parseFloat(editActualCash) || 0;
    
    const sales = (editingShift.expected_ending_cash || 0) - editingShift.starting_cash;
    const newExpected = newStart + sales;

    const updatedShifts = shifts.map(s => 
      s.id === editingShift.id 
        ? { ...s, starting_cash: newStart, actual_ending_cash: newActual, expected_ending_cash: newExpected }
        : s
    );

    setShifts(updatedShifts);
    localStorage.setItem(tenantStorageKey, JSON.stringify(updatedShifts));
    setIsEditModalOpen(false);

    try {
      await supabase.from("cashier_shifts").update({
        starting_cash: newStart,
        actual_ending_cash: newActual,
        expected_ending_cash: newExpected
      }).eq("id", editingShift.id);
    } catch (err) {
      console.warn("Failed sync edit shift to Supabase:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (shift: Shift) => {
    setDeletingShift(shift);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deletingShift || !user) return;
    setIsSubmitting(true);

    const updatedShifts = shifts.filter(s => s.id !== deletingShift.id);
    setShifts(updatedShifts);
    localStorage.setItem(tenantStorageKey, JSON.stringify(updatedShifts));
    setIsDeleteModalOpen(false);

    try {
      await supabase.from("cashier_shifts").delete().eq("id", deletingShift.id);
    } catch (err) {
      console.warn("Failed sync delete shift to Supabase:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  // Print modal state
  const [selectedShiftForPrint, setSelectedShiftForPrint] = useState<Shift | null>(null);
  const [isShiftPrintModalOpen, setIsShiftPrintModalOpen] = useState<boolean>(false);

  const openShiftReportPrint = (shift: Shift) => {
    setSelectedShiftForPrint(shift);
    setIsShiftPrintModalOpen(true);
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

  const filteredShifts = shifts.filter(shift => {
    if (!shift.start_time) return false;
    const shiftDate = new Date(shift.start_time);
    const now = new Date();
    
    if (dateFilter === 'today') {
      return shiftDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return shiftDate.toDateString() === yesterday.toDateString();
    }
    if (dateFilter === 'month') {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return shiftDate >= oneMonthAgo;
    }
    if (dateFilter === 'custom') {
      if (!customStartDate || !customEndDate) return true;
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return shiftDate >= start && shiftDate <= end;
    }
    return true; // 'all'
  });

  return (
    <div className="p-2 md:p-6 h-full flex flex-col">
      <div className="mb-4 md:mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg md:text-2xl font-bold text-slate-900 tracking-tight">
            Shift Kasir
          </h1>
          <p className="text-[10px] md:text-sm text-slate-500 mt-0.5 md:mt-1 hidden md:block">
            Buka shift, pantau uang di laci, dan tutup kas harian.
          </p>
        </div>
        {!activeShift && !isLoading && (
          <Button onClick={() => setIsOpenShiftModalOpen(true)} className="bg-[#0b172a] text-white hover:bg-slate-800 transition-all shadow-sm hover:shadow text-[10px] md:text-sm h-8 md:h-10 px-3 md:px-5 rounded-xl font-bold">
            <Plus className="size-3 md:size-4 mr-1 md:mr-2" /> Mulai Shift
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6 flex-1 overflow-hidden">
        {/* Kolom Kiri: Status Shift Aktif */}
        <div className="col-span-1 flex flex-col gap-3 md:gap-6">
          {activeShift ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 md:p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-3 md:p-4">
                <span className="flex items-center gap-1 md:gap-1.5 text-[8px] md:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg border border-emerald-100 uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-emerald-500"></span>
                  </span>
                  SHIFT AKTIF
                </span>
              </div>
              
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 mt-2 md:mt-0">
                <div className="size-10 md:size-12 rounded-[14px] bg-slate-50 border border-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm md:text-lg">
                  {activeShift.cashier_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-base md:text-xl font-bold text-slate-800">{activeShift.cashier_name}</h2>
                  <p className="text-[10px] md:text-sm font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="size-3 md:size-3.5" /> Buka: {new Date(activeShift.start_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 md:space-y-4 mb-5 md:mb-8">
                <div className="bg-slate-50/80 p-3 md:p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 md:gap-2 text-slate-600">
                    <Wallet className="size-4 md:size-4 text-slate-400" />
                    <span className="text-[11px] md:text-sm font-bold">Kas Awal</span>
                  </div>
                  <span className="font-extrabold text-slate-800 text-sm md:text-base">{formatRupiah(activeShift.starting_cash)}</span>
                </div>
              </div>
              
              <Button onClick={prepareCloseShift} className="w-full bg-[#0b172a] hover:bg-slate-800 text-white transition-all shadow-sm hover:shadow text-[11px] md:text-sm h-10 md:h-12 rounded-xl font-bold">
                <LogOut className="size-3.5 md:size-4 mr-1.5 md:mr-2" /> Tutup Shift
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-8 text-center flex flex-col items-center justify-center h-48 md:h-64 transition-all hover:shadow-md">
              <div className="p-3 md:p-4 bg-slate-50 rounded-2xl mb-3 md:mb-4">
                <Clock className="size-8 md:size-10 text-slate-300" />
              </div>
              <h2 className="mb-1 md:mb-2 font-display text-sm md:text-lg font-bold text-slate-800">
                Kasir Belum Buka
              </h2>
              <p className="text-[10px] md:text-sm max-w-[250px] mx-auto text-slate-500 font-medium mb-4 md:mb-6 leading-relaxed">
                Masukkan uang modal awal di laci kasir untuk mulai transaksi hari ini.
              </p>
              <Button onClick={() => setIsOpenShiftModalOpen(true)} className="bg-[#0b172a] text-white hover:bg-slate-800 transition-all shadow-sm hover:shadow text-[11px] md:text-sm h-9 md:h-11 px-6 rounded-xl font-bold">
                Mulai Shift Sekarang
              </Button>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Riwayat Shift */}
        <div className="col-span-2 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-3 md:p-5 border-b border-slate-50 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display font-bold text-slate-800 text-[13px] md:text-base">Riwayat Shift Kasir</h2>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-100 font-semibold text-slate-700 text-[10px] md:text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value="all">Semua Waktu</option>
                <option value="today">Hari Ini</option>
                <option value="yesterday">Kemarin</option>
                <option value="month">1 Bulan Terakhir</option>
                <option value="custom">Custom Tanggal</option>
              </select>
              
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input 
                    type="date" 
                    value={customStartDate} 
                    onChange={e => setCustomStartDate(e.target.value)} 
                    className="bg-slate-50 border border-slate-100 font-semibold text-slate-700 text-[10px] md:text-xs rounded-xl px-3 py-2 outline-none"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input 
                    type="date" 
                    value={customEndDate} 
                    onChange={e => setCustomEndDate(e.target.value)} 
                    className="bg-slate-50 border border-slate-100 font-semibold text-slate-700 text-[10px] md:text-xs rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="size-6 animate-spin text-[#0b172a]" />
              </div>
            ) : filteredShifts.length === 0 ? (
              <div className="text-center p-8 text-slate-500 font-medium text-[11px] md:text-sm">Belum ada riwayat shift untuk rentang waktu ini.</div>
            ) : (
              <table className="w-full text-left text-[10px] md:text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 md:p-4 font-bold text-[10px] uppercase tracking-wider">Waktu Shift</th>
                    <th className="p-3 md:p-4 font-bold text-[10px] uppercase tracking-wider">Kasir</th>
                    <th className="p-3 md:p-4 font-bold text-[10px] uppercase tracking-wider text-right">Kas Awal</th>
                    <th className="p-3 md:p-4 font-bold text-[10px] uppercase tracking-wider text-right">Kas Akhir</th>
                    <th className="p-3 md:p-4 font-bold text-[10px] uppercase tracking-wider text-center">Selisih</th>
                    <th className="p-3 md:p-4 font-bold text-[10px] uppercase tracking-wider text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShifts.map(shift => {
                    const diff = shift.status === 'closed' && shift.actual_ending_cash !== null && shift.expected_ending_cash !== null 
                      ? shift.actual_ending_cash - shift.expected_ending_cash 
                      : 0;
                    
                    return (
                      <tr key={shift.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 md:p-4">
                          <div className="font-bold text-slate-800">{formatDate(shift.start_time)}</div>
                          <div className="text-[9px] md:text-xs font-semibold text-slate-500 mt-1">
                            {shift.end_time ? `s.d. ${formatDate(shift.end_time)}` : <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Aktif</span>}
                          </div>
                        </td>
                        <td className="p-3 md:p-4 font-bold text-slate-700">{shift.cashier_name}</td>
                        <td className="p-3 md:p-4 text-right font-semibold text-slate-600">{formatRupiah(shift.starting_cash)}</td>
                        <td className="p-3 md:p-4 text-right">
                          {shift.status === 'closed' ? (
                            <span className="font-extrabold text-slate-800">{formatRupiah(shift.actual_ending_cash || 0)}</span>
                          ) : (
                            <span className="text-slate-300 italic font-medium">-</span>
                          )}
                        </td>
                        <td className="p-3 md:p-4 text-center">
                          {shift.status === 'closed' ? (
                            diff === 0 ? (
                              <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-[9px] md:text-xs font-bold text-emerald-700 border border-emerald-100">
                                Sesuai
                              </span>
                            ) : diff > 0 ? (
                              <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-1 text-[9px] md:text-xs font-bold text-blue-700 border border-blue-100" title={`Lebih ${formatRupiah(diff)}`}>
                                Lebih
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-lg bg-red-50 px-2 py-1 text-[9px] md:text-xs font-bold text-red-700 border border-red-100" title={`Kurang ${formatRupiah(Math.abs(diff))}`}>
                                Kurang
                              </span>
                            )
                          ) : (
                            <span className="text-slate-300 italic font-medium">-</span>
                          )}
                        </td>
                        <td className="p-3 md:p-4 text-center">
                          {shift.status === 'closed' ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openShiftReportPrint(shift)} 
                                className="text-slate-500 hover:text-[#0b172a] hover:bg-slate-100 transition-colors px-2 h-7 md:h-8 rounded-lg"
                                title="Cetak Laporan"
                              >
                                <Receipt className="size-3.5 md:size-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleOpenEdit(shift)} 
                                className="text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors px-2 h-7 md:h-8 rounded-lg"
                                title="Edit Data"
                              >
                                <Pencil className="size-3.5 md:size-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleOpenDelete(shift)} 
                                className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors px-2 h-7 md:h-8 rounded-lg"
                                title="Hapus Shift"
                              >
                                <Trash2 className="size-3.5 md:size-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Buka Shift */}
      <Dialog open={isOpenShiftModalOpen} onOpenChange={setIsOpenShiftModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-slate-100 p-0 overflow-hidden bg-white">
          <DialogHeader className="p-5 border-b border-slate-50 bg-white">
            <DialogTitle className="font-display font-bold text-lg text-slate-800">Buka Shift Kasir</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOpenShift} className="space-y-5 p-5 bg-slate-50/30">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Nama Kasir</label>
              <select 
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#0b172a] focus:ring-1 focus:ring-[#0b172a]"
              >
                <option value="" disabled>Pilih Kasir</option>
                {staffList.length > 0 ? (
                  staffList.map(staff => (
                    <option key={staff.id} value={staff.name}>{staff.name} ({staff.role})</option>
                  ))
                ) : (
                  <option value={user?.name || "Kasir"}>{user?.name || "Kasir"}</option>
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Uang Kas Awal (Rp)</label>
              <p className="text-[10px] text-slate-400 font-medium mb-1">Total uang tunai modal kembalian di laci saat ini.</p>
              <Input 
                type="number"
                min="0"
                placeholder="0" 
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                className="h-11 rounded-xl bg-white border-slate-200 font-bold text-base focus-visible:ring-[#0b172a]"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpenShiftModalOpen(false)} className="rounded-xl font-bold text-slate-500">Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl font-bold px-6">
                Buka Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tutup Shift */}
      <Dialog open={isCloseShiftModalOpen} onOpenChange={setIsCloseShiftModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-slate-100 p-0 overflow-hidden bg-white">
          <DialogHeader className="p-5 border-b border-slate-50 bg-white">
            <DialogTitle className="font-display font-bold text-lg text-slate-800">Tutup Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseShift} className="space-y-5 p-5 bg-slate-50/30">
            
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Kas Awal</span>
                <span className="font-bold text-slate-700">{formatRupiah(activeShift?.starting_cash || 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Penjualan Tunai</span>
                <span className="font-bold text-slate-700">+{formatRupiah(cashSales)}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between">
                <span className="font-bold text-[11px] text-slate-800 uppercase">Ekspektasi Uang</span>
                <span className="font-black text-[#0b172a] text-sm">{formatRupiah((activeShift?.starting_cash || 0) + cashSales)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Uang Fisik Akhir (Real)</label>
              <p className="text-[10px] text-slate-400 font-medium mb-1">Hitung total uang tunai yang ada di laci kasir saat ini.</p>
              <Input 
                type="number"
                min="0"
                placeholder="0" 
                value={actualEndingCash}
                onChange={(e) => setActualEndingCash(e.target.value)}
                className="font-extrabold text-xl p-6 rounded-xl border-slate-200 bg-white text-center focus-visible:ring-[#0b172a]"
              />
            </div>
            
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsCloseShiftModalOpen(false)} className="rounded-xl font-bold text-slate-500">Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl font-bold px-6">
                Konfirmasi Tutup
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pop-up Cetak Laporan Shift */}
      <Dialog open={isShiftPrintModalOpen} onOpenChange={setIsShiftPrintModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-slate-100 p-0 overflow-hidden bg-slate-100">
          {selectedShiftForPrint && (
            <div className="flex flex-col h-[80vh] max-h-[600px]">
              <div className="bg-white p-4 border-b border-slate-100 text-center flex-shrink-0">
                <h3 className="font-display font-bold text-base text-slate-800">Pratinjau Struk Shift</h3>
              </div>
              
              <div className="flex-1 overflow-auto p-6" id="shift-report-printable">
                <div className="bg-white shadow-sm p-6 mx-auto w-full max-w-[320px] font-mono text-sm text-slate-800 border-t-[6px] border-[#0b172a] rounded-sm">
                  <div className="text-center mb-5">
                    <h2 className="font-black text-lg uppercase mb-1 tracking-tight">LAPORAN SHIFT KASIR</h2>
                    <p className="text-xs text-slate-500 mb-3 font-semibold">Toko Saya</p>
                    <div className="border-b border-dashed border-slate-300 pb-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Kasir:</span>
                        <span className="font-bold">{selectedShiftForPrint.cashier_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Buka:</span>
                        <span className="font-medium">{new Date(selectedShiftForPrint.start_time).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tutup:</span>
                        <span className="font-medium">{selectedShiftForPrint.end_time ? new Date(selectedShiftForPrint.end_time).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs border-b border-dashed border-slate-300 pb-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Modal Kas Awal</span>
                      <span className="font-bold">{formatRupiah(selectedShiftForPrint.starting_cash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Ekspektasi Uang</span>
                      <span className="font-bold">{formatRupiah(selectedShiftForPrint.expected_ending_cash || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2 pt-2 border-t border-dashed border-slate-200">
                      <span className="font-bold">Uang Fisik</span>
                      <span className="font-black">{formatRupiah(selectedShiftForPrint.actual_ending_cash || 0)}</span>
                    </div>
                  </div>

                  {(() => {
                    const diff = (selectedShiftForPrint.actual_ending_cash || 0) - (selectedShiftForPrint.expected_ending_cash || 0);
                    return (
                      <div className="text-center py-2.5 px-3 bg-slate-50 border-y border-dashed border-slate-300 mb-5 text-[11px] font-bold tracking-wide">
                        <span className="text-slate-500">STATUS SELISIH: </span>
                        {diff === 0 ? (
                          <span className="text-emerald-700">SESUAI (Rp 0)</span>
                        ) : diff > 0 ? (
                          <span className="text-blue-700">LEBIH (+{formatRupiah(diff)})</span>
                        ) : (
                          <span className="text-red-700">KURANG (-{formatRupiah(Math.abs(diff))})</span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="mt-8 pt-4 text-center text-[10px] text-slate-500 font-medium">
                    <p className="mb-8">Tanda Tangan Kasir,</p>
                    <p className="font-bold border-b border-slate-400 pb-1 inline-block min-w-[140px] text-slate-700">({selectedShiftForPrint.cashier_name})</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
                <Button 
                  onClick={() => printDocument("shift-report-printable")}
                  className="flex-1 bg-[#0b172a] hover:bg-slate-800 text-white font-bold rounded-xl h-11"
                >
                  <Printer className="size-4 mr-2" />
                  Cetak Struk
                </Button>
                <Button onClick={() => setIsShiftPrintModalOpen(false)} variant="outline" className="flex-1 font-bold rounded-xl h-11 border-slate-200">
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Edit Shift */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-slate-100 p-0 overflow-hidden bg-white">
          <DialogHeader className="p-5 border-b border-slate-50 bg-white">
            <DialogTitle className="font-display font-bold text-lg text-slate-800">Edit Data Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 p-5 bg-slate-50/30">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Kas Awal (Rp)</label>
              <Input 
                required 
                type="number"
                min="0"
                value={editStartingCash}
                onChange={(e) => setEditStartingCash(e.target.value)}
                className="h-11 rounded-xl bg-white border-slate-200 font-bold focus-visible:ring-[#0b172a]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Kas Akhir Real (Rp)</label>
              <Input 
                required 
                type="number"
                min="0"
                value={editActualCash}
                onChange={(e) => setEditActualCash(e.target.value)}
                className="h-11 rounded-xl bg-white border-slate-200 font-bold focus-visible:ring-[#0b172a]"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl font-bold text-slate-500">Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl font-bold px-6">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Hapus Shift */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-slate-100 p-0 overflow-hidden bg-white">
          <DialogHeader className="p-5 border-b border-slate-50 bg-white">
            <DialogTitle className="font-display font-bold text-lg text-red-600">Hapus Shift Kasir</DialogTitle>
          </DialogHeader>
          <div className="p-5 bg-slate-50/30">
            <p className="text-sm font-medium text-slate-600 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus data shift kasir <strong className="text-slate-800">{deletingShift?.cashier_name}</strong>?
            </p>
            <div className="bg-red-50 border border-red-100/50 p-4 rounded-xl">
              <p className="text-xs text-red-700 font-semibold leading-relaxed">Tindakan ini tidak dapat dibatalkan dan akan menghapus riwayat shift ini selamanya dari cloud.</p>
            </div>
          </div>
          <DialogFooter className="p-5 border-t border-slate-50 bg-white">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="rounded-xl font-bold text-slate-500">Batal</Button>
            <Button type="button" onClick={handleDeleteSubmit} disabled={isSubmitting} className="bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold px-5">
              {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
              Ya, Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

