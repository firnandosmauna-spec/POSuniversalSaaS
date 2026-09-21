import { useState, useEffect } from "react";
import {
  WashingMachine,
  Sparkles,
  Scissors,
  ShoppingBag,
  Plus,
  Trash2,
  Printer,
  Check,
  FileCheck,
  Eye,
  Clock,
  Shirt,
  Layers,
  MapPin,
  CheckCircle2,
  Package,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/shared/auth/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export type LaundryCategory = "KILOAN" | "SATUAN" | "EXPRESS";

export type LaundryService = {
  id: string;
  name: string;
  category: LaundryCategory;
  pricePerUnit: number;
  unitName: string; // kg, pcs, m2
  description: string;
  minQty?: number;
};

export type LaundryOrderItem = {
  id: string;
  service: LaundryService;
  weightOrQty: number; // kg or pcs
  parfum: string;
  notes: string;
  rackLocation: string;
  expressTier: "Reguler (2-3 Hari)" | "Kilat (24 Jam)" | "Express (6 Jam)";
  totalPrice: number;
};

export type LaundryJobOrder = {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  items: LaundryOrderItem[];
  totalAmount: number;
  dpAmount: number;
  remainingAmount: number;
  paymentType: "LUNAS" | "DP";
  paymentMethod: string;
  paymentStatus: "Lunas" | "DP (Belum Lunas)";
  jobStatus: "Antrean" | "Proses Cuci" | "Pengeringan" | "Setrika & Packing" | "Siap Diambil" | "Selesai";
  createdAt: string;
  cashierName: string;
  branchName: string;
  targetCompletionDate: string;
};

export default function LaundryPOSView() {
  const { user, activeBranchId, branches } = useAuth();
  const currentBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const [services, setServices] = useState<LaundryService[]>([]);
  const [parfumOptions, setParfumOptions] = useState<string[]>([]);
  const [rackLocations, setRackLocations] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<LaundryCategory>("KILOAN");
  const [selectedService, setSelectedService] = useState<LaundryService | null>(null);
  const [weightOrQty, setWeightOrQty] = useState<number>(3);
  const [parfum, setParfum] = useState<string>("");
  const [expressTier, setExpressTier] = useState<"Reguler (2-3 Hari)" | "Kilat (24 Jam)" | "Express (6 Jam)">("Reguler (2-3 Hari)");
  const [notes, setNotes] = useState<string>("");
  const [rackLocation, setRackLocation] = useState<string>("");

  // Add Service Modal
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceUnit, setNewServiceUnit] = useState("kg");
  const [newServiceCategory, setNewServiceCategory] = useState<LaundryCategory>("KILOAN");

  // Customer & Cart
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [cart, setCart] = useState<LaundryOrderItem[]>([]);

  // Payment State
  const [paymentType, setPaymentType] = useState<"LUNAS" | "DP">("LUNAS");
  const [paymentMethod, setPaymentMethod] = useState<string>("Tunai");
  const [dpInput, setDpInput] = useState<number>(0);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);

  // Job History & SPK Dialog
  const [recentJobs, setRecentJobs] = useState<LaundryJobOrder[]>([]);
  const [selectedSpkJob, setSelectedSpkJob] = useState<LaundryJobOrder | null>(null);

  // Load local recent jobs and settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_laundry_jobs");
      if (saved) setRecentJobs(JSON.parse(saved));

      const savedSvc = localStorage.getItem("laundry_services");
      if (savedSvc) {
        const parsed = JSON.parse(savedSvc);
        const mapped: LaundryService[] = parsed.map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category || "KILOAN",
          pricePerUnit: s.price,
          unitName: s.unit,
          description: s.name,
          minQty: 1
        }));
        setServices(mapped);
        if (mapped.length > 0) setSelectedService(mapped[0]);
      }

      const savedPrf = localStorage.getItem("laundry_parfums");
      if (savedPrf) {
        const parsedPrf = JSON.parse(savedPrf).map((p: any) => p.name);
        setParfumOptions(parsedPrf);
        if (parsedPrf.length > 0) setParfum(parsedPrf[0]);
      }

      const savedRck = localStorage.getItem("laundry_racks");
      if (savedRck) {
        const parsedRck = JSON.parse(savedRck).map((r: any) => r.name);
        setRackLocations(parsedRck);
        if (parsedRck.length > 0) setRackLocation(parsedRck[0]);
      }
    } catch (e) {}
  }, []);

  const handleAddServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName) return;
    const updated = [...services, {
      id: "lnd_svc_" + Date.now(),
      name: newServiceName,
      category: newServiceCategory,
      pricePerUnit: Number(newServicePrice) || 0,
      unitName: newServiceUnit,
      description: newServiceName,
      minQty: 1
    }];
    setServices(updated);
    
    // Save to localStorage matching SettingsView format
    const toSave = updated.map(s => ({
      id: s.id,
      name: s.name,
      price: s.pricePerUnit,
      unit: s.unitName,
      category: s.category
    }));
    localStorage.setItem("laundry_services", JSON.stringify(toSave));
    
    setIsAddServiceOpen(false);
    setNewServiceName("");
    setNewServicePrice("");
  };

  // Update default service when tab changes
  useEffect(() => {
    const defaultForTab = services.find((s) => s.category === activeTab);
    if (defaultForTab) {
      setSelectedService(defaultForTab || null);
      setWeightOrQty(defaultForTab.minQty || 1);
    } else {
      setSelectedService(null);
    }
  }, [activeTab, services]);

  // Express Multiplier
  const getExpressMultiplier = () => {
    if (expressTier === "Express (6 Jam)") return 2.0;
    if (expressTier === "Kilat (24 Jam)") return 1.5;
    return 1.0;
  };

  // Pricing calculation
  const calculateItemPrice = () => {
    if (!selectedService) return { basePrice: 0, finalPrice: 0 };
    const basePrice = selectedService.pricePerUnit * weightOrQty;
    const finalPrice = Math.round(basePrice * getExpressMultiplier());
    return {
      basePrice,
      finalPrice,
    };
  };

  const currentPricing = calculateItemPrice();

  // Total cart sum
  const cartTotalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  // Handle Add to Cart
  const handleAddToCart = () => {
    if (weightOrQty <= 0 || !selectedService) return;

    const newItem: LaundryOrderItem = {
      id: "lnd_item_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      service: selectedService,
      weightOrQty,
      parfum,
      notes,
      rackLocation,
      expressTier,
      totalPrice: currentPricing.finalPrice,
    };

    setCart([...cart, newItem]);
    setNotes("");
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter((i) => i.id !== itemId));
  };

  // Handle Checkout / Save Nota Order
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsProcessingCheckout(true);

    const actualDp = paymentType === "DP" ? Math.max(0, dpInput) : cartTotalAmount;
    const actualRemaining = Math.max(0, cartTotalAmount - actualDp);

    // Estimate completion date
    const now = new Date();
    if (expressTier === "Express (6 Jam)") now.setHours(now.getHours() + 6);
    else if (expressTier === "Kilat (24 Jam)") now.setDate(now.getDate() + 1);
    else now.setDate(now.getDate() + 3);

    const newJobOrder: LaundryJobOrder = {
      id: "lnd_job_" + Date.now(),
      invoiceNo: "LND-" + Math.floor(100000 + Math.random() * 900000),
      customerName: customerName.trim() || "Pelanggan Umum",
      customerPhone: customerPhone.trim() || "-",
      items: [...cart],
      totalAmount: cartTotalAmount,
      dpAmount: actualDp,
      remainingAmount: actualRemaining,
      paymentType,
      paymentMethod,
      paymentStatus: paymentType === "LUNAS" || actualRemaining <= 0 ? "Lunas" : "DP (Belum Lunas)",
      jobStatus: "Antrean",
      createdAt: new Date().toISOString(),
      cashierName: user?.email?.split("@")[0] || "Kasir Laundry",
      branchName: currentBranch?.name || "Laundry Utama",
      targetCompletionDate: now.toISOString(),
    };

    setTimeout(() => {
      const updatedJobs = [newJobOrder, ...recentJobs];
      setRecentJobs(updatedJobs);
      try {
        localStorage.setItem("pos_laundry_jobs", JSON.stringify(updatedJobs));
      } catch (e) {}

      setSelectedSpkJob(newJobOrder);
      setCart([]);
      setDpInput(0);
      setIsProcessingCheckout(false);
    }, 400);
  };

  // Update Job Status
  const handleUpdateJobStatus = (jobId: string, newStatus: LaundryJobOrder["jobStatus"]) => {
    const updated = recentJobs.map((j) => (j.id === jobId ? { ...j, jobStatus: newStatus } : j));
    setRecentJobs(updated);
    try {
      localStorage.setItem("pos_laundry_jobs", JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <div className="flex flex-col landscape:flex-row md:flex-row h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto landscape:overflow-hidden md:overflow-hidden font-sans pb-16 md:pb-4">
      {/* LEFT COLUMN: Laundry Service Selection & Calculator (60% width) */}
      <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 landscape:h-full md:h-full p-3 md:p-6 space-y-4 min-h-[350px]">
        {/* Header Title Banner */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-baseline gap-2">
            <h1 className="font-bold text-lg text-slate-900 dark:text-white">
              POS Laundry
            </h1>
            <span className="text-xs text-slate-500">
              {currentBranch?.name || "Pusat"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (recentJobs.length > 0 && recentJobs[0]) setSelectedSpkJob(recentJobs[0]);
            }}
            className="text-xs h-7 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-none"
          >
            <Eye className="size-3.5 mr-1" /> Riwayat ({recentJobs.length})
          </Button>
        </div>

        {/* Category Tabs & Add Service */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex">
            <button
              onClick={() => setActiveTab("KILOAN")}
              className={`py-1.5 px-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === "KILOAN"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Kiloan
            </button>
            <button
              onClick={() => setActiveTab("SATUAN")}
              className={`py-1.5 px-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === "SATUAN"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Satuan
            </button>
            <button
              onClick={() => setActiveTab("EXPRESS")}
              className={`py-1.5 px-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === "EXPRESS"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Layanan Express
            </button>
          </div>
          <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-brand hover:text-brand hover:bg-brand/10">
                <Plus className="size-3 mr-1" /> Tambah
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-none">
              <DialogHeader>
                <DialogTitle className="font-display font-bold">Tambah Layanan Laundry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddServiceSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Kategori Layanan</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["KILOAN", "SATUAN", "EXPRESS"].map((cat) => (
                      <div
                        key={cat}
                        onClick={() => setNewServiceCategory(cat as LaundryCategory)}
                        className={`text-center cursor-pointer p-2 border text-xs font-semibold transition-colors ${
                          newServiceCategory === cat
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold" htmlFor="svc-name">Nama Layanan</Label>
                  <Input
                    id="svc-name"
                    required
                    className="h-8 rounded-none text-xs"
                    placeholder="Contoh: Cuci Komplit, Sprei, Bedcover"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold" htmlFor="svc-price">Harga (Rp)</Label>
                    <Input
                      id="svc-price"
                      required
                      type="number"
                      className="h-8 rounded-none text-xs font-mono"
                      placeholder="6000"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold" htmlFor="svc-unit">Satuan</Label>
                    <select
                      id="svc-unit"
                      className="flex h-8 w-full items-center justify-between border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none"
                      value={newServiceUnit}
                      onChange={(e) => setNewServiceUnit(e.target.value)}
                    >
                      <option value="kg">kg (Kilo)</option>
                      <option value="pcs">pcs (Satuan)</option>
                      <option value="m2">m² (Karpet)</option>
                    </select>
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" className="rounded-none h-8 text-xs" onClick={() => setIsAddServiceOpen(false)}>Batal</Button>
                  <Button type="submit" className="rounded-none h-8 text-xs bg-slate-900 text-white hover:bg-slate-800">Simpan Layanan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calculator Main Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none space-y-5">
          {/* Service Selector List */}
          <div>
            <div className="flex flex-col border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
              {services.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 italic">
                  Belum ada layanan untuk kategori ini.
                </div>
              ) : (
                services.filter((s) => (activeTab === "EXPRESS" ? true : s.category === activeTab)).map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => {
                        setSelectedService(srv);
                        if (srv.minQty) setWeightOrQty(srv.minQty);
                      }}
                      className={`flex items-center justify-between p-2 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-slate-100 dark:bg-slate-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 flex justify-center">
                          {isSelected && <Check className="size-3.5 text-slate-900 dark:text-white" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-white">{srv.name}</h4>
                          <span className="text-[10px] text-slate-500">
                            {srv.minQty ? `Min. ${srv.minQty} ${srv.unitName}` : "-"}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        Rp {srv.pricePerUnit.toLocaleString("id-ID")}/{srv.unitName}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Service Configuration Form */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kuantitas ({selectedService?.unitName || "-"})
              </label>
              <div className="flex">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeightOrQty(Math.max(1, weightOrQty - 1))}
                  className="rounded-none px-2 h-8"
                >
                  -
                </Button>
                <Input
                  type="number"
                  step={selectedService?.unitName === "kg" ? "0.5" : "1"}
                  min={1}
                  value={weightOrQty}
                  onChange={(e) => setWeightOrQty(Math.max(0.5, Number(e.target.value)))}
                  className="rounded-none text-center h-8 focus-visible:ring-0 focus-visible:border-slate-900 border-x-0"
                  disabled={!selectedService}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeightOrQty(weightOrQty + 1)}
                  className="rounded-none px-2 h-8"
                >
                  +
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Durasi Layanan
              </label>
              <select
                value={expressTier}
                onChange={(e) => setExpressTier(e.target.value as any)}
                className="w-full h-8 text-xs px-2 bg-transparent border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-slate-900"
              >
                <option value="Reguler (2-3 Hari)">Reguler (2-3 Hari)</option>
                <option value="Kilat (24 Jam)">Kilat (24 Jam)</option>
                <option value="Express (6 Jam)">Express (6 Jam)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Parfum / Aroma
              </label>
              <select
                value={parfum}
                onChange={(e) => setParfum(e.target.value)}
                className="w-full h-8 text-xs px-2 bg-transparent border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-slate-900"
              >
                {parfumOptions.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Lokasi Rak
              </label>
              <select
                value={rackLocation}
                onChange={(e) => setRackLocation(e.target.value)}
                className="w-full h-8 text-xs px-2 bg-transparent border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-slate-900"
              >
                {rackLocations.map((r: string) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 md:col-span-4 mt-2">
               <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan (noda, pisah warna, dsb.)"
                  className="h-8 text-xs rounded-none focus-visible:ring-0 focus-visible:border-slate-900 bg-slate-50 dark:bg-slate-900"
                />
            </div>
          </div>

          {/* Pricing Calculation Summary Bar */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500">
                Tarif Dasar: <strong className="font-mono text-slate-900 dark:text-white">Rp {currentPricing.basePrice.toLocaleString("id-ID")}</strong>
              </span>
              <span className="text-slate-500">
                Total Item: <strong className="font-mono text-slate-900 dark:text-white">Rp {currentPricing.finalPrice.toLocaleString("id-ID")}</strong>
              </span>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={!selectedService}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs px-6 py-2 rounded-none"
            >
              Tambah ke Nota
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Cart / Order Summary (40% width) */}
      <div className="w-full landscape:w-[350px] sm:landscape:w-[380px] md:w-[420px] lg:w-[450px] bg-white dark:bg-slate-950 flex flex-col h-full max-h-full border-l border-slate-200 dark:border-slate-800 shrink-0 overflow-hidden min-h-0">
        {/* Customer Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Nota Keranjang
            </h2>
            <span className="text-xs text-slate-500">
              {cart.length} Item
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">Nama Pemesan</span>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama Pelanggan"
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-none h-8 focus:border-cyan-500"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">No. WhatsApp / HP</span>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0812xxxx"
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-none h-8 focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs italic">
              Keranjang kosong
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.id}
                className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-none space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white">{item.service.name}</h4>
                    <p className="text-[10px] text-slate-500">
                      {item.weightOrQty} {item.service.unitName} | {item.parfum} | {item.rackLocation}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="text-slate-400 hover:text-red-500"
                    title="Hapus"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {item.notes && (
                  <p className="text-[10px] text-amber-800 dark:text-amber-300 italic bg-amber-50 dark:bg-amber-950/40 p-1.5 border border-amber-200 dark:border-amber-900/40">
                    Catatan: {item.notes}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2 font-mono text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.expressTier}
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    Rp {item.totalPrice.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout & DP Payment Box */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 space-y-3">
          {/* Payment Type Toggle */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1.5">
              Skema Pembayaran
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType("LUNAS")}
                className={`py-1.5 px-3 text-xs font-extrabold border rounded-none transition-all ${
                  paymentType === "LUNAS"
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Bayar Lunas (100%)
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("DP")}
                className={`py-1.5 px-3 text-xs font-extrabold border rounded-none transition-all ${
                  paymentType === "DP"
                    ? "bg-amber-600 border-amber-500 text-white shadow-sm"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Uang Muka (DP)
              </button>
            </div>
          </div>

          {/* DP Input Amount */}
          {paymentType === "DP" && (
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold">
                <span>Nominal DP (Uang Muka)</span>
                <span>Minimal 50%</span>
              </div>
              <Input
                type="number"
                value={dpInput}
                onChange={(e) => setDpInput(Number(e.target.value))}
                placeholder={`Contoh: Rp ${(cartTotalAmount / 2).toLocaleString("id-ID")}`}
                className="bg-white dark:bg-slate-950 border-amber-400 dark:border-amber-800/80 text-xs font-mono font-bold text-slate-900 dark:text-white rounded-none focus:border-amber-500"
              />
              <div className="flex justify-between text-[11px] text-amber-800 dark:text-amber-400 font-mono">
                <span>Sisa Pelunasan Saat Diambil:</span>
                <strong>Rp {Math.max(0, cartTotalAmount - dpInput).toLocaleString("id-ID")}</strong>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
              Metode Pembayaran
            </span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white p-2 rounded-none focus:outline-cyan-500"
            >
              <option value="Tunai">Tunai / Cash</option>
              <option value="QRIS">QRIS Statis/Dinamis</option>
              <option value="Transfer Bank">Transfer Bank BCA/Mandiri</option>
              <option value="Debit / Kredit">Kartu Debit / Kredit</option>
            </select>
          </div>

          {/* Total & Checkout Action */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400">Total Tagihan Laundry:</span>
              <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                Rp {cartTotalAmount.toLocaleString("id-ID")}
              </span>
            </div>

            <Button
              disabled={cart.length === 0 || isProcessingCheckout}
              onClick={handleCheckout}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm py-3 rounded-none shadow-lg transition-all"
            >
              {isProcessingCheckout
                ? "Proses Cetak Struk & Nota..."
                : `Simpan Nota Laundry (${paymentType === "DP" ? "DP" : "Lunas"})`}
            </Button>
          </div>
        </div>
      </div>

      {/* RECEIPT / NOTA MODAL DIALOG */}
      {selectedSpkJob && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl rounded-none font-mono">
            {/* Modal Header */}
            <div className="p-3 border-b border-dashed border-slate-300 flex items-center justify-between">
              <span className="font-bold text-xs">Preview Struk</span>
              <button
                onClick={() => setSelectedSpkJob(null)}
                className="text-slate-400 hover:text-black"
              >
                ✕
              </button>
            </div>

            {/* Printable Content Body (Thermal Receipt Style) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Header Document */}
              <div className="text-center pb-4 border-b border-dashed border-slate-300">
                <h2 className="font-bold text-base mb-1">
                  NOTA LAUNDRY
                </h2>
                <p className="text-[10px]">{selectedSpkJob.branchName}</p>
                <p className="text-[10px] mt-2">
                  No: {selectedSpkJob.invoiceNo}<br/>
                  Kasir: {selectedSpkJob.cashierName}<br/>
                  {new Date(selectedSpkJob.createdAt).toLocaleString("id-ID")}
                </p>
              </div>

              {/* Customer Specs */}
              <div className="border-b border-dashed border-slate-300 pb-4">
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-bold">{selectedSpkJob.customerName}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>No. HP:</span>
                  <span>{selectedSpkJob.customerPhone}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span>Status:</span>
                  <select
                    value={selectedSpkJob.jobStatus}
                    onChange={(e) =>
                      handleUpdateJobStatus(
                        selectedSpkJob.id,
                        e.target.value as LaundryJobOrder["jobStatus"]
                      )
                    }
                    className="border border-slate-300 bg-transparent text-xs p-1"
                  >
                    <option value="Antrean">Antrean Cuci</option>
                    <option value="Proses Cuci">Proses Cuci</option>
                    <option value="Pengeringan">Pengeringan</option>
                    <option value="Setrika & Packing">Setrika & Packing</option>
                    <option value="Siap Diambil">Siap Diambil</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3 pb-4 border-b border-dashed border-slate-300">
                {selectedSpkJob.items.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>{item.service.name}</span>
                      <span>{item.totalPrice.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="text-[10px]">
                      {item.weightOrQty} {item.service.unitName} | {item.expressTier} | {item.parfum} | {item.rackLocation}
                    </div>
                    {item.notes && (
                      <div className="text-[10px] italic">
                        Catatan: {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment Breakdown */}
              <div className="space-y-1 mt-4">
                <div className="flex justify-between font-bold">
                  <span>Total Harga</span>
                  <span>{selectedSpkJob.totalAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span>DP / Uang Muka</span>
                  <span>{selectedSpkJob.dpAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-dashed border-slate-300">
                  <span>Sisa Tagihan</span>
                  <span>{selectedSpkJob.remainingAmount.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs gap-1.5 rounded-none"
              >
                <Printer className="size-4" /> Cetak Struk Nota & Tag Rak
              </Button>

              <Button
                onClick={() => setSelectedSpkJob(null)}
                className="bg-cyan-600 text-white font-bold text-xs px-5 rounded-none"
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
