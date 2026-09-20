import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/shared/auth/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { generateInvoiceCode, getInvoiceSettings } from "@/shared/utils/invoiceGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Printer, 
  Ruler, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2, 
  Search, 
  ShoppingBag, 
  DollarSign, 
  User, 
  ChevronRight, 
  Layers, 
  Scissors, 
  FileCheck, 
  AlertCircle, 
  Eye, 
  RefreshCw, 
  Receipt, 
  Box, 
  Image as ImageIcon,
  Sparkles,
  Check,
  Phone,
  HardDrive,
  Calculator,
  Zap
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Types for Printing POS
export type PrintCategory = string;

export interface MaterialOption {
  id: string;
  name: string;
  category: PrintCategory;
  pricePerUnit: number; // Price per m2 for OUTDOOR, price per sheet/unit for SHEET/MERCH
  unitName: string; // "m²", "lembar", "box", "pcs"
  description: string;
}

export interface FinishingOption {
  id: string;
  name: string;
  price: number; // Flat or per unit
  isPerM2?: boolean;
}

export interface PrintingCartItem {
  id: string;
  category: PrintCategory;
  jobTitle: string;
  material: MaterialOption;
  widthCm: number;
  heightCm: number;
  areaM2: number;
  quantity: number;
  unitPrice: number;
  finishings: FinishingOption[];
  finishingCost: number;
  designFee?: number;
  designFeeName?: string;
  totalPrice: number;
  notes: string;
  fileStatus: "Ready" | "Perlu Desain" | "Re-Desain";
  fileUrl?: string;
}

export interface PrintingJobOrder {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  items: PrintingCartItem[];
  subTotalAmount?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
  dpAmount: number;
  remainingAmount: number;
  paymentStatus: "Lunas" | "DP (Kurang Bayar)";
  paymentMethod: string;
  jobStatus: "Antrean" | "Proses Desain" | "Proses Cetak" | "Finishing" | "Siap Diambil" | "Selesai";
  cashierName: string;
  branchId?: string;
  branchName: string;
  createdAt: string;
}



