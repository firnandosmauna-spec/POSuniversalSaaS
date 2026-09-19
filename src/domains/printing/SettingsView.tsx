import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/shared/auth/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, 
  Printer, 
  FileText, 
  Building2, 
  Crown, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Ruler, 
  Scissors, 
  Wrench, 
  Hash, 
  Receipt, 
  Sparkles, 
  Zap, 
  RefreshCw,
  Sliders,
  Check,
  Tag,
  Pencil,
  FolderPlus,
  Layers,
  ArrowLeft,
  LayoutGrid,
  ChevronRight
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getInvoiceSettings, saveInvoiceSettings, generateInvoiceCode, InvoiceSettings } from "@/shared/utils/invoiceGenerator";
import { seedAllMockDataToPermanentStorage } from "@/shared/utils/permanentDataSeeder";

export interface PrintingMachine {
  id: string;
  name: string;
  type: string; // e.g. "Outdoor Banner", "Digital Press A3+", "Plotter Cutting", "UV Flatbed"
  maxPrintWidthCm?: number;
  status: "Ready" | "Maintenance" | "Offline";
}

export interface PrintingFinishingSetting {
  id: string;
  name: string;
  price: number;
  isPerM2: boolean; // true: Rp/m², false: Flat per pcs/lembar
  isAvailable: boolean;
}

export interface PrintingCategorySetting {
  id: string;
  name: string;
  code: string;
  description: string;
  isAvailable: boolean;
}

const DEFAULT_FINISHINGS: PrintingFinishingSetting[] = [];

const DEFAULT_CATEGORIES: PrintingCategorySetting[] = [];

export interface PrintingDesignFeeTier {
  id: string;
  name: string;
  price: number;
  feeType: "FLAT" | "PER_HOUR";
  estimatedMinutes: number;
  description: string;
  isAvailable: boolean;
}

const DEFAULT_DESIGN_TIERS: PrintingDesignFeeTier[] = [];

