import { useState, useEffect } from "react";
import { Clock, Plus, LogOut, CheckCircle2, Wallet, Receipt, Calculator, Loader2 } from "lucide-react";
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

  // Forms
  const [cashierName, setCashierName] = useState(user?.name || "");
  const [startingCash, setStartingCash] = useState("");
  const [actualEndingCash, setActualEndingCash] = useState("");
  const [staffList, setStaffList] = useState<{id: string, name: string, role: string}[]>([]);

  useEffect(() => {
    if (user?.name && staffList.length === 0) {
      setCashierName(user.name);
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
          const currentStaff = data.find(s => s.name === user.name);
          if (currentStaff) {
            setCashierName(currentStaff.name);
          } else if (data.length > 0) {
            setCashierName(data[0].name);
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
    setIsSubmitting(true);
    
    const newShift: Shift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Shift Kasir
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Buka shift, pantau uang di laci, dan tutup kas harian.
          </p>
        </div>
        {!activeShift && !isLoading && (
          <Button onClick={() => setIsOpenShiftModalOpen(true)} className="bg-brand text-white hover:bg-brand/90 transition-all shadow-sm hover:shadow">
            <Plus className="size-4 mr-2" /> Mulai Shift
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Kolom Kiri: Status Shift Aktif */}
        <div className="col-span-1 flex flex-col gap-6">
          {activeShift ? (
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-4">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  SHIFT AKTIF
                </span>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="size-12 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                  {activeShift.cashier_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-800">{activeShift.cashier_name}</h2>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="size-3.5" /> Buka: {new Date(activeShift.start_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Wallet className="size-4 text-slate-400" />
                    <span className="text-sm font-semibold">Kas Awal</span>
                  </div>
                  <span className="font-bold text-slate-800">{formatRupiah(activeShift.starting_cash)}</span>
                </div>
              </div>
              
              <Button onClick={prepareCloseShift} className="w-full bg-slate-800 hover:bg-slate-900 text-white transition-all shadow-sm hover:shadow">
                <LogOut className="size-4 mr-2" /> Tutup Shift
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center flex flex-col items-center justify-center h-64 transition-all hover:shadow-md">
              <div className="p-3 bg-slate-50 rounded-full mb-4">
                <Clock className="size-8 text-slate-400" />
              </div>
              <h2 className="mb-2 font-display text-lg font-semibold text-slate-800">
                Kasir Belum Buka
              </h2>
              <p className="text-sm max-w-[250px] mx-auto text-slate-500 mb-6 leading-relaxed">
                Masukkan uang modal awal di laci kasir untuk mulai transaksi hari ini.
              </p>
              <Button onClick={() => setIsOpenShiftModalOpen(true)} className="bg-brand text-white hover:bg-brand/90 transition-all shadow-sm hover:shadow">
                Mulai Shift
              </Button>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Riwayat Shift */}
        <div className="col-span-2 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
            <h2 className="font-display font-bold text-slate-800">Riwayat Shift Kasir</h2>
          </div>
          <div className="flex-1 overflow-auto p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="size-6 animate-spin text-brand" />
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center p-8 text-slate-500">Belum ada riwayat shift.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 font-semibold">Waktu Shift</th>
                    <th className="p-4 font-semibold">Kasir</th>
                    <th className="p-4 font-semibold text-right">Kas Awal</th>
                    <th className="p-4 font-semibold text-right">Kas Akhir (Real)</th>
                    <th className="p-4 font-semibold text-center">Selisih</th>
                    <th className="p-4 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(shift => {
                    const diff = shift.status === 'closed' && shift.actual_ending_cash !== null && shift.expected_ending_cash !== null 
                      ? shift.actual_ending_cash - shift.expected_ending_cash 
                      : 0;
                    
                    return (
                      <tr key={shift.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4">
                          <div className="font-medium text-slate-800">{formatDate(shift.start_time)}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {shift.end_time ? `s.d. ${formatDate(shift.end_time)}` : <span className="text-brand font-semibold">Sedang Berlangsung</span>}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-700">{shift.cashier_name}</td>
                        <td className="p-4 text-right text-slate-600">{formatRupiah(shift.starting_cash)}</td>
                        <td className="p-4 text-right">
                          {shift.status === 'closed' ? (
                            <span className="font-bold text-slate-800">{formatRupiah(shift.actual_ending_cash || 0)}</span>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {shift.status === 'closed' ? (
                            diff === 0 ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                Sesuai
                              </span>
                            ) : diff > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200" title={`Lebih ${formatRupiah(diff)}`}>
                                Lebih
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200" title={`Kurang ${formatRupiah(Math.abs(diff))}`}>
                                Kurang
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {shift.status === 'closed' ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openShiftReportPrint(shift)} 
                              className="text-brand hover:bg-brand/10 transition-colors"
                              title="Cetak Laporan Shift"
                            >
                              <Receipt className="size-4" />
                            </Button>
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
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Buka Shift Kasir</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOpenShift} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nama Kasir</label>
              <select 
                required
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950"
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
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Uang Kas Awal (Rp)</label>
              <p className="text-xs text-slate-500">Total uang tunai modal kembalian di laci saat ini.</p>
              <Input 
                required 
                type="number"
                min="0"
                placeholder="0" 
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpenShiftModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting || !cashierName} className="bg-brand text-white">
                Buka Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tutup Shift */}
      <Dialog open={isCloseShiftModalOpen} onOpenChange={setIsCloseShiftModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Tutup Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseShift} className="space-y-4 py-2">
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Kas Awal</span>
                <span className="font-semibold text-slate-700">{formatRupiah(activeShift?.starting_cash || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Penjualan Tunai</span>
                <span className="font-semibold text-slate-700">+{formatRupiah(cashSales)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="font-bold text-slate-800">Ekspektasi Uang di Laci</span>
                <span className="font-bold text-brand">{formatRupiah((activeShift?.starting_cash || 0) + cashSales)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">Uang Fisik Akhir (Real)</label>
              <p className="text-xs text-slate-500">Hitung total uang tunai yang ada di laci kasir saat ini.</p>
              <Input 
                required 
                type="number"
                min="0"
                placeholder="0" 
                value={actualEndingCash}
                onChange={(e) => setActualEndingCash(e.target.value)}
                className="font-bold text-lg p-6"
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsCloseShiftModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 text-white">
                Konfirmasi Tutup Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pop-up Cetak Laporan Shift */}
      <Dialog open={isShiftPrintModalOpen} onOpenChange={setIsShiftPrintModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-slate-100">
          {selectedShiftForPrint && (
            <div className="flex flex-col h-[80vh] max-h-[600px]">
              <div className="bg-white p-4 border-b border-slate-200 text-center flex-shrink-0">
                <h3 className="font-display font-bold text-lg text-slate-800">Pratinjau Struk Laporan Shift</h3>
              </div>
              
              <div className="flex-1 overflow-auto p-6" id="shift-report-printable">
                <div className="bg-white shadow-sm p-6 mx-auto w-full max-w-[320px] font-mono text-sm text-slate-800 border-t-4 border-slate-800">
                  <div className="text-center mb-4">
                    <h2 className="font-bold text-xl uppercase mb-1">LAPORAN SHIFT KASIR</h2>
                    <p className="text-xs text-slate-500 mb-2">Toko Saya</p>
                    <div className="border-b border-dashed border-slate-300 pb-3 text-xs">
                      <div className="flex justify-between">
                        <span>Kasir:</span>
                        <span className="font-bold">{selectedShiftForPrint.cashier_name}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Buka:</span>
                        <span>{new Date(selectedShiftForPrint.start_time).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tutup:</span>
                        <span>{selectedShiftForPrint.end_time ? new Date(selectedShiftForPrint.end_time).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs border-b border-dashed border-slate-300 pb-4 mb-4">
                    <div className="flex justify-between">
                      <span>Modal Kas Awal</span>
                      <span className="font-semibold">{formatRupiah(selectedShiftForPrint.starting_cash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ekspektasi Uang Laci</span>
                      <span className="font-semibold">{formatRupiah(selectedShiftForPrint.expected_ending_cash || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uang Fisik Akhir</span>
                      <span className="font-bold">{formatRupiah(selectedShiftForPrint.actual_ending_cash || 0)}</span>
                    </div>
                  </div>

                  {(() => {
                    const diff = (selectedShiftForPrint.actual_ending_cash || 0) - (selectedShiftForPrint.expected_ending_cash || 0);
                    return (
                      <div className="text-center py-2 px-3 bg-slate-50 rounded border border-dashed border-slate-300 mb-4 text-xs font-bold">
                        <span>STATUS SELISIH: </span>
                        {diff === 0 ? (
                          <span className="text-emerald-700 uppercase">SESUAI (Rp 0)</span>
                        ) : diff > 0 ? (
                          <span className="text-blue-700 uppercase">LEBIH (+{formatRupiah(diff)})</span>
                        ) : (
                          <span className="text-red-700 uppercase">KURANG (-{formatRupiah(Math.abs(diff))})</span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-center text-xs text-slate-500">
                    <p className="mb-6">Tanda Tangan Kasir,</p>
                    <p className="font-bold border-b border-slate-400 pb-1 inline-block min-w-[120px]">({selectedShiftForPrint.cashier_name})</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 border-t border-slate-200 flex gap-2 flex-shrink-0">
                <Button 
                  onClick={() => printDocument("shift-report-printable")}
                  className="flex-1 bg-brand text-white font-bold"
                >
                  <LogOut className="size-4 mr-2 hidden" />
                  Cetak Struk Shift
                </Button>
                <Button onClick={() => setIsShiftPrintModalOpen(false)} variant="outline" className="flex-1 font-bold">
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