export default function PrintingPOSView() {
  const navigate = useNavigate();

  // Helper to determine if a material uses dimension (m2) calculation
  const isMaterialDimensionBased = (material: MaterialOption | null) => {
    if (!material) return false;
    const unit = (material.unitName || "").toLowerCase();
    
    // If they explicitly use pcs/lembar etc, definitely not dimension
    if (unit.includes("pcs") || unit.includes("lembar") || unit.includes("lbr") || unit.includes("pack") || unit.includes("rim") || unit.includes("buku") || unit.includes("a3") || unit.includes("box")) return false;

    // Dimension based if unit mentions m, m2, meter, meter persegi, cm
    if (unit.includes("m2") || unit.includes("m²") || unit.includes("meter") || unit === "m" || unit.includes("cm") || unit.includes("m²") || unit.includes("m²")) return true;
    
    return false;
  };
const { user, activeBranchId, activeBranchName } = useAuth();

  const [categories, setCategories] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("pos_printing_categories");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [{ code: "UMUM", name: "Kategori Umum" }];
  });

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<PrintCategory>(categories[0].code);

  const [finishingOptions, setFinishingOptions] = useState<FinishingOption[]>(() => {
    try {
      const saved = localStorage.getItem("pos_printing_finishing_options");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.filter((f: any) => f.isAvailable !== false);
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_printing_finishing_options");
      if (saved) {
        const parsed = JSON.parse(saved);
        setFinishingOptions(parsed.filter((f: any) => f.isAvailable !== false));
      }
    } catch (e) {}
  }, []);

  const [materialsList, setMaterialsList] = useState<MaterialOption[]>([]);

  // Load materials from localStorage & Supabase to ensure Kasir always gets the latest
  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const savedStr = localStorage.getItem("pos_printing_materials");
        let list: any[] = savedStr ? JSON.parse(savedStr) : [];
        
        const catStr = localStorage.getItem("pos_printing_categories");
        let loadedCategories = catStr ? JSON.parse(catStr) : [];

        if (user) {
          const { data: dbProducts } = await supabase
            .from("products")
            .select("*")
            .eq("tenant_id", user.id)
            .order("name", { ascending: true });

          if (dbProducts && dbProducts.length > 0) {
            // Extract missing categories dynamically from products
            const uniqueDbCategories = Array.from(new Set(dbProducts.map(p => p.category).filter(Boolean)));
            let catUpdated = false;
            const currentCats = [...loadedCategories];
            
            uniqueDbCategories.forEach((catCode: any) => {
              if (!currentCats.some(c => c.code === catCode)) {
                currentCats.push({ code: catCode, name: catCode });
                catUpdated = true;
              }
            });

            if (catUpdated) {
              loadedCategories = currentCats;
              localStorage.setItem("pos_printing_categories", JSON.stringify(currentCats));
              setCategories(currentCats);
            }

            const remoteMaterials = dbProducts.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category || (loadedCategories.length > 0 ? loadedCategories[0].code : "UMUM"),
              unitType: p.unit_type || "m²",
              costPrice: Number(p.cost_price) || 0,
              price: Number(p.price) || 0,
              stock: Number(p.stock) || 0,
              minOrder: 1,
              description: p.description || "Bahan material cetak percetakan",
              finishingsAllowed: ["Laminasi Glossy", "Potong Clean"],
              isAvailable: p.status === "active"
            }));

            const merged = [...list];
            remoteMaterials.forEach((rm) => {
              if (!merged.some((lm) => lm.id === rm.id)) {
                merged.push(rm);
              }
            });
            list = merged;
            localStorage.setItem("pos_printing_materials", JSON.stringify(list));
          }
        }
        
        // Map to MaterialOption for POS
        const mappedList = list.filter((m: any) => m.isAvailable !== false).map((m: any) => ({
          id: m.id,
          name: m.name,
          category: m.category || "UMUM",
          pricePerUnit: m.price || 0,
          unitName: m.unitType || "pcs",
          description: m.description || ""
        }));
        setMaterialsList(mappedList);
      } catch (e) {
        console.error("Failed loading materials:", e);
      }
    };
    loadMaterials();
  }, [user]);

  // Design Fee Tiers State
  const [designTiers, setDesignTiers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("pos_printing_design_fee_tiers");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.filter((t: any) => t.isAvailable !== false);
      }
    } catch (e) {}
    return [
      { id: "dt_ready", name: "File Siap Cetak (Ready)", price: 0, description: "Bawa file sendiri" },
      { id: "dt_edit", name: "Edit Ringan & Ganti Teks", price: 15000, description: "Ubah HP/Alamat" },
      { id: "dt_standard", name: "Desain Standard (Spanduk)", price: 35000, description: "Desain baru 30m" },
      { id: "dt_premium", name: "Desain Premium / Redesain Full", price: 75000, description: "Tracing Vektor 1.5j" }
    ];
  });

  const [selectedDesignTierId, setSelectedDesignTierId] = useState<string>("dt_ready");
  const [customDesignFee, setCustomDesignFee] = useState<number>(0);
  const [isDesignCalcModalOpen, setIsDesignCalcModalOpen] = useState<boolean>(false);

  // Quick Design Fee Calculator State
  const [posCalcHours, setPosCalcHours] = useState<number>(1);
  const [posCalcMinutes, setPosCalcMinutes] = useState<number>(0);
  const [posCalcMult, setPosCalcMult] = useState<number>(1.0);
  const [posCalcBaseRate, setPosCalcBaseRate] = useState<number>(50000);
  const [posCalcAddon, setPosCalcAddon] = useState<number>(0);

  // Calculator Form State
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialOption | null>(materialsList[0] || null);
  const [jobTitle, setJobTitle] = useState("");
  const [widthCm, setWidthCm] = useState<number>(300);
  const [heightCm, setHeightCm] = useState<number>(100);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedFinishings, setSelectedFinishings] = useState<string[]>([]);
  const [fileStatus, setFileStatus] = useState<"Ready" | "Perlu Desain" | "Re-Desain">("Ready");
  const [fileUrl, setFileUrl] = useState("");
  const [jobNotes, setJobNotes] = useState("");

  // Auto-select first material when loaded if none selected
  useEffect(() => {
    if (materialsList.length > 0 && !selectedMaterial) {
      setSelectedMaterial(materialsList[0] || null);
    }
  }, [materialsList, selectedMaterial]);

  // Customer & Cart State
  const [customerName, setCustomerName] = useState("Pelanggan Umum");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<PrintingCartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);

  useEffect(() => {
    if (user) {
      try {
        const savedSettings = localStorage.getItem(`pos_tenant_${user.id}_printing_settings`);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.defaultTaxRate !== undefined) {
            setTaxRate(parsed.defaultTaxRate);
          }
        }
      } catch (e) {
        console.error("Failed to load tax rate", e);
      }
    }
  }, [user]);

  // Customer Synchronization State
  const [registeredCustomers, setRegisteredCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerTierDiscount, setCustomerTierDiscount] = useState<number>(0);

  // Load registered customers from localStorage & Supabase
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const savedStr = localStorage.getItem("pos_printing_customers");
        let list = savedStr ? JSON.parse(savedStr) : [];
        if (list.length === 0) {
          list = [];
          localStorage.setItem("pos_printing_customers", JSON.stringify(list));
        }

        if (user) {
          const { data: dbCustomers } = await supabase
            .from("customers")
            .select("*")
            .eq("tenant_id", user.id)
            .order("name", { ascending: true });
          if (dbCustomers && dbCustomers.length > 0) {
            const dbList = dbCustomers.map((c: any) => ({
              id: c.id,
              name: c.name,
              companyName: c.company_name || "-",
              phone: c.phone || "",
              discountPercent: Number(c.discount_percent) || 0,
              tier: c.tier || "REGULAR"
            }));
            const combined = [...dbList];
            list.forEach((l: any) => {
              if (!combined.some((c: any) => c.id === l.id || (c.phone && c.phone === l.phone))) {
                combined.push(l);
              }
            });
            list = combined;
          }
        }
        setRegisteredCustomers(list);
      } catch (e) {
        console.error("Failed loading registered customers:", e);
      }
    };
    loadCustomers();
  }, [user]);

  // Handle selecting customer from dropdown
  const handleSelectRegisteredCustomer = (id: string) => {
    setSelectedCustomerId(id);
    if (!id) {
      setCustomerName("Pelanggan Umum");
      setCustomerPhone("");
      setCustomerTierDiscount(0);
      return;
    }
    const found = registeredCustomers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || "");
      setCustomerTierDiscount(found.discountPercent || 0);
    }
  };

  // Checkout & Payment State
  const [paymentType, setPaymentType] = useState<"LUNAS" | "DP">("LUNAS");
  const [dpInput, setDpInput] = useState<number>(0);
  const [paymentMethodsList, setPaymentMethodsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pos_payment_methods");
      if (saved) {
        return saved.split(",").map(s => s.trim()).filter(Boolean);
      }
    } catch(e) {}
    return ["Tunai", "QRIS", "Transfer Bank", "Debit / Kredit"];
  });
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethodsList[0] || "Tunai");
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [activeJobOrder, setActiveJobOrder] = useState<PrintingJobOrder | null>(null);

  // History & SPK Modal
  const [recentJobs, setRecentJobs] = useState<PrintingJobOrder[]>(() => {
    try {
      const saved = localStorage.getItem("pos_printing_jobs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedSpkJob, setSelectedSpkJob] = useState<PrintingJobOrder | null>(null);

  // Update default material when changing tab
  useEffect(() => {
    const firstOfTab = materialsList.find((m) => m.category === activeTab);
    if (firstOfTab) {
      setSelectedMaterial(firstOfTab);
      setSelectedFinishings([]);
    } else {
      setSelectedMaterial(null);
    }
  }, [activeTab, materialsList]);

  // Dynamic Area Calculation (m²)
  const calculatedAreaM2 = useMemo(() => {
    if (!selectedMaterial) return 1;
    if (!isMaterialDimensionBased(selectedMaterial)) return 1;
    const rawArea = (widthCm / 100) * (heightCm / 100);
    // Minimum 1 m² order size rounding for banner
    return Math.max(1, parseFloat(rawArea.toFixed(2)));
  }, [widthCm, heightCm, selectedMaterial]);

  // Dynamic Price Calculation
  const currentItemPricing = useMemo(() => {
    if (!selectedMaterial) return { baseTotal: 0, finishingTotal: 0, chosenDesignFee: 0, chosenDesignFeeName: "File Siap Cetak (Rp 0)", finalTotal: 0, chosenFinishingsObj: [] };

    let unitBase = selectedMaterial.pricePerUnit;
    let baseTotal = 0;

    if (isMaterialDimensionBased(selectedMaterial)) {
      baseTotal = calculatedAreaM2 * unitBase * quantity;
    } else {
      baseTotal = unitBase * quantity;
    }

    // Finishing Cost calculation
    let finishingTotal = 0;
    const chosenFinishingsObj: FinishingOption[] = [];

    selectedFinishings.forEach((fId) => {
      const fObj = finishingOptions.find((f) => f.id === fId);
      if (fObj) {
        chosenFinishingsObj.push(fObj);
        if (fObj.isPerM2 && isMaterialDimensionBased(selectedMaterial)) {
          finishingTotal += fObj.price * calculatedAreaM2 * quantity;
        } else {
          finishingTotal += fObj.price * quantity;
        }
      }
    });

    // Design Fee Calculation
    let chosenDesignFee = 0;
    let chosenDesignFeeName = "File Siap Cetak (Rp 0)";
    if (selectedDesignTierId === "CUSTOM") {
      chosenDesignFee = customDesignFee;
      chosenDesignFeeName = `Custom Kalkulator (+Rp ${customDesignFee.toLocaleString("id-ID")})`;
    } else {
      const tier = designTiers.find((t) => t.id === selectedDesignTierId);
      if (tier) {
        chosenDesignFee = tier.price;
        chosenDesignFeeName = `${tier.name} ${tier.price > 0 ? `(+Rp ${tier.price.toLocaleString("id-ID")})` : "(Gratis)"}`;
      }
    }

    const finalTotal = baseTotal + finishingTotal + chosenDesignFee;

    return {
      baseTotal,
      finishingTotal,
      chosenDesignFee,
      chosenDesignFeeName,
      finalTotal,
      chosenFinishingsObj,
    };
  }, [selectedMaterial, calculatedAreaM2, quantity, selectedFinishings, selectedDesignTierId, customDesignFee, designTiers]);

  // Add Item to Cart
  const handleAddToCart = () => {
    if (!selectedMaterial) return alert("Silakan pilih produk/bahan terlebih dahulu.");

    const title = jobTitle.trim() || `${selectedMaterial.name} ${isMaterialDimensionBased(selectedMaterial) ? `${widthCm}x${heightCm}cm` : "Unit"}`;

    const newItem: PrintingCartItem = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      category: selectedMaterial.category,
      jobTitle: title,
      material: selectedMaterial,
      widthCm: isMaterialDimensionBased(selectedMaterial) ? widthCm : 0,
      heightCm: isMaterialDimensionBased(selectedMaterial) ? heightCm : 0,
      areaM2: isMaterialDimensionBased(selectedMaterial) ? calculatedAreaM2 : 0,
      quantity,
      unitPrice: selectedMaterial.pricePerUnit,
      finishings: currentItemPricing.chosenFinishingsObj,
      finishingCost: currentItemPricing.finishingTotal,
      designFee: currentItemPricing.chosenDesignFee,
      designFeeName: currentItemPricing.chosenDesignFeeName,
      totalPrice: currentItemPricing.finalTotal,
      notes: jobNotes ? `${jobNotes} | Desain: ${currentItemPricing.chosenDesignFeeName}` : `Desain: ${currentItemPricing.chosenDesignFeeName}`,
      fileStatus,
      fileUrl,
    };

    setCart((prev) => [...prev, newItem]);

    // Reset Form Input
    setJobTitle("");
    setJobNotes("");
    setFileUrl("");
    setSelectedFinishings([]);
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Total Cart Amount Calculation
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    return Math.max(0, (cartSubtotal - discountAmount) * (taxRate / 100));
  }, [cartSubtotal, discountAmount, taxRate]);

  const cartTotalAmount = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount + taxAmount);
  }, [cartSubtotal, discountAmount, taxAmount]);

  // Toggle Finishing Checkbox
  const toggleFinishing = (fId: string) => {
    setSelectedFinishings((prev) =>
      prev.includes(fId) ? prev.filter((id) => id !== fId) : [...prev, fId]
    );
  };

  // Handle Checkout / Save Job Order
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsProcessingCheckout(true);

    try {
      const invSettings = getInvoiceSettings();
      const invNo = generateInvoiceCode(invSettings, recentJobs.length + 1, activeBranchName || "PUSAT");
      const dpVal = paymentType === "DP" ? Math.min(dpInput, cartTotalAmount) : cartTotalAmount;
      const remainingVal = Math.max(0, cartTotalAmount - dpVal);

      const newJobOrder: PrintingJobOrder = {
        id: `job_${Date.now()}`,
        invoiceNo: invNo,
        customerName: customerName || "Pelanggan Umum",
        customerPhone: customerPhone || "-",
        items: [...cart],
        subTotalAmount: cartSubtotal,
        discountAmount,
        taxRate,
        taxAmount,
        totalAmount: cartTotalAmount,
        dpAmount: dpVal,
        remainingAmount: remainingVal,
        paymentStatus: remainingVal === 0 ? "Lunas" : "DP (Kurang Bayar)",
        paymentMethod,
        jobStatus: "Antrean",
        cashierName: user?.name || "Staf Percetakan",
        branchId: activeBranchId || "main",
        branchName: activeBranchName || "Cabang Utama",
        createdAt: new Date().toISOString(),
      };

      // Save to state & localStorage
      const updatedJobs = [newJobOrder, ...recentJobs];
      setRecentJobs(updatedJobs);
      try {
        localStorage.setItem("pos_printing_jobs", JSON.stringify(updatedJobs));
      } catch (e) {
        console.error("Failed saving job order:", e);
      }

      // Synchronize customer stats & registration
      try {
        const savedCustStr = localStorage.getItem("pos_printing_customers");
        let currentCustList = savedCustStr ? JSON.parse(savedCustStr) : [];
        const existingIdx = currentCustList.findIndex(
          (c: any) => (selectedCustomerId && c.id === selectedCustomerId) || (c.phone && customerPhone && c.phone === customerPhone)
        );

        if (existingIdx >= 0) {
          currentCustList[existingIdx].totalSpkCount = (currentCustList[existingIdx].totalSpkCount || 0) + 1;
          currentCustList[existingIdx].totalSpent = (currentCustList[existingIdx].totalSpent || 0) + cartTotalAmount;
          currentCustList[existingIdx].unpaidDpBalance = (currentCustList[existingIdx].unpaidDpBalance || 0) + remainingVal;
        } else if (customerName && customerName !== "Pelanggan Umum") {
          const newCustObj = {
            id: `cust_${Date.now()}`,
            name: customerName,
            phone: customerPhone || "-",
            customerType: "INDIVIDUAL",
            tier: "REGULAR",
            discountPercent: 0,
            totalSpkCount: 1,
            totalSpent: cartTotalAmount,
            unpaidDpBalance: remainingVal,
            createdAt: new Date().toISOString()
          };
          currentCustList.push(newCustObj);
        }
        localStorage.setItem("pos_printing_customers", JSON.stringify(currentCustList));
        setRegisteredCustomers(currentCustList);

        // Sync to Supabase with increment instead of overwrite
        if (user) {
          if (customerName && customerName !== "Pelanggan Umum") {
            const { data: existingDbCust } = await supabase
              .from("customers")
              .select("*")
              .eq("tenant_id", user.id)
              .eq("phone", customerPhone || "-")
              .maybeSingle();

            if (existingDbCust) {
              await supabase
                .from("customers")
                .update({
                  total_spent: (Number(existingDbCust.total_spent) || 0) + cartTotalAmount,
                  total_spk_count: (Number(existingDbCust.total_spk_count) || 0) + 1
                })
                .eq("id", existingDbCust.id);
            } else {
              await supabase.from("customers").insert({
                tenant_id: user.id,
                name: customerName,
                phone: customerPhone || "-",
                total_spent: cartTotalAmount,
                total_spk_count: 1
              });
            }
          }

          // Supabase transaction insert
          await supabase.from("transactions").insert({
            tenant_id: user.id,
            invoice_no: invNo,
            customer_name: customerName || "Pelanggan Umum",
            customer_phone: customerPhone || "-",
            total_amount: cartTotalAmount,
            dp_amount: dpVal,
            remaining_amount: remainingVal,
            payment_status: remainingVal === 0 ? "Lunas" : "DP (Kurang Bayar)",
            payment_method: paymentMethod,
            job_status: "Antrean",
            items: {
              ...cart,
              tax_rate: taxRate,
              tax_amount: taxAmount,
              discount_amount: discountAmount,
              sub_total: cartSubtotal
            },
            cashier_name: user?.name || "Staf Percetakan",
            branch_id: activeBranchId || "main",
            branch_name: activeBranchName || "Cabang Utama"
          });
        }
      } catch (e) {
        console.error("Failed syncing customer on checkout:", e);
      }

      setActiveJobOrder(newJobOrder);
      setSelectedSpkJob(newJobOrder);
      setCart([]);
      setDpInput(0);
    } catch (e) {
      console.error("Checkout failed:", e);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Update Job Status (localStorage + Supabase cloud sync)
  const handleUpdateJobStatus = (jobId: string, newStatus: PrintingJobOrder["jobStatus"]) => {
    const updated = recentJobs.map((j) => (j.id === jobId ? { ...j, jobStatus: newStatus } : j));
    setRecentJobs(updated);
    try {
      localStorage.setItem("pos_printing_jobs", JSON.stringify(updated));
    } catch (e) {}

    // Sinkronisasi status ke Supabase
    if (user) {
      (async () => {
        try {
          await supabase
            .from("transactions")
            .update({ job_status: newStatus })
            .eq("id", jobId)
            .eq("tenant_id", user.id);
        } catch (err) {
          console.warn("Status sync to Supabase failed (saved locally):", err);
        }
      })();
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto md:overflow-hidden font-sans">
      {/* LEFT COLUMN: Printing Price Calculator & Material Selection (Compact Sleek Layout) */}
      <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 h-auto md:h-full p-2.5 md:p-3.5 space-y-2.5 overflow-visible md:overflow-y-auto">
        {/* Compact Header Title Banner */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 px-3 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-brand text-white grid place-items-center font-bold shadow-xs">
              <Printer className="size-4" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xs md:text-sm text-slate-900 dark:text-white tracking-tight">
                Kasir
              </h1>
              <p className="text-[10px] text-slate-500 font-mono hidden sm:block">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/app/sales" })}
                className="text-[10px] h-7 px-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 gap-1 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <FileText className="size-3 text-brand" /> SPK & Riwayat Cetak
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (recentJobs.length > 0 && recentJobs[0]) setSelectedSpkJob(recentJobs[0]);
                }}
                className="text-[10px] h-7 px-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 gap-1 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Eye className="size-3 text-brand" /> Antrean JO ({recentJobs.length})
              </Button>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat.code}
              onClick={() => setActiveTab(cat.code)}
              className={`py-1.5 px-2 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all rounded-none ${
                activeTab === cat.code
                  ? "bg-brand text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Compact Calculator Main Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-3 flex-1 flex flex-col justify-between">
          {/* Material Selector Grid */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="size-3.5 text-brand" /> Pilih Bahan / Media Cetak
            </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {materialsList.length === 0 ? (
                  <div className="col-span-full p-4 border border-dashed rounded-lg text-center text-slate-500">
                    Belum ada produk untuk kategori ini. <br/>
                    <span className="text-xs">Silakan tambahkan di menu Produk.</span>
                  </div>
                ) : (
                  materialsList.filter((m) => m.category === activeTab).map((mat) => {
                  const isSelected = selectedMaterial?.id === mat.id;
                  return (
                    <div
                    key={mat.id}
                    onClick={() => setSelectedMaterial(mat)}
                    className={`p-2 border cursor-pointer transition-all rounded-none relative ${
                      isSelected
                        ? "bg-brand/10 border-brand text-slate-900 dark:text-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 text-brand">
                        <CheckCircle2 className="size-3.5" />
                      </div>
                    )}
                    <h4 className="font-bold text-[11px] text-slate-900 dark:text-white pr-4 leading-tight">{mat.name}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{mat.description}</p>
                    <div className="mt-1 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-1">
                      <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500">Tarif</span>
                      <span className="font-mono text-[11px] font-bold text-brand">
                        Rp {mat.pricePerUnit.toLocaleString("id-ID")}/{mat.unitName}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>

          {/* Form Dimensions & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
            {/* Left Inputs: Dimensions & Qty */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Pesanan / Nama Pekerjaan
                </label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Misal: Spanduk Warung Makan (3x1m)"
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs h-8 rounded-none focus:border-brand"
                />
              </div>

              {/* Outdoor Dimensions Input */}
                {isMaterialDimensionBased(selectedMaterial) && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Dimensi Ukuran Cetak (Centimeter / cm)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Panjang (cm)</span>
                      <Input
                        type="number"
                        min={10}
                        value={widthCm}
                        onChange={(e) => setWidthCm(Math.max(1, Number(e.target.value)))}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold h-8 rounded-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Lebar (cm)</span>
                      <Input
                        type="number"
                        min={10}
                        value={heightCm}
                        onChange={(e) => setHeightCm(Math.max(1, Number(e.target.value)))}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold h-8 rounded-none focus:border-brand"
                      />
                    </div>
                  </div>

                  {/* Calculated Area Display */}
                  <div className="p-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between rounded-none">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Luas Dihitung:</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white text-xs">
                      {(widthCm / 100).toFixed(2)}m x {(heightCm / 100).toFixed(2)}m ={" "}
                      <strong className="text-brand">{calculatedAreaM2} m²</strong>
                    </span>
                  </div>
                </div>
                )}

              {/* Quantity Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Eksemplar / Pcs (Qty)
                </label>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-none h-8 w-8 text-xs"
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-center text-xs font-mono font-bold rounded-none h-8 focus:border-brand"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                    className="border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-none h-8 w-8 text-xs"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Inputs: Finishing & Operator Notes */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Pilihan Finishing Tambahan
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {finishingOptions.map((fin) => {
                    const isChecked = selectedFinishings.includes(fin.id);
                    return (
                      <label
                        key={fin.id}
                        onClick={() => toggleFinishing(fin.id)}
                        className={`p-1.5 border text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 rounded-none ${
                          isChecked
                            ? "bg-brand/20 border-brand text-brand"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <div
                          className={`size-3 border grid place-items-center shrink-0 ${
                            isChecked ? "bg-brand border-brand text-white" : "border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {isChecked && <Check className="size-2" />}
                        </div>
                        <span className="truncate">{fin.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tarif & Opsi Jasa Desain Grafis */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Tarif & Opsi Jasa Desain
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDesignCalcModalOpen(true)}
                    className="text-[10px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="size-3" /> Kalkulator Quick Quote
                  </button>
                </div>
                <select
                  value={selectedDesignTierId}
                  onChange={(e) => setSelectedDesignTierId(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 font-bold text-xs text-slate-800 dark:text-slate-200 rounded-none focus:border-brand"
                >
                  {designTiers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.price === 0 ? "(Gratis / Ready)" : `(+Rp ${t.price.toLocaleString("id-ID")})`}
                    </option>
                  ))}
                  <option value="CUSTOM">
                    Custom Fee Kalkulator {customDesignFee > 0 ? `(+Rp ${customDesignFee.toLocaleString("id-ID")})` : ""}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status File Desain & Link / File
                </label>
                <div className="grid grid-cols-3 gap-1 mb-1">
                  {(["Ready", "Perlu Desain", "Re-Desain"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFileStatus(st)}
                      className={`py-1 px-1 text-[9px] font-extrabold uppercase border rounded-none transition-all ${
                        fileStatus === st
                          ? "bg-brand border-brand text-white"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <Input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="Link Drive / File Gambar..."
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs h-7 rounded-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                  Catatan Khusus Operator Cetak
                </label>
                <Input
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  placeholder="Catatan pengerjaan..."
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs h-7 rounded-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          {/* Compact Pricing Summary Bar */}
          <div className="p-2.5 px-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 rounded-none">
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider block">
                Rincian Subtotal Item
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <span>
                  Bahan: <strong className="font-mono text-slate-900 dark:text-white">Rp {currentItemPricing.baseTotal.toLocaleString("id-ID")}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>
                  Finishing: <strong className="font-mono text-slate-900 dark:text-white">Rp {currentItemPricing.finishingTotal.toLocaleString("id-ID")}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase font-mono">Total Item</span>
                <span className="font-mono text-base font-extrabold text-brand">
                  Rp {currentItemPricing.finalTotal.toLocaleString("id-ID")}
                </span>
              </div>

              <Button
                onClick={handleAddToCart}
                className="bg-brand hover:bg-brand/90 text-white font-bold text-xs h-8 px-4 rounded-none shadow-xs gap-1.5"
              >
                <Plus className="size-3.5" /> Tambah
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Cart Order, DP Payment, Checkout & Job Status (Sleek Compact Width) */}
      <div className="w-full md:w-[350px] lg:w-[380px] xl:w-[400px] bg-white dark:bg-slate-950 flex flex-col h-auto md:h-full border-l border-slate-200 dark:border-slate-800 shrink-0 overflow-visible md:overflow-hidden">
        {/* Customer Header */}
        <div className="p-2.5 px-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShoppingBag className="size-3.5 text-brand" /> Keranjang Pesanan Cetak
            </h2>
            <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.2 font-bold font-mono">
              {cart.length} Item
            </span>
          </div>

          {/* Customer Selection & Sync */}
          <div className="space-y-1.5">
            {customerTierDiscount > 0 && (
              <div className="flex justify-end">
                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.2 border border-emerald-300 dark:border-emerald-800">
                  Diskon Member {customerTierDiscount}%
                </span>
              </div>
            )}

            <select
              value={selectedCustomerId}
              onChange={(e) => handleSelectRegisteredCustomer(e.target.value)}
              className="w-full h-7 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 font-semibold text-slate-900 dark:text-slate-100 rounded-none focus:outline-hidden focus:border-brand"
            >
              <option value="">-- Pelanggan Umum / Input Manual --</option>
              {registeredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName && c.companyName !== "-" ? `(${c.companyName})` : ""} - {c.phone || "No HP"}
                </option>
              ))}
            </select>

            {/* Input Nama Manual hanya tampil jika memilih Pelanggan Umum / Input Manual */}
            {!selectedCustomerId && (
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ketik Nama Pemesan (Manual)..."
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-none h-7 focus:border-brand font-medium"
              />
            )}
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800/80">
              <Printer className="size-8 mb-1.5 text-slate-400 dark:text-slate-700" />
              <p className="text-xs font-medium">Belum ada item pesanan.</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-600 mt-0.5">
                Gunakan kalkulator di sebelah kiri untuk menambah pesanan.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.id}
                className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none relative space-y-1.5 group"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <span className="text-[9px] font-bold text-brand uppercase font-mono block">
                      #{idx + 1} • {item.material.category}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">{item.jobTitle}</h4>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">
                      {item.material.name}{" "}
                      {item.category === "OUTDOOR_INDOOR" && `(${item.widthCm}x${item.heightCm}cm = ${item.areaM2}m²)`}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 p-0.5"
                    title="Hapus Item"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {item.finishings.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 pt-0.5">
                    {item.finishings.map((f) => (
                      <span
                        key={f.id}
                        className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 py-0.2 border border-slate-300 dark:border-slate-700"
                      >
                        + {f.name}
                      </span>
                    ))}
                  </div>
                )}

                {item.notes && (
                  <p className="text-[9px] text-amber-800 dark:text-amber-300 italic bg-amber-50 dark:bg-amber-950/40 p-1 border border-amber-200 dark:border-amber-900/40">
                    Catatan: {item.notes}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-1 font-mono text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.quantity} x Rp {item.totalPrice / item.quantity}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    Rp {item.totalPrice.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout & DP Payment Box */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 space-y-2">
          {/* Payment Type Toggle */}
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
              Skema Pembayaran
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentType("LUNAS")}
                className={`py-1 px-2 text-[11px] font-bold border rounded-none transition-all ${
                  paymentType === "LUNAS"
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-xs"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Bayar Lunas (100%)
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("DP")}
                className={`py-1 px-2 text-[11px] font-bold border rounded-none transition-all ${
                  paymentType === "DP"
                    ? "bg-amber-600 border-amber-500 text-white shadow-xs"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Uang Muka (DP)
              </button>
            </div>
          </div>

          {/* DP Input Amount */}
          {paymentType === "DP" && (
            <div className="p-2 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-bold">
                <span>Nominal DP (Uang Muka)</span>
                <span>Min 50%</span>
              </div>
              <Input
                type="number"
                value={dpInput}
                onChange={(e) => setDpInput(Number(e.target.value))}
                placeholder={`Contoh: Rp ${(cartTotalAmount / 2).toLocaleString("id-ID")}`}
                className="bg-white dark:bg-slate-950 border-amber-400 dark:border-amber-800/80 text-xs font-mono font-bold text-slate-900 dark:text-white h-7 rounded-none focus:border-amber-500"
              />
              <div className="flex justify-between text-[10px] text-amber-800 dark:text-amber-400 font-mono">
                <span>Sisa Pelunasan:</span>
                <strong>Rp {Math.max(0, cartTotalAmount - dpInput).toLocaleString("id-ID")}</strong>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-0.5">
              Metode Pembayaran
            </span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white p-1.5 rounded-none focus:outline-brand"
            >
              {paymentMethodsList.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {/* Discount Input */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Diskon (Rp):</span>
            <Input
              type="number"
              min={0}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value))}
              className="w-24 h-7 text-right text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-none focus:border-brand"
              placeholder="0"
            />
          </div>

          {/* Tax Display */}
          {taxRate > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Pajak PPN ({taxRate}%):</span>
              <span className="font-mono text-xs text-slate-900 dark:text-white">
                +Rp {taxAmount.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          {/* Total & Checkout Action */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Subtotal:</span>
              <span className="font-mono text-xs text-slate-900 dark:text-white">
                Rp {cartSubtotal.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between bg-brand/10 p-1">
              <span className="text-xs text-brand font-bold">Total Tagihan:</span>
              <span className="font-mono text-base font-extrabold text-brand">
                Rp {cartTotalAmount.toLocaleString("id-ID")}
              </span>
            </div>

            <Button
              disabled={cart.length === 0 || isProcessingCheckout}
              onClick={handleCheckout}
              className="w-full bg-brand hover:bg-brand/90 text-white font-bold text-xs py-2.5 rounded-none shadow-md transition-all"
            >
              {isProcessingCheckout
                ? "Memproses SPK..."
                : `Simpan SPK & Transaksi (${paymentType === "DP" ? "DP" : "Lunas"})`}
            </Button>
          </div>
        </div>
      </div>

      {/* SPK & RECEIPT MODAL DIALOG */}
      {selectedSpkJob && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl rounded-none">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileCheck className="size-5 text-brand" />
                <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white">
                  Surat Perintah Kerja (SPK) & Struk Job Order Percetakan
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
            <div id="printable-receipt" className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-200 font-sans bg-white">
              {/* Header SPK Dokumen */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                    SURAT PERINTAH KERJA (SPK) PERCETAKAN
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedSpkJob.branchName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
                    Kasir: {selectedSpkJob.cashierName} • Tgl:{" "}
                    {new Date(selectedSpkJob.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-brand block">
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
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase">Status Pengerjaan Mesin</span>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={selectedSpkJob.jobStatus}
                      onChange={(e) =>
                        handleUpdateJobStatus(
                          selectedSpkJob.id,
                          e.target.value as PrintingJobOrder["jobStatus"]
                        )
                      }
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-brand p-1 rounded-none"
                    >
                      <option value="Antrean">ðŸŸ¡ Antrean Mesin</option>
                      <option value="Proses Desain">ðŸ”µ Proses Desain</option>
                      <option value="Proses Cetak">ðŸŸ£ Proses Cetak</option>
                      <option value="Finishing">ðŸŸ  Finishing</option>
                      <option value="Siap Diambil">ðŸŸ¢ Siap Diambil</option>
                      <option value="Selesai">âšª Selesai (Diambil)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Specification Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Spesifikasi Pekerjaan Cetak (Operator)
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {selectedSpkJob.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>
                          #{idx + 1} {item.jobTitle}
                        </span>
                        <span className="font-mono">Rp {item.totalPrice.toLocaleString("id-ID")}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                        <div>
                          Bahan: <strong className="text-slate-800 dark:text-slate-200">{item.material.name}</strong>
                        </div>
                        <div>
                          Ukuran:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {item.category === "OUTDOOR_INDOOR"
                              ? `${item.widthCm} x ${item.heightCm} cm (${item.areaM2} m²)`
                              : "Standard Unit"}
                          </strong>
                        </div>
                        <div>
                          Qty: <strong className="text-slate-800 dark:text-slate-200">{item.quantity} Eksemplar</strong>
                        </div>
                        <div>
                          File Status:{" "}
                          <strong className="text-brand uppercase">{item.fileStatus}</strong>
                        </div>
                      </div>

                      {item.finishings.length > 0 && (
                        <div className="text-[11px] text-amber-800 dark:text-amber-300">
                          Finishing: {item.finishings.map((f) => f.name).join(", ")}
                        </div>
                      )}

                      {item.notes && (
                        <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 italic">
                          Catatan Operator: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                {selectedSpkJob.subTotalAmount !== undefined && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal Pekerjaan:</span>
                    <span>Rp {selectedSpkJob.subTotalAmount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {selectedSpkJob.discountAmount !== undefined && selectedSpkJob.discountAmount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Diskon:</span>
                    <span>- Rp {selectedSpkJob.discountAmount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {selectedSpkJob.taxAmount !== undefined && selectedSpkJob.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>PPN ({selectedSpkJob.taxRate}%):</span>
                    <span>+ Rp {selectedSpkJob.taxAmount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className={`flex justify-between ${selectedSpkJob.subTotalAmount !== undefined ? "font-bold text-slate-800 dark:text-slate-200 border-t border-slate-300 dark:border-slate-700 pt-1.5" : "text-slate-600 dark:text-slate-400"}`}>
                  <span>Total Tagihan:</span>
                  <span>Rp {selectedSpkJob.totalAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold mt-1">
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
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center no-print">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs gap-1.5 rounded-none"
              >
                <Printer className="size-4" /> Cetak SPK Operator / Struk
              </Button>

              <Button
                onClick={() => setSelectedSpkJob(null)}
                className="bg-brand text-white font-bold text-xs px-5 rounded-none"
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK DESIGN FEE CALCULATOR MODAL FOR POS */}
      <Dialog open={isDesignCalcModalOpen} onOpenChange={setIsDesignCalcModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-0 overflow-hidden font-sans">
          <DialogHeader className="p-3.5 bg-slate-900 text-white flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-amber-400" />
              <DialogTitle className="text-sm font-bold text-white tracking-tight">
                Kalkulator Quick Quote Biaya Desain
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-3.5 text-xs text-slate-800 dark:text-slate-200">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estimasi Durasi Pengerjaan Desain
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    value={posCalcHours}
                    onChange={(e) => setPosCalcHours(Number(e.target.value))}
                    className="h-8 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                  />
                  <span className="font-bold text-slate-500">Jam</span>
                </div>
                <div>
                  <select
                    value={posCalcMinutes}
                    onChange={(e) => setPosCalcMinutes(Number(e.target.value))}
                    className="w-full h-8 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 font-bold text-xs text-slate-800 dark:text-slate-200 rounded-none"
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
                Tingkat Kompleksitas Layout Desain
              </label>
              <select
                value={posCalcMult}
                onChange={(e) => setPosCalcMult(Number(e.target.value))}
                className="w-full h-8 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 font-bold text-xs text-slate-800 dark:text-slate-200 rounded-none"
              >
                <option value={1.0}>Simple (1.0x) - Edit Teks / Ringan</option>
                <option value={1.5}>Sedang (1.5x) - Layout Spanduk / Brosur Baru</option>
                <option value={2.0}>Rumit (2.0x) - Tracing Vektor & Logo Custom</option>
                <option value={2.5}>Sangat Rumit (2.5x) - Complete Branding</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tarif Desainer (Rp/jam)
                </label>
                <Input
                  type="number"
                  value={posCalcBaseRate}
                  onChange={(e) => setPosCalcBaseRate(Number(e.target.value))}
                  className="h-8 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Biaya Addon Revisi (Rp)
                </label>
                <Input
                  type="number"
                  value={posCalcAddon}
                  onChange={(e) => setPosCalcAddon(Number(e.target.value))}
                  className="h-8 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>
            </div>

            {/* Total Result Calculation Preview */}
            <div className="p-3 bg-slate-900 text-white border border-slate-800 space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Total Estimasi Biaya Desain:</span>
                <span className="font-mono">({posCalcHours + posCalcMinutes/60}j x {posCalcMult}x rate)</span>
              </div>
              <div className="text-right text-lg font-extrabold font-mono text-amber-400">
                Rp {Math.round(posCalcBaseRate * (posCalcHours + posCalcMinutes / 60) * posCalcMult + Number(posCalcAddon || 0)).toLocaleString("id-ID")}
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDesignCalcModalOpen(false)}
              className="h-8 text-xs border-slate-300 rounded-none"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const calculated = Math.round(posCalcBaseRate * (posCalcHours + posCalcMinutes / 60) * posCalcMult + Number(posCalcAddon || 0));
                setCustomDesignFee(calculated);
                setSelectedDesignTierId("CUSTOM");
                setIsDesignCalcModalOpen(false);
              }}
              className="h-8 text-xs bg-emerald-600 text-white font-bold hover:bg-emerald-700 rounded-none"
            >
              Gunakan Hasil Kalkulasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