export function PrintingSettingsView() {
  const { user, branches, addBranch, deleteBranch, switchBranch, activeBranchId, editBranch, setMainBranch } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "printing_calc" | "printing_categories" | "printing_finishing" | "printing_spk" | "design_fee_calc" | "cabang" | "invoice" | "langganan" | "printer_kasir"
  >("printing_calc");

  // Design Fee Settings & Calculator State
  const [designTiers, setDesignTiers] = useState<PrintingDesignFeeTier[]>(() => {
    try {
      const saved = localStorage.getItem("pos_printing_design_fee_tiers");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_DESIGN_TIERS;
  });

  // Designer Base Hourly Rate
  const [baseHourlyRate, setBaseHourlyRate] = useState<number>(50000);

  // Live Calculator Form Inputs
  const [calcHours, setCalcHours] = useState<number>(1);
  const [calcMinutes, setCalcMinutes] = useState<number>(0);
  const [calcComplexityMult, setCalcComplexityMult] = useState<number>(1.0); // 1.0 = Simple, 1.5 = Medium, 2.0 = Rumit
  const [calcRevisionFee, setCalcRevisionFee] = useState<number>(0);
  const [calcTierName, setCalcTierName] = useState<string>("Desain Custom");
  const [calcTierDesc, setCalcTierDesc] = useState<string>("Hasil kalkulasi otomatis durasi & kompleksitas");

  // Subscription State
  const [subscriptionData, setSubscriptionData] = useState<{
    plan: string;
    status: string;
    trialUntil?: string;
    registeredAt?: string;
  } | null>(null);

  // Printing Machines State
  const [machines, setMachines] = useState<PrintingMachine[]>([]);
  const [newMachineName, setNewMachineName] = useState("");
  const [newMachineType, setNewMachineType] = useState("Outdoor Banner");
  const [newMachineWidth, setNewMachineWidth] = useState(320);

  // Receipt Printers State
  const [receiptPrinters, setReceiptPrinters] = useState<{ id: string; name: string; type: string; connection: string; status: string }[]>([]);
  const [newReceiptPrinterName, setNewReceiptPrinterName] = useState("");
  const [newReceiptPrinterType, setNewReceiptPrinterType] = useState("Thermal 80mm");
  const [newReceiptPrinterConnection, setNewReceiptPrinterConnection] = useState("USB");

  // Finishing Options State
  const [finishings, setFinishings] = useState<PrintingFinishingSetting[]>(DEFAULT_FINISHINGS);
  const [isFinishingModalOpen, setIsFinishingModalOpen] = useState(false);
  const [editingFinishing, setEditingFinishing] = useState<PrintingFinishingSetting | null>(null);
  const [formFinName, setFormFinName] = useState("");
  const [formFinPrice, setFormFinPrice] = useState<number>(5000);
  const [formFinIsPerM2, setFormFinIsPerM2] = useState<boolean>(false);
  const [formFinIsAvailable, setFormFinIsAvailable] = useState<boolean>(true);

  // Categories State
  const [categories, setCategories] = useState<PrintingCategorySetting[]>(DEFAULT_CATEGORIES);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PrintingCategorySetting | null>(null);
  const [formCatName, setFormCatName] = useState("");
  const [formCatCode, setFormCatCode] = useState("");
  const [formCatDesc, setFormCatDesc] = useState("");
  const [formCatIsAvailable, setFormCatIsAvailable] = useState(true);

  // SPK & DP Workflow Settings
  const [minDpPercentage, setMinDpPercentage] = useState<number>(50);
  const [defaultEstimatedDays, setDefaultEstimatedDays] = useState<number>(1);
  const [enableFileProofing, setEnableFileProofing] = useState<boolean>(true);
  const [defaultSpkNotes, setDefaultSpkNotes] = useState<string>("Periksa resolusi CMYK min 300 DPI dan lebihi bleed potong 3mm.");

  // Branch Outlet Form & Edit State
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [editBranchPhone, setEditBranchPhone] = useState("");

  // Invoice Code Settings
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceSettings>({
    invoicePrefix: "SPK",
    invoiceFormat: "{PREFIX}-{YYYYMMDD}-{COUNTER}",
    invoiceCounterDigits: 4,
    invoiceCounterReset: "DAILY"
  });
  const [sampleInvoice, setSampleInvoice] = useState("");

  // Load Settings
  useEffect(() => {
    if (!user) return;
    try {
      // 1. Subscription
      const savedSub = localStorage.getItem(`pos_tenant_sub_${user.id}`);
      if (savedSub) {
        setSubscriptionData(JSON.parse(savedSub));
      } else {
        setSubscriptionData({
          plan: "PRO PERCETAKAN DIGITAL",
          status: "ACTIVE",
          registeredAt: new Date().toISOString()
        });
      }

      // 2. Machines & SPK Settings
      const savedSettings = localStorage.getItem(`pos_tenant_${user.id}_printing_settings`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.machines) setMachines(parsed.machines);
        if (parsed.minDpPercentage) setMinDpPercentage(parsed.minDpPercentage);
        if (parsed.defaultEstimatedDays) setDefaultEstimatedDays(parsed.defaultEstimatedDays);
        if (parsed.enableFileProofing !== undefined) setEnableFileProofing(parsed.enableFileProofing);
        if (parsed.defaultSpkNotes) setDefaultSpkNotes(parsed.defaultSpkNotes);
      }

      // 3. Finishing Options
      const savedFin = localStorage.getItem("pos_printing_finishing_options");
      if (savedFin) {
        setFinishings(JSON.parse(savedFin));
      }

      // 4. Categories
      const savedCat = localStorage.getItem("pos_printing_categories");
      if (savedCat) {
        setCategories(JSON.parse(savedCat));
      }

      // Receipt Printers
      const savedReceipt = localStorage.getItem(`pos_tenant_${user.id}_receipt_printers`);
      if (savedReceipt) {
        setReceiptPrinters(JSON.parse(savedReceipt));
      }

      // 5. Invoice Config
      const currentConfig = getInvoiceSettings();
      setInvoiceConfig(currentConfig);
      setSampleInvoice(generateInvoiceCode(currentConfig, 1, "PUSAT"));
    } catch (e) {
      console.error("Error loading printing settings:", e);
    }
  }, [user]);

  // Seed All Mock Data to Permanent Storage
  const handleSeedAllPermanentData = async () => {
    if (confirm("Apakah Anda yakin ingin menyimpan dan mempermanenkan seluruh data demo (Bahan, Pelanggan, Finishing, Kategori, & Staf) ke penyimpanan permanen?")) {
      const res = await seedAllMockDataToPermanentStorage(user?.id);
      alert(res.message);
      window.location.reload();
    }
  };

  // Add Machine
  const handleAddMachine = () => {
    if (!newMachineName.trim()) return alert("Nama mesin cetak tidak boleh kosong!");
    const newM: PrintingMachine = {
      id: `m_${Date.now()}`,
      name: newMachineName,
      type: newMachineType,
      maxPrintWidthCm: Number(newMachineWidth) || 100,
      status: "Ready"
    };
    const updated = [...machines, newM];
    setMachines(updated);
    setNewMachineName("");
  };

  // Delete Machine
  const handleDeleteMachine = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus mesin ini dari daftar armada?")) {
      const updated = machines.filter((m) => m.id !== id);
      setMachines(updated);
      try {
        const savedSettings = JSON.parse(localStorage.getItem(`pos_tenant_${user?.id}_printing_settings`) || "{}");
        savedSettings.machines = updated;
        localStorage.setItem(`pos_tenant_${user?.id}_printing_settings`, JSON.stringify(savedSettings));
      } catch (e) {}
    }
  };

  // Receipt Printer Handlers
  const handleAddReceiptPrinter = () => {
    if (!newReceiptPrinterName.trim() || !user) return alert("Nama printer tidak boleh kosong!");
    const newPrinter = {
      id: `rp_${Date.now()}`,
      name: newReceiptPrinterName,
      type: newReceiptPrinterType,
      connection: newReceiptPrinterConnection,
      status: "Ready",
    };
    const updated = [...receiptPrinters, newPrinter];
    setReceiptPrinters(updated);
    setNewReceiptPrinterName("");
    try {
      localStorage.setItem(`pos_tenant_${user.id}_receipt_printers`, JSON.stringify(updated));
    } catch(e) {}
  };

  const handleDeleteReceiptPrinter = (id: string) => {
    if (!user || !confirm("Apakah Anda yakin ingin menghapus printer kasir ini?")) return;
    const updated = receiptPrinters.filter(p => p.id !== id);
    setReceiptPrinters(updated);
    try {
      localStorage.setItem(`pos_tenant_${user.id}_receipt_printers`, JSON.stringify(updated));
    } catch(e) {}
  };

  // Toggle Machine Status
  const handleToggleMachineStatus = (id: string) => {
    setMachines(
      machines.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === "Ready" ? "Maintenance" : "Ready";
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
  };

  // Open Finishing Modal Add
  const handleOpenFinishingAdd = () => {
    setEditingFinishing(null);
    setFormFinName("");
    setFormFinPrice(5000);
    setFormFinIsPerM2(false);
    setFormFinIsAvailable(true);
    setIsFinishingModalOpen(true);
  };

  // Open Finishing Modal Edit
  const handleOpenFinishingEdit = (fin: PrintingFinishingSetting) => {
    setEditingFinishing(fin);
    setFormFinName(fin.name);
    setFormFinPrice(fin.price);
    setFormFinIsPerM2(fin.isPerM2);
    setFormFinIsAvailable(fin.isAvailable);
    setIsFinishingModalOpen(true);
  };

  // Save Finishing Option
  const handleSaveFinishing = () => {
    if (!formFinName.trim()) return alert("Nama opsi finishing tidak boleh kosong!");

    let updated: PrintingFinishingSetting[];
    if (editingFinishing) {
      updated = finishings.map((f) => {
        if (f.id === editingFinishing.id) {
          return {
            ...f,
            name: formFinName,
            price: Number(formFinPrice) || 0,
            isPerM2: formFinIsPerM2,
            isAvailable: formFinIsAvailable
          };
        }
        return f;
      });
    } else {
      const newFin: PrintingFinishingSetting = {
        id: `fin_${Date.now()}`,
        name: formFinName,
        price: Number(formFinPrice) || 0,
        isPerM2: formFinIsPerM2,
        isAvailable: formFinIsAvailable
      };
      updated = [...finishings, newFin];
    }

    setFinishings(updated);
    try {
      localStorage.setItem("pos_printing_finishing_options", JSON.stringify(updated));
    } catch (e) {}
    setIsFinishingModalOpen(false);
  };

  // Toggle Finishing Status
  const handleToggleFinishingStatus = (id: string) => {
    const updated = finishings.map((f) => (f.id === id ? { ...f, isAvailable: !f.isAvailable } : f));
    setFinishings(updated);
    try {
      localStorage.setItem("pos_printing_finishing_options", JSON.stringify(updated));
    } catch (e) {}
  };

  // Delete Finishing
  const handleDeleteFinishing = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus opsi finishing ini?")) {
      const updated = finishings.filter((f) => f.id !== id);
      setFinishings(updated);
      try {
        localStorage.setItem("pos_printing_finishing_options", JSON.stringify(updated));
      } catch (e) {}
    }
  };

  // Open Category Modal Add
  const handleOpenCategoryAdd = () => {
    setEditingCategory(null);
    setFormCatName("");
    setFormCatCode("");
    setFormCatDesc("");
    setFormCatIsAvailable(true);
    setIsCategoryModalOpen(true);
  };

  // Open Category Modal Edit
  const handleOpenCategoryEdit = (cat: PrintingCategorySetting) => {
    setEditingCategory(cat);
    setFormCatName(cat.name);
    setFormCatCode(cat.code);
    setFormCatDesc(cat.description);
    setFormCatIsAvailable(cat.isAvailable);
    setIsCategoryModalOpen(true);
  };

  // Save Category
  const handleSaveCategory = () => {
    if (!formCatName.trim()) return alert("Nama kategori tidak boleh kosong!");
    const code = formCatCode.trim() ? formCatCode.toUpperCase() : formCatName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

    let updated: PrintingCategorySetting[];
    if (editingCategory) {
      updated = categories.map((c) => {
        if (c.id === editingCategory.id) {
          return {
            ...c,
            name: formCatName,
            code,
            description: formCatDesc,
            isAvailable: formCatIsAvailable
          };
        }
        return c;
      });
    } else {
      const newCat: PrintingCategorySetting = {
        id: `cat_${Date.now()}`,
        name: formCatName,
        code,
        description: formCatDesc,
        isAvailable: formCatIsAvailable
      };
      updated = [...categories, newCat];
    }

    setCategories(updated);
    try {
      localStorage.setItem("pos_printing_categories", JSON.stringify(updated));
    } catch (e) {}
    setIsCategoryModalOpen(false);
  };

  // Toggle Category Status
  const handleToggleCategoryStatus = (id: string) => {
    const updated = categories.map((c) => (c.id === id ? { ...c, isAvailable: !c.isAvailable } : c));
    setCategories(updated);
    try {
      localStorage.setItem("pos_printing_categories", JSON.stringify(updated));
    } catch (e) {}
  };

  // Delete Category
  const handleDeleteCategory = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus kategori bahan ini?")) {
      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      try {
        localStorage.setItem("pos_printing_categories", JSON.stringify(updated));
      } catch (e) {}
    }
  };

  // Add Branch Outlet
  const handleAddBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return alert("Nama outlet cabang wajib diisi!");
    try {
      await addBranch(branchName, branchAddress, branchPhone);
      setBranchName("");
      setBranchAddress("");
      setBranchPhone("");
      alert("Outlet cabang percetakan baru berhasil ditambahkan!");
    } catch (e) {
      console.error("Failed to add branch:", e);
    }
  };

  // Open Edit Branch Modal
  const handleOpenEditBranch = (b: any) => {
    setEditingBranchId(b.id);
    setEditBranchName(b.name || "");
    setEditBranchAddress(b.address || "");
    setEditBranchPhone(b.phone || "");
    setIsEditBranchModalOpen(true);
  };

  // Save Edit Branch
  const handleSaveEditedBranch = async () => {
    if (!editingBranchId || !editBranchName.trim()) return alert("Nama outlet wajib diisi!");
    try {
      await editBranch(editingBranchId, editBranchName, editBranchAddress, editBranchPhone);
      setIsEditBranchModalOpen(false);
      alert("Data outlet cabang berhasil diperbarui!");
    } catch (e) {
      console.error("Failed to edit branch:", e);
    }
  };

  // Set Main Branch
  const handleSetMainBranch = async (id: string) => {
    try {
      await setMainBranch(id);
      alert("Cabang utama berhasil diubah!");
    } catch (e) {
      console.error("Failed to set main branch:", e);
    }
  };


  // Save Invoice Settings
  const handleSaveInvoiceConfig = () => {
    saveInvoiceSettings(invoiceConfig);
    setSampleInvoice(generateInvoiceCode(invoiceConfig, 1, "PUSAT"));
    alert("Format nomor SPK / Struk berhasil diperbarui!");
  };

  // Save All Settings
  const savePrintingSettings = () => {
    if (!user) return;
    try {
      const dataToSave = {
        machines,
        minDpPercentage,
        defaultEstimatedDays,
        enableFileProofing,
        defaultSpkNotes,
        baseHourlyRate
      };
      localStorage.setItem(`pos_tenant_${user.id}_printing_settings`, JSON.stringify(dataToSave));
      localStorage.setItem("pos_printing_finishing_options", JSON.stringify(finishings));
      localStorage.setItem("pos_printing_categories", JSON.stringify(categories));
      localStorage.setItem("pos_printing_design_fee_tiers", JSON.stringify(designTiers));
      alert("Pengaturan Toko, Outlet & Tarif Desain Percetakan berhasil disimpan!");
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  // Calculate live design fee result
  const calculatedDesignFee = Math.max(
    0,
    Math.round(
      baseHourlyRate * (calcHours + calcMinutes / 60) * calcComplexityMult + Number(calcRevisionFee || 0)
    )
  );

  const handleSaveCalculatedTier = () => {
    if (!calcTierName.trim()) return alert("Nama preset opsi desain wajib diisi!");
    const newTier: PrintingDesignFeeTier = {
      id: `dt_${Date.now()}`,
      name: calcTierName,
      price: calculatedDesignFee,
      feeType: "FLAT",
      estimatedMinutes: calcHours * 60 + calcMinutes,
      description: calcTierDesc || `Kalkulasi (${calcHours}j ${calcMinutes}m, mult ${calcComplexityMult}x)`,
      isAvailable: true
    };
    const updated = [...designTiers, newTier];
    setDesignTiers(updated);
    try {
      localStorage.setItem("pos_printing_design_fee_tiers", JSON.stringify(updated));
    } catch (e) {}
    alert(`Preset tarif "${calcTierName}" seharga ${formatRupiah(calculatedDesignFee)} berhasil ditambahkan!`);
  };

  const handleDeleteDesignTier = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus opsi tarif desain ini dari daftar?")) {
      const updated = designTiers.filter((t) => t.id !== id);
      setDesignTiers(updated);
      try {
        localStorage.setItem("pos_printing_design_fee_tiers", JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const handleToggleDesignTierStatus = (id: string) => {
    const updated = designTiers.map((t) => (t.id === id ? { ...t, isAvailable: !t.isAvailable } : t));
    setDesignTiers(updated);
    try {
      localStorage.setItem("pos_printing_design_fee_tiers", JSON.stringify(updated));
    } catch (e) {}
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 md:p-5 space-y-4 overflow-y-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 md:p-4 border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-brand text-white grid place-items-center font-bold shadow-md shadow-brand/20 dark:shadow-none rounded-xl">
            <Settings className="size-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base md:text-lg text-slate-900 dark:text-white tracking-tight">
              Pengaturan Toko & Outlet Percetakan
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih menu di sebelah kiri untuk mengelola mesin, bahan, finishing, alur SPK, biaya desain, dan outlet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/app/pos">
            <Button
              variant="outline"
              className="h-8 text-xs font-bold gap-1.5 rounded-xl border-slate-300 shadow-md shadow-slate-200/50 dark:shadow-none text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="size-4" /> Kembali ke Kasir
            </Button>
          </Link>
          <Button
            onClick={() => {
              if(confirm('Yakin ingin mereset/mengosongkan seluruh data Bahan, Kategori, Finishing, dan Mesin? Ini akan menghapus semua data mock yang tersisa.')) {
                localStorage.removeItem('pos_printing_finishing_options');
                localStorage.removeItem('pos_printing_categories');
                localStorage.removeItem('pos_printing_materials');
                localStorage.setItem('pos_tenant_'+user?.id+'_printing_settings', '{}');
                window.location.reload();
              }
            }}
            variant="outline"
            className="h-8 text-xs font-bold gap-1.5 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-md shadow-slate-200/50 dark:shadow-none"
          >
            <Trash2 className="size-4" /> Kosongkan Data
          </Button>
          <Button
            onClick={savePrintingSettings}
            className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1.5 rounded-xl shadow-md shadow-brand/20 dark:shadow-none"
          >
            <Check className="size-4" /> Simpan Pengaturan
          </Button>
        </div>
      </div>

      {/* Main Container: Left Sidebar + Right Content Area */}
      <div className="flex flex-col md:flex-row gap-4 flex-1">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none rounded-2xl space-y-1 h-fit">
          <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
            Menu Pengaturan
          </div>
          {[
            { id: "printing_calc", label: "Armada Mesin Cetak", icon: Printer, badge: `${machines.length} Mesin` },
            { id: "printing_categories", label: "Kategori Bahan & Produk", icon: FolderPlus, badge: `${categories.length} Cat` },
            { id: "printing_finishing", label: "Pilihan Finishing Tambahan", icon: Scissors, badge: `${finishings.length} Opsi` },
            { id: "printing_spk", label: "Alur SPK & DP Minimal", icon: FileText, badge: `DP ${minDpPercentage}%` },
            { id: "design_fee_calc", label: "Biaya & Kalkulator Desain", icon: Sparkles, badge: `${designTiers.length} Preset` },
            { id: "printer_kasir", label: "Koneksi Printer Struk", icon: Printer, badge: `${receiptPrinters.length} Aktif` },
            { id: "cabang", label: "Outlet & Cabang", icon: Building2, badge: `${branches.length} Outlet` },
            { id: "invoice", label: "Format Kode SPK", icon: Receipt, badge: invoiceConfig.invoicePrefix },
            { id: "langganan", label: "Status Paket SaaS", icon: Crown, badge: "PRO" }
          ].map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold transition-all rounded-xl cursor-pointer ${
                  isActive
                    ? "bg-brand text-white shadow-md shadow-slate-200/50 dark:shadow-none"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`size-4 shrink-0 ${isActive ? "text-white" : "text-brand"}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 shrink-0 ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-4">

      {/* TAB PRINTER KASIR */}
      {activeTab === "printer_kasir" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md shadow-slate-200/50 dark:shadow-none">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Printer className="size-4 text-brand" /> Daftar Koneksi Printer Kasir (Struk & Nota)
            </h3>

            {/* Form Tambah Printer Kasir */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Printer
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Epson TM-T82X, Kassen..."
                  value={newReceiptPrinterName}
                  onChange={(e) => setNewReceiptPrinterName(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe / Ukuran Kertas
                </label>
                <select
                  value={newReceiptPrinterType}
                  onChange={(e) => setNewReceiptPrinterType(e.target.value)}
                  className="w-full h-8 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value="Thermal 58mm">Thermal 58mm</option>
                  <option value="Thermal 80mm">Thermal 80mm</option>
                  <option value="Dot Matrix 76mm">Dot Matrix 76mm</option>
                  <option value="A4 / A5">A4 / A5 (Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Metode Koneksi
                </label>
                <select
                  value={newReceiptPrinterConnection}
                  onChange={(e) => setNewReceiptPrinterConnection(e.target.value)}
                  className="w-full h-8 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value="USB">Kabel USB</option>
                  <option value="Bluetooth">Bluetooth / Wireless</option>
                  <option value="LAN / Ethernet">LAN / Ethernet (IP)</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleAddReceiptPrinter}
                  disabled={!newReceiptPrinterName.trim()}
                  className="w-full h-8 text-xs bg-brand text-white font-bold rounded-xl hover:bg-brand/90"
                >
                  <Plus className="size-3 mr-1" /> Tambah
                </Button>
              </div>
            </div>

            {/* List */}
            {receiptPrinters.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800 mt-4">
                {receiptPrinters.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 grid place-items-center">
                        <Printer className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {p.name}
                          </h4>
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] uppercase font-black px-1.5 py-0.5 tracking-wider">
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Tipe: <span className="font-semibold text-slate-700 dark:text-slate-300">{p.type}</span> &bull; Koneksi: <span className="font-semibold text-slate-700 dark:text-slate-300">{p.connection}</span>
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReceiptPrinter(p.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl h-8 px-2"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 mt-4">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Belum ada printer kasir / struk yang ditambahkan.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: Armada Mesin Cetak */}
      {activeTab === "printing_calc" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md shadow-slate-200/50 dark:shadow-none">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Printer className="size-4 text-brand" /> Daftar Armada Mesin Produksi Percetakan
            </h3>

            {/* Form Tambah Mesin */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Mesin / Printer
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Roland Soljet 3.2m..."
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Kategori Mesin
                </label>
                <select
                  value={newMachineType}
                  onChange={(e) => setNewMachineType(e.target.value)}
                  className="w-full h-8 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value="Outdoor Banner">Outdoor Banner Flexi</option>
                  <option value="Digital Press A3+">Digital Press A3+</option>
                  <option value="Plotter Cutting">Plotter Cutting Stiker</option>
                  <option value="UV Flatbed">UV Flatbed Rigid</option>
                  <option value="Sublimasi Tekstil">Sublimasi & Tekstil</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lebar Maks Area (cm)
                </label>
                <Input
                  type="number"
                  value={newMachineWidth}
                  onChange={(e) => setNewMachineWidth(Number(e.target.value))}
                  className="h-8 font-mono text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleAddMachine}
                  className="w-full h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1 rounded-xl"
                >
                  <Plus className="size-3.5" /> Tambah Mesin
                </Button>
              </div>
            </div>

            {/* List Mesin */}
            <div className="border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {machines.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-slate-100 dark:bg-slate-800 grid place-items-center text-brand font-bold border border-slate-200 dark:border-slate-700">
                      <Printer className="size-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        {m.name}
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 font-mono">
                          Max: {m.maxPrintWidthCm} cm
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">Tipe: {m.type}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleMachineStatus(m.id)}
                      className={`px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider cursor-pointer ${
                        m.status === "Ready"
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                      }`}
                    >
                      {m.status}
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteMachine(m.id)}
                      className="h-7 px-1.5 text-[10px] border-rose-200 dark:border-rose-900 text-rose-600 rounded-xl"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Kategori Bahan & Produk */}
      {activeTab === "printing_categories" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md shadow-slate-200/50 dark:shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderPlus className="size-4 text-indigo-600" /> Pengaturan Penambahan Kategori Bahan Percetakan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tambah dan atur kategori bahan cetak (Outdoor, Indoor, Sheet A3+, Merchandise, Akrilik, Sablon) yang otomatis terintegrasi ke Katalog Produk.
                </p>
              </div>

              <Button
                onClick={handleOpenCategoryAdd}
                className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1.5 rounded-xl shadow-md shadow-slate-200/50 dark:shadow-none"
              >
                <Plus className="size-4" /> Tambah Kategori Baru
              </Button>
            </div>

            {/* List Categories Table */}
            <div className="border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">Nama Kategori</th>
                    <th className="p-3 text-center">Kode Kategori</th>
                    <th className="p-3">Keterangan / Kelompok Bahan</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Tag className="size-3.5 text-indigo-600" />
                        {cat.name}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-brand">
                        {cat.code}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {cat.description || "-"}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleCategoryStatus(cat.id)}
                          className={`px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider cursor-pointer ${
                            cat.isAvailable
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {cat.isAvailable ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCategoryEdit(cat)}
                            className="h-7 px-2 text-[10px] border-slate-300 rounded-xl"
                          >
                            <Pencil className="size-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="h-7 px-1.5 text-[10px] border-rose-200 text-rose-600 rounded-xl"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Pilihan Finishing Tambahan */}
      {activeTab === "printing_finishing" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md shadow-slate-200/50 dark:shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Scissors className="size-4 text-purple-600" /> Kelola Pilihan Finishing Tambahan & Tarif
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Atur daftar finishing cetak (Laminasi, Mata Ayam, Potong, Jilid) beserta tarif yang otomatis terintegrasi ke Kasir POS Percetakan.
                </p>
              </div>

              <Button
                onClick={handleOpenFinishingAdd}
                className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1.5 rounded-xl shadow-md shadow-slate-200/50 dark:shadow-none"
              >
                <Plus className="size-4" /> Tambah Finishing Baru
              </Button>
            </div>

            {/* List Finishing Options Table */}
            <div className="border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">Nama Opsi Finishing</th>
                    <th className="p-3 text-center">Metode Hitung Tarif</th>
                    <th className="p-3 text-right">Tarif Harga (Rp)</th>
                    <th className="p-3 text-center">Status Ketersediaan</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {finishings.map((fin) => (
                    <tr key={fin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Scissors className="size-3.5 text-purple-600" />
                        {fin.name}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                          {fin.isPerM2 ? "Per Meter Persegi (m²)" : "Flat per Pcs / Lembar"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-brand">
                        {formatRupiah(fin.price)} {fin.isPerM2 && "/m²"}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleFinishingStatus(fin.id)}
                          className={`px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider cursor-pointer ${
                            fin.isAvailable
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {fin.isAvailable ? "Aktif (Ready)" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenFinishingEdit(fin)}
                            className="h-7 px-2 text-[10px] border-slate-300 rounded-xl"
                          >
                            <Pencil className="size-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteFinishing(fin.id)}
                            className="h-7 px-1.5 text-[10px] border-rose-200 text-rose-600 rounded-xl"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Alur SPK & DP Minimal */}
      {activeTab === "printing_spk" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md shadow-slate-200/50 dark:shadow-none">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="size-4 text-brand" /> Pengaturan Alur Pembayaran & SPK Operator
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Uang Muka Minimal (DP %) Sebelum SPK Diproses
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={minDpPercentage}
                    onChange={(e) => setMinDpPercentage(Number(e.target.value))}
                    className="h-9 font-mono font-extrabold text-sm w-32 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl text-brand"
                  />
                  <span className="font-bold text-slate-500">% Tagihan SPK</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Kasir wajib menerima DP minimal persentase ini sebelum cetakan masuk antrean produksi operator.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estimasi SLA Pengerjaan Standar (Hari Kerja)
                </label>
                <select
                  value={defaultEstimatedDays}
                  onChange={(e) => setDefaultEstimatedDays(Number(e.target.value))}
                  className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value={1}>1 Hari Kerja (Selesai Besok / Same Day)</option>
                  <option value={2}>2 Hari Kerja</option>
                  <option value={3}>3 Hari Kerja</option>
                  <option value={5}>5 Hari Kerja (Order Besar / Project)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Menentukan tanggal deadline bawaan pada form pendaftaran SPK.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Verifikasi Proofing File Desain Pelanggan
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Aktifkan opsi checklist verifikasi mode warna CMYK & bleed potong oleh desainer pre-press.
                  </p>
                </div>
                <button
                  onClick={() => setEnableFileProofing(!enableFileProofing)}
                  className={`px-3 py-1 text-xs font-bold border rounded-xl cursor-pointer ${
                    enableFileProofing
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 border-slate-300"
                  }`}
                >
                  {enableFileProofing ? "Aktif" : "Nonaktif"}
                </button>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Instruksi Cetak Wajib pada Lembar SPK Operator
                </label>
                <Input
                  type="text"
                  value={defaultSpkNotes}
                  onChange={(e) => setDefaultSpkNotes(e.target.value)}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB BIaya & KALKULATOR DESAIN GRAFIS */}
      {activeTab === "design_fee_calc" && (
        <div className="space-y-4">
          {/* Header Description */}
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" /> Kalkulator & Pengaturan Biaya Desain Grafis
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Konfigurasi tarif dasar desainer, preset biaya setting pre-press, dan simulasi kalkulator desain real-time untuk kasir.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Tarif Dasar Desainer:</span>
              <Input
                type="number"
                value={baseHourlyRate}
                onChange={(e) => setBaseHourlyRate(Number(e.target.value))}
                className="h-8 w-32 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-brand"
              />
              <span className="text-xs text-slate-500 font-bold">/ Jam</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Realtime Design Fee Calculator Simulator Card */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none space-y-3.5">
              <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="size-4 text-amber-500" /> Simulator Kalkulator Biaya Desain
                </h3>
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                  Real-time Quote
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimasi Pengerjaan Desain (Jam & Menit)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={48}
                        value={calcHours}
                        onChange={(e) => setCalcHours(Number(e.target.value))}
                        className="h-8 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                      />
                      <span className="font-bold text-slate-500">Jam</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={calcMinutes}
                        onChange={(e) => setCalcMinutes(Number(e.target.value))}
                        className="w-full h-8 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 font-bold text-xs text-slate-800 dark:text-slate-200"
                      >
                        <option value={0}>0 Menit</option>
                        <option value={15}>15 Menit</option>
                        <option value={30}>30 Menit</option>
                        <option value={45}>45 Menit</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Kompleksitas Desain
                  </label>
                  <select
                    value={calcComplexityMult}
                    onChange={(e) => setCalcComplexityMult(Number(e.target.value))}
                    className="w-full h-8 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 font-bold text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value={1.0}>Simple / Ringan (1.0x) - Ganti Teks & Ukuran</option>
                    <option value={1.5}>Sedang (1.5x) - Layout Spanduk / Broshur Baru</option>
                    <option value={2.0}>Rumit (2.0x) - Tracing Vektor & Logo Custom</option>
                    <option value={2.5}>Sangat Rumit (2.5x) - Complete Branding & Mascot</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Biaya Tambahan Revisi / Expedited (Rp)
                  </label>
                  <Input
                    type="number"
                    value={calcRevisionFee}
                    onChange={(e) => setCalcRevisionFee(Number(e.target.value))}
                    placeholder="0"
                    className="h-8 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                  />
                </div>

                {/* Calculation Output Box */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3.5 border border-slate-700 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Formula Hasil Kalkulasi:</span>
                    <span className="font-mono">
                      ({formatRupiah(baseHourlyRate)} x {(calcHours + calcMinutes / 60).toFixed(2)}j x {calcComplexityMult}x) + {formatRupiah(calcRevisionFee)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="font-extrabold uppercase tracking-wider text-xs">Total Biaya Desain:</span>
                    <span className="text-xl font-extrabold font-mono text-amber-400">
                      {formatRupiah(calculatedDesignFee)}
                    </span>
                  </div>
                </div>

                {/* Save Calculated as Preset Form */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block font-bold text-[11px] text-slate-700 dark:text-slate-300">
                    Simpan Hasil Kalkulasi ke List Preset Kasir:
                  </label>
                  <Input
                    type="text"
                    placeholder="Nama Preset (misal: Desain Spanduk 1 Jam)"
                    value={calcTierName}
                    onChange={(e) => setCalcTierName(e.target.value)}
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                  />
                  <Button
                    onClick={handleSaveCalculatedTier}
                    size="sm"
                    className="w-full h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1.5 rounded-xl"
                  >
                    <Plus className="size-3.5" /> Tambah ke Opsi Preset Kasir
                  </Button>
                </div>
              </div>
            </div>

            {/* List Preset Opsi Biaya Desain Table */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none space-y-3">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="size-4 text-brand" /> Daftar Preset Opsi Biaya Desain Kasir
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold">{designTiers.length} Opsi Terdaftar</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px]">
                      <th className="p-2.5">Opsi Desain</th>
                      <th className="p-2.5">Deskripsi</th>
                      <th className="p-2.5 text-right">Tarif (Rp)</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {designTiers.map((tier) => (
                      <tr key={tier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          {tier.name}
                          {tier.estimatedMinutes > 0 && (
                            <div className="text-[10px] text-slate-500 font-mono font-normal">
                              Est: {tier.estimatedMinutes} menit
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                          {tier.description}
                        </td>
                        <td className="p-2.5 text-right font-mono font-extrabold text-brand">
                          {tier.price === 0 ? "GRATIS" : formatRupiah(tier.price)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleToggleDesignTierStatus(tier.id)}
                            className={`px-1.5 py-0.5 text-[9px] font-bold border uppercase ${
                              tier.isAvailable
                                ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {tier.isAvailable ? "Aktif" : "Nonaktif"}
                          </button>
                        </td>
                        <td className="p-2.5 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteDesignTier(tier.id)}
                            className="h-6 w-6 p-0 text-rose-600 border-rose-200 rounded-xl"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Outlet & Cabang */}
      {activeTab === "cabang" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md shadow-slate-200/50 dark:shadow-none">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="size-4 text-brand" /> Daftar Outlet & Workshop Produksi Percetakan
            </h3>

            {/* Form Tambah Cabang */}
            <form onSubmit={handleAddBranchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Outlet / Workshop
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Workshop Percetakan Barat..."
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Workshop
                </label>
                <Input
                  type="text"
                  placeholder="Jl. Raya Cetak No. 12..."
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telepon Hotline
                </label>
                <Input
                  type="text"
                  placeholder="081234567890"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1 rounded-xl"
                >
                  <Plus className="size-3.5" /> Tambah Outlet
                </Button>
              </div>
            </form>

            {/* List Cabang */}
            <div className="border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {branches.map((b) => {
                const isActive = b.id === activeBranchId;
                return (
                  <div key={b.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="size-9 bg-slate-100 dark:bg-slate-800 grid place-items-center text-brand font-bold border border-slate-200 dark:border-slate-700">
                        <Building2 className="size-4" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          {b.name}
                          {b.is_main && (
                            <span className="text-[9px] bg-brand text-white px-1.5 py-0.2 uppercase font-bold">
                              Outlet Utama
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 uppercase font-bold">
                              Aktif Sekarang
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {b.address || "Alamat belum diatur"} • {b.phone || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => switchBranch(b.id)}
                          className="h-7 px-2 text-[10px] border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold"
                        >
                          Switch ke Outlet Ini
                        </Button>
                      )}

                      {!b.is_main && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetMainBranch(b.id)}
                          className="h-7 px-2 text-[10px] border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl"
                        >
                          Jadikan Utama
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditBranch(b)}
                        className="h-7 px-2 text-[10px] border-slate-300 text-slate-700 rounded-xl"
                      >
                        <Pencil className="size-3" /> Edit
                      </Button>

                      {!b.is_main && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteBranch(b.id)}
                          className="h-7 px-1.5 text-[10px] border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Format Kode SPK */}
      {activeTab === "invoice" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md shadow-slate-200/50 dark:shadow-none">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="size-4 text-brand" /> Format Awalan Nomor SPK & Struk Nota Percetakan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Awalan / Prefix SPK
                </label>
                <Input
                  type="text"
                  value={invoiceConfig.invoicePrefix}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, invoicePrefix: e.target.value.toUpperCase() })}
                  className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Panjang Counter Angka
                </label>
                <Input
                  type="number"
                  min={3}
                  max={6}
                  value={invoiceConfig.invoiceCounterDigits}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, invoiceCounterDigits: Number(e.target.value) })}
                  className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleSaveInvoiceConfig}
                  className="w-full h-9 text-xs bg-brand text-white font-bold hover:bg-brand/90 rounded-xl"
                >
                  Simpan Format SPK
                </Button>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/80 p-3 border border-slate-200 dark:border-slate-700 font-mono text-xs">
              <span className="text-slate-500 block text-[10px]">Contoh Tampilan Nomor SPK Nota:</span>
              <strong className="text-brand text-sm font-extrabold">{sampleInvoice || "SPK-20260916-0001"}</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Status Paket SaaS */}
      {activeTab === "langganan" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-4 shadow-md shadow-slate-200/50 dark:shadow-none">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Crown className="size-4 text-amber-500" /> Status Langganan POS Percetakan Digital SaaS
            </h3>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Tipe Paket Aktif:</span>
                <span className="text-lg font-extrabold text-brand font-mono">
                  {subscriptionData?.plan || "PRO PERCETAKAN DIGITAL"}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  ✓ Status: Aktif & Terverifikasi
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Tenant ID:</span>
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  {user?.id || "tenant_demo"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Modal Add / Edit Category */}
      {isCategoryModalOpen && (
        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 text-slate-900 dark:text-slate-100 rounded-xl font-sans">
            <DialogHeader className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <FolderPlus className="size-4 text-indigo-600" />
                {editingCategory ? "Edit Kategori Bahan" : "Tambah Kategori Bahan Cetak Baru"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kategori Bahan *
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Outdoor Banner, Digital Press A3+, Merchandise..."
                  value={formCatName}
                  onChange={(e) => setFormCatName(e.target.value)}
                  className="h-9 font-semibold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Kategori (Opsional)
                </label>
                <Input
                  type="text"
                  placeholder="OUTDOOR / SHEET_DOC / DISPLAY..."
                  value={formCatCode}
                  onChange={(e) => setFormCatCode(e.target.value)}
                  className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl text-brand uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Spesifikasi Kelompok Bahan
                </label>
                <Input
                  type="text"
                  placeholder="Daftar bahan yang termasuk di kategori ini..."
                  value={formCatDesc}
                  onChange={(e) => setFormCatDesc(e.target.value)}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Kategori
                </label>
                <select
                  value={formCatIsAvailable ? "true" : "false"}
                  onChange={(e) => setFormCatIsAvailable(e.target.value === "true")}
                  className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value="true">Aktif (Tampil di Katalog)</option>
                  <option value="false">Nonaktif (Sembunyikan)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCategoryModalOpen(false)}
                className="h-8 text-xs border-slate-300 rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCategory}
                className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 rounded-xl"
              >
                Simpan Kategori
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Add / Edit Finishing Option */}
      {isFinishingModalOpen && (
        <Dialog open={isFinishingModalOpen} onOpenChange={setIsFinishingModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 text-slate-900 dark:text-slate-100 rounded-xl font-sans">
            <DialogHeader className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Scissors className="size-4 text-purple-600" />
                {editingFinishing ? "Edit Opsi Finishing" : "Tambah Opsi Finishing Cetak Baru"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Opsi Finishing *
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Laminasi Doff, Mata Ayam, Potong Die Cut..."
                  value={formFinName}
                  onChange={(e) => setFormFinName(e.target.value)}
                  className="h-9 font-semibold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tarif Harga (Rp) *
                </label>
                <Input
                  type="number"
                  value={formFinPrice}
                  onChange={(e) => setFormFinPrice(Number(e.target.value))}
                  className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl text-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Metode Hitung Tarif
                </label>
                <select
                  value={formFinIsPerM2 ? "m2" : "flat"}
                  onChange={(e) => setFormFinIsPerM2(e.target.value === "m2")}
                  className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-semibold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value="flat">Harga Flat per Pcs / Lembar</option>
                  <option value="m2">Harga Hitung per Meter Persegi (m²)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Ketersediaan
                </label>
                <select
                  value={formFinIsAvailable ? "true" : "false"}
                  onChange={(e) => setFormFinIsAvailable(e.target.value === "true")}
                  className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value="true">Aktif (Tampil di Kasir)</option>
                  <option value="false">Nonaktif (Sembunyikan)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFinishingModalOpen(false)}
                className="h-8 text-xs border-slate-300 rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveFinishing}
                className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 rounded-xl"
              >
                Simpan Opsi Finishing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Edit Branch Outlet */}
      {isEditBranchModalOpen && (
        <Dialog open={isEditBranchModalOpen} onOpenChange={setIsEditBranchModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 text-slate-900 dark:text-slate-100 rounded-xl font-sans">
            <DialogHeader className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="size-4 text-brand" />
                Edit Data Outlet Cabang
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Outlet / Workshop *
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Workshop Cetak Cabang Barat..."
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  className="h-9 font-semibold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap Workshop
                </label>
                <Input
                  type="text"
                  placeholder="Jl. Raya Cetak No. 12..."
                  value={editBranchAddress}
                  onChange={(e) => setEditBranchAddress(e.target.value)}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Telepon Hotline
                </label>
                <Input
                  type="text"
                  placeholder="081234567890"
                  value={editBranchPhone}
                  onChange={(e) => setEditBranchPhone(e.target.value)}
                  className="h-9 font-mono text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditBranchModalOpen(false)}
                className="h-8 text-xs border-slate-300 rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditedBranch}
                className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 rounded-xl"
              >
                Simpan Perubahan Outlet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
