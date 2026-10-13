import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Settings, Plus, Trash2, LayoutGrid, Loader2, Tags, Building2, MapPin, Phone, Receipt, FileText, Hash, Sparkles, CreditCard, CheckCircle2, Crown, Zap, ShieldCheck, ArrowRight, Clock, Printer, Layers, Ruler, Scissors, Wrench, ArrowLeft, Bluetooth, Menu, Store, ChevronRight, X, ChevronLeft, Pencil, RotateCcw, Banknote, QrCode, Smartphone, Search, Filter, Armchair, Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";
import { getInvoiceSettings, saveInvoiceSettings, generateInvoiceCode, InvoiceSettings } from "@/shared/utils/invoiceGenerator";
import { getFnBPaymentSettings, saveFnBPaymentSettings, resetPaymentMethodsToDefault, PaymentMethodItem, FnBPaymentSettings, DEFAULT_FNB_PAYMENT_METHODS } from "@/shared/utils/fnbPaymentSettings";
import { toast } from "sonner";
import { PrintingSettingsView } from "@/domains/printing/SettingsView";
import { LaundrySettingsView } from "@/domains/laundry/SettingsView";

type TableData = {
  id: string;
  name: string;
  capacity?: number;
  status: string;
  branch_id?: string | null;
  qr_code?: string | null;
  tenant_id?: string;
  created_at?: string;
};

type AreaData = {
  id: string;
  name: string;
  type: "smoking" | "non-smoking";
  branch_id?: string | null;
  tenant_id?: string;
  created_at?: string;
};

function parseTableArea(table: TableData): string {
  if (table.qr_code) {
    try {
      const parsed = JSON.parse(table.qr_code);
      if (parsed.area) return parsed.area;
    } catch {}
  }
  const match = table.name.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) return match[1];
  return "Utama";
}

function parseTableDisplayName(table: TableData): string {
  const match = table.name.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) return match[2];
  return table.name;
}

