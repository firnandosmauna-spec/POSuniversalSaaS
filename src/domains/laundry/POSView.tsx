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

const SERVICES: LaundryService[] = [
  // Kiloan
  {
    id: "kil_1",
    name: "Cuci Komplit (Cuci + Lipat + Setrika)",
    category: "KILOAN",
    pricePerUnit: 8000,
    unitName: "kg",
    description: "Pembersihan total, harum pewangi premium, & setrika uap rapi.",
    minQty: 3,
  },
  {
    id: "kil_2",
    name: "Cuci Lipat (Tanpa Setrika)",
    category: "KILOAN",
    pricePerUnit: 6000,
    unitName: "kg",
    description: "Pembersihan higienis, dikeringkan mesin, & dilipat rapi.",
    minQty: 3,
  },
  {
    id: "kil_3",
    name: "Setrika Uap Saja",
    category: "KILOAN",
    pricePerUnit: 5000,
    unitName: "kg",
    description: "Setrika uap licin dan rapi khusus pakaian bersih.",
    minQty: 3,
  },
  {
    id: "kil_4",
    name: "Dry Clean Kiloan Premium",
    category: "KILOAN",
    pricePerUnit: 15000,
    unitName: "kg",
    description: "Pembersihan bebas air untuk kain sintetis & wol sensitive.",
    minQty: 2,
  },

  // Satuan
  {
    id: "sat_1",
    name: "Bedcover Single / Double",
    category: "SATUAN",
    pricePerUnit: 30000,
    unitName: "pcs",
    description: "Pencucian deep-clean kasur & pengeringan bebas jamur.",
  },
  {
    id: "sat_2",
    name: "Bedcover King / Jumbo",
    category: "SATUAN",
    pricePerUnit: 40000,
    unitName: "pcs",
    description: "Bedcover ukuran besar dengan pewangi tahan lama 14 hari.",
  },
  {
    id: "sat_3",
    name: "Jas / Stelan Tuxedo / Blazer",
    category: "SATUAN",
    pricePerUnit: 35000,
    unitName: "pcs",
    description: "Dry clean khusus bahan wool/jas formal beserta hanger.",
  },
  {
    id: "sat_4",
    name: "Gaun / Kebaya Pesta",
    category: "SATUAN",
    pricePerUnit: 45000,
    unitName: "pcs",
    description: "Pencucian lembut gaun berbintik/manik-manik & brokat.",
  },
  {
    id: "sat_5",
    name: "Cuci Sepatu Sneakers / Leather",
    category: "SATUAN",
    pricePerUnit: 30000,
    unitName: "pasang",
    description: "Deep clean midsole, upper, unyellowing & sterilisasi UV.",
  },
  {
    id: "sat_6",
    name: "Boneka Ukuran Jumbo",
    category: "SATUAN",
    pricePerUnit: 25000,
    unitName: "pcs",
    description: "Pencucian lembut boneka kain tanpa merusak serat bulu.",
  },
  {
    id: "sat_7",
    name: "Karpet Tebal / Gorden",
    category: "SATUAN",
    pricePerUnit: 15000,
    unitName: "m²",
    description: "Pencucian karpet spon / gorden tebal dengan pengeringan ekstra.",
  },
];

const PARFUM_OPTIONS = [
  "Lavender Fresh",
  "Fresh Lily",
  "Sakura Bloom",
  "Ocean Breeze",
  "Vanilla Sweet",
  "Tanpa Parfum (Sensitif)",
];

const RACK_LOCATIONS = ["Rak A-1", "Rak A-2", "Rak B-1", "Rak B-2", "Rak C-1", "Gantungan Hanger 01", "Gantungan Hanger 02"];

