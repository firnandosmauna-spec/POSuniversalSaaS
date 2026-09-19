import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/shared/auth/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  DollarSign, 
  Tag, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Eye, 
  BadgePercent,
  Receipt
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export interface PrintingCustomer {
  id: string;
  name: string;
  companyName?: string;
  customerType: "INDIVIDUAL" | "CORPORATE" | "AGENCY" | "INSTITUTION";
  phone: string;
  email?: string;
  address?: string;
  npwp?: string;
  tier: "REGULAR" | "RESELLER" | "VIP_CORPORATE";
  discountPercent: number;
  totalSpkCount: number;
  totalSpent: number;
  unpaidDpBalance: number;
  branchId?: string;
  branchName?: string;
  notes?: string;
  createdAt?: string;
}

export function PrintingCustomersView() {
  const { user, activeBranchId, activeBranchName } = useAuth();
  const [customers, setCustomers] = useState<PrintingCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [tierFilter, setTierFilter] = useState<string>("ALL");

  // Selected for Modal Detail / Edit
  const [selectedCustomer, setSelectedCustomer] = useState<PrintingCustomer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<PrintingCustomer | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formCustomerType, setFormCustomerType] = useState<PrintingCustomer["customerType"]>("INDIVIDUAL");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNpwp, setFormNpwp] = useState("");
  const [formTier, setFormTier] = useState<PrintingCustomer["tier"]>("REGULAR");
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formNotes, setFormNotes] = useState("");

  const isUUID = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

  // Load Customers
  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const deletedIdsStr = localStorage.getItem("pos_deleted_customer_ids");
      const deletedIds: string[] = deletedIdsStr ? JSON.parse(deletedIdsStr) : [];

      // 1. Get from localStorage
      const savedStr = localStorage.getItem("pos_printing_customers");
      let list: PrintingCustomer[] = savedStr ? JSON.parse(savedStr) : [];
      

      // 2. Fetch from Supabase as fallback
      if (user) {
        const { data: dbCustomers } = await supabase
          .from("customers")
          .select("*")
          .eq("tenant_id", user.id)
          .order("name", { ascending: true });

        if (dbCustomers && dbCustomers.length > 0) {
          const remoteList: PrintingCustomer[] = dbCustomers.map((c) => ({
            id: c.id,
            name: c.name,
            companyName: c.company_name || "-",
            customerType: (c.customer_type as any) || "INDIVIDUAL",
            phone: c.phone || "081234567890",
            email: c.email || "",
            address: c.address || "",
            npwp: c.npwp || "",
            tier: (c.tier as any) || "REGULAR",
            discountPercent: Number(c.discount_percent) || 0,
            totalSpkCount: Number(c.total_spk_count) || 1,
            totalSpent: Number(c.total_spent) || 0,
            unpaidDpBalance: 0,
            notes: c.notes || ""
          }));

          const mergedMap = new Map<string, PrintingCustomer>();
          list.forEach((lc) => mergedMap.set(lc.id, lc));
          remoteList.forEach((rc) => {
            if (!deletedIds.includes(rc.id)) {
              mergedMap.set(rc.id, rc);
            }
          });
          list = Array.from(mergedMap.values());
        }
      }

      // Filter deleted items
      list = list.filter((c) => !deletedIds.includes(c.id));

      const isInitialized = localStorage.getItem("pos_printing_customers_initialized");
      if (list.length === 0 && !isInitialized) {
        localStorage.setItem("pos_printing_customers_initialized", "true");
        localStorage.setItem("pos_printing_customers", JSON.stringify(list));
      }

      setCustomers(list);
    } catch (e) {
      console.error("Error loading printing customers:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [user]);

  const saveCustomers = (updated: PrintingCustomer[]) => {
    setCustomers(updated);
    try {
      localStorage.setItem("pos_printing_customers", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  };

  // Open Form Add
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName("");
    setFormCompanyName("");
    setFormCustomerType("INDIVIDUAL");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormNpwp("");
    setFormTier("REGULAR");
    setFormDiscount(0);
    setFormNotes("");
    setIsFormOpen(true);
  };

  // Open Form Edit
  const handleOpenEdit = (c: PrintingCustomer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormCompanyName(c.companyName || "");
    setFormCustomerType(c.customerType);
    setFormPhone(c.phone);
    setFormEmail(c.email || "");
    setFormAddress(c.address || "");
    setFormNpwp(c.npwp || "");
    setFormTier(c.tier);
    setFormDiscount(c.discountPercent);
    setFormNotes(c.notes || "");
    setIsFormOpen(true);
  };

  // Save Customer
  const handleSaveCustomer = async () => {
    if (!formName.trim()) return alert("Nama pelanggan wajib diisi!");
    if (!formPhone.trim()) return alert("Nomor telepon / WhatsApp wajib diisi!");

    let targetId = editingCustomer ? editingCustomer.id : `cust_${Date.now()}`;
    const payloadToDb: any = {
      tenant_id: user?.id,
      name: formName,
      company_name: formCompanyName || null,
      customer_type: formCustomerType,
      phone: formPhone,
      email: formEmail || null,
      address: formAddress || null,
      npwp: formNpwp || null,
      tier: formTier,
      discount_percent: Number(formDiscount) || 0,
      notes: formNotes || null
    };

    if (editingCustomer && isUUID(editingCustomer.id)) {
      payloadToDb.id = editingCustomer.id;
    }

    if (user) {
      try {
        const { data: savedDb, error } = await supabase
          .from("customers")
          .upsert(payloadToDb)
          .select()
          .single();

        if (savedDb && savedDb.id) {
          targetId = savedDb.id;
        } else if (error) {
          console.error("Supabase customer save error:", error);
        }
      } catch (e) {
        console.error("Supabase customer save exception:", e);
      }
    }

    let updated: PrintingCustomer[];

    if (editingCustomer) {
      updated = customers.map((c) => {
        if (c.id === editingCustomer.id) {
          return {
            ...c,
            id: targetId,
            name: formName,
            companyName: formCompanyName,
            customerType: formCustomerType,
            phone: formPhone,
            email: formEmail,
            address: formAddress,
            npwp: formNpwp,
            tier: formTier,
            discountPercent: Number(formDiscount) || 0,
            branchId: c.branchId || activeBranchId || "main",
            branchName: c.branchName || activeBranchName || "Cabang Utama",
            notes: formNotes
          };
        }
        return c;
      });
    } else {
      const newCust: PrintingCustomer = {
        id: targetId,
        name: formName,
        companyName: formCompanyName,
        customerType: formCustomerType,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        npwp: formNpwp,
        tier: formTier,
        discountPercent: Number(formDiscount) || 0,
        totalSpkCount: 0,
        totalSpent: 0,
        unpaidDpBalance: 0,
        branchId: activeBranchId || "main",
        branchName: activeBranchName || "Cabang Utama",
        notes: formNotes,
        createdAt: new Date().toISOString()
      };
      updated = [newCust, ...customers];
    }

    saveCustomers(updated);
    setIsFormOpen(false);
  };

  // Delete Customer
  const handleDeleteCustomer = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data pelanggan cetak ini?")) {
      try {
        const deletedIdsStr = localStorage.getItem("pos_deleted_customer_ids");
        const deletedIds: string[] = deletedIdsStr ? JSON.parse(deletedIdsStr) : [];
        if (!deletedIds.includes(id)) {
          deletedIds.push(id);
          localStorage.setItem("pos_deleted_customer_ids", JSON.stringify(deletedIds));
        }
      } catch (e) {}

      const updated = customers.filter((c) => c.id !== id);
      saveCustomers(updated);

      if (selectedCustomer && selectedCustomer.id === id) {
        setIsDetailOpen(false);
        setSelectedCustomer(null);
      }

      if (user) {
        try {
          const { error } = await supabase.from("customers").delete().eq("id", id);
          if (error && error.message) {
            console.error("Supabase delete customer error:", error);
          }
        } catch (e) {
          console.error("Failed to delete customer from Supabase:", e);
        }
      }
    }
  };

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        c.name.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q));

      const matchType = typeFilter === "ALL" || c.customerType === typeFilter;
      const matchTier = tierFilter === "ALL" || c.tier === tierFilter;
      const matchBranch =
        activeBranchId === "all" ||
        c.branchId === activeBranchId ||
        c.branchName === activeBranchName ||
        (!c.branchId && (activeBranchId === "main" || activeBranchId === "all"));

      return matchSearch && matchType && matchTier && matchBranch;
    });
  }, [customers, search, typeFilter, tierFilter, activeBranchId, activeBranchName]);

  // Financial Metrics Summary
  const metrics = useMemo(() => {
    const totalCount = filteredCustomers.length;
    const countCorporate = filteredCustomers.filter((c) => c.customerType === "CORPORATE" || c.customerType === "AGENCY").length;
    const totalSpentSum = filteredCustomers.reduce((acc, c) => acc + c.totalSpent, 0);
    const totalUnpaidBalance = filteredCustomers.reduce((acc, c) => acc + c.unpaidDpBalance, 0);

    return { totalCount, countCorporate, totalSpentSum, totalUnpaidBalance };
  }, [filteredCustomers]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  const getTierBadgeClass = (tier: PrintingCustomer["tier"]) => {
    switch (tier) {
      case "VIP_CORPORATE":
        return "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800";
      case "RESELLER":
        return "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getTypeLabel = (type: PrintingCustomer["customerType"]) => {
    switch (type) {
      case "CORPORATE":
        return "Corporate (PT/CV)";
      case "AGENCY":
        return "EO / Agency / Reseller";
      case "INSTITUTION":
        return "Instansi / Sekolah";
      default:
        return "Perorangan / Umum";
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 md:p-5 space-y-4 overflow-y-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 md:p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-brand text-white grid place-items-center font-bold shadow-xs">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base md:text-lg text-slate-900 dark:text-white tracking-tight">
              Pelanggan & Klien Percetakan
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAdd}
            className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1.5 rounded-none shadow-xs"
          >
            <Plus className="size-4" /> Tambah Klien Baru
          </Button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Database Klien
            </span>
            <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {metrics.totalCount} Klien
            </span>
          </div>
          <div className="size-8 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 grid place-items-center">
            <Users className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Klien Corporate & EO
            </span>
            <span className="text-base font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-0.5 block">
              {metrics.countCorporate} Instansi
            </span>
          </div>
          <div className="size-8 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900 grid place-items-center">
            <Building2 className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Akumulasi Omzet Cetak
            </span>
            <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {formatRupiah(metrics.totalSpentSum)}
            </span>
          </div>
          <div className="size-8 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 grid place-items-center">
            <DollarSign className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Piutang DP Klien
            </span>
            <span className="text-base font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
              {formatRupiah(metrics.totalUnpaidBalance)}
            </span>
          </div>
          <div className="size-8 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 grid place-items-center">
            <Clock className="size-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari nama klien, perusahaan, no WhatsApp, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">Semua Tipe Klien</option>
            <option value="INDIVIDUAL">Perorangan / Umum</option>
            <option value="CORPORATE">Corporate (PT/CV)</option>
            <option value="AGENCY">EO / Agency / Reseller</option>
            <option value="INSTITUTION">Instansi / Sekolah</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">Semua Tier Diskon</option>
            <option value="REGULAR">Regular (0%)</option>
            <option value="RESELLER">Member Reseller (5%)</option>
            <option value="VIP_CORPORATE">VIP Corporate (10%)</option>
          </select>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <th className="p-3">Nama Klien & Perusahaan</th>
              <th className="p-3">Tipe & Kontak WhatsApp</th>
              <th className="p-3 text-center">Tier Diskon</th>
              <th className="p-3 text-center">Total SPK Order</th>
              <th className="p-3 text-right">Akumulasi Belanja</th>
              <th className="p-3 text-right">Sisa Piutang DP</th>
              <th className="p-3 text-center">Aksi / Kontrol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="size-5 animate-spin text-brand" />
                    <span>Memuat database klien percetakan...</span>
                  </div>
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="size-8 text-slate-300 dark:text-slate-700" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Data klien tidak ditemukan
                    </span>
                    <span className="text-[11px]">Tambahkan klien baru dengan mengklik tombol di atas.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Name & Company */}
                  <td className="p-3 align-top">
                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-brand" />
                      {c.name}
                    </div>
                    {c.companyName && c.companyName !== "-" && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        {c.companyName}
                      </div>
                    )}
                  </td>

                  {/* Type & Phone */}
                  <td className="p-3 align-top">
                    <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                      {getTypeLabel(c.customerType)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="size-3 text-slate-400" /> {c.phone}
                    </div>
                  </td>

                  {/* Tier Badge */}
                  <td className="p-3 align-top text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${getTierBadgeClass(
                        c.tier
                      )}`}
                    >
                      {c.tier.replace("_", " ")} ({c.discountPercent}%)
                    </span>
                  </td>

                  {/* Total SPK Count */}
                  <td className="p-3 align-top text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                    {c.totalSpkCount} SPK
                  </td>

                  {/* Total Spent */}
                  <td className="p-3 align-top text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(c.totalSpent)}
                  </td>

                  {/* Remaining Unpaid Balance */}
                  <td className="p-3 align-top text-right font-mono">
                    {c.unpaidDpBalance > 0 ? (
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        {formatRupiah(c.unpaidDpBalance)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">Lunas (0)</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3 align-top text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setIsDetailOpen(true);
                        }}
                        className="h-7 px-2 text-[10px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 gap-1 rounded-none"
                      >
                        <Eye className="size-3" /> Detail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(c)}
                        className="h-7 px-1.5 text-[10px] border-slate-300 dark:border-slate-700 rounded-none"
                        title="Edit Data"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCustomer(c.id)}
                        className="h-7 px-1.5 text-[10px] border-rose-200 dark:border-rose-900 text-rose-600 rounded-none"
                        title="Hapus Klien"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detail Klien */}
      {isDetailOpen && selectedCustomer && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 text-slate-900 dark:text-slate-100 rounded-none font-sans">
            <DialogHeader className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="size-4 text-brand" />
                Profil Klien: {selectedCustomer.name}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                    Nama Perusahaan / Instansi
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white block mt-0.5">
                    {selectedCustomer.companyName || "-"}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Tipe: {getTypeLabel(selectedCustomer.customerType)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                    Tier Diskon & Membership
                  </span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-extrabold border uppercase tracking-wider ${getTierBadgeClass(
                      selectedCustomer.tier
                    )}`}
                  >
                    {selectedCustomer.tier.replace("_", " ")} ({selectedCustomer.discountPercent}% OFF)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                    No WhatsApp / Telepon
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <Phone className="size-3 text-slate-400" /> {selectedCustomer.phone}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                    Email Klien
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <Mail className="size-3 text-slate-400" /> {selectedCustomer.email || "-"}
                  </span>
                </div>
              </div>

              {selectedCustomer.address && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                    Alamat Pengiriman / Instansi
                  </span>
                  <div className="font-medium text-slate-700 dark:text-slate-300 flex items-start gap-1 mt-0.5">
                    <MapPin className="size-3 text-slate-400 shrink-0 mt-0.5" />
                    {selectedCustomer.address}
                  </div>
                </div>
              )}

              {selectedCustomer.npwp && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                    NPWP / Faktur Pajak
                  </span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedCustomer.npwp}
                  </div>
                </div>
              )}

              <div className="bg-slate-100 dark:bg-slate-800/80 p-3 space-y-1 font-mono text-right">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total SPK Order:</span>
                  <span className="font-bold">{selectedCustomer.totalSpkCount} Kali Order</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Akumulasi Transaksi:</span>
                  <span className="font-bold text-emerald-600">{formatRupiah(selectedCustomer.totalSpent)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-300 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Sisa Piutang DP:</span>
                  <span className="font-extrabold text-amber-600">{formatRupiah(selectedCustomer.unpaidDpBalance)}</span>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-950 p-2 border border-slate-200 italic">
                  Catatan Klien: {selectedCustomer.notes}
                </div>
              )}
            </div>

            <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button
                size="sm"
                onClick={() => setIsDetailOpen(false)}
                className="h-8 text-xs bg-brand text-white font-bold rounded-none"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Add / Edit Form */}
      {isFormOpen && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 text-slate-900 dark:text-slate-100 rounded-none font-sans">
            <DialogHeader className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="size-4 text-brand" />
                {editingCustomer ? "Edit Profil Klien Percetakan" : "Tambah Klien Cetak Baru"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kontak Klien *
                </label>
                <Input
                  type="text"
                  placeholder="Nama Penanggung Jawab / Pemesan..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 font-semibold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Perusahaan / Instansi
                  </label>
                  <Input
                    type="text"
                    placeholder="PT Sinar Merdeka / EO Nusantara..."
                    value={formCompanyName}
                    onChange={(e) => setFormCompanyName(e.target.value)}
                    className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Klien
                  </label>
                  <select
                    value={formCustomerType}
                    onChange={(e: any) => setFormCustomerType(e.target.value)}
                    className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-semibold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="INDIVIDUAL">Perorangan / Umum</option>
                    <option value="CORPORATE">Corporate (PT/CV)</option>
                    <option value="AGENCY">EO / Agency / Reseller</option>
                    <option value="INSTITUTION">Instansi / Sekolah</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No WhatsApp / Telepon *
                  </label>
                  <Input
                    type="text"
                    placeholder="081234567890"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="h-9 font-semibold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Klien
                  </label>
                  <Input
                    type="email"
                    placeholder="email@klien.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tier Diskon & Membership
                  </label>
                  <select
                    value={formTier}
                    onChange={(e: any) => {
                      const val = e.target.value;
                      setFormTier(val);
                      if (val === "VIP_CORPORATE") setFormDiscount(10);
                      else if (val === "RESELLER") setFormDiscount(5);
                      else setFormDiscount(0);
                    }}
                    className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-semibold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="REGULAR">Regular (0% Off)</option>
                    <option value="RESELLER">Member Reseller (5% Off)</option>
                    <option value="VIP_CORPORATE">VIP Corporate (10% Off)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Diskon Khusus (%)
                  </label>
                  <Input
                    type="number"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(Number(e.target.value))}
                    className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none text-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Pengiriman / Instansi
                </label>
                <Input
                  type="text"
                  placeholder="Alamat kantor / tempat pengiriman spanduk..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  NPWP / Identitas Pajak (Opsional)
                </label>
                <Input
                  type="text"
                  placeholder="01.234.567.8-012.000"
                  value={formNpwp}
                  onChange={(e) => setFormNpwp(e.target.value)}
                  className="h-9 font-mono text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Klien
                </label>
                <Input
                  type="text"
                  placeholder="Catatan khusus desainer atau ketentuan nota..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>
            </div>

            <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(false)}
                className="h-8 text-xs border-slate-300 rounded-none"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCustomer}
                className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 rounded-none"
              >
                Simpan Data Klien
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
