import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { 
  Building2, Receipt, CreditCard, WashingMachine, Shirt, Sparkles, Box, 
  Trash2, ArrowRight, Settings, Plus, MapPin, Phone, Hash, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";
import { getInvoiceSettings, saveInvoiceSettings, InvoiceSettings } from "@/shared/utils/invoiceGenerator";

export function LaundrySettingsView() {
  const { user, branches, addBranch, deleteBranch } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"cabang" | "invoice" | "langganan" | "layanan" | "parfum_rak">("cabang");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Branch Form
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  // Invoice Settings
  const [invoicePrefix, setInvoicePrefix] = useState("LND");
  const [invoiceFormat, setInvoiceFormat] = useState("{PREFIX}-{YYYYMMDD}-{COUNTER}");
  const [invoiceCounterDigits, setInvoiceCounterDigits] = useState(4);
  const [invoiceCounterReset, setInvoiceCounterReset] = useState<"DAILY" | "MONTHLY" | "YEARLY" | "NEVER">("DAILY");
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Subscription
  const [subscriptionData, setSubscriptionData] = useState<{
    plan: string;
    status: string;
    trialUntil?: string;
    registeredAt?: string;
  } | null>(null);

  // Laundry Specific Mocks
  const [services, setServices] = useState<{id: string, name: string, price: number, unit: string}[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceUnit, setNewServiceUnit] = useState("kg");

  const [parfums, setParfums] = useState<{id: string, name: string}[]>([]);
  const [newParfum, setNewParfum] = useState("");

  const [racks, setRacks] = useState<{id: string, name: string}[]>([]);
  const [newRack, setNewRack] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // Invoice Settings
        const savedInvoice = getInvoiceSettings();
        setInvoicePrefix(savedInvoice.invoicePrefix);
        setInvoiceFormat(savedInvoice.invoiceFormat);
        setInvoiceCounterDigits(savedInvoice.invoiceCounterDigits);
        setInvoiceCounterReset(savedInvoice.invoiceCounterReset);

        // Subscription
        const subKey = `pos_tenant_${user.id}_subscription`;
        const savedSub = localStorage.getItem(subKey);
        if (savedSub) {
          try { setSubscriptionData(JSON.parse(savedSub)); } catch (e) {}
        } else {
          const defaultSub = { plan: "Pro (Laundry)", status: "ACTIVE", registeredAt: new Date().toISOString() };
          setSubscriptionData(defaultSub);
          localStorage.setItem(subKey, JSON.stringify(defaultSub));
        }

        // Fetch DB Settings
        const { data: settingsData } = await supabase.from("store_settings").select("*").eq("tenant_id", user.id).maybeSingle();
        if (settingsData) {
          if (settingsData.invoice_prefix) setInvoicePrefix(settingsData.invoice_prefix);
          if (settingsData.invoice_format) setInvoiceFormat(settingsData.invoice_format);
          if (settingsData.invoice_counter_digits) setInvoiceCounterDigits(settingsData.invoice_counter_digits);
          if (settingsData.invoice_counter_reset) setInvoiceCounterReset(settingsData.invoice_counter_reset);
          setSettingsId(settingsData.id);
        }

        // Mock Data load
        try {
          const savedSvc = localStorage.getItem("laundry_services");
          if (savedSvc) setServices(JSON.parse(savedSvc));
          const savedPrf = localStorage.getItem("laundry_parfums");
          if (savedPrf) setParfums(JSON.parse(savedPrf));
          const savedRck = localStorage.getItem("laundry_racks");
          if (savedRck) setRacks(JSON.parse(savedRck));
        } catch(e) {}

      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Handlers
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    setIsSubmitting(true);
    try {
      await addBranch(branchName.trim(), branchAddress.trim(), branchPhone.trim());
      setBranchName(""); setBranchAddress(""); setBranchPhone("");
      alert("Cabang baru berhasil ditambahkan!");
    } catch (e: any) {
      alert("Gagal menambahkan cabang: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInvoiceSettings = async () => {
    setIsSubmitting(true);
    try {
      const newSettings: InvoiceSettings = { invoicePrefix, invoiceFormat, invoiceCounterDigits, invoiceCounterReset };
      saveInvoiceSettings(newSettings);
      if (settingsId && user) {
        await supabase.from("store_settings").update({
          invoice_prefix: invoicePrefix, invoice_format: invoiceFormat, 
          invoice_counter_digits: invoiceCounterDigits, invoice_counter_reset: invoiceCounterReset,
          updated_at: new Date().toISOString()
        }).eq("id", settingsId);
      }
      alert("Format Invoice berhasil disimpan!");
    } catch (error) {
      alert("Pengaturan format invoice disimpan secara lokal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName) return;
    const s = { id: Date.now().toString(), name: newServiceName, price: Number(newServicePrice) || 0, unit: newServiceUnit };
    const updated = [...services, s];
    setServices(updated);
    localStorage.setItem("laundry_services", JSON.stringify(updated));
    setNewServiceName(""); setNewServicePrice("");
  };

  const handleAddParfum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParfum) return;
    const p = { id: Date.now().toString(), name: newParfum };
    const updated = [...parfums, p];
    setParfums(updated);
    localStorage.setItem("laundry_parfums", JSON.stringify(updated));
    setNewParfum("");
  };

  const handleAddRack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRack) return;
    const r = { id: Date.now().toString(), name: newRack };
    const updated = [...racks, r];
    setRacks(updated);
    localStorage.setItem("laundry_racks", JSON.stringify(updated));
    setNewRack("");
  };

  const handleDeleteItem = (type: "service"|"parfum"|"rack", id: string) => {
    if (!confirm("Hapus item ini?")) return;
    if (type === "service") {
      const u = services.filter(s => s.id !== id);
      setServices(u); localStorage.setItem("laundry_services", JSON.stringify(u));
    }
    if (type === "parfum") {
      const u = parfums.filter(s => s.id !== id);
      setParfums(u); localStorage.setItem("laundry_parfums", JSON.stringify(u));
    }
    if (type === "rack") {
      const u = racks.filter(s => s.id !== id);
      setRacks(u); localStorage.setItem("laundry_racks", JSON.stringify(u));
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="mb-6 flex items-center justify-between border-b border-slate-300 dark:border-slate-800 pb-4">
        <h1 className="font-display text-xl md:text-2xl font-extrabold uppercase tracking-tight flex items-center gap-2">
          <Settings className="size-6 text-slate-900 dark:text-white" /> Pengaturan Sistem Laundry
        </h1>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-1 overflow-y-auto">
          {[
            { id: "cabang", label: "Kelola Cabang", icon: Building2 },
            { id: "layanan", label: "Layanan & Harga", icon: Shirt },
            { id: "parfum_rak", label: "Parfum & Rak", icon: Sparkles },
            { id: "invoice", label: "Format Nota", icon: Receipt },
            { id: "langganan", label: "Billing & Paket", icon: CreditCard },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left px-4 py-3 font-bold text-sm uppercase tracking-wider flex items-center gap-3 transition-colors rounded-none border ${
                activeTab === tab.id 
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 overflow-y-auto p-4 md:p-6">
          
          {/* TAB: CABANG */}
          {activeTab === "cabang" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-extrabold uppercase mb-1">Daftar Cabang / Outlet</h2>
                <p className="text-xs text-slate-500 font-mono mb-4">Manajemen outlet fisik operasional laundry.</p>
                <div className="space-y-3">
                  {branches.map((branch) => (
                    <div key={branch.id} className="p-4 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex justify-between items-center rounded-none">
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <Building2 className="size-4" /> {branch.name}
                          {branch.is_main && (
                            <span className="text-[10px] uppercase font-extrabold bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2 py-0.5">Pusat</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1"><MapPin className="size-3"/> {branch.address || "-"}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1"><Phone className="size-3"/> {branch.phone || "-"}</div>
                      </div>
                      {!branch.is_main && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if (confirm("Hapus cabang ini beserta data yang terkait?")) deleteBranch(branch.id);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-none font-bold text-xs"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-sm uppercase mb-4">Tambah Cabang Baru</h3>
                <form onSubmit={handleCreateBranch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Nama Cabang / Outlet</label>
                    <Input 
                      placeholder="Contoh: Cabang Seturan" 
                      value={branchName} onChange={(e) => setBranchName(e.target.value)} required
                      className="rounded-none border-slate-300 dark:border-slate-700 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Alamat Lengkap</label>
                    <Input 
                      placeholder="Jalan / Detail Lokasi" 
                      value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)}
                      className="rounded-none border-slate-300 dark:border-slate-700 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Nomor Telepon / WhatsApp</label>
                    <Input 
                      placeholder="08123456789" 
                      value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)}
                      className="rounded-none border-slate-300 dark:border-slate-700 font-mono text-sm"
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="rounded-none bg-slate-900 text-white font-bold uppercase tracking-wider text-xs px-6 py-2">
                    {isSubmitting ? "Menyimpan..." : "Tambah Cabang"}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: LAYANAN */}
          {activeTab === "layanan" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-extrabold uppercase mb-1">Katalog Layanan & Tarif</h2>
                <p className="text-xs text-slate-500 font-mono mb-4">Layanan cuci kiloan, satuan, dry clean, dsb.</p>
                <div className="space-y-2">
                  {services.map((svc) => (
                    <div key={svc.id} className="p-3 border border-slate-300 dark:border-slate-700 flex justify-between items-center rounded-none bg-slate-50 dark:bg-slate-950">
                      <div>
                        <div className="font-bold uppercase text-sm">{svc.name}</div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">Rp {svc.price.toLocaleString("id-ID")} / {svc.unit}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("service", svc.id)} className="text-slate-400 hover:text-red-600 rounded-none">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {services.length === 0 && <p className="text-xs font-mono text-slate-500 italic">Belum ada layanan terdaftar.</p>}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-sm uppercase mb-4">Tambah Layanan</h3>
                <form onSubmit={handleAddService} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input placeholder="Nama Layanan (Cuci Komplit)" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} required className="rounded-none font-mono text-sm border-slate-300" />
                  </div>
                  <div className="w-32">
                    <Input placeholder="Harga" type="number" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} required className="rounded-none font-mono text-sm border-slate-300" />
                  </div>
                  <div className="w-24">
                    <select value={newServiceUnit} onChange={(e) => setNewServiceUnit(e.target.value)} className="w-full h-10 border border-slate-300 bg-transparent px-3 text-sm font-mono focus:outline-none">
                      <option value="kg">/ kg</option>
                      <option value="pcs">/ pcs</option>
                      <option value="meter">/ m²</option>
                    </select>
                  </div>
                  <Button type="submit" className="rounded-none bg-slate-900 text-white font-bold"><Plus className="size-4"/></Button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: PARFUM & RAK */}
          {activeTab === "parfum_rak" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
              {/* Parfum */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold uppercase mb-1">Opsi Parfum</h2>
                  <p className="text-xs text-slate-500 font-mono mb-4">Pilihan wewangian untuk pelanggan.</p>
                  <div className="space-y-2 mb-4">
                    {parfums.map((p) => (
                      <div key={p.id} className="p-2 px-3 border border-slate-300 dark:border-slate-700 flex justify-between items-center rounded-none bg-slate-50 dark:bg-slate-950">
                        <span className="font-mono text-sm font-bold uppercase">{p.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("parfum", p.id)} className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 rounded-none"><Trash2 className="size-3" /></Button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddParfum} className="flex gap-2">
                    <Input placeholder="Aroma Baru" value={newParfum} onChange={(e) => setNewParfum(e.target.value)} required className="rounded-none font-mono text-sm border-slate-300" />
                    <Button type="submit" className="rounded-none bg-slate-900 text-white font-bold px-3"><Plus className="size-4"/></Button>
                  </form>
                </div>
              </div>

              {/* Rak */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold uppercase mb-1">Lokasi Rak Penyimpanan</h2>
                  <p className="text-xs text-slate-500 font-mono mb-4">Posisi penyimpanan pasca packing.</p>
                  <div className="space-y-2 mb-4">
                    {racks.map((r) => (
                      <div key={r.id} className="p-2 px-3 border border-slate-300 dark:border-slate-700 flex justify-between items-center rounded-none bg-slate-50 dark:bg-slate-950">
                        <span className="font-mono text-sm font-bold uppercase">{r.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteItem("rack", r.id)} className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 rounded-none"><Trash2 className="size-3" /></Button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddRack} className="flex gap-2">
                    <Input placeholder="Kode Rak (A1, B2)" value={newRack} onChange={(e) => setNewRack(e.target.value)} required className="rounded-none font-mono text-sm border-slate-300" />
                    <Button type="submit" className="rounded-none bg-slate-900 text-white font-bold px-3"><Plus className="size-4"/></Button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB: INVOICE */}
          {activeTab === "invoice" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-lg font-extrabold uppercase mb-1">Format Nota & Struk</h2>
                <p className="text-xs text-slate-500 font-mono mb-4">Atur penomoran kustom untuk order laundry Anda.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Prefix Kode (Awalan)</label>
                  <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} className="font-mono uppercase rounded-none border-slate-300" maxLength={5} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Format Penomoran</label>
                  <select value={invoiceFormat} onChange={(e) => setInvoiceFormat(e.target.value)} className="w-full h-10 border border-slate-300 bg-transparent px-3 text-sm font-mono focus:outline-none">
                    <option value="{PREFIX}-{YYYYMMDD}-{COUNTER}">PREFIX-YYYYMMDD-COUNTER</option>
                    <option value="{PREFIX}{YYYYMMDD}{COUNTER}">PREFIXYYYYMMDDCOUNTER</option>
                    <option value="{YYYYMMDD}-{COUNTER}">YYYYMMDD-COUNTER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Digit Nomor Urut</label>
                  <select value={invoiceCounterDigits} onChange={(e) => setInvoiceCounterDigits(Number(e.target.value))} className="w-full h-10 border border-slate-300 bg-transparent px-3 text-sm font-mono focus:outline-none">
                    <option value={3}>3 Digit (001)</option>
                    <option value={4}>4 Digit (0001)</option>
                    <option value={5}>5 Digit (00001)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Reset Nomor Urut</label>
                  <select value={invoiceCounterReset as string} onChange={(e) => setInvoiceCounterReset(e.target.value as any)} className="w-full h-10 border border-slate-300 bg-transparent px-3 text-sm font-mono focus:outline-none">
                    <option value="DAILY">Harian (Mulai dari 1 setiap hari)</option>
                    <option value="MONTHLY">Bulanan (Mulai dari 1 setiap bulan)</option>
                    <option value="YEARLY">Tahunan</option>
                    <option value="NEVER">Lanjut Terus (Never Reset)</option>
                  </select>
                </div>

                <div className="p-4 mt-4 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                  <span className="text-xs font-bold uppercase text-slate-500 mb-1 block">Preview Nota:</span>
                  <span className="font-mono text-lg font-extrabold tracking-widest text-slate-900 dark:text-white">
                    {invoiceFormat
                      .replace("{PREFIX}", invoicePrefix || "LND")
                      .replace("{YYYYMMDD}", new Date().toISOString().slice(0,10).replace(/-/g,""))
                      .replace("{COUNTER}", "1".padStart(invoiceCounterDigits, "0"))}
                  </span>
                </div>

                <Button onClick={handleSaveInvoiceSettings} disabled={isSubmitting} className="rounded-none bg-slate-900 text-white font-bold uppercase tracking-wider text-xs px-6 py-2 mt-4">
                  {isSubmitting ? "Menyimpan..." : "Simpan Pengaturan Nota"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB: LANGGANAN */}
          {activeTab === "langganan" && subscriptionData && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-lg font-extrabold uppercase mb-1">Status Billing & Paket</h2>
                <p className="text-xs text-slate-500 font-mono mb-4">Informasi langganan POS SaaS Anda.</p>
              </div>

              <div className="p-6 border-2 border-slate-900 dark:border-slate-300 bg-white dark:bg-slate-900">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Paket Saat Ini</span>
                    <div className="font-display text-2xl font-black mt-1 uppercase">{subscriptionData.plan}</div>
                  </div>
                  <span className="px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-extrabold uppercase">
                    {subscriptionData.status}
                  </span>
                </div>

                <div className="space-y-3 font-mono text-sm border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tanggal Daftar</span>
                    <span className="font-bold">{new Date(subscriptionData.registeredAt || "").toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kapasitas Cabang</span>
                    <span className="font-bold">{branches.length} / {subscriptionData.plan.includes("Pro") ? "Unlimited" : "1"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dukungan Teknis</span>
                    <span className="font-bold">Prioritas</span>
                  </div>
                </div>

                <Button className="w-full mt-8 rounded-none border-2 border-slate-900 bg-transparent text-slate-900 hover:bg-slate-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-slate-900 font-bold uppercase text-xs tracking-wider">
                  Hubungi Admin untuk Upgrade
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