export default function LaundryPOSView() {
  const { user, activeBranchId, branches } = useAuth();
  const currentBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const [activeTab, setActiveTab] = useState<LaundryCategory>("KILOAN");
  const [selectedService, setSelectedService] = useState<LaundryService>(SERVICES[0] as LaundryService);
  const [weightOrQty, setWeightOrQty] = useState<number>(3);
  const [parfum, setParfum] = useState<string>("Lavender Fresh");
  const [expressTier, setExpressTier] = useState<"Reguler (2-3 Hari)" | "Kilat (24 Jam)" | "Express (6 Jam)">("Reguler (2-3 Hari)");
  const [notes, setNotes] = useState<string>("");
  const [rackLocation, setRackLocation] = useState<string>("Rak A-1");

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

  // Load local recent jobs
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_laundry_jobs");
      if (saved) setRecentJobs(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Update default service when tab changes
  useEffect(() => {
    const defaultForTab = SERVICES.find((s) => s.category === activeTab);
    if (defaultForTab) {
      setSelectedService(defaultForTab);
      setWeightOrQty(defaultForTab.minQty || 1);
    }
  }, [activeTab]);

  // Express Multiplier
  const getExpressMultiplier = () => {
    if (expressTier === "Express (6 Jam)") return 2.0;
    if (expressTier === "Kilat (24 Jam)") return 1.5;
    return 1.0;
  };

  // Pricing calculation
  const calculateItemPrice = () => {
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
    if (weightOrQty <= 0) return;

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
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-cyan-600 text-white grid place-items-center rounded-none font-bold shadow-md">
              <WashingMachine className="size-5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Kasir & Penerimaan Laundry
                <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 border border-cyan-500/40 uppercase font-mono">
                  Kiloan & Satuan
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Penerimaan pakaian kiloan/satuan, pilihan aroma parfum, durasi express, & nomor rak otomatis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (recentJobs.length > 0 && recentJobs[0]) setSelectedSpkJob(recentJobs[0]);
              }}
              className="text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 gap-1.5 rounded-none"
            >
              <Eye className="size-3.5 text-cyan-600 dark:text-cyan-400" /> Daftar Nota Laundry ({recentJobs.length})
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-800 rounded-none">
          <button
            onClick={() => setActiveTab("KILOAN")}
            className={`py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-2 transition-all rounded-none ${
              activeTab === "KILOAN"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <Shirt className="size-4" /> Laundry Kiloan (per kg)
          </button>

          <button
            onClick={() => setActiveTab("SATUAN")}
            className={`py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-2 transition-all rounded-none ${
              activeTab === "SATUAN"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <Sparkles className="size-4" /> Laundry Satuan (Bedcover/Jas/Sepatu)
          </button>

          <button
            onClick={() => setActiveTab("EXPRESS")}
            className={`py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-2 transition-all rounded-none ${
              activeTab === "EXPRESS"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="size-4" /> Layanan Express & Kilat
          </button>
        </div>

        {/* Calculator Main Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none space-y-5">
          {/* Service Selector Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Layers className="size-4 text-cyan-600 dark:text-cyan-400" /> Pilih Jenis Layanan Laundry
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
              {SERVICES.filter((s) => (activeTab === "EXPRESS" ? true : s.category === activeTab)).map((srv) => {
                const isSelected = selectedService.id === srv.id;
                return (
                  <div
                    key={srv.id}
                    onClick={() => {
                      setSelectedService(srv);
                      if (srv.minQty) setWeightOrQty(srv.minQty);
                    }}
                    className={`p-3 border cursor-pointer transition-all rounded-none relative ${
                      isSelected
                        ? "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-slate-900 dark:text-white shadow-md"
                        : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 text-cyan-600 dark:text-cyan-400">
                        <CheckCircle2 className="size-4" />
                      </div>
                    )}
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white pr-5">{srv.name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{srv.description}</p>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-1.5">
                      <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500">
                        {srv.minQty ? `Min. ${srv.minQty} ${srv.unitName}` : "Tarif Standard"}
                      </span>
                      <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                        Rp {srv.pricePerUnit.toLocaleString("id-ID")}/{srv.unitName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Service Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
            {/* Left Column Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Timbangan / Unit ({selectedService.unitName})
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeightOrQty(Math.max(1, weightOrQty - 1))}
                    className="border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-none h-9 w-9"
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    step={selectedService.unitName === "kg" ? "0.5" : "1"}
                    min={1}
                    value={weightOrQty}
                    onChange={(e) => setWeightOrQty(Math.max(0.5, Number(e.target.value)))}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-center text-xs font-mono font-bold rounded-none h-9 focus:border-cyan-500"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeightOrQty(weightOrQty + 1)}
                    className="border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-none h-9 w-9"
                  >
                    +
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Prioritas Layanan (Durasi Pengerjaan)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      "Reguler (2-3 Hari)",
                      "Kilat (24 Jam)",
                      "Express (6 Jam)",
                    ] as const
                  ).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setExpressTier(tier)}
                      className={`py-1.5 px-2 text-[10px] font-extrabold uppercase border rounded-none transition-all ${
                        expressTier === tier
                          ? "bg-cyan-600 border-cyan-500 text-white"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilihan Aroma Parfum Laundry
                </label>
                <select
                  value={parfum}
                  onChange={(e) => setParfum(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold p-2 rounded-none focus:outline-cyan-500"
                >
                  {PARFUM_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      🌸 {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lokasi Rak / Hanger Penyimpanan
                </label>
                <select
                  value={rackLocation}
                  onChange={(e) => setRackLocation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold p-2 rounded-none focus:outline-cyan-500"
                >
                  {RACK_LOCATIONS.map((r) => (
                    <option key={r} value={r}>
                      📦 {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Khusus Pakaian (Noda / Luntur / Halus)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: Ada noda oli di kerah, luntur baju merah, jangan pakai softener..."
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing Calculation Summary Bar */}
          <div className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-none">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">
                Rincian Tarif Item
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span>
                  Layanan:{" "}
                  <strong className="text-slate-900 dark:text-white font-mono">
                    Rp {currentPricing.basePrice.toLocaleString("id-ID")}
                  </strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>
                  Durasi:{" "}
                  <strong className="text-cyan-600 dark:text-cyan-400 font-mono">
                    {expressTier}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-mono">Total Subtotal Item</span>
                <span className="font-mono text-xl font-extrabold text-cyan-600 dark:text-cyan-400">
                  Rp {currentPricing.finalPrice.toLocaleString("id-ID")}
                </span>
              </div>

              <Button
                onClick={handleAddToCart}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-5 py-2.5 rounded-none shadow-md gap-2"
              >
                <Plus className="size-4" /> Tambah ke Nota
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Cart / Order Summary (40% width) */}
      <div className="w-full landscape:w-[350px] sm:landscape:w-[380px] md:w-[420px] lg:w-[450px] bg-white dark:bg-slate-950 flex flex-col h-full max-h-full border-l border-slate-200 dark:border-slate-800 shrink-0 overflow-hidden min-h-0">
        {/* Customer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="size-4 text-cyan-600 dark:text-cyan-400" /> Nota Penerimaan Laundry
            </h2>
            <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-0.5 font-bold font-mono">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800/80">
              <WashingMachine className="size-10 mb-2 text-slate-400 dark:text-slate-700" />
              <p className="text-xs font-medium">Belum ada item pakaian dimasukkan.</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-600 mt-1">
                Gunakan kalkulator di sebelah kiri untuk menambah layanan laundry.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none relative space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase font-mono block">
                      #{idx + 1} • {item.service.category} • {item.rackLocation}
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{item.service.name}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {item.weightOrQty} {item.service.unitName} • Parfum: {item.parfum}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 p-1"
                    title="Hapus Item"
                  >
                    <Trash2 className="size-4" />
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl rounded-none">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="size-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white">
                  Struk Nota Order & Label Rak Laundry
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSpkJob(null)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1"
              >
                ✕
              </Button>
            </div>

            {/* Printable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-200 font-sans">
              {/* Header Document */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                    NOTA ORDER LAUNDRY KILOAN & SATUAN
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedSpkJob.branchName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
                    Kasir: {selectedSpkJob.cashierName} • Masuk:{" "}
                    {new Date(selectedSpkJob.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400 block">
                    {selectedSpkJob.invoiceNo}
                  </span>
                  <span
                    className={`inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 border uppercase ${
                      selectedSpkJob.paymentStatus === "Lunas"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                    }`}
                  >
                    {selectedSpkJob.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Customer Specs */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase">Pelanggan</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{selectedSpkJob.customerName}</strong>
                  <p className="text-slate-600 dark:text-slate-400 font-mono">{selectedSpkJob.customerPhone}</p>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase">Status Pengerjaan</span>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={selectedSpkJob.jobStatus}
                      onChange={(e) =>
                        handleUpdateJobStatus(
                          selectedSpkJob.id,
                          e.target.value as LaundryJobOrder["jobStatus"]
                        )
                      }
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-cyan-600 dark:text-cyan-400 p-1 rounded-none"
                    >
                      <option value="Antrean">🟡 Antrean Cuci</option>
                      <option value="Proses Cuci">🔵 Proses Cuci</option>
                      <option value="Pengeringan">🟣 Pengeringan Mesin</option>
                      <option value="Setrika & Packing">🟠 Setrika & Packing</option>
                      <option value="Siap Diambil">🟢 Siap Diambil</option>
                      <option value="Selesai">⚪ Selesai (Diambil)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Rincian Layanan & Pakaian Pelanggan
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {selectedSpkJob.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>
                          #{idx + 1} {item.service.name}
                        </span>
                        <span className="font-mono">Rp {item.totalPrice.toLocaleString("id-ID")}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                        <div>
                          Berat/Qty: <strong className="text-slate-800 dark:text-slate-200">{item.weightOrQty} {item.service.unitName}</strong>
                        </div>
                        <div>
                          Aroma Parfum: <strong className="text-slate-800 dark:text-slate-200">{item.parfum}</strong>
                        </div>
                        <div>
                          Durasi: <strong className="text-cyan-600 dark:text-cyan-400 font-bold">{item.expressTier}</strong>
                        </div>
                        <div>
                          Lokasi Rak: <strong className="text-slate-800 dark:text-slate-200 font-mono">{item.rackLocation}</strong>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 italic">
                          Catatan Pakaian: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Layanan:</span>
                  <span>Rp {selectedSpkJob.totalAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>Uang Muka (DP) Bayar:</span>
                  <span>- Rp {selectedSpkJob.dpAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-amber-800 dark:text-amber-400 font-extrabold border-t border-slate-200 dark:border-slate-800 pt-1.5 text-sm">
                  <span>Sisa Pelunasan Saat Diambil:</span>
                  <span>Rp {selectedSpkJob.remainingAmount.toLocaleString("id-ID")}</span>
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