export function SettingsView() {
  const { user, branches, addBranch, deleteBranch, activeBranchName, activeBranchId } = useAuth();

  if ((user?.businessType as string) === "PRINTING") {
    return <PrintingSettingsView />;
  }
  if ((user?.businessType as string) === "LAUNDRY") {
    return <LaundrySettingsView />;
  }
  const [tables, setTables] = useState<TableData[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [tableSubTab, setTableSubTab] = useState<"meja" | "area">("meja");
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>("all");

  // Meja Form States
  const [newTableName, setNewTableName] = useState("");
  const [newTableArea, setNewTableArea] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  // Edit Meja Modal States
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const [editTableName, setEditTableName] = useState("");
  const [editTableArea, setEditTableArea] = useState("");
  const [editTableCapacity, setEditTableCapacity] = useState<number>(4);

  // Area Form States
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaType, setNewAreaType] = useState<"smoking" | "non-smoking">("non-smoking");

  // Edit Area Modal States
  const [isEditAreaModalOpen, setIsEditAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaData | null>(null);
  const [editAreaName, setEditAreaName] = useState("");
  const [editAreaType, setEditAreaType] = useState<"smoking" | "non-smoking">("non-smoking");

  // Categories
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Branch Form
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  // Tabs
  const [activeTab, setActiveTab] = useState<"langganan" | "meja" | "kategori" | "pembayaran" | "cabang" | "umum" | "invoice" | "printing_calc" | "printing_spk" | "printer">("langganan");

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

  // Payment Settings for FnB
  const [paymentSettings, setPaymentSettings] = useState<FnBPaymentSettings>(() => getFnBPaymentSettings(user?.id));
  const [paymentSaveSuccess, setPaymentSaveSuccess] = useState(false);

  // Payment Method Modal State (Create / Update CRUD)
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [methodFormName, setMethodFormName] = useState("");
  const [methodFormType, setMethodFormType] = useState<PaymentMethodItem["type"]>("debit");
  const [methodFormBank, setMethodFormBank] = useState("");
  const [methodFormAccountNumber, setMethodFormAccountNumber] = useState("");
  const [methodFormAccountName, setMethodFormAccountName] = useState("");
  const [methodFormNotes, setMethodFormNotes] = useState("");
  const [methodFormEnabled, setMethodFormEnabled] = useState(true);

  // Search & Filter State for Payment Methods
  const [methodSearchQuery, setMethodSearchQuery] = useState("");
  const [methodFilterTab, setMethodFilterTab] = useState<"all" | "active" | "inactive">("all");

  // Invoice Code Settings
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [invoiceFormat, setInvoiceFormat] = useState("{PREFIX}-{YYYYMMDD}-{COUNTER}");
  const [invoiceCounterDigits, setInvoiceCounterDigits] = useState(4);
  const [invoiceCounterReset, setInvoiceCounterReset] = useState<"DAILY" | "MONTHLY" | "YEARLY" | "NEVER">("DAILY");

  const fetchTables = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const areaRows: AreaData[] = (data || [])
        .filter(t => t.status === "_area_def")
        .map(t => {
          let type: "smoking" | "non-smoking" = "non-smoking";
          if (t.qr_code) {
            try {
              const parsed = JSON.parse(t.qr_code);
              if (parsed.type) type = parsed.type;
            } catch {}
          }
          return {
            id: t.id,
            name: t.name,
            type,
            branch_id: t.branch_id,
            tenant_id: t.tenant_id,
            created_at: t.created_at,
          };
        });

      const tableRows: TableData[] = (data || []).filter(t => t.status !== "_area_def");
      setAreas(areaRows);
      setTables(tableRows);
    } catch (error) {
      console.error("Error fetching tables & areas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("categories").select("*").eq("tenant_id", user.id).order("name");
      setCategories(data || []);
    } catch (error) {}
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        await fetchTables();

        // Fetch Categories
        const { data: catData } = await supabase.from("categories").select("*").eq("tenant_id", user.id).order("name");
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

        // Fetch FnB Payment Settings
        const loadedPay = getFnBPaymentSettings(user.id);
        if (settingsData && settingsData.tax_rate !== undefined) {
          loadedPay.taxRate = settingsData.tax_rate;
          loadedPay.enableTax = settingsData.tax_rate > 0;
        }
        setPaymentSettings(loadedPay);
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

  const addTable = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !newTableName.trim()) return;
    setIsSubmitting(true);
    const chosenArea = newTableArea.trim() || (areas.length > 0 ? areas[0].name : "Utama");
    const finalName = chosenArea && chosenArea !== "Utama"
      ? `[${chosenArea}] ${newTableName.trim()}`
      : newTableName.trim();
    try {
      const { error } = await supabase.from("tables").insert({
        tenant_id: user.id,
        name: finalName,
        capacity: Number(newTableCapacity) || 4,
        status: "available",
        branch_id: activeBranchId || null,
        qr_code: JSON.stringify({ area: chosenArea, capacity: Number(newTableCapacity) || 4 })
      });
      if (error) throw error;
      toast.success("Meja berhasil disimpan ke Supabase");
      setNewTableName("");
      setNewTableArea("");
      setNewTableCapacity(4);
      setIsTableModalOpen(false);
      await fetchTables();
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal menambah meja: ${error.message || "Kesalahan server"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditTable = (table: TableData) => {
    setEditingTable(table);
    setEditTableName(parseTableDisplayName(table));
    setEditTableArea(parseTableArea(table));
    setEditTableCapacity(table.capacity || 4);
    setIsEditTableModalOpen(true);
  };

  const updateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTable || !editTableName.trim()) return;
    setIsSubmitting(true);
    const chosenArea = editTableArea.trim() || "Utama";
    const finalName = chosenArea && chosenArea !== "Utama"
      ? `[${chosenArea}] ${editTableName.trim()}`
      : editTableName.trim();
    try {
      const { error } = await supabase.from("tables").update({
        name: finalName,
        capacity: Number(editTableCapacity) || 4,
        branch_id: activeBranchId || null,
        qr_code: JSON.stringify({ area: chosenArea, capacity: Number(editTableCapacity) || 4 })
      }).eq("id", editingTable.id).eq("tenant_id", user.id);
      if (error) throw error;
      toast.success("Meja berhasil diperbarui di Supabase");
      setIsEditTableModalOpen(false);
      setEditingTable(null);
      await fetchTables();
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal mengubah meja: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm("Hapus meja ini dari database Supabase?")) return;
    try {
      const { error } = await supabase.from("tables").delete().eq("id", id).eq("tenant_id", user.id);
      if (error) throw error;
      toast.success("Meja berhasil dihapus dari Supabase");
      await fetchTables();
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal menghapus meja: ${error.message}`);
    }
  };

  const markAvailable = async (id: string) => {
    try {
      const { error } = await supabase.from("tables").update({ status: "available" }).eq("id", id).eq("tenant_id", user.id);
      if (error) throw error;
      toast.success("Status meja dikosongkan");
      await fetchTables();
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal mengubah status: ${error.message}`);
    }
  };

  const addArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAreaName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("tables").insert({
        tenant_id: user.id,
        name: newAreaName.trim(),
        status: "_area_def",
        capacity: 0,
        branch_id: activeBranchId || null,
        qr_code: JSON.stringify({ type: newAreaType || "non-smoking", branch_id: activeBranchId || null })
      });
      if (error) throw error;
      toast.success("Area berhasil disimpan ke Supabase");
      setNewAreaName("");
      setNewAreaType("non-smoking");
      setIsAreaModalOpen(false);
      await fetchTables();
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal menyimpan area: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditArea = (area: AreaData) => {
    setEditingArea(area);
    setEditAreaName(area.name);
    setEditAreaType(area.type);
    setIsEditAreaModalOpen(true);
  };

  const updateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingArea || !editAreaName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("tables").update({
        name: editAreaName.trim(),
        qr_code: JSON.stringify({ type: editAreaType, branch_id: activeBranchId || null })
      }).eq("id", editingArea.id).eq("tenant_id", user.id);
      if (error) throw error;
      toast.success("Area berhasil diperbarui di Supabase");
      setIsEditAreaModalOpen(false);
      setEditingArea(null);
      await fetchTables();
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal mengubah area: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteArea = async (areaId: string, areaName: string) => {
    if (!confirm(`Hapus area "${areaName}" dari database Supabase?`)) return;
    try {
      const { error } = await supabase.from("tables").delete().eq("id", areaId).eq("tenant_id", user.id);
      if (error) throw error;
      toast.success("Area berhasil dihapus dari Supabase");
      if (selectedAreaFilter === areaName) setSelectedAreaFilter("all");
      await fetchTables();
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal menghapus area: ${error.message}`);
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

  const handleSavePaymentSettings = async () => {
    setIsSubmitting(true);
    try {
      // 1. Simpan ke localStorage (tenant aktif & key umum fallback)
      saveFnBPaymentSettings(paymentSettings, user?.id);

      // 2. Sinkronkan ke database store_settings Supabase jika ada session user
      if (user?.id) {
        const taxToSave = paymentSettings.enableTax ? (Number(paymentSettings.taxRate) || 0) : 0;
        const serviceToSave = paymentSettings.enableServiceCharge ? (Number(paymentSettings.serviceChargeRate) || 0) : 0;

        try {
          if (settingsId) {
            await supabase.from("store_settings").update({ 
              tax_rate: taxToSave,
              service_charge: serviceToSave,
              updated_at: new Date().toISOString() 
            }).eq("id", settingsId);
          } else {
            const { data } = await supabase.from("store_settings").upsert({ 
              tenant_id: user.id,
              tax_rate: taxToSave,
              service_charge: serviceToSave,
              updated_at: new Date().toISOString() 
            }, { onConflict: "tenant_id" }).select().maybeSingle();
            if (data?.id) setSettingsId(data.id);
          }
          setTaxRate(taxToSave);
        } catch (dbErr) {
          console.warn("Sinkronisasi database toko Supabase dilewati (data aman di cache lokal):", dbErr);
        }
      }

      setPaymentSaveSuccess(true);
      setTimeout(() => setPaymentSaveSuccess(false), 3500);
      toast.success("Pengaturan metode pembayaran & biaya resto berhasil disimpan!");
      alert("Pengaturan metode pembayaran & biaya resto berhasil disimpan!");
    } catch (error: any) {
      console.error("Gagal simpan pengaturan pembayaran:", error);
      toast.error("Gagal menyimpan pengaturan: " + (error?.message || error));
      alert("Gagal menyimpan pengaturan: " + (error?.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // === CRUD METODE PEMBAYARAN F&B ===
  const handleOpenCreateMethodModal = () => {
    setEditingMethodId(null);
    setMethodFormName("");
    setMethodFormType("debit");
    setMethodFormBank("");
    setMethodFormAccountNumber("");
    setMethodFormAccountName("");
    setMethodFormNotes("");
    setMethodFormEnabled(true);
    setIsMethodModalOpen(true);
  };

  const handleOpenEditMethodModal = (method: PaymentMethodItem) => {
    setEditingMethodId(method.id);
    setMethodFormName(method.name);
    setMethodFormType(method.type);
    setMethodFormBank(method.bankName || "");
    setMethodFormAccountNumber(method.accountNumber || "");
    setMethodFormAccountName(method.accountName || "");
    setMethodFormNotes(method.notes || "");
    setMethodFormEnabled(method.enabled);
    setIsMethodModalOpen(true);
  };

  const handleSaveMethodModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodFormName.trim()) {
      toast.error("Nama metode pembayaran wajib diisi!");
      return;
    }

    if (editingMethodId) {
      // UPDATE: Ubah metode yang ada
      const updatedMethods = paymentSettings.paymentMethods.map(m => {
        if (m.id === editingMethodId) {
          return {
            ...m,
            name: methodFormName.trim(),
            type: methodFormType,
            bankName: methodFormBank.trim() || undefined,
            accountNumber: methodFormAccountNumber.trim() || undefined,
            accountName: methodFormAccountName.trim() || undefined,
            notes: methodFormNotes.trim() || undefined,
            enabled: methodFormEnabled,
          };
        }
        return m;
      });
      const nextSettings = { ...paymentSettings, paymentMethods: updatedMethods };
      setPaymentSettings(nextSettings);
      saveFnBPaymentSettings(nextSettings, user?.id);
      toast.success(`Metode "${methodFormName.trim()}" berhasil diperbarui!`);
    } else {
      // CREATE: Tambah metode baru
      const newId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newMethod: PaymentMethodItem = {
        id: newId,
        name: methodFormName.trim(),
        type: methodFormType,
        bankName: methodFormBank.trim() || undefined,
        accountNumber: methodFormAccountNumber.trim() || undefined,
        accountName: methodFormAccountName.trim() || undefined,
        notes: methodFormNotes.trim() || undefined,
        enabled: methodFormEnabled,
      };
      const nextSettings = {
        ...paymentSettings,
        paymentMethods: [...paymentSettings.paymentMethods, newMethod]
      };
      setPaymentSettings(nextSettings);
      saveFnBPaymentSettings(nextSettings, user?.id);
      toast.success(`Metode baru "${newMethod.name}" berhasil ditambahkan!`);
    }

    setIsMethodModalOpen(false);
  };

  const handleTogglePaymentMethod = (id: string) => {
    const updatedMethods = paymentSettings.paymentMethods.map(m =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    const nextSettings = { ...paymentSettings, paymentMethods: updatedMethods };
    setPaymentSettings(nextSettings);
    saveFnBPaymentSettings(nextSettings, user?.id);
    const target = updatedMethods.find(m => m.id === id);
    if (target) {
      toast.success(`Metode "${target.name}" ${target.enabled ? "diaktifkan" : "dinonaktifkan"}`);
    }
  };

  const handleDeletePaymentMethod = (method: PaymentMethodItem) => {
    if (paymentSettings.paymentMethods.length <= 1) {
      alert("Minimal harus ada 1 metode pembayaran yang tersisa agar kasir tetap dapat beroperasi.");
      return;
    }

    if (!confirm(`Hapus metode pembayaran "${method.name}"?\nMetode ini akan dihapus dari opsi kasir POS.`)) {
      return;
    }

    const updatedMethods = paymentSettings.paymentMethods.filter(m => m.id !== method.id);
    const nextSettings = { ...paymentSettings, paymentMethods: updatedMethods };
    setPaymentSettings(nextSettings);
    saveFnBPaymentSettings(nextSettings, user?.id);
    toast.success(`Metode "${method.name}" berhasil dihapus.`);
  };

  const handleResetPaymentMethods = () => {
    if (!confirm("Kembalikan daftar metode pembayaran ke konfigurasi standar F&B (Tunai, QRIS, BCA, Mandiri, Transfer, GoPay, OVO)?\nMetode kustom yang ditambahkan akan dihapus.")) {
      return;
    }
    const resetList = resetPaymentMethodsToDefault(user?.id);
    const nextSettings = { ...paymentSettings, paymentMethods: resetList };
    setPaymentSettings(nextSettings);
    toast.success("Daftar metode pembayaran telah di-reset ke standar F&B!");
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

  const filteredPaymentMethods = paymentSettings.paymentMethods.filter((method) => {
    if (methodFilterTab === "active" && !method.enabled) return false;
    if (methodFilterTab === "inactive" && method.enabled) return false;
    if (methodSearchQuery.trim()) {
      const q = methodSearchQuery.toLowerCase();
      const matchName = method.name.toLowerCase().includes(q);
      const matchBank = method.bankName?.toLowerCase().includes(q);
      const matchAcc = method.accountNumber?.toLowerCase().includes(q);
      const matchType = method.type.toLowerCase().includes(q);
      return matchName || matchBank || matchAcc || matchType;
    }
    return true;
  });

  const activePaymentCount = paymentSettings.paymentMethods.filter((m) => m.enabled).length;
  const totalPaymentCount = paymentSettings.paymentMethods.length;

  const getMethodTypeInfo = (type: PaymentMethodItem["type"]) => {
    switch (type) {
      case "cash":
        return { label: "Tunai", Icon: Banknote, colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" };
      case "qris":
        return { label: "QRIS", Icon: QrCode, colorClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800" };
      case "debit":
        return { label: "Kartu / Debit", Icon: CreditCard, colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" };
      case "transfer":
        return { label: "Transfer Bank", Icon: Building2, colorClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800" };
      case "ewallet":
        return { label: "E-Wallet", Icon: Smartphone, colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" };
      default:
        return { label: "Lainnya", Icon: Layers, colorClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" };
    }
  };

  return (
    <div className="p-3 md:p-6 h-full flex flex-col gap-3 md:gap-6 overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-lg md:text-2xl font-extrabold text-slate-900 dark:text-white">
            Pengaturan Toko & Resto
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola meja, menu, metode pembayaran, kasir printer, dan outlet bisnis Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            Modul F&B Resto & Cafe
          </span>
        </div>
      </div>
      
      <div className="flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-6 flex-1 overflow-hidden">
        {/* Sidebar Kiri / Tab Bar Horizontal di Layar Kecil */}
        <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-2 md:pb-0 md:pr-4 flex md:flex-col gap-1.5 md:space-y-1.5 shrink-0 overflow-x-auto overflow-y-hidden md:overflow-y-auto">
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
            onClick={() => setActiveTab("pembayaran")}
            className={`shrink-0 w-auto md:w-full text-left px-2.5 md:px-3 py-1.5 md:py-2.5 font-bold rounded-xl flex items-center gap-1.5 md:gap-2 transition-all text-[10px] md:text-sm ${activeTab === "pembayaran" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >
            <CreditCard className={`size-3.5 md:size-4 ${activeTab === "pembayaran" ? "text-white" : "text-slate-400"}`} />
            Metode Pembayaran
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
              {/* Mobile Header */}
              <div className="md:hidden flex items-center h-14 px-4 bg-white shrink-0 border-b border-slate-100">
                <button onClick={() => setActiveTab("langganan")} className="p-2 -ml-2 mr-2 text-slate-800">
                  <Menu className="size-5" />
                </button>
                <h1 className="font-extrabold text-slate-900 text-[17px]">Kelola Meja & Area</h1>
              </div>

              {/* Mobile Branch Selector */}
              <div className="md:hidden px-4 py-3 shrink-0">
                <div className="flex items-center justify-between bg-slate-100/70 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Store className="size-4 text-slate-700" />
                    <span className="font-bold text-slate-800 text-sm">{activeBranchName || "Semua Cabang"}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Outlet Aktif</span>
                </div>
              </div>

              {/* Tabs Meja & Area (Mobile & Desktop) */}
              <div className="flex px-4 md:px-0 border-b border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setTableSubTab("meja")}
                  className={`flex-1 text-center py-3 font-bold text-sm md:text-base cursor-pointer transition-colors ${
                    tableSubTab === "meja" ? "border-b-2 border-[#0b172a] text-[#0b172a] font-extrabold" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Daftar Meja ({tables.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTableSubTab("area")}
                  className={`flex-1 text-center py-3 font-bold text-sm md:text-base cursor-pointer transition-colors ${
                    tableSubTab === "area" ? "border-b-2 border-[#0b172a] text-[#0b172a] font-extrabold" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Kelola Area ({areas.length})
                </button>
              </div>

              {tableSubTab === "meja" ? (
                <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-0">
                  {/* Desktop Header Title */}
                  <div className="hidden md:flex items-center justify-between mt-4 mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Daftar Meja (Dine In)</h2>
                      <p className="text-xs text-slate-400">Kelola nomor meja, kapasitas tempat duduk, dan area restoran yang tersimpan di Supabase.</p>
                    </div>
                    <Button 
                      onClick={() => setIsTableModalOpen(true)}
                      className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm"
                    >
                      <Plus className="size-4 mr-1.5" /> Tambah Meja
                    </Button>
                  </div>

                  {/* Filter Area Pills */}
                  <div className="mb-4 shrink-0 overflow-x-auto pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                        <Filter className="size-3" /> Area:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedAreaFilter("all")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          selectedAreaFilter === "all"
                            ? "bg-[#0b172a] text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Semua Area ({tables.length})
                      </button>
                      {areas.map(a => {
                        const count = tables.filter(t => parseTableArea(t) === a.name).length;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelectedAreaFilter(a.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                              selectedAreaFilter === a.name
                                ? "bg-[#0b172a] text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            <span>{a.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              selectedAreaFilter === a.name ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Desktop Inline Add Form */}
                  <form onSubmit={addTable} className="hidden md:flex items-center gap-3 mb-5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="w-48">
                      <select
                        value={newTableArea}
                        onChange={(e) => setNewTableArea(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20"
                      >
                        <option value="">Pilih Area ({areas.length > 0 ? areas[0].name : "Utama"})</option>
                        {areas.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.type === 'smoking' ? 'Smoking' : 'Non-Smoking'})</option>
                        ))}
                        <option value="Utama">Area Utama</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <Input 
                        placeholder="Nama Meja (cth: Meja 1, VIP 2)" 
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        required
                        className="h-10 text-xs md:text-sm rounded-xl font-bold border-slate-200 bg-white"
                      />
                    </div>
                    <div className="w-32">
                      <Input 
                        type="number"
                        min="1"
                        placeholder="Kapasitas (4)" 
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                        className="h-10 text-xs md:text-sm rounded-xl font-medium border-slate-200 bg-white"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting || !newTableName.trim()} className="bg-[#0b172a] hover:bg-slate-800 text-white shrink-0 h-10 text-xs rounded-xl font-bold px-5 shadow-sm">
                      <Plus className="size-3.5 mr-1.5" /> Tambah Meja
                    </Button>
                  </form>

                  {/* Table List Container */}
                  <div className="flex-1 overflow-auto bg-white flex flex-col md:border md:border-slate-100 md:rounded-2xl md:shadow-sm">
                    {isLoading ? (
                      <div className="flex justify-center items-center flex-1 py-12">
                        <Loader2 className="size-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      (() => {
                        const filtered = selectedAreaFilter === "all"
                          ? tables
                          : tables.filter(t => parseTableArea(t) === selectedAreaFilter);

                        if (filtered.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center flex-1 text-slate-500 py-16 text-center">
                              <LayoutGrid className="size-12 text-slate-300 mb-3" />
                              <p className="text-[17px] font-extrabold text-slate-800 mb-1">
                                {selectedAreaFilter === "all" ? "Belum Ada Meja" : `Belum Ada Meja di Area "${selectedAreaFilter}"`}
                              </p>
                              <p className="text-[13px] text-slate-400 font-medium mb-4 max-w-sm">
                                Tambahkan meja baru untuk dine-in agar kasir dapat mencatat pesanan per meja.
                              </p>
                              <Button
                                onClick={() => {
                                  if (selectedAreaFilter !== "all") setNewTableArea(selectedAreaFilter);
                                  setIsTableModalOpen(true);
                                }}
                                className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                              >
                                <Plus className="size-4 mr-1.5" /> Tambah Meja Sekarang
                              </Button>
                            </div>
                          );
                        }

                        return (
                          <table className="w-full text-left text-xs md:text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 sticky top-0">
                              <tr>
                                <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs">Nama Meja</th>
                                <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs">Area / Lokasi</th>
                                <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs text-center">Kapasitas</th>
                                <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs text-center w-28">Status</th>
                                <th className="p-3 md:p-4 font-bold uppercase tracking-wider text-[10px] md:text-xs text-right w-28">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map(table => {
                                const displayName = parseTableDisplayName(table);
                                const tableArea = parseTableArea(table);
                                return (
                                  <tr key={table.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 md:p-4">
                                      <div className="font-bold text-slate-800 text-sm">{displayName}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">ID: {table.id.substring(0, 8)}</div>
                                    </td>
                                    <td className="p-3 md:p-4">
                                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                        <MapPin className="size-3 text-slate-400" />
                                        {tableArea}
                                      </span>
                                    </td>
                                    <td className="p-3 md:p-4 text-center">
                                      <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                        <Armchair className="size-3.5 text-slate-400" />
                                        {table.capacity || 4} Kursi
                                      </span>
                                    </td>
                                    <td className="p-3 md:p-4 text-center">
                                      {table.status === 'available' ? (
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold border border-emerald-200">
                                          Tersedia
                                        </span>
                                      ) : (
                                        <div className="flex flex-col items-center gap-1">
                                          <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold border border-amber-200">
                                            Terisi
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => markAvailable(table.id)}
                                            className="text-[10px] text-indigo-600 font-semibold hover:underline"
                                          >
                                            Kosongkan
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3 md:p-4 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openEditTable(table)}
                                          title="Ubah Meja"
                                          className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 size-8 md:size-9 rounded-xl"
                                        >
                                          <Pencil className="size-3.5 md:size-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => deleteTable(table.id)}
                                          title="Hapus Meja"
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50 size-8 md:size-9 rounded-xl"
                                        >
                                          <Trash2 className="size-3.5 md:size-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        );
                      })()
                    )}
                  </div>

                  {/* Fixed Bottom Button for Mobile (Meja) */}
                  <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 pb-safe z-10">
                    <Button 
                      onClick={() => setIsTableModalOpen(true)}
                      className="w-full bg-[#0b172a] hover:bg-slate-800 text-white h-12 rounded-[14px] font-bold text-[15px] shadow-sm"
                    >
                      <Plus className="size-5 mr-2" /> Tambah Meja
                    </Button>
                  </div>
                </div>
              ) : (
                /* Area SubTab */
                <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-0">
                  {/* Desktop Header */}
                  <div className="hidden md:flex items-center justify-between mt-4 mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Kelola Area / Ruangan</h2>
                      <p className="text-xs text-slate-400">Kelompokkan meja berdasarkan zona seperti Indoor, Outdoor, Lantai 2, atau Smoking Area.</p>
                    </div>
                    <Button 
                      onClick={() => { setNewAreaName(""); setNewAreaType("non-smoking"); setIsAreaModalOpen(true); }}
                      className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm"
                    >
                      <Plus className="size-4 mr-1.5" /> Tambah Area Baru
                    </Button>
                  </div>

                  {/* Area List Container */}
                  <div className="flex-1 overflow-auto bg-white flex flex-col md:bg-transparent">
                    {isLoading ? (
                      <div className="flex justify-center items-center flex-1 py-12">
                        <Loader2 className="size-6 animate-spin text-slate-400" />
                      </div>
                    ) : areas.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1 text-slate-500 py-16 text-center">
                        <Building2 className="size-14 text-slate-300 mb-3" />
                        <p className="text-[17px] font-extrabold text-slate-800 mb-1">Belum Ada Area</p>
                        <p className="text-[13px] text-slate-400 font-medium mb-4 max-w-sm">
                          Area yang terdaftar di Supabase akan muncul di sini. Tambahkan area seperti Indoor, Outdoor, atau VIP.
                        </p>
                        <Button
                          onClick={() => { setNewAreaName(""); setNewAreaType("non-smoking"); setIsAreaModalOpen(true); }}
                          className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                        >
                          <Plus className="size-4 mr-1.5" /> Tambah Area Pertama
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 md:pb-6">
                        {areas.map(area => {
                          const tableCount = tables.filter(t => parseTableArea(t) === area.name).length;
                          return (
                            <div key={area.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                                      <Building2 className="size-5" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-slate-800 text-base">{area.name}</h3>
                                      <p className="text-[11px] text-slate-400 font-medium">{activeBranchName || "Semua Cabang"}</p>
                                    </div>
                                  </div>
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                                    area.type === "smoking"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}>
                                    {area.type === "smoking" ? (
                                      <>
                                        <Flame className="size-3 text-amber-500" /> Smoking Area
                                      </>
                                    ) : (
                                      <>
                                        <ShieldCheck className="size-3 text-emerald-500" /> Non-Smoking
                                      </>
                                    )}
                                  </span>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs text-slate-600 mb-4">
                                  <span className="font-medium">Jumlah Meja Terdaftar:</span>
                                  <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                    {tableCount} Meja
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditArea(area)}
                                  className="h-8 rounded-lg text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                                >
                                  <Pencil className="size-3.5 mr-1" /> Ubah
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteArea(area.id, area.name)}
                                  className="h-8 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="size-3.5 mr-1" /> Hapus
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Fixed Bottom Button for Mobile (Area) */}
                  <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 pb-safe z-10">
                    <Button 
                      onClick={() => { setNewAreaName(""); setNewAreaType("non-smoking"); setIsAreaModalOpen(true); }}
                      className="w-full bg-[#0b172a] hover:bg-slate-800 text-white h-12 rounded-[14px] font-bold text-[15px] shadow-sm"
                    >
                      <Plus className="size-5 mr-2" /> Tambah Area Baru
                    </Button>
                  </div>
                </div>
              )}

              {/* Add Table Modal (Mobile / Dialog) */}
              <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="font-bold text-lg text-slate-800">Tambah Meja Baru</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Masukkan detail meja untuk disimpan langsung ke database Supabase.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={addTable} className="space-y-4 py-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama / Nomor Meja *</label>
                      <Input 
                        placeholder="Contoh: Meja 1, VIP 01" 
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        required
                        className="h-11 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Area</label>
                      <select
                        value={newTableArea}
                        onChange={(e) => setNewTableArea(e.target.value)}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20"
                      >
                        <option value="">Area Utama (Default)</option>
                        {areas.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.type === 'smoking' ? 'Smoking' : 'Non-Smoking'})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Kursi (Orang)</label>
                      <Input 
                        type="number"
                        min="1"
                        placeholder="4" 
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsTableModalOpen(false)}
                        className="rounded-xl"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !newTableName.trim()}
                        className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl font-bold"
                      >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                        Simpan ke Supabase
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Edit Table Modal */}
              <Dialog open={isEditTableModalOpen} onOpenChange={setIsEditTableModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="font-bold text-lg text-slate-800">Ubah Data Meja</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Perbarui nomor meja, kapasitas, dan area penempatan di database Supabase.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={updateTable} className="space-y-4 py-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama / Nomor Meja *</label>
                      <Input 
                        placeholder="Contoh: Meja 1" 
                        value={editTableName}
                        onChange={(e) => setEditTableName(e.target.value)}
                        required
                        className="h-11 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Area</label>
                      <select
                        value={editTableArea}
                        onChange={(e) => setEditTableArea(e.target.value)}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20"
                      >
                        <option value="Utama">Area Utama</option>
                        {areas.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.type === 'smoking' ? 'Smoking' : 'Non-Smoking'})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Kursi (Orang)</label>
                      <Input 
                        type="number"
                        min="1"
                        value={editTableCapacity}
                        onChange={(e) => setEditTableCapacity(Number(e.target.value))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsEditTableModalOpen(false)}
                        className="rounded-xl"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !editTableName.trim()}
                        className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl font-bold"
                      >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : "Perbarui di Supabase"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Add Area Modal */}
              <Dialog open={isAreaModalOpen} onOpenChange={setIsAreaModalOpen}>
                <DialogContent className="sm:max-w-[460px]">
                  <DialogHeader>
                    <DialogTitle className="font-bold text-lg text-slate-800">Tambah Area Baru</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Area akan disimpan ke database Supabase dan dapat dipilih saat menambah meja.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={addArea} className="space-y-4 py-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Area *</label>
                      <Input 
                        placeholder="Contoh: Indoor, Outdoor, Lantai 2, VIP Room" 
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        required
                        className="h-11 rounded-xl font-bold text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Tipe Area</label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          newAreaType === "non-smoking" ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500" : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}>
                          <input 
                            type="radio" 
                            name="newAreaType" 
                            className="hidden" 
                            checked={newAreaType === "non-smoking"} 
                            onChange={() => setNewAreaType("non-smoking")} 
                          />
                          <div className={`size-4 rounded-full border flex items-center justify-center ${
                            newAreaType === "non-smoking" ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                          }`}>
                            {newAreaType === "non-smoking" && <div className="size-1.5 bg-white rounded-full" />}
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-800">Non-Smoking</span>
                            <span className="block text-[10px] text-slate-400">Area Bebas Asap</span>
                          </div>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          newAreaType === "smoking" ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500" : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}>
                          <input 
                            type="radio" 
                            name="newAreaType" 
                            className="hidden" 
                            checked={newAreaType === "smoking"} 
                            onChange={() => setNewAreaType("smoking")} 
                          />
                          <div className={`size-4 rounded-full border flex items-center justify-center ${
                            newAreaType === "smoking" ? "border-amber-600 bg-amber-600" : "border-slate-300"
                          }`}>
                            {newAreaType === "smoking" && <div className="size-1.5 bg-white rounded-full" />}
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-800">Smoking Area</span>
                            <span className="block text-[10px] text-slate-400">Area Merokok</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsAreaModalOpen(false)}
                        className="rounded-xl"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !newAreaName.trim()}
                        className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl font-bold"
                      >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                        Simpan ke Supabase
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Edit Area Modal */}
              <Dialog open={isEditAreaModalOpen} onOpenChange={setIsEditAreaModalOpen}>
                <DialogContent className="sm:max-w-[460px]">
                  <DialogHeader>
                    <DialogTitle className="font-bold text-lg text-slate-800">Ubah Data Area</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Perbarui nama dan tipe area di database Supabase.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={updateArea} className="space-y-4 py-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Area *</label>
                      <Input 
                        placeholder="Contoh: Indoor" 
                        value={editAreaName}
                        onChange={(e) => setEditAreaName(e.target.value)}
                        required
                        className="h-11 rounded-xl font-bold text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Tipe Area</label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          editAreaType === "non-smoking" ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500" : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}>
                          <input 
                            type="radio" 
                            name="editAreaType" 
                            className="hidden" 
                            checked={editAreaType === "non-smoking"} 
                            onChange={() => setEditAreaType("non-smoking")} 
                          />
                          <div className={`size-4 rounded-full border flex items-center justify-center ${
                            editAreaType === "non-smoking" ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                          }`}>
                            {editAreaType === "non-smoking" && <div className="size-1.5 bg-white rounded-full" />}
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-800">Non-Smoking</span>
                            <span className="block text-[10px] text-slate-400">Area Bebas Asap</span>
                          </div>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          editAreaType === "smoking" ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500" : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}>
                          <input 
                            type="radio" 
                            name="editAreaType" 
                            className="hidden" 
                            checked={editAreaType === "smoking"} 
                            onChange={() => setEditAreaType("smoking")} 
                          />
                          <div className={`size-4 rounded-full border flex items-center justify-center ${
                            editAreaType === "smoking" ? "border-amber-600 bg-amber-600" : "border-slate-300"
                          }`}>
                            {editAreaType === "smoking" && <div className="size-1.5 bg-white rounded-full" />}
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-800">Smoking Area</span>
                            <span className="block text-[10px] text-slate-400">Area Merokok</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsEditAreaModalOpen(false)}
                        className="rounded-xl"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !editAreaName.trim()}
                        className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl font-bold"
                      >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : "Perbarui di Supabase"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
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
          ) : activeTab === "pembayaran" ? (
            <div className="flex flex-col h-full overflow-y-auto space-y-4 md:space-y-6 pr-1">
              <div className="border-b border-slate-100 pb-2 md:pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm md:text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard className="size-4 md:size-5 text-indigo-600" />
                    Metode Pembayaran & Biaya Kafe
                  </h2>
                  <p className="text-[9px] md:text-xs text-slate-500">
                    Atur opsi metode pembayaran yang aktif di kasir, biaya layanan (service charge), pajak resto (PB1), dan QRIS toko.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSavePaymentSettings}
                  disabled={isSubmitting}
                  className={`font-bold text-xs h-9 px-4 rounded-xl shadow-sm self-start md:self-auto transition-all ${
                    paymentSaveSuccess
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-[#0b172a] hover:bg-slate-800 text-white"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : paymentSaveSuccess ? (
                    <CheckCircle2 className="size-3.5 mr-1.5 text-white" />
                  ) : (
                    <CreditCard className="size-3.5 mr-1.5 text-white" />
                  )}
                  {paymentSaveSuccess ? "Berhasil Disimpan!" : "Simpan Pengaturan Pembayaran"}
                </Button>
              </div>

              {/* Seksi 1: Pajak & Service Charge */}
              <div className="p-3.5 md:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <h3 className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="size-4 text-slate-600" />
                  Pajak Resto (PB1) & Biaya Layanan (Service Charge)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pajak PB1 */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-700">Pajak Resto (PB1 / PPN)</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={paymentSettings.enableTax}
                          onChange={(e) => setPaymentSettings(prev => ({ ...prev, enableTax: e.target.checked }))}
                          className="size-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                        />
                        Aktif
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500">Dikenakan pada subtotal pesanan sebelum/sesudah diskon.</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!paymentSettings.enableTax}
                        value={paymentSettings.taxRate}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                        className="h-9 w-24 font-bold text-xs rounded-xl bg-slate-50 border-slate-200"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  {/* Service Charge */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-700">Service Charge (Layanan)</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={paymentSettings.enableServiceCharge}
                          onChange={(e) => setPaymentSettings(prev => ({ ...prev, enableServiceCharge: e.target.checked }))}
                          className="size-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                        />
                        Aktif
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500">Biaya servis untuk pesanan Dine-In (Makan di Tempat).</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!paymentSettings.enableServiceCharge}
                        value={paymentSettings.serviceChargeRate}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, serviceChargeRate: Number(e.target.value) }))}
                        className="h-9 w-24 font-bold text-xs rounded-xl bg-slate-50 border-slate-200"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seksi 2: Informasi QRIS Kafe */}
              <div className="p-3.5 md:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h3 className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="size-4 text-indigo-600" />
                  Informasi QRIS Kasir (Tampil di Layar Pembayaran)
                </h3>
                <p className="text-[10px] text-slate-500">
                  Data ini membantu kasir memverifikasi pembayaran saat pelanggan memilih metode bayar QRIS.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Nama Merchant / Toko QRIS</label>
                    <Input
                      type="text"
                      placeholder="Contoh: Kopi Senja Resto"
                      value={paymentSettings.qrisMerchantName || ""}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, qrisMerchantName: e.target.value }))}
                      className="h-9 text-xs rounded-xl bg-white border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">NMID / Catatan QRIS (Opsional)</label>
                    <Input
                      type="text"
                      placeholder="Contoh: ID1020304050"
                      value={paymentSettings.qrisNmid || ""}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, qrisNmid: e.target.value }))}
                      className="h-9 text-xs rounded-xl bg-white border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 3: Daftar Metode Pembayaran (CRUD Lengkap) */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      Daftar Metode Pembayaran
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {activePaymentCount} Aktif / {totalPaymentCount} Total
                      </span>
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-500">
                      Metode yang diaktifkan otomatis muncul pada tombol bayar kasir POS.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetPaymentMethods}
                      className="h-8 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 border-slate-200 bg-white"
                      title="Kembalikan daftar metode ke konfigurasi standar F&B"
                    >
                      <RotateCcw className="size-3 mr-1" /> Reset Default
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleOpenCreateMethodModal}
                      className="h-8 text-xs font-bold rounded-xl bg-[#0b172a] hover:bg-slate-800 text-white shadow-sm"
                    >
                      <Plus className="size-3.5 mr-1" /> Tambah Metode
                    </Button>
                  </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setMethodFilterTab("all")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        methodFilterTab === "all"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Semua ({totalPaymentCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethodFilterTab("active")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        methodFilterTab === "active"
                          ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Aktif ({activePaymentCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethodFilterTab("inactive")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        methodFilterTab === "inactive"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Nonaktif ({totalPaymentCount - activePaymentCount})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Cari metode, bank, no rek..."
                      value={methodSearchQuery}
                      onChange={(e) => setMethodSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                {/* Grid Kartu Metode Pembayaran */}
                {filteredPaymentMethods.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                    <CreditCard className="size-8 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">Tidak ada metode pembayaran yang cocok.</p>
                    {methodSearchQuery || methodFilterTab !== "all" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMethodSearchQuery("");
                          setMethodFilterTab("all");
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        Reset Pencarian & Filter
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleOpenCreateMethodModal}
                        className="text-xs bg-[#0b172a] hover:bg-slate-800 text-white font-bold rounded-xl mt-1"
                      >
                        <Plus className="size-3.5 mr-1" /> Tambah Metode Pertama
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {filteredPaymentMethods.map((method) => {
                      const typeInfo = getMethodTypeInfo(method.type);
                      const IconComponent = typeInfo.Icon;

                      return (
                        <div
                          key={method.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                            method.enabled
                              ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                              : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/60 opacity-65"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Icon Kotak Tipe */}
                            <div className={`size-9 rounded-xl border flex items-center justify-center shrink-0 ${typeInfo.colorClass}`}>
                              <IconComponent className="size-4" />
                            </div>

                            {/* Info Metode */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {method.name}
                                </h4>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border uppercase ${typeInfo.colorClass}`}>
                                  {typeInfo.label}
                                </span>
                              </div>

                              {/* Detail Rekening / Bank */}
                              {(method.bankName || method.accountNumber || method.accountName) && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                                  {method.bankName && <span className="font-semibold text-slate-700 dark:text-slate-300">Bank {method.bankName}</span>}
                                  {method.bankName && method.accountNumber && <span>•</span>}
                                  {method.accountNumber && <span className="font-mono">No: {method.accountNumber}</span>}
                                  {method.accountName && <span className="italic text-slate-500">({method.accountName})</span>}
                                </div>
                              )}

                              {/* Catatan */}
                              {method.notes && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                                  Catatan: {method.notes}
                                </p>
                              )}

                              {/* Status Badge */}
                              <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                                {method.enabled ? (
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Aktif di Kasir
                                  </span>
                                ) : (
                                  <span className="font-medium text-slate-400 flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-slate-300 inline-block" /> Nonaktif
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Tombol Aksi Kanan (Switch, Edit, Delete) */}
                          <div className="flex items-center gap-1.5 shrink-0 self-center">
                            <Switch
                              checked={method.enabled}
                              onCheckedChange={() => handleTogglePaymentMethod(method.id)}
                              title={method.enabled ? "Nonaktifkan metode ini di kasir" : "Aktifkan metode ini di kasir"}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditMethodModal(method)}
                              title="Ubah rincian metode pembayaran"
                              className="size-8 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePaymentMethod(method)}
                              title="Hapus metode pembayaran"
                              className="size-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Dialog CRUD (Tambah / Ubah Metode Pembayaran) */}
              <Dialog open={isMethodModalOpen} onOpenChange={setIsMethodModalOpen}>
                <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {editingMethodId ? (
                        <Pencil className="size-4 text-indigo-600" />
                      ) : (
                        <Plus className="size-4 text-emerald-600" />
                      )}
                      {editingMethodId ? "Ubah Metode Pembayaran" : "Tambah Metode Pembayaran Baru"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      {editingMethodId
                        ? "Perbarui rincian atau nomor rekening metode pembayaran kasir."
                        : "Tambahkan opsi pembayaran baru yang dapat dipilih pelanggan di kasir F&B."}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSaveMethodModal} className="space-y-3.5 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nama Metode Pembayaran <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        placeholder="Contoh: EDC Bank Mandiri, ShopeePay Kasir, Kasbon Staff"
                        value={methodFormName}
                        onChange={(e) => setMethodFormName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Kategori Pembayaran
                        </label>
                        <select
                          value={methodFormType}
                          onChange={(e) => setMethodFormType(e.target.value as any)}
                          className="w-full h-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="cash">Tunai (Cash)</option>
                          <option value="qris">QRIS</option>
                          <option value="debit">Kartu / Debit EDC</option>
                          <option value="transfer">Transfer Bank</option>
                          <option value="ewallet">E-Wallet</option>
                          <option value="other">Lainnya / Kasbon</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Bank / Provider (Opsional)
                        </label>
                        <Input
                          placeholder="Contoh: BCA, Mandiri, Shopee"
                          value={methodFormBank}
                          onChange={(e) => setMethodFormBank(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          No. Rekening / Akun (Opsional)
                        </label>
                        <Input
                          placeholder="Contoh: 1234567890"
                          value={methodFormAccountNumber}
                          onChange={(e) => setMethodFormAccountNumber(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Atas Nama (Opsional)
                        </label>
                        <Input
                          placeholder="Contoh: a.n Kopi Senja"
                          value={methodFormAccountName}
                          onChange={(e) => setMethodFormAccountName(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Catatan / Instruksi Kasir (Opsional)
                      </label>
                      <Input
                        placeholder="Contoh: Masukkan nomor approval slip EDC atau foto struk"
                        value={methodFormNotes}
                        onChange={(e) => setMethodFormNotes(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          Status Langsung Aktif di Kasir
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Tampilkan opsi metode ini saat kasir menyelesaikan pesanan
                        </span>
                      </div>
                      <Switch
                        checked={methodFormEnabled}
                        onCheckedChange={setMethodFormEnabled}
                      />
                    </div>

                    <DialogFooter className="pt-2 flex gap-2 sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsMethodModalOpen(false)}
                        className="h-10 rounded-xl text-xs font-bold border-slate-300"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        className="h-10 rounded-xl text-xs font-bold bg-[#0b172a] hover:bg-slate-800 text-white px-5 shadow-sm"
                      >
                        {editingMethodId ? "Simpan Perubahan" : "Tambahkan Metode"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Tombol Simpan Bawah */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  type="button"
                  onClick={handleSavePaymentSettings}
                  disabled={isSubmitting}
                  className={`font-bold text-xs md:text-sm px-6 h-11 rounded-xl shadow-sm w-full md:w-auto transition-all flex items-center justify-center gap-2 ${
                    paymentSaveSuccess
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-[#0b172a] hover:bg-slate-800 text-white"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : paymentSaveSuccess ? (
                    <>
                      <CheckCircle2 className="size-4 text-white" />
                      Berhasil Disimpan!
                    </>
                  ) : (
                    <>
                      <CreditCard className="size-4 text-white" />
                      Simpan Semua Pengaturan Pembayaran
                    </>
                  )}
                </Button>
                {paymentSaveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="size-4" /> Pengaturan berhasil disimpan dan aktif di kasir.
                  </span>
                )}
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
