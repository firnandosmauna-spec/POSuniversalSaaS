import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Settings, Plus, Trash2, LayoutGrid, Loader2, Tags, Building2, MapPin, Phone, Receipt, FileText, Hash, Sparkles, CreditCard, CheckCircle2, Crown, Zap, ShieldCheck, ArrowRight, Clock, Printer, Layers, Ruler, Scissors, Wrench, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";
import { getInvoiceSettings, saveInvoiceSettings, generateInvoiceCode, InvoiceSettings } from "@/shared/utils/invoiceGenerator";

import { PrintingSettingsView } from "@/domains/printing/SettingsView";

type TableData = {
  id: string;
  name: string;
  status: string;
};

export function SettingsView() {
  const { user, branches, addBranch, deleteBranch } = useAuth();

  if ((user?.businessType as string) === "PRINTING") {
    return <PrintingSettingsView />;
  }
  const [tables, setTables] = useState<TableData[]>([]);
  const [newTableName, setNewTableName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Categories
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Branch Form
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  // Tabs
  const [activeTab, setActiveTab] = useState<"langganan" | "meja" | "kategori" | "cabang" | "umum" | "invoice" | "printing_calc" | "printing_spk">("langganan");

  // Subscription
  const [subscriptionData, setSubscriptionData] = useState<{
    plan: string;
    status: string;
    trialUntil?: string | undefined;
    registeredAt?: string | undefined;
  } | null>(null);

  // Digital Printing Specific Settings
  const [minDpPercentage, setMinDpPercentage] = useState<number>(50);
  const [defaultEstimatedDays, setDefaultEstimatedDays] = useState<number>(1);
  const [enableFileProofing, setEnableFileProofing] = useState<boolean>(true);
  const [printers, setPrinters] = useState<{ id: string; name: string; type: string; status: string }[]>([
    { id: "p1", name: "Roland Outdoor 3.2m", type: "Banner Outdoor", status: "Ready" },
    { id: "p2", name: "Fuji Xerox Digital Press", type: "A3+ Offset Digital", status: "Ready" },
    { id: "p3", name: "Mimaki Cutting Plotter", type: "Sticker Cut", status: "Ready" },
  ]);
  const [newPrinterName, setNewPrinterName] = useState("");
  const [newPrinterType, setNewPrinterType] = useState("Banner Outdoor");

  // Settings
  const [taxRate, setTaxRate] = useState<number>(0);
  const [enableDineIn, setEnableDineIn] = useState<boolean>(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Invoice Code Settings
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [invoiceFormat, setInvoiceFormat] = useState("{PREFIX}-{YYYYMMDD}-{COUNTER}");
  const [invoiceCounterDigits, setInvoiceCounterDigits] = useState(4);
  const [invoiceCounterReset, setInvoiceCounterReset] = useState<"DAILY" | "MONTHLY" | "YEARLY" | "NEVER">("DAILY");

  const fetchTables = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await supabase.from("tables").select("*").order("name");
      setTables(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("categories").select("*").order("name");
      setCategories(data || []);
    } catch (error) {}
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // Fetch Tables
        const { data: tablesData } = await supabase.from("tables").select("*").order("name");
        setTables(tablesData || []);

        // Fetch Categories
        const { data: catData } = await supabase.from("categories").select("*").order("name");
        setCategories(catData || []);

        // Fetch Invoice Settings from localStorage
        const savedInvoice = getInvoiceSettings();
        setInvoicePrefix(savedInvoice.invoicePrefix);
        setInvoiceFormat(savedInvoice.invoiceFormat);
        setInvoiceCounterDigits(savedInvoice.invoiceCounterDigits);
        setInvoiceCounterReset(savedInvoice.invoiceCounterReset);

        // Fetch Subscription Settings from localStorage
        const subKey = `pos_tenant_${user.id}_subscription`;
        const savedSub = localStorage.getItem(subKey);
        if (savedSub) {
          try {
            setSubscriptionData(JSON.parse(savedSub));
          } catch (e) {}
        } else {
          const defaultSub = {
            plan: "Starter (Gratis)",
            status: "ACTIVE",
            registeredAt: new Date().toISOString()
          };
          setSubscriptionData(defaultSub);
          localStorage.setItem(subKey, JSON.stringify(defaultSub));
        }

        // Fetch Printing Settings from localStorage
        const printKey = `pos_tenant_${user.id}_printing_settings`;
        const savedPrint = localStorage.getItem(printKey);
        if (savedPrint) {
          try {
            const parsed = JSON.parse(savedPrint);
            if (parsed.minDpPercentage !== undefined) setMinDpPercentage(parsed.minDpPercentage);
            if (parsed.defaultEstimatedDays !== undefined) setDefaultEstimatedDays(parsed.defaultEstimatedDays);
            if (parsed.enableFileProofing !== undefined) setEnableFileProofing(parsed.enableFileProofing);
            if (parsed.printers) setPrinters(parsed.printers);
          } catch (e) {}
        }

        // Fetch Settings from Supabase
        const { data: settingsData } = await supabase.from("store_settings").select("*").eq("tenant_id", user.id).maybeSingle();
        if (settingsData) {
          setTaxRate(settingsData.tax_rate);
          if (settingsData.enable_dine_in !== undefined) setEnableDineIn(settingsData.enable_dine_in);
          if (settingsData.invoice_prefix) setInvoicePrefix(settingsData.invoice_prefix);
          if (settingsData.invoice_format) setInvoiceFormat(settingsData.invoice_format);
          if (settingsData.invoice_counter_digits) setInvoiceCounterDigits(settingsData.invoice_counter_digits);
          if (settingsData.invoice_counter_reset) setInvoiceCounterReset(settingsData.invoice_counter_reset);
          setSettingsId(settingsData.id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleAddPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrinterName.trim() || !user) return;
    const newPrinter = {
      id: `p_${Date.now()}`,
      name: newPrinterName.trim(),
      type: newPrinterType,
      status: "Ready",
    };
    const updated = [...printers, newPrinter];
    setPrinters(updated);
    setNewPrinterName("");

    const printKey = `pos_tenant_${user.id}_printing_settings`;
    localStorage.setItem(printKey, JSON.stringify({
      minDpPercentage,
      defaultEstimatedDays,
      enableFileProofing,
      printers: updated,
      updatedAt: new Date().toISOString()
    }));
    alert(`Mesin cetak "${newPrinter.name}" berhasil ditambahkan!`);
  };

  const handleDeletePrinter = (id: string) => {
    if (!user || !confirm("Hapus mesin cetak ini?")) return;
    const updated = printers.filter(p => p.id !== id);
    setPrinters(updated);
    const printKey = `pos_tenant_${user.id}_printing_settings`;
    localStorage.setItem(printKey, JSON.stringify({
      minDpPercentage,
      defaultEstimatedDays,
      enableFileProofing,
      printers: updated,
      updatedAt: new Date().toISOString()
    }));
  };

  const handleSavePrintingSettings = () => {
    if (!user) return;
    const printKey = `pos_tenant_${user.id}_printing_settings`;
    localStorage.setItem(printKey, JSON.stringify({
      minDpPercentage,
      defaultEstimatedDays,
      enableFileProofing,
      printers,
      updatedAt: new Date().toISOString()
    }));
    alert("Pengaturan SPK & Alur Produksi Percetakan Digital berhasil disimpan!");
  };

  const handleUpdatePlan = (newPlan: string) => {
    if (!user) return;
    const updated: {
      plan: string;
      status: string;
      registeredAt?: string | undefined;
      trialUntil?: string | undefined;
    } = {
      plan: newPlan,
      status: "ACTIVE",
      registeredAt: subscriptionData?.registeredAt || new Date().toISOString(),
      trialUntil: newPlan === "Starter (Gratis)" ? undefined : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem(`pos_tenant_${user.id}_subscription`, JSON.stringify(updated));
    setSubscriptionData(updated);
    alert(`Paket langganan bisnis Anda berhasil diperbarui ke "${newPlan}"!`);
  };

  const handleSaveInvoiceSettings = async () => {
    setIsSubmitting(true);
    try {
      const newSettings: InvoiceSettings = {
        invoicePrefix,
        invoiceFormat,
        invoiceCounterDigits,
        invoiceCounterReset,
      };
      saveInvoiceSettings(newSettings);

      if (settingsId && user) {
        await supabase.from("store_settings").update({
          invoice_prefix: invoicePrefix,
          invoice_format: invoiceFormat,
          invoice_counter_digits: invoiceCounterDigits,
          invoice_counter_reset: invoiceCounterReset,
          updated_at: new Date().toISOString()
        }).eq("id", settingsId);
      }
      alert("Pengaturan Kode & Format Invoice berhasil disimpan!");
    } catch (error) {
      console.error(error);
      alert("Pengaturan format invoice disimpan secara lokal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTableName.trim()) return;
    setIsSubmitting(true);
    try {
      await supabase.from("tables").insert({
        tenant_id: user.id,
        name: newTableName.trim(),
        status: "available"
      });
      setNewTableName("");
      fetchTables();
    } catch (error) {
      console.error(error);
      alert("Gagal menambah meja.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm("Hapus meja ini?")) return;
    try {
      await supabase.from("tables").delete().eq("id", id);
      fetchTables();
    } catch (error) {
      console.error(error);
    }
  };

  const markAvailable = async (id: string) => {
    try {
      await supabase.from("tables").update({ status: "available" }).eq("id", id);
      fetchTables();
    } catch (error) {
      console.error(error);
    }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategoryName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("categories").insert({
        tenant_id: user.id,
        name: newCategoryName.trim()
      });
      if (error) throw error;
      setNewCategoryName("");
      fetchCategories();
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menambah kategori: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Hapus kategori ini? (Hanya menghapus dari daftar, produk yang sudah memakai kategori ini akan tetap memiliki namanya)")) return;
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      fetchCategories();
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menghapus kategori: ${error.message}`);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (settingsId) {
        await supabase.from("store_settings").update({ tax_rate: taxRate, enable_dine_in: enableDineIn, updated_at: new Date().toISOString() }).eq("id", settingsId);
      } else {
        const { data } = await supabase.from("store_settings").insert({ tenant_id: user.id, tax_rate: taxRate, enable_dine_in: enableDineIn }).select().single();
        if (data) setSettingsId(data.id);
      }
      alert("Pengaturan berhasil disimpan.");
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan pengaturan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    setIsSubmitting(true);
    try {
      await addBranch(branchName.trim(), branchAddress.trim(), branchPhone.trim());
      setBranchName("");
      setBranchAddress("");
      setBranchPhone("");
      alert("Cabang baru berhasil ditambahkan!");
    } catch (e: any) {
      alert("Gagal menambahkan cabang: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Pengaturan Toko & Outlet
        </h1>
      </div>
      
      <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Sidebar Kiri - Menu Pengaturan */}
        <div className="col-span-1 border-r border-slate-200 pr-6 space-y-2">
          <button 
            onClick={() => setActiveTab("langganan")}
            className={`w-full text-left px-4 py-3 font-semibold rounded-lg flex items-center justify-between transition-colors ${activeTab === "langganan" ? "bg-brand/10 text-brand font-bold shadow-sm ring-1 ring-brand/20" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="size-5 text-indigo-600" />
              <span>Status Paket & Billing</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {subscriptionData?.plan || "Aktif"}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab("cabang")}
            className={`w-full text-left px-4 py-3 font-semibold rounded-lg flex items-center gap-3 transition-colors ${activeTab === "cabang" ? "bg-brand/10 text-brand font-bold" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Building2 className="size-5" />
            Kelola Cabang / Outlet
          </button>
          {user?.businessType === "PRINTING" && (
            <>
              <button 
                onClick={() => setActiveTab("printing_calc")}
                className={`w-full text-left px-4 py-3 font-semibold rounded-lg flex items-center justify-between transition-colors ${activeTab === "printing_calc" ? "bg-brand/10 text-brand font-bold shadow-sm ring-1 ring-brand/20" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <div className="flex items-center gap-3">
                  <Printer className="size-5 text-indigo-600" />
                  <span>Mesin Cetak & Meteran</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  PRINT
                </span>
              </button>
              <button 
                onClick={() => setActiveTab("printing_spk")}
                className={`w-full text-left px-4 py-3 font-semibold rounded-lg flex items-center justify-between transition-colors ${activeTab === "printing_spk" ? "bg-brand/10 text-brand font-bold shadow-sm ring-1 ring-brand/20" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-emerald-600" />
                  <span>Alur SPK & DP Pesanan</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  SPK
                </span>
              </button>
            </>
          )}
          {enableDineIn && (
            <button 
              onClick={() => setActiveTab("meja")}
              className={`w-full text-left px-4 py-3 font-semibold rounded-lg flex items-center gap-3 transition-colors ${activeTab === "meja" ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <LayoutGrid className="size-5" />
              Manajemen Meja
            </button>
          )}
          <button 
            onClick={() => setActiveTab("kategori")}
            className={`w-full text-left px-4 py-3 font-semibold rounded-lg flex items-center gap-3 transition-colors ${activeTab === "kategori" ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Tags className="size-5" />
            Kategori Produk
          </button>
          <button 
            onClick={() => setActiveTab("invoice")}
            className={`w-full text-left px-4 py-3 font-semibold rounded-lg flex items-center gap-3 transition-colors ${activeTab === "invoice" ? "bg-brand/10 text-brand font-bold" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Receipt className="size-5" />
            Format & Kode Invoice
          </button>
          <button 
            onClick={() => setActiveTab("umum")}
            className={`w-full text-left px-4 py-3 font-semibold rounded-lg flex items-center gap-3 transition-colors ${activeTab === "umum" ? "bg-brand/10 text-brand font-bold" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Settings className="size-5" />
            Pengaturan Umum
          </button>
        </div>

        {/* Konten Kanan - Tabel / Pengaturan Umum */}
        <div className="col-span-2 flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden">
          {activeTab === "langganan" ? (
            <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Crown className="size-6 text-amber-500" />
                      Paket Langganan & Status Billing POS
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Status lisensi POS, paket harga yang dipilih saat mendaftar, dan fitur aktif bisnis Anda.
                    </p>
                  </div>
                  <Link 
                    to="/harga" 
                    className="px-4 py-2 bg-gradient-to-r from-brand to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="size-4" />
                    Halaman Harga POS
                  </Link>
                </div>
              </div>

              {/* Hero Card Active Plan */}
              <div className={`p-6 rounded-2xl border ${
                subscriptionData?.plan?.toLowerCase().includes("enterprise")
                  ? "bg-gradient-to-br from-amber-950 via-slate-900 to-black text-white border-amber-500/30 shadow-xl"
                  : subscriptionData?.plan?.toLowerCase().includes("growth")
                  ? "bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border-indigo-500/30 shadow-xl"
                  : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700 shadow-xl"
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                        STATUS: {subscriptionData?.status || "ACTIVE"}
                      </span>
                      {subscriptionData?.trialUntil && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                          <Clock className="size-3" />
                          Masa Trial 14 Hari
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      Paket {subscriptionData?.plan || "Starter (Gratis)"}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Terdaftar pada: {subscriptionData?.registeredAt ? new Date(subscriptionData.registeredAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Saat Pendaftaran Pertama"}
                    </p>
                  </div>

                  <div className="text-left md:text-right bg-white/10 backdrop-blur px-5 py-3 rounded-xl border border-white/10">
                    <div className="text-[11px] uppercase font-extrabold text-slate-300 tracking-wider">Status Biaya / Harga</div>
                    <div className="text-2xl font-black text-emerald-400 mt-0.5">
                      {subscriptionData?.plan?.toLowerCase().includes("growth")
                        ? "Rp 299.000 / bln"
                        : subscriptionData?.plan?.toLowerCase().includes("enterprise")
                        ? "Rp 799.000 / bln"
                        : "GRATIS (Rp 0)"}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      {subscriptionData?.plan?.toLowerCase().includes("starter") || !subscriptionData?.plan || subscriptionData?.plan?.toLowerCase().includes("gratis")
                        ? "Tidak ada tagihan bulanan"
                        : "Billed Monthly / Tahunan"}
                    </div>
                  </div>
                </div>

                {/* Feature Badges */}
                <div className="pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-400" />
                    Fasilitas & Fitur Terbuka pada Akun Anda:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Multi-Cabang & Outlet</span>
                        <span className="text-slate-300 text-[11px]">
                          {subscriptionData?.plan?.toLowerCase().includes("enterprise")
                            ? "Unlimited Outlet & Cabang Bebas"
                            : subscriptionData?.plan?.toLowerCase().includes("growth")
                            ? "Mendukung s/d 5 Outlet Cabang"
                            : "1 Outlet Cabang Utama"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Manajemen Kasir & Staf</span>
                        <span className="text-slate-300 text-[11px]">
                          {subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis")
                            ? "Mendukung s/d 2 Akun Staf/Kasir"
                            : "Akses Akun Kasir & Manager Tanpa Batas"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Akses Seluruh Modul POS</span>
                        <span className="text-slate-300 text-[11px]">
                          F&B, Retail, Percetakan, Laundry, Gym, Apotek, Workshop & Ecommerce.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Laporan & Struk Invoice</span>
                        <span className="text-slate-300 text-[11px]">
                          Cetak Struk Thermal, Struk WA, Laporan Penjualan Realtime.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Plan Switch / Upgrade Cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Zap className="size-4 text-indigo-600" />
                  Pilihan Paket Langganan POS Universal SaaS:
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Starter Card */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan
                      ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900">Starter (Gratis)</span>
                        {(subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan) && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Paket Saat Ini
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-black text-slate-900 mb-1">Rp 0 <span className="text-xs font-medium text-slate-500">/ selamanya</span></div>
                      <p className="text-xs text-slate-500 mb-4">Cocok untuk usaha rintisan dan UMKM mikro yang baru memulai POS digital.</p>
                      <ul className="text-xs space-y-2 text-slate-600">
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-500" /> 1 Outlet / Cabang Toko</li>
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-500" /> Maksimal 2 Akun Staf/Kasir</li>
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-500" /> Cetak Struk & Bluetooth Printer</li>
                      </ul>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleUpdatePlan("Starter (Gratis)")}
                        disabled={subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan}
                        className={`w-full py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                          subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 cursor-default"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                        }`}
                      >
                        {subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan ? "Paket Saat Ini" : "Pilih Paket Starter"}
                      </button>
                    </div>
                  </div>

                  {/* Growth Card */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    subscriptionData?.plan?.toLowerCase().includes("growth")
                      ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-1">
                          Growth
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-1.5 py-0.5 rounded">POPULER</span>
                        </span>
                        {subscriptionData?.plan?.toLowerCase().includes("growth") && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                            Paket Saat Ini
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-black text-indigo-600 mb-1">Rp 299.000 <span className="text-xs font-medium text-slate-500">/ bulan</span></div>
                      <p className="text-xs text-slate-500 mb-4">Solusi terlengkap untuk toko bertumbuh yang butuh multi cabang & laporan.</p>
                      <ul className="text-xs space-y-2 text-slate-600">
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-indigo-500" /> Up to 5 Cabang / Outlet</li>
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-indigo-500" /> Unlimited Staf & Kasir</li>
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-indigo-500" /> Laporan Analitik Laba Rugi</li>
                      </ul>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleUpdatePlan("Growth")}
                        disabled={subscriptionData?.plan?.toLowerCase().includes("growth")}
                        className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                          subscriptionData?.plan?.toLowerCase().includes("growth")
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-300 cursor-default"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        }`}
                      >
                        {subscriptionData?.plan?.toLowerCase().includes("growth") ? "Paket Saat Ini" : "Upgrade ke Growth"}
                      </button>
                    </div>
                  </div>

                  {/* Enterprise Card */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    subscriptionData?.plan?.toLowerCase().includes("enterprise")
                      ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900">Enterprise</span>
                        {subscriptionData?.plan?.toLowerCase().includes("enterprise") && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            Paket Saat Ini
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-black text-amber-600 mb-1">Rp 799.000 <span className="text-xs font-medium text-slate-500">/ bulan</span></div>
                      <p className="text-xs text-slate-500 mb-4">Fitur custom, unlimited cabang, integrasi gudang & dedicated support.</p>
                      <ul className="text-xs space-y-2 text-slate-600">
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-amber-500" /> Unlimited Cabang & Warehouse</li>
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-amber-500" /> Integrasi E-Commerce & API</li>
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-amber-500" /> Dedicated Account Manager</li>
                      </ul>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleUpdatePlan("Enterprise")}
                        disabled={subscriptionData?.plan?.toLowerCase().includes("enterprise")}
                        className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                          subscriptionData?.plan?.toLowerCase().includes("enterprise")
                            ? "bg-amber-100 text-amber-800 border border-amber-300 cursor-default"
                            : "bg-slate-900 hover:bg-black text-white shadow-sm"
                        }`}
                      >
                        {subscriptionData?.plan?.toLowerCase().includes("enterprise") ? "Paket Saat Ini" : "Upgrade Enterprise"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "printing_calc" ? (
            <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="size-6 text-indigo-600" />
                  Pengaturan Mesin Cetak & Kalkulator Meteran (m²)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola armada mesin cetak percetakan digital, kategori bahan outdoor/indoor, dan opsi tarif finishing.
                </p>
              </div>

              {/* Form Tambah Mesin Cetak */}
              <form onSubmit={handleAddPrinter} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Plus className="size-4 text-brand" /> Tambah Mesin Cetak / Produksi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Mesin Cetak</label>
                    <Input 
                      required 
                      placeholder="Contoh: Roland Outdoor 3.2m, Fuji Xerox A3+" 
                      value={newPrinterName}
                      onChange={(e) => setNewPrinterName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kategori Spesialisasi</label>
                    <select
                      value={newPrinterType}
                      onChange={(e) => setNewPrinterType(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="Banner Outdoor">Banner Outdoor (Flexi / Spanduk)</option>
                      <option value="Digital Press A3+">Digital Press A3+ (Art Paper / Stiker)</option>
                      <option value="Sublim & Textile">Sublimasi & Tekstil (Jersey / Hijab)</option>
                      <option value="Plotter Cutting & Laser">Plotter Cutting & Laser Cut</option>
                      <option value="UV Flatbed">UV Flatbed (Akrilik / Flute / Case)</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled={!newPrinterName.trim()} className="bg-brand text-white font-bold text-xs">
                  <Plus className="size-4 mr-1.5" /> Tambah Mesin
                </Button>
              </form>

              {/* Daftar Mesin Cetak Terdaftar */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Daftar Mesin Cetak & Status ({printers.length})</h3>
                <div className="grid grid-cols-1 gap-3">
                  {printers.map((p) => (
                    <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Printer className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                              {p.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Tipe: {p.type}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePrinter(p.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarif & Finishing Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Scissors className="size-4 text-indigo-600" />
                  Daftar Pilihan Finishing Percetakan Aktif
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800">
                    Laminasi Doff / Glossy
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800">
                    Mata Ayam / Ring Banner
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800">
                    Potong Kiss Cut / Die Cut
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800">
                    Jilid Spiral / Hardcover
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "printing_spk" ? (
            <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="size-6 text-emerald-600" />
                  Alur SPK Produksi & Pengaturan DP (Down Payment)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Atur syarat uang muka (DP minimal), estimasi hari pengerjaan, dan validasi berkas cetak pelanggan.
                </p>
              </div>

              <div className="space-y-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
                {/* Min DP % */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Minimal Uang Muka / DP Pesanan (%)
                  </label>
                  <p className="text-xs text-slate-500 mb-3">Persentase uang muka wajib saat pelanggan membuat Job Order SPK baru.</p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-32">
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={minDpPercentage}
                        onChange={(e) => setMinDpPercentage(Number(e.target.value))}
                        className="pr-8 font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">%</span>
                    </div>
                    <span className="text-xs text-slate-500">Default: 50% dari Total Transaksi</span>
                  </div>
                </div>

                {/* Default SLA */}
                <div className="border-t border-slate-200 pt-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Estimasi Pengerjaan Standar (Hari Kerja)
                  </label>
                  <p className="text-xs text-slate-500 mb-3">Target waktu penyelesaian SPK dari status Pre-press hingga Siap Ambil.</p>
                  <div className="grid grid-cols-4 gap-2 max-w-md">
                    {[1, 2, 3, 5].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setDefaultEstimatedDays(day)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          defaultEstimatedDays === day
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {day} Hari Kerja
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proofing File Toggle */}
                <div className="border-t border-slate-200 pt-5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={enableFileProofing}
                      onChange={(e) => setEnableFileProofing(e.target.checked)}
                      className="size-5 rounded text-emerald-600 focus:ring-emerald-600 accent-emerald-600 cursor-pointer"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-slate-800">Aktifkan Fitur Checking File & Proofing Desain</span>
                      <span className="block text-xs text-slate-500">Staf operator akan memverifikasi resolusi, mode warna CMYK, dan bleed sebelum mencetak SPK.</span>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button onClick={handleSavePrintingSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 shadow-md">
                    Simpan Pengaturan SPK Produksi
                  </Button>
                </div>
              </div>
            </div>
          ) : activeTab === "cabang" ? (
            <div className="flex flex-col h-full overflow-y-auto">
              <h2 className="text-lg font-bold text-slate-800 mb-1">Manajemen Multi-Cabang (Outlets)</h2>
              <p className="text-xs text-slate-500 mb-6">Tambah outlet baru dan kelola seluruh cabang bisnis Anda dari satu tempat.</p>

              {/* Form Tambah Cabang */}
              <form onSubmit={handleCreateBranch} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Tambah Cabang Baru</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input 
                    required 
                    placeholder="Nama Cabang (cth: Cabang Bandung)" 
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                  />
                  <Input 
                    placeholder="Alamat Lengkap" 
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                  />
                  <Input 
                    placeholder="No. Telepon / WA" 
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting || !branchName.trim()} className="bg-brand text-white font-bold text-xs">
                  <Plus className="size-4 mr-1.5" /> Tambah Cabang Baru
                </Button>
              </form>

              {/* Daftar Cabang */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Cabang Terdaftar ({branches.length})</h3>
                <div className="grid grid-cols-1 gap-3">
                  {branches.map((b) => (
                    <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
                          <Building2 className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                            {b.is_main ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                                PUSAT
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                                CABANG
                              </span>
                            )}
                          </div>
                          {b.address && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <MapPin className="size-3" /> {b.address}
                            </p>
                          )}
                          {b.phone && (
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <Phone className="size-3" /> {b.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {!b.is_main && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if (confirm(`Hapus cabang "${b.name}"?`)) {
                              deleteBranch(b.id);
                            }
                          }} 
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === "meja" ? (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-4">Daftar Meja (Dine In)</h2>
              
              <form onSubmit={addTable} className="flex gap-3 mb-6">
                <div className="flex-1">
                  <Input 
                    placeholder="Cth: Meja 1, VIP 2, Outdoor A" 
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isSubmitting || !newTableName.trim()} className="bg-brand text-white">
                  <Plus className="size-4 mr-2" /> Tambah Meja
                </Button>
              </form>

              <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="size-6 animate-spin text-brand" />
                  </div>
                ) : tables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                    <LayoutGrid className="size-8 mb-2 opacity-20" />
                    <p className="text-sm">Belum ada meja yang didaftarkan.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-3 font-semibold">Nama / Nomor Meja</th>
                        <th className="p-3 font-semibold text-center">Status</th>
                        <th className="p-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tables.map(table => (
                        <tr key={table.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">{table.name}</td>
                          <td className="p-3 text-center">
                            {table.status === 'available' ? (
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold">Tersedia</span>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-semibold">Terisi</span>
                                <button onClick={() => markAvailable(table.id)} className="text-[10px] text-brand hover:underline">Kosongkan</button>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => deleteTable(table.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : activeTab === "kategori" ? (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-4">Kategori Produk</h2>
              
              <form onSubmit={addCategory} className="flex gap-3 mb-6">
                <div className="flex-1">
                  <Input 
                    placeholder="Cth: Minuman Dingin, Makanan Utama, Snack" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isSubmitting || !newCategoryName.trim()} className="bg-brand text-white">
                  <Plus className="size-4 mr-2" /> Tambah Kategori
                </Button>
              </form>

              <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="size-6 animate-spin text-brand" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                    <Tags className="size-8 mb-2 opacity-20" />
                    <p className="text-sm">Belum ada kategori yang didaftarkan.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-3 font-semibold">Nama Kategori</th>
                        <th className="p-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">{cat.name}</td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => deleteCategory(cat.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : activeTab === "invoice" ? (
            <div className="flex flex-col h-full overflow-y-auto space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800">Format & Kode Invoice</h2>
                <p className="text-xs text-slate-500 mt-1">Atur penomoran dan pola struktur nomor nota/invoice otomatis untuk setiap transaksi kasir.</p>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-brand/10 via-indigo-50 to-emerald-50 border border-brand/20 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                    <Sparkles className="size-4" />
                    <span>Pratinjau Hasil Kode Invoice:</span>
                  </div>
                  <div className="font-mono text-xl font-extrabold text-slate-900 tracking-wider">
                    {generateInvoiceCode({
                      invoicePrefix,
                      invoiceFormat,
                      invoiceCounterDigits,
                      invoiceCounterReset
                    }, 1, branches[0]?.name || "PUSAT")}
                  </div>
                  <p className="text-[11px] text-slate-500">Contoh tampilan invoice untuk transaksi pertama di hari baru.</p>
                </div>
                <div className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
                  Resets: <span className="font-bold text-slate-800">{invoiceCounterReset}</span>
                </div>
              </div>

              {/* Prefix & Pattern */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Awalan (Prefix Invoice)
                  </label>
                  <Input 
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                    placeholder="Contoh: INV, NOTA, TRX, KASIR"
                    className="font-mono text-sm uppercase"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Kode singkat nama toko atau tipe transaksi.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Jumlah Digit Nomor Urut ({invoiceCounterDigits} Digit)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 4, 5, 6].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => setInvoiceCounterDigits(digit)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          invoiceCounterDigits === digit
                            ? "bg-brand text-white border-brand shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {digit} Digit ({'0'.repeat(digit - 1)}1)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preset Format Patterns */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Pilihan Pola Format Invoice
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Prefix-Tanggal-Counter", fmt: "{PREFIX}-{YYYYMMDD}-{COUNTER}" },
                    { label: "Prefix/Tanggal/Counter", fmt: "{PREFIX}/{YYYYMMDD}/{COUNTER}" },
                    { label: "Prefix-Counter Saja", fmt: "{PREFIX}-{COUNTER}" },
                    { label: "Prefix/Cabang/Tanggal/Counter", fmt: "{PREFIX}/{BRANCH}/{YYYYMMDD}/{COUNTER}" },
                  ].map((preset) => (
                    <button
                      key={preset.fmt}
                      type="button"
                      onClick={() => setInvoiceFormat(preset.fmt)}
                      className={`p-3 text-left rounded-xl border text-xs transition-all ${
                        invoiceFormat === preset.fmt
                          ? "bg-indigo-50/80 border-brand text-slate-900 ring-2 ring-brand/20 font-semibold"
                          : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-bold mb-0.5 text-slate-800">{preset.label}</div>
                      <div className="font-mono text-[11px] text-brand">{preset.fmt}</div>
                    </button>
                  ))}
                </div>

                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Format Kustom (Gunakan Tag: &#123;PREFIX&#125;, &#123;YYYYMMDD&#125;, &#123;COUNTER&#125;, &#123;BRANCH&#125;)
                </label>
                <Input 
                  value={invoiceFormat}
                  onChange={(e) => setInvoiceFormat(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="{PREFIX}-{YYYYMMDD}-{COUNTER}"
                />
              </div>

              {/* Reset Strategy */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Siklus Reset Nomor Urut Counter
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "DAILY", title: "Harian", desc: "Reset tiap pergantian tanggal" },
                    { id: "MONTHLY", title: "Bulanan", desc: "Reset awal bulan baru" },
                    { id: "YEARLY", title: "Tahunan", desc: "Reset awal tahun baru" },
                    { id: "NEVER", title: "Terus Menerus", desc: "Nomor berlanjut tanpa reset" },
                  ].map((cycle) => (
                    <button
                      key={cycle.id}
                      type="button"
                      onClick={() => setInvoiceCounterReset(cycle.id as any)}
                      className={`p-3 text-left rounded-xl border text-xs transition-all ${
                        invoiceCounterReset === cycle.id
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400/20 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-bold text-slate-800">{cycle.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{cycle.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button 
                  onClick={handleSaveInvoiceSettings} 
                  disabled={isSubmitting} 
                  className="bg-brand text-white font-bold px-6 shadow-md"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Simpan Pengaturan Invoice
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-4">Pengaturan Umum</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pajak Toko (PPN/PB1)</label>
                  <p className="text-sm text-slate-500 mb-3">Persentase pajak yang akan dibebankan ke setiap transaksi. Masukkan 0 jika tidak ada pajak.</p>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative w-32">
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">%</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={enableDineIn}
                      onChange={(e) => {
                        setEnableDineIn(e.target.checked);
                        if (!e.target.checked && (activeTab as string) === "meja") setActiveTab("kategori");
                      }}
                      className="size-5 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-slate-800">Aktifkan Fitur Meja (Dine In)</span>
                      <span className="block text-xs text-slate-500">Jika dimatikan, opsi Makan di Tempat (Dine In) dan Pengaturan Meja akan disembunyikan.</span>
                    </div>
                  </label>
                </div>

                <Button onClick={saveSettings} disabled={isSubmitting} className="bg-brand text-white mt-6">
                  Simpan Pengaturan
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
