import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Settings, Plus, Trash2, LayoutGrid, Loader2, Tags, Building2, MapPin, Phone, Receipt, FileText, Hash, Sparkles, CreditCard, CheckCircle2, Crown, Zap, ShieldCheck, ArrowRight, Clock, Printer, Layers, Ruler, Scissors, Wrench, ArrowLeft, Bluetooth, Menu, Store, ChevronRight, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";
import { getInvoiceSettings, saveInvoiceSettings, generateInvoiceCode, InvoiceSettings } from "@/shared/utils/invoiceGenerator";
import { toast } from "sonner";
import { PrintingSettingsView } from "@/domains/printing/SettingsView";
import { LaundrySettingsView } from "@/domains/laundry/SettingsView";

type TableData = {
  id: string;
  name: string;
  status: string;
};

export function SettingsView() {
  const { user, branches, addBranch, deleteBranch, activeBranchName } = useAuth();

  if ((user?.businessType as string) === "PRINTING") {
    return <PrintingSettingsView />;
  }
  if ((user?.businessType as string) === "LAUNDRY") {
    return <LaundrySettingsView />;
  }
  const [tables, setTables] = useState<TableData[]>([]);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCategory, setNewTableCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableSubTab, setTableSubTab] = useState<"meja" | "area">("meja");
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaType, setNewAreaType] = useState<"smoking" | "non-smoking" | "">("");

  // Categories
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Branch Form
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  // Tabs
  const [activeTab, setActiveTab] = useState<"langganan" | "meja" | "kategori" | "cabang" | "umum" | "invoice" | "printing_calc" | "printing_spk" | "printer">("langganan");

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
    const finalName = newTableCategory.trim() 
      ? `[${newTableCategory.trim()}] ${newTableName.trim()}` 
      : newTableName.trim();
    try {
      await supabase.from("tables").insert({
        tenant_id: user.id,
        name: finalName,
        status: "available"
      });
      setNewTableName("");
      setNewTableCategory("");
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
    <div className="p-2 md:p-6 h-full flex flex-col gap-2 md:gap-6 overflow-hidden bg-slate-50 md:bg-transparent">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg md:text-2xl font-bold text-slate-900">
          Pengaturan Toko
        </h1>
      </div>
      
      <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-6 flex-1 overflow-hidden">
        {/* Sidebar Kiri - Menu Pengaturan */}
        <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-4 flex overflow-x-auto md:flex-col gap-1.5 md:space-y-1.5 shrink-0 scrollbar-hide">
          <button 
            onClick={() => setActiveTab("langganan")}
            className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "langganan" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >
            <div className="flex items-center gap-1.5 md:gap-2">
              <CreditCard className={`size-3.5 md:size-4 ${activeTab === "langganan" ? "text-white" : "text-slate-400"}`} />
              <span>Paket & Billing</span>
            </div>
            <span className={`hidden md:inline-block text-[8px] md:text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${activeTab === "langganan" ? "bg-white/20 text-white border-white/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
              {subscriptionData?.plan || "Aktif"}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab("cabang")}
            className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "cabang" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >
            <Building2 className={`size-3.5 md:size-4 ${activeTab === "cabang" ? "text-white" : "text-slate-400"}`} />
            Kelola Cabang
          </button>
          {user?.businessType === "PRINTING" && (
            <>
              <button 
                onClick={() => setActiveTab("printing_calc")}
                className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "printing_calc" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Printer className={`size-3.5 md:size-4 ${activeTab === "printing_calc" ? "text-white" : "text-slate-400"}`} />
                  <span>Mesin Cetak</span>
                </div>
              </button>
              <button 
                onClick={() => setActiveTab("printing_spk")}
                className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "printing_spk" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  <FileText className={`size-3.5 md:size-4 ${activeTab === "printing_spk" ? "text-white" : "text-slate-400"}`} />
                  <span>Alur SPK & DP</span>
                </div>
              </button>
            </>
          )}
          {enableDineIn && (
            <button 
              onClick={() => setActiveTab("meja")}
              className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "meja" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
            >
              <LayoutGrid className={`size-3.5 md:size-4 ${activeTab === "meja" ? "text-white" : "text-slate-400"}`} />
              Meja (Dine In)
            </button>
          )}
          <button 
            onClick={() => setActiveTab("kategori")}
            className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "kategori" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >
            <Tags className={`size-3.5 md:size-4 ${activeTab === "kategori" ? "text-white" : "text-slate-400"}`} />
            Kategori Produk
          </button>
          <button 
            onClick={() => setActiveTab("printer")}
            className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "printer" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >
            <Bluetooth className={`size-3.5 md:size-4 ${activeTab === "printer" ? "text-white" : "text-slate-400"}`} />
            Printer Kasir
          </button>
          <button 
            onClick={() => setActiveTab("invoice")}
            className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "invoice" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >
            <Receipt className={`size-3.5 md:size-4 ${activeTab === "invoice" ? "text-white" : "text-slate-400"}`} />
            Format Invoice
          </button>
          <button 
            onClick={() => setActiveTab("umum")}
            className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "umum" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >
            <Settings className={`size-3.5 md:size-4 ${activeTab === "umum" ? "text-white" : "text-slate-400"}`} />
            Pengaturan Umum
          </button>
        </div>

        {/* Konten Kanan - Tabel / Pengaturan Umum */}
        <div className="md:col-span-3 flex flex-col h-full bg-white rounded-2xl border border-slate-100 shadow-sm p-3 md:p-6 overflow-hidden">
          {activeTab === "langganan" ? (
            <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-3 md:space-y-6">
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm md:text-xl font-bold text-slate-900 flex items-center gap-1.5 md:gap-2">
                      <Crown className="size-4 md:size-6 text-amber-500" />
                      Paket & Billing
                    </h2>
                    <p className="text-[10px] md:text-sm text-slate-500 md:mt-1">
                      Status lisensi POS, paket harga, dan fitur aktif bisnis Anda.
                    </p>
                  </div>
                  <Link 
                    to="/harga" 
                    className="px-4 md:px-5 py-2 md:py-2.5 bg-[#0b172a] text-white font-bold text-[10px] md:text-sm rounded-xl shadow-sm hover:shadow hover:bg-slate-800 transition-all flex items-center justify-center gap-1 md:gap-2 w-full md:w-auto"
                  >
                    <Sparkles className="size-3 md:size-4" />
                    Halaman Harga POS
                  </Link>
                </div>
              </div>

              {/* Hero Card Active Plan */}
              <div className={`p-4 md:p-8 rounded-2xl border ${
                subscriptionData?.plan?.toLowerCase().includes("enterprise")
                  ? "bg-gradient-to-br from-amber-950 via-slate-900 to-black text-white border-amber-500/30 shadow-lg"
                  : subscriptionData?.plan?.toLowerCase().includes("growth")
                  ? "bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border-indigo-500/30 shadow-lg"
                  : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700 shadow-lg"
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 pb-3 md:pb-6 border-b border-white/10">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                      <span className="px-1.5 md:px-3 py-0.5 md:py-1 rounded-none text-[8px] md:text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 md:gap-1.5">
                        <span className="size-1.5 md:size-2 rounded-full bg-emerald-400 animate-pulse" />
                        STATUS: {subscriptionData?.status || "ACTIVE"}
                      </span>
                      {subscriptionData?.trialUntil && (
                        <span className="px-1.5 md:px-3 py-0.5 md:py-1 rounded-none text-[8px] md:text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                          <Clock className="size-2.5 md:size-3" />
                          Masa Trial
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm md:text-2xl font-black text-white tracking-tight flex items-center gap-1 md:gap-2">
                      Paket {subscriptionData?.plan || "Starter"}
                    </h3>
                    <p className="text-[8px] md:text-xs text-slate-300 mt-0.5 md:mt-1">
                      Terdaftar: {subscriptionData?.registeredAt ? new Date(subscriptionData.registeredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Saat Pendaftaran"}
                    </p>
                  </div>

                  <div className="text-left md:text-right bg-white/10 backdrop-blur px-3 md:px-5 py-2 md:py-3 rounded-none border border-white/10">
                    <div className="text-[8px] md:text-[11px] uppercase font-extrabold text-slate-300 tracking-wider">Status Biaya</div>
                    <div className="text-sm md:text-2xl font-black text-emerald-400 mt-0.5">
                      {subscriptionData?.plan?.toLowerCase().includes("growth")
                        ? "Rp 299.000 / bln"
                        : subscriptionData?.plan?.toLowerCase().includes("enterprise")
                        ? "Rp 799.000 / bln"
                        : "GRATIS (Rp 0)"}
                    </div>
                    <div className="text-[8px] md:text-[10px] text-slate-300 md:mt-0.5">
                      {subscriptionData?.plan?.toLowerCase().includes("starter") || !subscriptionData?.plan || subscriptionData?.plan?.toLowerCase().includes("gratis")
                        ? "Tidak ada tagihan bulanan"
                        : "Billed Monthly"}
                    </div>
                  </div>
                </div>

                {/* Feature Badges */}
                <div className="pt-3 md:pt-6">
                  <h4 className="text-[8px] md:text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 md:mb-3 flex items-center gap-1 md:gap-1.5">
                    <ShieldCheck className="size-3 md:size-4 text-emerald-400" />
                    Fasilitas Terbuka:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3 text-[9px] md:text-xs">
                    <div className="flex items-start gap-1.5 md:gap-2 bg-white/5 p-1.5 md:p-2.5 rounded-none border border-white/10">
                      <CheckCircle2 className="size-3 md:size-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Multi-Cabang & Outlet</span>
                        <span className="text-slate-300 text-[8px] md:text-[11px]">
                          {subscriptionData?.plan?.toLowerCase().includes("enterprise")
                            ? "Unlimited Outlet"
                            : subscriptionData?.plan?.toLowerCase().includes("growth")
                            ? "s/d 5 Outlet Cabang"
                            : "1 Outlet Utama"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 md:gap-2 bg-white/5 p-1.5 md:p-2.5 rounded-none border border-white/10">
                      <CheckCircle2 className="size-3 md:size-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Manajemen Staf</span>
                        <span className="text-slate-300 text-[8px] md:text-[11px]">
                          {subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis")
                            ? "s/d 2 Akun Staf"
                            : "Akses Akun Staf Tanpa Batas"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 md:gap-2 bg-white/5 p-1.5 md:p-2.5 rounded-none border border-white/10">
                      <CheckCircle2 className="size-3 md:size-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Akses Modul POS</span>
                        <span className="text-slate-300 text-[8px] md:text-[11px]">
                          F&B, Retail, Laundry, Apotek, dsb.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 md:gap-2 bg-white/5 p-1.5 md:p-2.5 rounded-none border border-white/10">
                      <CheckCircle2 className="size-3 md:size-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Laporan & Struk</span>
                        <span className="text-slate-300 text-[8px] md:text-[11px]">
                          Cetak Struk Thermal, Struk WA, Laporan.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Plan Switch / Upgrade Cards */}
              <div className="space-y-2 md:space-y-3">
                <h3 className="text-[10px] md:text-sm font-bold text-slate-800 flex items-center gap-1.5 md:gap-2">
                  <Zap className="size-3 md:size-4 text-indigo-600" />
                  Pilihan Paket:
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                  {/* Starter Card */}
                  <div className={`p-3 md:p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan
                      ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20 shadow-md"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-1.5 md:mb-2">
                        <span className="font-bold text-[10px] md:text-sm text-slate-900">Starter</span>
                        {(subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan) && (
                          <span className="text-[8px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-sm md:text-xl font-black text-slate-900 mb-0.5 md:mb-1">Rp 0 <span className="text-[8px] md:text-xs font-medium text-slate-500">/ selamanya</span></div>
                      <p className="text-[8px] md:text-xs text-slate-500 mb-2 md:mb-4">Cocok untuk usaha mikro.</p>
                      <ul className="text-[8px] md:text-xs space-y-1 md:space-y-2 text-slate-600 font-medium">
                        <li className="flex items-center gap-1 md:gap-1.5"><CheckCircle2 className="size-3 md:size-3.5 text-emerald-500" /> 1 Outlet / Cabang Toko</li>
                        <li className="flex items-center gap-1 md:gap-1.5"><CheckCircle2 className="size-3 md:size-3.5 text-emerald-500" /> Maks 2 Akun Staf</li>
                        <li className="flex items-center gap-1 md:gap-1.5"><CheckCircle2 className="size-3 md:size-3.5 text-emerald-500" /> Cetak Struk</li>
                      </ul>
                    </div>
                    <div className="mt-3 md:mt-5 pt-3 md:pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleUpdatePlan("Starter (Gratis)")}
                        disabled={subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan}
                        className={`w-full py-2 px-3 text-[10px] md:text-xs font-bold rounded-xl transition-all ${
                          subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 cursor-default"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                        }`}
                      >
                        {subscriptionData?.plan?.toLowerCase().includes("starter") || subscriptionData?.plan?.toLowerCase().includes("gratis") || !subscriptionData?.plan ? "Paket Saat Ini" : "Pilih Starter"}
                      </button>
                    </div>
                  </div>

                  {/* Growth Card */}
                  <div className={`p-3 md:p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    subscriptionData?.plan?.toLowerCase().includes("growth")
                      ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20 shadow-md"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-1.5 md:mb-2">
                        <span className="font-bold text-[10px] md:text-sm text-slate-900 flex items-center gap-1">
                          Growth
                          <span className="bg-indigo-100 text-indigo-700 text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-md">POPULER</span>
                        </span>
                        {subscriptionData?.plan?.toLowerCase().includes("growth") && (
                          <span className="text-[8px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-sm md:text-xl font-black text-indigo-600 mb-0.5 md:mb-1">Rp 299rb <span className="text-[8px] md:text-xs font-medium text-slate-500">/ bulan</span></div>
                      <p className="text-[8px] md:text-xs text-slate-500 mb-2 md:mb-4">Untuk toko berkembang & multi cabang.</p>
                      <ul className="text-[8px] md:text-xs space-y-1 md:space-y-2 text-slate-600 font-medium">
                        <li className="flex items-center gap-1 md:gap-1.5"><CheckCircle2 className="size-3 md:size-3.5 text-indigo-500" /> s/d 5 Cabang</li>
                        <li className="flex items-center gap-1 md:gap-1.5"><CheckCircle2 className="size-3 md:size-3.5 text-indigo-500" /> Unlimited Staf</li>
                        <li className="flex items-center gap-1 md:gap-1.5"><CheckCircle2 className="size-3 md:size-3.5 text-indigo-500" /> Laporan Analitik</li>
                      </ul>
                    </div>
                    <div className="mt-3 md:mt-5 pt-3 md:pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleUpdatePlan("Growth")}
                        disabled={subscriptionData?.plan?.toLowerCase().includes("growth")}
                        className={`w-full py-2 px-3 text-[10px] md:text-xs font-bold rounded-xl transition-all ${
                          subscriptionData?.plan?.toLowerCase().includes("growth")
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-300 cursor-default"
                            : "bg-[#0b172a] hover:bg-slate-800 text-white shadow-sm"
                        }`}
                      >
                        {subscriptionData?.plan?.toLowerCase().includes("growth") ? "Paket Saat Ini" : "Upgrade Growth"}
                      </button>
                    </div>
                  </div>

                  {/* Enterprise Card */}
                  <div className={`p-3 md:p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    subscriptionData?.plan?.toLowerCase().includes("enterprise")
                      ? "border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/20 shadow-md"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-1.5 md:mb-2">
                        <span className="font-bold text-[10px] md:text-sm text-slate-900">Enterprise</span>
                        {subscriptionData?.plan?.toLowerCase().includes("enterprise") && (
                          <span className="text-[8px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-sm md:text-xl font-black text-amber-600 mb-0.5 md:mb-1">Rp 799rb <span className="text-[8px] md:text-xs font-medium text-slate-500">/ bulan</span></div>
                      <p className="text-[8px] md:text-xs text-slate-500 mb-2 md:mb-4">Fitur custom & integrasi lengkap.</p>
                      <ul className="text-[8px] md:text-xs space-y-1 md:space-y-2 text-slate-600 font-medium">
                        <li className="flex items-center gap-1 md:gap-1.5"><CheckCircle2 className="size-3 md:size-3.5 text-amber-500" /> Unlimited Cabang</li>
                        <li className="flex items-center gap-1 md:gap-1.5"><CheckCircle2 className="size-3 md:size-3.5 text-amber-500" /> Integrasi E-Commerce</li>
                        <li className="flex items-center gap-1 md:gap-1.5"><CheckCircle2 className="size-3 md:size-3.5 text-amber-500" /> Account Manager</li>
                      </ul>
                    </div>
                    <div className="mt-3 md:mt-5 pt-3 md:pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleUpdatePlan("Enterprise")}
                        disabled={subscriptionData?.plan?.toLowerCase().includes("enterprise")}
                        className={`w-full py-2 px-3 text-[10px] md:text-xs font-bold rounded-xl transition-all ${
                          subscriptionData?.plan?.toLowerCase().includes("enterprise")
                            ? "bg-amber-100 text-amber-800 border border-amber-300 cursor-default"
                            : "bg-[#0b172a] hover:bg-slate-800 text-white shadow-sm"
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
            <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-3 md:space-y-6">
              <div>
                <h2 className="text-sm md:text-xl font-bold text-slate-900 flex items-center gap-1.5 md:gap-2">
                  <Printer className="size-4 md:size-6 text-indigo-600" />
                  Mesin Cetak & Meteran
                </h2>
                <p className="text-[9px] md:text-xs text-slate-500 md:mt-1">
                  Kelola armada mesin cetak percetakan digital, kategori, dan opsi tarif.
                </p>
              </div>

              {/* Form Tambah Mesin Cetak */}
              <form onSubmit={handleAddPrinter} className="bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-100 space-y-3 md:space-y-4 shadow-sm">
                <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1 md:gap-1.5">
                  <Plus className="size-3 md:size-4 text-[#0b172a]" /> Tambah Mesin Produksi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                  <div>
                    <label className="block text-[10px] md:text-xs font-semibold text-slate-600 md:mb-1">Nama Mesin Cetak</label>
                    <Input 
                      required 
                      placeholder="Contoh: Roland Outdoor 3.2m" 
                      value={newPrinterName}
                      onChange={(e) => setNewPrinterName(e.target.value)}
                      className="h-9 md:h-11 text-xs md:text-sm rounded-xl bg-white border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-semibold text-slate-600 md:mb-1">Kategori Spesialisasi</label>
                    <select
                      value={newPrinterType}
                      onChange={(e) => setNewPrinterType(e.target.value)}
                      className="w-full h-9 md:h-11 px-3 md:px-4 rounded-xl border border-slate-200 bg-white text-xs md:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20"
                    >
                      <option value="Banner Outdoor">Banner Outdoor</option>
                      <option value="Digital Press A3+">Digital Press A3+</option>
                      <option value="Sublim & Textile">Sublimasi & Tekstil</option>
                      <option value="Plotter Cutting & Laser">Plotter Cutting</option>
                      <option value="UV Flatbed">UV Flatbed</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled={!newPrinterName.trim()} className="bg-[#0b172a] hover:bg-slate-800 text-white font-bold text-xs md:text-sm h-9 md:h-11 rounded-xl w-full md:w-auto shadow-sm transition-all px-6">
                  <Plus className="size-3.5 md:size-4 md:mr-1.5" /> Tambah
                </Button>
              </form>

              {/* Daftar Mesin Cetak */}
              <div className="space-y-1.5 md:space-y-3">
                <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Mesin Cetak ({printers.length})</h3>
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                  {printers.map((p) => (
                    <div key={p.id} className="p-3 md:p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="size-8 md:size-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                          <Printer className="size-4 md:size-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight">{p.name}</h4>
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
                              {p.status}
                            </span>
                          </div>
                          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1 font-medium">Tipe: {p.type}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePrinter(p.id)}
                        className="size-8 md:size-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-4 md:size-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarif & Finishing Card */}
              <div className="p-3 md:p-5 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-3 md:space-y-4 shadow-sm">
                <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Scissors className="size-3.5 md:size-4 text-indigo-600" />
                  Daftar Pilihan Finishing Aktif
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] md:text-xs">
                  <div className="p-2 md:p-3 rounded-xl bg-white border border-slate-100 shadow-sm font-semibold text-slate-800 text-center">
                    Laminasi Doff / Glossy
                  </div>
                  <div className="p-2 md:p-3 rounded-xl bg-white border border-slate-100 shadow-sm font-semibold text-slate-800 text-center">
                    Mata Ayam / Ring Banner
                  </div>
                  <div className="p-2 md:p-3 rounded-xl bg-white border border-slate-100 shadow-sm font-semibold text-slate-800 text-center">
                    Potong Kiss Cut / Die Cut
                  </div>
                  <div className="p-2 md:p-3 rounded-xl bg-white border border-slate-100 shadow-sm font-semibold text-slate-800 text-center">
                    Jilid Spiral / Hardcover
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "printing_spk" ? (
            <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-3 md:space-y-6">
              <div>
                <h2 className="text-sm md:text-xl font-bold text-slate-900 flex items-center gap-1.5 md:gap-2">
                  <FileText className="size-4 md:size-6 text-emerald-600" />
                  Alur SPK Produksi & DP
                </h2>
                <p className="text-[9px] md:text-xs text-slate-500 md:mt-1">
                  Atur syarat uang muka, estimasi hari pengerjaan, dan validasi berkas cetak.
                </p>
              </div>

              <div className="space-y-4 md:space-y-6 bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                {/* Min DP % */}
                <div>
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-700 mb-0.5 md:mb-1">
                    Minimal DP (%)
                  </label>
                  <p className="text-[10px] md:text-xs text-slate-500 mb-2 md:mb-3">Persentase uang muka wajib pesanan SPK.</p>
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="relative w-24 md:w-32">
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={minDpPercentage}
                        onChange={(e) => setMinDpPercentage(Number(e.target.value))}
                        className="pr-6 md:pr-8 font-bold h-9 md:h-11 text-xs md:text-sm rounded-xl bg-white"
                      />
                      <span className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-xs md:text-sm">%</span>
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-slate-500">Default: 50%</span>
                  </div>
                </div>

                {/* Default SLA */}
                <div className="border-t border-slate-100 pt-4 md:pt-6">
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-700 mb-0.5 md:mb-1">
                    Estimasi Pengerjaan (Hari Kerja)
                  </label>
                  <p className="text-[10px] md:text-xs text-slate-500 mb-2 md:mb-3">Target waktu penyelesaian SPK.</p>
                  <div className="grid grid-cols-4 gap-2 max-w-md">
                    {[1, 2, 3, 5].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setDefaultEstimatedDays(day)}
                        className={`py-1.5 md:py-2.5 text-xs font-bold rounded-xl border transition-all ${
                          defaultEstimatedDays === day
                            ? "bg-[#0b172a] text-white border-[#0b172a] shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {day} Hari
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proofing File Toggle */}
                <div className="border-t border-slate-100 pt-4 md:pt-6">
                  <label className="flex items-start gap-2 md:gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={enableFileProofing}
                      onChange={(e) => setEnableFileProofing(e.target.checked)}
                      className="size-4 md:size-5 mt-0.5 md:mt-0 rounded text-[#0b172a] focus:ring-[#0b172a] accent-[#0b172a] cursor-pointer"
                    />
                    <div>
                      <span className="block text-[10px] md:text-sm font-semibold text-slate-800">Aktifkan Proofing Desain</span>
                      <span className="block text-[10px] md:text-xs text-slate-500 md:mt-0.5">Operator memverifikasi file sebelum cetak.</span>
                    </div>
                  </label>
                </div>

                <div className="pt-4 md:pt-6 border-t border-slate-100">
                  <Button onClick={handleSavePrintingSettings} className="bg-[#0b172a] hover:bg-slate-800 text-white font-bold text-xs px-6 h-9 md:h-11 rounded-xl shadow-sm w-full md:w-auto transition-all">
                    Simpan Pengaturan SPK
                  </Button>
                </div>
              </div>
            </div>
          ) : activeTab === "cabang" ? (
            <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-3 md:space-y-6">
              <div>
                <h2 className="text-sm md:text-lg font-bold text-slate-800 mb-0.5">Manajemen Multi-Cabang</h2>
                <p className="text-[9px] md:text-xs text-slate-500">Tambah outlet baru dan kelola seluruh cabang bisnis Anda dari satu tempat.</p>
              </div>

              {/* Form Tambah Cabang */}
              <form onSubmit={handleCreateBranch} className="bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-100 space-y-3 md:space-y-4 shadow-sm">
                <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-600">Tambah Cabang Baru</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                  <Input 
                    required 
                    placeholder="Nama Cabang (cth: Cabang Bandung)" 
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="h-9 md:h-11 text-xs md:text-sm rounded-xl bg-white border-slate-200"
                  />
                  <Input 
                    placeholder="Alamat Lengkap" 
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    className="h-9 md:h-11 text-xs md:text-sm rounded-xl bg-white border-slate-200"
                  />
                  <Input 
                    placeholder="No. Telepon / WA" 
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    className="h-9 md:h-11 text-xs md:text-sm rounded-xl bg-white border-slate-200"
                  />
                </div>
                <Button type="submit" disabled={isSubmitting || !branchName.trim()} className="bg-[#0b172a] hover:bg-slate-800 text-white font-bold text-xs md:text-sm h-9 md:h-11 rounded-xl w-full md:w-auto shadow-sm transition-all px-6">
                  <Plus className="size-3.5 md:size-4 mr-1.5 md:mr-2" /> Tambah Cabang
                </Button>
              </form>

              {/* Daftar Cabang */}
              <div className="space-y-1.5 md:space-y-3">
                <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Cabang ({branches.length})</h3>
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                  {branches.map((b) => (
                    <div key={b.id} className="p-3 md:p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="size-8 md:size-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                          <Building2 className="size-4 md:size-6" />
                        </div>
                        <div className="flex flex-col gap-0.5 md:gap-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-xs md:text-sm">{b.name}</h4>
                            {b.is_main ? (
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] md:text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200">
                                PUSAT
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 text-[9px] md:text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                                CABANG
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {b.address && (
                              <p className="text-[10px] md:text-xs text-slate-500 font-medium flex items-center gap-1">
                                <MapPin className="size-3" /> {b.address}
                              </p>
                            )}
                            {b.phone && (
                              <p className="text-[10px] md:text-xs text-slate-400 font-medium flex items-center gap-1">
                                <Phone className="size-3" /> {b.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {!b.is_main && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            if (confirm(`Hapus cabang "${b.name}"?`)) {
                              deleteBranch(b.id);
                            }
                          }} 
                          className="size-8 md:size-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-4 md:size-5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === "meja" ? (
            <div className="flex flex-col h-full bg-white md:bg-transparent overflow-hidden fixed inset-0 z-50 md:relative md:inset-auto md:z-auto pb-14 md:pb-0">
              {/* Mobile Header matching screenshot */}
              <div className="md:hidden flex items-center h-14 px-4 bg-white shrink-0">
                <button onClick={() => setActiveTab("langganan")} className="p-2 -ml-2 mr-2 text-slate-800">
                  <Menu className="size-5" />
                </button>
                <h1 className="font-extrabold text-slate-900 text-[17px]">Kelola Meja</h1>
              </div>

              {/* Mobile Branch Selector matching screenshot */}
              <div className="md:hidden px-4 py-3 shrink-0">
                <div className="flex items-center justify-between bg-slate-100/70 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Store className="size-4 text-slate-700" />
                    <span className="font-bold text-slate-800 text-sm">{activeBranchName || "Semua Cabang"}</span>
                  </div>
                  <ChevronRight className="size-4 text-slate-500" />
                </div>
              </div>

              {/* Tabs Meja & Area (Mobile & Desktop) */}
              <div className="flex px-4 md:px-0 border-b border-slate-200 shrink-0">
                <div onClick={() => setTableSubTab("meja")} className={`flex-1 text-center py-3 font-bold text-sm md:text-base cursor-pointer ${tableSubTab === "meja" ? "border-b-2 border-blue-500 text-blue-500" : "text-slate-300"}`}>
                  Meja
                </div>
                <div onClick={() => setTableSubTab("area")} className={`flex-1 text-center py-3 font-bold text-sm md:text-base cursor-pointer ${tableSubTab === "area" ? "border-b-2 border-blue-500 text-blue-500" : "text-slate-300"}`}>
                  Area
                </div>
              </div>

              {tableSubTab === "meja" ? (
                <>
                  {/* Desktop Header Title */}
                  <h2 className="hidden md:block text-sm md:text-lg font-bold text-slate-800 mt-4 mb-2 md:mb-4 pb-2 md:pb-4 border-b border-slate-100">Daftar Meja (Dine In)</h2>
                  
                  {/* Filter Area Dropdown */}
                  <div className="px-4 py-4 md:px-0 shrink-0">
                    <div className="border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between bg-white">
                      <span className="text-slate-700 text-sm font-bold">Area: <span className="font-bold text-[#0b172a]">Semua Area</span></span>
                      <ChevronRight className="size-4 text-slate-400 rotate-90" />
                    </div>
                  </div>

              {/* Desktop Inline Add Form */}
              <form onSubmit={addTable} className="hidden md:flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
                <div className="w-full sm:w-1/3">
                  <Input 
                    placeholder="Kategori (LT1, VIP)" 
                    value={newTableCategory}
                    onChange={(e) => setNewTableCategory(e.target.value)}
                    className="h-9 md:h-11 text-xs md:text-sm rounded-xl font-medium border-slate-200 bg-slate-50"
                  />
                </div>
                <div className="flex-1">
                  <Input 
                    placeholder="Cth: Meja 1, Meja 2" 
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    required
                    className="h-9 md:h-11 text-xs md:text-sm rounded-xl font-bold border-slate-200"
                  />
                </div>
                <Button type="submit" disabled={isSubmitting || !newTableName.trim()} className="bg-[#0b172a] hover:bg-slate-800 text-white shrink-0 h-9 md:h-11 text-xs md:text-sm rounded-xl font-bold px-6 shadow-sm">
                  <Plus className="size-3.5 md:size-4 mr-1.5 md:mr-2" /> Tambah Meja
                </Button>
              </form>

              <div className="flex-1 overflow-auto bg-white flex flex-col md:border md:border-slate-100 md:rounded-2xl md:shadow-sm">
                {isLoading ? (
                  <div className="flex justify-center items-center flex-1">
                    <Loader2 className="size-6 animate-spin text-slate-400" />
                  </div>
                ) : tables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-500 mb-20 md:mb-0">
                    <p className="text-[17px] font-extrabold text-slate-800 mb-1">Belum Ada Meja</p>
                    <p className="text-[13px] text-slate-400 font-medium">Meja yang terdaftar akan muncul di sini.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs">Nama Meja</th>
                        <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs text-center w-20 md:w-32">Status</th>
                        <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs text-right w-12 md:w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tables.map(table => (
                        <tr key={table.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 md:p-4 font-bold text-slate-800">{table.name}</td>
                          <td className="p-3 md:p-4 text-center">
                            {table.status === 'available' ? (
                              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold border border-emerald-200">Tersedia</span>
                            ) : (
                              <div className="flex flex-col items-center gap-1 md:gap-1.5">
                                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold border border-amber-200">Terisi</span>
                                <button onClick={() => markAvailable(table.id)} className="text-[10px] text-indigo-600 font-semibold hover:underline">Kosongkan</button>
                              </div>
                            )}
                          </td>
                          <td className="p-3 md:p-4 text-right">
                            <Button variant="ghost" size="icon" onClick={() => deleteTable(table.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 size-8 md:size-10 rounded-xl">
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              {/* Fixed Bottom Button for Mobile (Meja) */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-50 pb-safe">
                <Button 
                  onClick={() => setIsTableModalOpen(true)}
                  className="w-full bg-[#0b172a] hover:bg-slate-800 text-white h-12 rounded-[14px] font-bold text-[15px] shadow-sm"
                >
                  <Plus className="size-5 mr-2" /> Tambah Meja
                </Button>
              </div>

              {/* Mobile Add Table Modal */}
              {isTableModalOpen && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm">
                  <div className="bg-white rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-full pb-safe">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg text-slate-800">Tambah Meja</h2>
                      <button onClick={() => setIsTableModalOpen(false)} className="p-2 text-slate-400 bg-slate-100 rounded-full">
                        <X className="size-4" />
                      </button>
                    </div>
                    <form onSubmit={(e) => { addTable(e); if(newTableName.trim()) setIsTableModalOpen(false); }} className="flex flex-col gap-3">
                      <Input 
                        placeholder="Kategori (opsional, cth: VIP)" 
                        value={newTableCategory}
                        onChange={(e) => setNewTableCategory(e.target.value)}
                        className="h-12 rounded-xl"
                      />
                      <Input 
                        placeholder="Nama Meja (cth: Meja 1)" 
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        required
                        className="h-12 rounded-xl font-bold"
                      />
                      <Button type="submit" disabled={isSubmitting || !newTableName.trim()} className="mt-2 h-12 rounded-xl bg-[#0b172a] text-white font-bold w-full">
                        Simpan Meja
                      </Button>
                    </form>
                  </div>
                </div>
              )}
              </>
              ) : (
                <>
                  <div className="flex-1 overflow-auto bg-white flex flex-col items-center justify-center mb-20 md:mb-0 text-slate-500">
                    <p className="text-[17px] font-extrabold text-slate-800 mb-1">Belum Ada Area</p>
                    <p className="text-[13px] text-slate-400 font-medium">Area yang terdaftar akan muncul di sini.</p>
                  </div>

                  {/* Fixed Bottom Button for Mobile (Area) */}
                  <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-50 pb-safe">
                    <Button 
                      onClick={() => setIsAreaModalOpen(true)}
                      className="w-full bg-[#0b172a] hover:bg-slate-800 text-white h-12 rounded-[14px] font-bold text-[15px] shadow-sm"
                    >
                      <Plus className="size-5 mr-2" /> Tambah Area
                    </Button>
                  </div>

                  {/* Mobile Add Area Modal (Full Screen) */}
                  {isAreaModalOpen && (
                    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right md:slide-in-from-bottom">
                      {/* Header */}
                      <div className="flex items-center h-14 px-4 bg-white border-b border-slate-100 shrink-0">
                        <button onClick={() => setIsAreaModalOpen(false)} className="p-2 -ml-2 mr-2 text-slate-800">
                          <ChevronLeft className="size-6" />
                        </button>
                        <h1 className="font-extrabold text-slate-900 text-[17px] flex-1 text-center pr-8">Tambah Area</h1>
                      </div>

                      {/* Store Info Banner */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 shrink-0 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Store className="size-4 text-slate-700" />
                          <span className="font-bold text-slate-800 text-sm">{activeBranchName || "Semua Cabang"}</span>
                        </div>
                        <button className="text-blue-500 font-bold text-sm hover:underline">
                          Ubah Outlet
                        </button>
                      </div>

                      {/* Form */}
                      <form onSubmit={(e) => { e.preventDefault(); toast.success("Area ditambahkan (mock)"); setIsAreaModalOpen(false); setNewAreaName(""); setNewAreaType(""); }} className="flex-1 flex flex-col p-4 bg-white">
                        <div className="mb-5">
                          <label className="block text-slate-800 font-medium mb-2 text-[15px]">Nama Area</label>
                          <Input 
                            placeholder="Contoh: Indoor" 
                            value={newAreaName}
                            onChange={(e) => setNewAreaName(e.target.value)}
                            required
                            className="h-12 rounded-xl text-base border-slate-200 placeholder:text-slate-300 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                          />
                        </div>

                        <div className="mb-6">
                          <label className="block text-slate-800 font-medium mb-2 text-[15px]">Tipe Area</label>
                          <div className="flex gap-3">
                            <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border ${newAreaType === "smoking" ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white"} cursor-pointer transition-all`}>
                              <div className={`size-5 rounded-full border-2 flex items-center justify-center ${newAreaType === "smoking" ? "border-blue-500" : "border-slate-300"}`}>
                                {newAreaType === "smoking" && <div className="size-2.5 bg-blue-500 rounded-full" />}
                              </div>
                              <span className={`text-[15px] ${newAreaType === "smoking" ? "font-bold text-slate-800" : "font-medium text-slate-600"}`}>Smoking Area</span>
                              <input 
                                type="radio" 
                                name="areaType" 
                                className="hidden" 
                                checked={newAreaType === "smoking"} 
                                onChange={() => setNewAreaType("smoking")} 
                              />
                            </label>

                            <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border ${newAreaType === "non-smoking" ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white"} cursor-pointer transition-all`}>
                              <div className={`size-5 rounded-full border-2 flex items-center justify-center ${newAreaType === "non-smoking" ? "border-blue-500" : "border-slate-300"}`}>
                                {newAreaType === "non-smoking" && <div className="size-2.5 bg-blue-500 rounded-full" />}
                              </div>
                              <span className={`text-[15px] ${newAreaType === "non-smoking" ? "font-bold text-slate-800" : "font-medium text-slate-600"}`}>Non-Smoking</span>
                              <input 
                                type="radio" 
                                name="areaType" 
                                className="hidden" 
                                checked={newAreaType === "non-smoking"} 
                                onChange={() => setNewAreaType("non-smoking")} 
                              />
                            </label>
                          </div>
                        </div>

                        {/* Bottom Sticky Button */}
                        <div className="mt-auto pt-4 pb-safe">
                          <Button 
                            type="submit" 
                            disabled={!newAreaName.trim() || !newAreaType}
                            className="w-full h-12 rounded-[14px] font-bold text-[15px] transition-all disabled:bg-[#d4d4d4] disabled:text-slate-500 bg-[#0b172a] hover:bg-slate-800 text-white shadow-sm"
                          >
                            Simpan
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : activeTab === "kategori" ? (
            <div className="flex flex-col h-full overflow-y-auto pr-1">
              <h2 className="text-sm md:text-lg font-bold text-slate-800 mb-2 md:mb-4 border-b border-slate-100 pb-2 md:pb-4">Kategori Produk</h2>
              
              <form onSubmit={addCategory} className="flex gap-2 md:gap-4 mb-4 md:mb-6">
                <div className="flex-1">
                  <Input 
                    placeholder="Cth: Minuman Dingin, Snack" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    className="h-9 md:h-11 text-xs md:text-sm rounded-xl font-bold border-slate-200"
                  />
                </div>
                <Button type="submit" disabled={isSubmitting || !newCategoryName.trim()} className="bg-[#0b172a] hover:bg-slate-800 text-white h-9 md:h-11 text-xs md:text-sm rounded-xl font-bold px-6 shadow-sm">
                  <Plus className="size-3.5 md:size-4 mr-1.5 md:mr-2" /> Tambah
                </Button>
              </form>

              <div className="flex-1 overflow-auto border border-slate-100 rounded-2xl bg-white shadow-sm">
                {isLoading ? (
                  <div className="flex justify-center items-center h-24 md:h-32">
                    <Loader2 className="size-4 md:size-6 animate-spin text-slate-400" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 md:h-32 text-slate-400">
                    <Tags className="size-6 md:size-8 mb-2 opacity-20" />
                    <p className="text-xs md:text-sm font-medium">Belum ada kategori.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs">Nama Kategori</th>
                        <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs text-right w-12 md:w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 md:p-4 font-bold text-slate-800">{cat.name}</td>
                          <td className="p-3 md:p-4 text-right">
                            <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 size-8 md:size-10 rounded-xl">
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : activeTab === "printer" ? (
            <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-3 md:space-y-6">
              <div>
                <h2 className="text-sm md:text-xl font-bold text-slate-900 flex items-center gap-1.5 md:gap-2">
                  <Bluetooth className="size-4 md:size-6 text-indigo-600" />
                  Pengaturan Printer Kasir
                </h2>
                <p className="text-[9px] md:text-xs text-slate-500 md:mt-1">
                  Atur format struk, ukuran kertas thermal, dan lakukan uji coba cetak via Bluetooth.
                </p>
              </div>

              <div className="bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-200 space-y-3 md:space-y-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-semibold text-slate-700 mb-1">Nama Toko di Struk</label>
                  <Input defaultValue="TOKO SAYA" className="h-8 md:h-10 text-xs md:text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-semibold text-slate-700 mb-1">Alamat Toko</label>
                  <Input defaultValue="Jl. Contoh Alamat No. 123" className="h-8 md:h-10 text-xs md:text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-semibold text-slate-700 mb-1">Pesan Footer (Bawah)</label>
                  <Input defaultValue="Terima kasih atas kunjungan Anda!" className="h-8 md:h-10 text-xs md:text-sm bg-white" />
                </div>
                
                <div className="border-t border-slate-200 pt-3 md:pt-4">
                  <h4 className="text-[10px] md:text-xs font-bold text-slate-900 mb-2">Ukuran Kertas Thermal</h4>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="paper_size" defaultChecked className="text-brand focus:ring-brand" />
                      <span className="text-[10px] md:text-xs text-slate-700 font-medium">58mm (Kecil)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="paper_size" className="text-brand focus:ring-brand" />
                      <span className="text-[10px] md:text-xs text-slate-700 font-medium">80mm (Lebar)</span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 md:pt-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] md:text-xs font-bold text-slate-900">Uji Coba Printer</h4>
                    <p className="text-[8px] md:text-[10px] text-slate-500">Kirim teks uji coba untuk cek koneksi</p>
                  </div>
                  <Button 
                    onClick={async () => {
                      try {
                        const { printWithWebBluetooth } = await import("@/shared/lib/bluetoothPrinter");
                        const testText = "       TEST PRINT       \n--------------------------------\nPrinter berhasil terhubung!\nKoneksi Bluetooth Native OK\n\n--------------------------------\n";
                        await printWithWebBluetooth(testText);
                        toast.success("Test print berhasil dikirim!");
                      } catch (error: any) {
                        toast.error(error.message || "Gagal test print");
                        alert("Gagal koneksi Bluetooth:\n" + (error.message || "Pastikan Anda menggunakan Chrome dan koneksi HTTPS/Localhost."));
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 md:h-11 px-5 text-xs md:text-sm rounded-xl shadow-sm transition-all"
                  >
                    <Bluetooth className="size-3.5 md:size-4 mr-1.5 md:mr-2" /> Test Print
                  </Button>
                </div>
              </div>
            </div>
          ) : activeTab === "invoice" ? (
            <div className="flex flex-col h-full overflow-y-auto space-y-3 md:space-y-6 pr-1">
              <div className="border-b border-slate-100 pb-2 md:pb-4">
                <h2 className="text-sm md:text-lg font-bold text-slate-800">Format Invoice</h2>
                <p className="text-[9px] md:text-xs text-slate-500">Atur penomoran dan pola struktur nomor nota/invoice otomatis.</p>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 md:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0b172a] to-slate-800 border border-slate-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-slate-300">
                    <Sparkles className="size-3 md:size-4 text-indigo-400" />
                    <span>Pratinjau Hasil:</span>
                  </div>
                  <div className="font-mono text-base md:text-2xl font-extrabold tracking-wider text-white">
                    {generateInvoiceCode({
                      invoicePrefix,
                      invoiceFormat,
                      invoiceCounterDigits,
                      invoiceCounterReset
                    }, 1, branches[0]?.name || "PUSAT")}
                  </div>
                  <p className="text-[10px] md:text-xs text-slate-400 font-medium">Contoh tampilan invoice pertama di hari baru.</p>
                </div>
                <div className="bg-white/10 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-white/20 text-[10px] md:text-xs font-semibold text-slate-200 self-start md:self-center">
                  Resets: <span className="font-bold text-white">{invoiceCounterReset}</span>
                </div>
              </div>

              {/* Prefix & Pattern */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 md:mb-2">
                    Awalan (Prefix)
                  </label>
                  <Input 
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                    placeholder="Contoh: INV"
                    className="font-mono text-xs md:text-sm uppercase h-9 md:h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 md:mb-2">
                    Digit Counter ({invoiceCounterDigits})
                  </label>
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    {[3, 4, 5, 6].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => setInvoiceCounterDigits(digit)}
                        className={`py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-xl border transition-all ${
                          invoiceCounterDigits === digit
                            ? "bg-[#0b172a] text-white border-[#0b172a] shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {digit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preset Format Patterns */}
              <div>
                <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 md:mb-2">
                  Pola Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
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
                      className={`p-2.5 md:p-4 text-left rounded-xl border transition-all ${
                        invoiceFormat === preset.fmt
                          ? "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm font-semibold"
                          : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-bold text-xs md:text-sm text-slate-800 mb-1">{preset.label}</div>
                      <div className="font-mono text-[10px] md:text-xs font-medium text-slate-500">{preset.fmt}</div>
                    </button>
                  ))}
                </div>

                <label className="block text-[10px] md:text-xs font-semibold text-slate-600 mb-1.5">
                  Format Kustom: &#123;PREFIX&#125;, &#123;YYYYMMDD&#125;, &#123;COUNTER&#125;, &#123;BRANCH&#125;
                </label>
                <Input 
                  value={invoiceFormat}
                  onChange={(e) => setInvoiceFormat(e.target.value)}
                  className="font-mono text-xs md:text-sm h-9 md:h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                  placeholder="{PREFIX}-{YYYYMMDD}-{COUNTER}"
                />
              </div>

              {/* Reset Strategy */}
              <div>
                <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 md:mb-2">
                  Siklus Reset Counter
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                  {[
                    { id: "DAILY", title: "Harian", desc: "Reset tiap tanggal" },
                    { id: "MONTHLY", title: "Bulanan", desc: "Reset awal bulan" },
                    { id: "YEARLY", title: "Tahunan", desc: "Reset awal tahun" },
                    { id: "NEVER", title: "Terus Menerus", desc: "Tidak ada reset" },
                  ].map((cycle) => (
                    <button
                      key={cycle.id}
                      type="button"
                      onClick={() => setInvoiceCounterReset(cycle.id as any)}
                      className={`p-2 md:p-3 text-left rounded-xl border transition-all ${
                        invoiceCounterReset === cycle.id
                          ? "bg-[#0b172a] border-[#0b172a] text-white shadow-sm font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-bold text-[10px] md:text-xs">{cycle.title}</div>
                      <div className={`text-[9px] md:text-[10px] mt-0.5 font-medium ${invoiceCounterReset === cycle.id ? "text-slate-300" : "text-slate-500"}`}>{cycle.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 md:pt-5 border-t border-slate-100">
                <Button 
                  onClick={handleSaveInvoiceSettings} 
                  disabled={isSubmitting} 
                  className="bg-[#0b172a] hover:bg-slate-800 text-white font-bold text-xs md:text-sm px-6 h-9 md:h-11 rounded-xl shadow-sm w-full md:w-auto transition-all"
                >
                  {isSubmitting ? <Loader2 className="size-3 md:size-4 animate-spin mr-1.5 md:mr-2" /> : null}
                  Simpan Pengaturan Invoice
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-y-auto pr-1">
              <h2 className="text-sm md:text-lg font-bold text-slate-800 mb-2 md:mb-4 border-b border-slate-100 pb-2 md:pb-4">Pengaturan Umum</h2>
              
              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-[9px] md:text-sm font-semibold text-slate-700 mb-1 md:mb-2">Pajak Toko (PPN/PB1)</label>
                  <p className="text-[8px] md:text-sm text-slate-500 mb-2 md:mb-3">Persentase pajak yang dibebankan ke setiap transaksi. Masukkan 0 jika tidak ada pajak.</p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-24 md:w-32">
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="pr-6 md:pr-8 h-9 md:h-11 text-xs md:text-sm rounded-xl font-bold bg-slate-50 border-slate-200"
                      />
                      <span className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-xs md:text-sm">%</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 md:pt-6">
                  <label className="flex items-start gap-2 md:gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={enableDineIn}
                      onChange={(e) => {
                        setEnableDineIn(e.target.checked);
                        if (!e.target.checked && (activeTab as string) === "meja") setActiveTab("kategori");
                      }}
                      className="size-3 md:size-5 mt-0.5 md:mt-0 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                    <div>
                      <span className="block text-[9px] md:text-sm font-semibold text-slate-800">Aktifkan Meja (Dine In)</span>
                      <span className="block text-[8px] md:text-xs text-slate-500 mt-0.5">Jika dimatikan, opsi Makan di Tempat dan Manajemen Meja disembunyikan.</span>
                    </div>
                  </label>
                </div>

                <Button onClick={saveSettings} disabled={isSubmitting} className="bg-[#0b172a] hover:bg-slate-800 shadow-sm text-white mt-4 md:mt-6 h-9 md:h-11 text-xs md:text-sm px-6 font-bold rounded-xl w-full md:w-auto transition-all">
                  Simpan Pengaturan
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
