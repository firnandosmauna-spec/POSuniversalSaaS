import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, CreditCard, Banknote, Coffee, Utensils, Search, Loader2, Clock, Plus, Percent, AlertTriangle, Wallet, Printer, LayoutDashboard, Bluetooth, X, Pencil, Receipt, MoreHorizontal, ChevronRight, User, QrCode, ChevronLeft, Barcode, ScanLine, List, Truck, ShoppingBag, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";
import { getInvoiceSettings, generateInvoiceCode } from "@/shared/utils/invoiceGenerator";
import BarcodeScannerModal from "@/components/pos/BarcodeScannerModal";
import { Capacitor } from "@capacitor/core";

const EXPENSE_CATEGORIES = [
  "Bahan Baku & Bumbu",
  "Operasional & Peralatan",
  "Kebersihan & Sanitasi",
  "Listrik, Air, Gas & Internet",
  "Transportasi & Pengiriman",
  "Gaji & Bonus Staf",
  "Lain-lain"
];

type TableData = {
  id: string;
  name: string;
  status: string;
};

type CustomerData = {
  id: string;
  name: string;
  phone: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
  stock: number | null;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export default function FnbPOSView() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  
  // Fitur Transaksi Manual
  const [posMode, setPosMode] = useState<"katalog" | "manual">("katalog");
  const [manualPrice, setManualPrice] = useState<number>(0);
  const [manualNote, setManualNote] = useState<string>("");

  const [orderType, setOrderType] = useState<"dine_in" | "take_away" | "delivery">("take_away");
  const [isOrderTypeOpen, setIsOrderTypeOpen] = useState(false);
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [isTableDrawerOpen, setIsTableDrawerOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Fitur Pajak & Diskon
  const [taxRate, setTaxRate] = useState<number>(0);
  const [enableDineIn, setEnableDineIn] = useState<boolean>(true);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"nominal" | "percent">("nominal");
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [tempDiscount, setTempDiscount] = useState<number>(0);
  const [tempDiscountType, setTempDiscountType] = useState<"nominal" | "percent">("nominal");

  // Tax State
  const [isTaxOpen, setIsTaxOpen] = useState(false);
  const [tempTaxRate, setTempTaxRate] = useState<number>(0);

  // Fitur Struk / Receipt
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // Fitur Hold
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [activeHoldId, setActiveHoldId] = useState<string | null>(null);

  // Fitur Riwayat Transaksi (Kasir)
  const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] = useState(false);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Barcode Scanner Modal (Web)
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Search Bar Toggle
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Layout Toggle
  const [productLayout, setProductLayout] = useState<'grid' | 'list'>('grid');

  // Fitur Pelanggan
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);

  // Shift Kasir
  const [activeShift, setActiveShift] = useState<any>(null);

  // Belanja Toko (Kasir)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<string>("Bahan Baku & Bumbu");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("Kas Laci (Petty Cash)");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Kalkulasi
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discountAmount = discountType === "nominal" ? discount : (subtotal * discount) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;


  const fetchProducts = async () => {
    if (!user) return;
    setIsLoading(true);
    let loadedProducts: Product[] = [];

    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, category, stock, status")
        .eq("tenant_id", user.id)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (!error && data && data.length > 0) {
        loadedProducts = data as Product[];
        localStorage.setItem(`pos_tenant_${user.id}_products`, JSON.stringify(data));
      } else {
        const saved = localStorage.getItem(`pos_tenant_${user.id}_products`);
        if (saved) {
          const list = JSON.parse(saved);
          loadedProducts = list.filter((p: any) => p.status === "active" || !p.status);
        }
      }
    } catch (error) {
      console.warn("Error fetching products from Supabase (loading local tenant products):", error);
      const saved = localStorage.getItem(`pos_tenant_${user.id}_products`);
      if (saved) {
        const list = JSON.parse(saved);
        loadedProducts = list.filter((p: any) => p.status === "active" || !p.status);
      }
    } finally {
      setProducts(loadedProducts);
      setIsLoading(false);
    }
  };

  const fetchTables = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("tables")
        .select("*")
        .eq("status", "available")
        .order("name");
      setTables(data || []);
    } catch (error) {
      console.error("Error fetching tables:", error);
    }
  };

  const fetchSettings = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("store_settings").select("tax_rate, enable_dine_in").eq("tenant_id", user.id).maybeSingle();
      if (data) {
        setTaxRate(data.tax_rate);
        if (data.enable_dine_in !== undefined) setEnableDineIn(data.enable_dine_in);
      }
    } catch (error) {}
  };

  const fetchHeldOrders = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("transactions").select("*, tables(name)").eq("tenant_id", user.id).eq("status", "hold").order("created_at", { ascending: false });
      setHeldOrders(data || []);
    } catch (error) {}
  };

  const fetchCustomers = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("customers").select("id, name, phone").eq("tenant_id", user.id).order("name");
      setCustomers(data || []);
    } catch (error) {}
  };

  const fetchActiveShift = async () => {
    if (!user) return;
    let foundShift: any = null;
    try {
      const { data, error } = await supabase.from("cashier_shifts").select("*").eq("tenant_id", user.id).eq("status", "open").maybeSingle();
      if (!error && data) {
        foundShift = data;
      }
    } catch (error) {}

    if (!foundShift) {
      try {
        const saved = localStorage.getItem(`pos_tenant_${user.id}_shifts`);
        if (saved) {
          const list = JSON.parse(saved);
          foundShift = list.find((s: any) => s.status === "open") || null;
        }
      } catch (e) {}
    }

    setActiveShift(foundShift);
  };

  const fetchHistoryTransactions = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          cashier_shifts(cashier_name),
          customers(name),
          tables(name),
          transaction_items(*)
        `)
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50); // Get last 50 transactions for Kasir view
        
      let fetchedTransactions = data || [];

      // Merge with localStorage transactions (offline/fallback POS transactions)
      try {
        const saved = localStorage.getItem(`pos_transactions_${user.id}`);
        if (saved) {
          const localTrx = JSON.parse(saved);
          const existingIds = new Set(fetchedTransactions.map((o: any) => o.id));
          const newLocalTrx = localTrx.filter((lt: any) => !existingIds.has(lt.id));
          fetchedTransactions = [...newLocalTrx, ...fetchedTransactions];
          fetchedTransactions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (e) {
        console.error("Failed to merge local transactions", e);
      }

      setHistoryTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTables();
    fetchSettings();
    fetchHeldOrders();
    fetchCustomers();
    fetchActiveShift();
  }, [user]);

  useEffect(() => {
    if (!enableDineIn && orderType === "dine_in") {
      setOrderType("take_away");
    }
  }, [enableDineIn, orderType]);

  const resumeOrder = async (order: any) => {
    try {
      const { data: items } = await supabase.from("transaction_items").select("*").eq("transaction_id", order.id);
      if (items) {
        setCart(items.map((i: any) => ({ id: i.product_id, name: i.product_name, price: i.price, qty: i.qty })));
      }
      setOrderType(order.order_type);
      setSelectedTable(order.table_id || "");
      setSelectedCustomerId(order.customer_id || "");
      setDiscountType("nominal");
      setDiscount(order.discount_amount);
      
      setActiveHoldId(order.id);
      
      // Update local state immediately
      setHeldOrders(prev => prev.filter(o => o.id !== order.id));
      
      setIsHeldOrdersOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim() !== '') {
      handleBarcodeScan(search.trim());
    }
  };

  const handleBarcodeScan = (scannedText: string) => {
    const scannedCode = scannedText.trim().toLowerCase();
    const exactMatch = products.find(
      p => ((p as any).sku && (p as any).sku.toLowerCase() === scannedCode) || p.name.toLowerCase() === scannedCode
    );
    
    if (exactMatch) {
      addToCart(exactMatch);
      setSearch(''); // Clear search input
    } else {
      toast.error(`Produk dengan barcode ${scannedText} tidak ditemukan.`);
    }
  };

  const handleScanClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Buka modal kamera HTML5 langsung agar bisa langsung dites
    setIsScannerOpen(true);
  };

  const addToCart = (product: Product | any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const handleAddManualToCart = () => {
    if (manualPrice <= 0) return;
    const manualProduct = {
      id: `manual_${Date.now()}`,
      name: manualNote || "Item Manual",
      price: manualPrice,
      stock: null,
      category: "Manual",
      image_url: null,
      status: "active",
      target_station: "kasir"
    };
    addToCart(manualProduct);
    setManualPrice(0);
    setManualNote("");
    toast.success("Item manual ditambahkan");
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setActiveHoldId(null);
  };

  const handleCheckout = () => {
    const isKasir = user?.role?.toLowerCase().includes("kasir");
    if (isKasir && !activeShift) {
      alert("Silakan buka shift kasir terlebih dahulu sebelum melakukan transaksi!");
      return;
    }
    if (cart.length === 0) return;
    if (orderType === "dine_in" && !selectedTable) {
      alert("Pilih meja terlebih dahulu untuk Dine In!");
      return;
    }
    setPaymentMethod("cash");
    setAmountReceived(total);
    setIsPaymentOpen(true);
  };

  const confirmPayment = async (method: string, receivedAmount: number = 0) => {
    if (!user || cart.length === 0) return;
    setIsCheckingOut(true);

    const isHold = method === "hold";

    try {
      const invSettings = getInvoiceSettings();
      const generatedInvoiceCode = generateInvoiceCode(invSettings, Math.floor(Date.now() / 1000) % 10000, "PUSAT");

      let transaction: any = null;

      // 1. Simpan Transaksi Induk (resilient to missing invoice_code column or DB schema difference)
      try {
        if (activeHoldId) {
          const { data, error: updateError } = await supabase
            .from("transactions")
            .update({
              shift_id: activeShift ? activeShift.id : null,
              order_type: orderType,
              table_id: orderType === "dine_in" && selectedTable !== "no_table" ? selectedTable : null,
              customer_id: selectedCustomerId || null,
              total_amount: total,
              discount_amount: discountAmount,
              tax_amount: taxAmount,
              payment_method: isHold ? "none" : method,
              status: isHold ? "hold" : "completed"
            })
            .eq("id", activeHoldId)
            .select()
            .single();
          if (!updateError) transaction = data;
        }

        if (!transaction) {
          const { data, error: trxError } = await supabase
            .from("transactions")
            .insert({
              tenant_id: user.id,
              shift_id: activeShift ? activeShift.id : null,
              order_type: orderType,
              table_id: orderType === "dine_in" && selectedTable !== "no_table" ? selectedTable : null,
              customer_id: selectedCustomerId || null,
              total_amount: total,
              discount_amount: discountAmount,
              tax_amount: taxAmount,
              payment_method: isHold ? "none" : method,
              status: isHold ? "hold" : "completed",
              invoice_code: generatedInvoiceCode
            })
            .select()
            .single();

          if (trxError) {
            // If invoice_code column doesn't exist in Supabase DB schema, retry without invoice_code
            if (trxError.message?.includes("invoice_code") || trxError.code === "PGRST204" || trxError.message?.toLowerCase().includes("column")) {
              const { data: retryData } = await supabase
                .from("transactions")
                .insert({
                  tenant_id: user.id,
                  shift_id: activeShift ? activeShift.id : null,
                order_type: orderType,
                table_id: orderType === "dine_in" && selectedTable !== "no_table" ? selectedTable : null,
                customer_id: selectedCustomerId || null,
                total_amount: total,
                discount_amount: discountAmount,
                tax_amount: taxAmount,
                payment_method: isHold ? "none" : method,
                status: isHold ? "hold" : "completed"
              })
              .select()
              .single();
            transaction = retryData;
          }
        } else {
          transaction = data;
        }
      } catch (e) {
        console.error("Supabase transaction insert fallback:", e);
      }

      // Fallback local transaction object if DB table missing or offline
      if (!transaction) {
        transaction = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
          created_at: new Date().toISOString(),
          tenant_id: user.id,
          total_amount: total,
          order_type: orderType,
          table_id: orderType === "dine_in" && selectedTable !== "no_table" ? selectedTable : null,
          customer_id: selectedCustomerId || null,
          payment_method: isHold ? "none" : method,
          status: isHold ? "hold" : "completed",
          kitchen_status: "pending"
        };
      }
      
      // 2. Simpan Detail Produk (Items)
      try {
        if (activeHoldId && transaction) {
          await supabase.from("transaction_items").delete().eq("transaction_id", transaction.id);
        }

        const itemsToInsert = cart.map(item => ({
          tenant_id: user.id,
          transaction_id: transaction.id,
          product_id: item.id,
          product_name: item.name,
          price: item.price,
          qty: item.qty
        }));
        
        await supabase.from("transaction_items").insert(itemsToInsert);
      } catch (e) {}

      // 2.5 Save to localStorage for offline/KDS fallback
      try {
        const localTrx = {
          ...transaction,
          transaction_items: cart.map(item => ({
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            transaction_id: transaction.id,
            product_id: item.id,
            product_name: item.name,
            price: item.price,
            qty: item.qty
          }))
        };
        const lsKey = `pos_transactions_${user.id}`;
        const saved = localStorage.getItem(lsKey);
        const currentTrx = saved ? JSON.parse(saved) : [];
        localStorage.setItem(lsKey, JSON.stringify([localTrx, ...currentTrx].slice(0, 50)));
      } catch (e) {}
      
      // 3. Update Status Meja
      if (orderType === "dine_in" && selectedTable && selectedTable !== "no_table" && !isHold) {
        await supabase.from("tables").update({ status: "occupied" }).eq("id", selectedTable);
      }
      
      // 4. Update Stok Produk (Kurangi stok untuk item yang melacak stok)
      if (!isHold) {
        for (const item of cart) {
          if (item.id.startsWith("manual_")) continue; // Skip manual items
          const product = products.find(p => p.id === item.id);
          if (product && product.stock !== null && product.stock !== -1) {
            const newStock = Math.max(0, product.stock - item.qty);
            
            // Update Supabase
            try {
              await supabase.from("products").update({ stock: newStock }).eq("id", product.id);
            } catch (err) {
              console.warn("Stock update error:", err);
            }
            
            // Simpan ke Riwayat Stok (Lokal)
            try {
              const historyEntry = {
                tenant_id: user.id,
                product_id: product.id,
                product_name: product.name,
                previous_stock: product.stock,
                new_stock: newStock,
                adjustment_type: "reduce",
                adjustment_amount: item.qty,
                notes: `Terjual via POS (Kasir: ${activeShift ? activeShift.cashier_name : user.name})`,
                created_at: new Date().toISOString()
              };
              const lsKey = `pos_stock_history_${user.id}_${product.id}`;
              const saved = localStorage.getItem(lsKey);
              const historyList = saved ? JSON.parse(saved) : [];
              localStorage.setItem(lsKey, JSON.stringify([historyEntry, ...historyList].slice(0, 50)));
            } catch (e) {}

            // Update Local State in memory
            product.stock = newStock;
          }
        }
        
        // Refresh local storage product cache
        const tenantProductKey = user ? `pos_tenant_${user.id}_products` : "pos_tenant_demo_products";
        localStorage.setItem(tenantProductKey, JSON.stringify(products));
        setProducts([...products]); // Trigger re-render so UI shows updated stock
      }
      
      if (isHold) {
        alert("Pesanan berhasil di-Hold.");
        clearCart();
        setDiscount(0);
        setOrderType("take_away");
        setSelectedTable("");
        setSelectedCustomerId("");
        fetchTables();
      } else {
        const receiptData = {
          transaction_id: transaction.id,
          invoice_code: transaction.invoice_code || generatedInvoiceCode,
          created_at: transaction.created_at || new Date().toISOString(),
          cashier: activeShift ? activeShift.cashier_name : user.name,
          customer_name: customers.find(c => c.id === selectedCustomerId)?.name || "Umum",
          order_type: orderType,
          table_name: selectedTable === "no_table" ? "Tanpa Meja" : (tables.find(t => t.id === selectedTable)?.name || "-"),
          items: [...cart],
          subtotal: subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total: total,
          payment_method: method,
          amount_received: method === "cash" ? receivedAmount : total,
          change_amount: method === "cash" ? receivedAmount - total : 0
        };
        setLastReceipt(receiptData);
        setIsPaymentOpen(false);
        setIsReceiptOpen(true);
      }
      
    } catch (error: any) {
      console.error("Error checkout:", error);
      alert("Gagal melakukan pembayaran: " + error.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === "Semua" || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const uniqueCategories = ["Semua", ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))];

  const handleApplyDiscount = () => {
    setDiscount(tempDiscount);
    setDiscountType(tempDiscountType);
    setIsDiscountOpen(false);
  };

  const handleApplyTax = () => {
    setTaxRate(tempTaxRate);
    setIsTaxOpen(false);
  };

  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
    clearCart();
    setDiscount(0);
    setOrderType("take_away");
    setSelectedTable("");
    setSelectedCustomerId("");
    fetchTables();
    setLastReceipt(null);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !expenseTitle.trim() || !expenseAmount) return;

    setIsSubmittingExpense(true);
    const numAmount = parseFloat(expenseAmount) || 0;
    const staffName = activeShift?.cashier_name || user.name || "Kasir";

    const newItem = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      title: expenseTitle.trim(),
      category: expenseCategory,
      amount: numAmount,
      payment_method: expensePaymentMethod,
      staff_name: staffName,
      notes: expenseNotes.trim()
    };

    try {
      await supabase.from("store_expenses").insert([{
        tenant_id: user.id,
        title: newItem.title,
        category: newItem.category,
        amount: newItem.amount,
        payment_method: newItem.payment_method,
        staff_name: newItem.staff_name,
        notes: newItem.notes
      }]);

      const saved = localStorage.getItem("pos_store_expenses");
      const currentItems = saved ? JSON.parse(saved) : [];
      localStorage.setItem("pos_store_expenses", JSON.stringify([newItem, ...currentItems]));

      alert("Pencatatan belanja toko berhasil disimpan!");
      setIsExpenseModalOpen(false);
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseNotes("");
    } catch (err: any) {
      console.error("Error save expense:", err);
      const saved = localStorage.getItem("pos_store_expenses");
      const currentItems = saved ? JSON.parse(saved) : [];
      localStorage.setItem("pos_store_expenses", JSON.stringify([newItem, ...currentItems]));

      alert("Pencatatan belanja toko berhasil disimpan!");
      setIsExpenseModalOpen(false);
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseNotes("");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  return (
    <div className="flex flex-col landscape:flex-row md:flex-row h-full w-full gap-2 md:gap-4 overflow-y-auto landscape:overflow-hidden md:overflow-hidden p-2 md:p-4 pb-32 md:pb-4 relative bg-slate-50 md:bg-transparent">
      {/* Sticky Bottom Bar Cart (Mobile Only) - Separated Frames */}
      {!isMobileCartOpen && (
        <div className="md:hidden fixed bottom-[84px] left-3 right-3 grid grid-cols-3 gap-2.5 z-40 mb-safe transition-all pointer-events-none items-stretch">
          {/* Frame 1: Total */}
          <div className="col-span-2 w-full bg-white/95 backdrop-blur-md border border-slate-200 py-1.5 px-3 flex flex-col justify-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl pointer-events-auto overflow-hidden">
            <span className="text-[10px] text-slate-500 font-medium leading-none mb-0.5">Total Pesanan</span>
            <span className="font-extrabold text-slate-800 text-sm leading-tight truncate">{formatRupiah(subtotal)}</span>
          </div>
          
          {/* Frame 2: Lihat Pesanan Button */}
          <button 
            onClick={() => setIsMobileCartOpen(true)}
            className="col-span-1 w-full bg-[#0b172a] hover:bg-slate-800 active:scale-95 transition-transform text-white rounded-2xl px-2 py-2 flex items-center justify-center gap-1.5 font-bold text-xs shadow-[0_8px_30px_rgba(0,0,0,0.12)] pointer-events-auto border border-slate-800 overflow-hidden"
          >
            <div className="bg-white text-slate-900 font-black rounded-lg min-w-[20px] h-5 px-1 flex items-center justify-center text-[11px] leading-none shadow-sm shrink-0">
              {cart.reduce((s, i) => s + i.qty, 0)}
            </div>
            <span className="truncate">Pesanan</span>
          </button>
        </div>
      )}

      {/* KIRI: Daftar Produk */}
      <div className="flex-1 relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden landscape:h-full md:h-full min-h-[350px]">
        
        {user?.role?.toLowerCase().includes("kasir") && !activeShift && !isLoading && (
          <div className="bg-rose-50 border-b border-rose-100 p-3 flex items-center justify-between text-rose-700 shrink-0 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Shift Kasir Belum Dibuka!</span>
            </div>
            <Link to="/app/shifts" className="font-bold bg-rose-600 text-white px-3 py-1.5 rounded-xl shadow-sm hover:bg-rose-700 transition-colors shrink-0">
              Buka Shift
            </Link>
          </div>
        )}



        {/* Hidden input for barcode scanner */}
        <input
          id="pos-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="absolute -top-96 opacity-0"
          autoComplete="off"
        />
        
        {/* Segmented Control & Kategori (Mobile Only & Desktop) */}
        <div className="flex flex-col shrink-0 bg-white z-10 border-b border-slate-100">
          <div className="px-2 pt-2 pb-1 flex gap-2">
            <div className="flex flex-1 bg-slate-100/80 p-1.5 rounded-full items-center">
              <button 
                onClick={() => setPosMode('katalog')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-extrabold rounded-full transition-all ${posMode === 'katalog' ? 'bg-[#0b172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
              >
                <LayoutDashboard className="size-4 shrink-0" /> <span>Katalog</span>
              </button>
              <button 
                onClick={() => setPosMode('manual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-extrabold rounded-full transition-all ${posMode === 'manual' ? 'bg-[#0b172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
              >
                <Pencil className="size-4 shrink-0" /> <span>Manual</span>
              </button>

              <button 
                onClick={() => setIsMobileCartOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-extrabold rounded-full text-slate-500 hover:text-slate-700 transition-all md:hidden"
              >
                <Receipt className="size-4 shrink-0" /> <span>Pesanan</span>
              </button>
            </div>
            {heldOrders.length > 0 && (
              <button 
                onClick={() => setIsHeldOrdersOpen(true)}
                className="bg-amber-100 hover:bg-amber-200 transition-colors text-amber-600 rounded-full flex items-center justify-center shrink-0 w-[44px] h-[44px] relative shadow-sm border border-amber-200"
              >
                <Clock className="size-5" />
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                  {heldOrders.length}
                </span>
              </button>
            )}
          </div>
          
          {posMode === 'katalog' && (
            <div className="px-3 md:px-4 py-2 flex items-center justify-between min-h-[48px] border-t border-slate-100/50 bg-slate-50/30">
              {isSearchVisible ? (
                <div className="flex-1 flex items-center gap-2 w-full animate-in fade-in slide-in-from-right-4 duration-200">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      id="pos-visible-search"
                      autoFocus
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari nama produk..."
                      className="w-full bg-slate-100 border-none rounded-lg pl-9 pr-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-[#0b172a] focus:bg-white transition-all shadow-inner"
                      autoComplete="off"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setIsSearchVisible(false);
                      setSearch('');
                    }}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <select 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="appearance-none bg-transparent pr-8 py-1.5 text-sm font-extrabold text-slate-700 focus:outline-none focus:ring-0 cursor-pointer"
                    >
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat === "Semua" ? "Semua Produk" : cat}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <button 
                      onClick={() => setIsSearchVisible(true)}
                      className="hover:text-slate-800 transition-colors p-2 rounded-lg hover:bg-slate-200 active:scale-95"
                      title="Cari Produk"
                    >
                      <Search className="size-5" strokeWidth={2.5} />
                    </button>
                    <button 
                      type="button"
                      onClick={handleScanClick}
                      className="hover:text-slate-800 transition-colors p-2 relative z-50 bg-slate-200 shadow-sm rounded-lg active:scale-95 cursor-pointer"
                      title="Scan Barcode"
                    >
                      <ScanLine className="size-5 pointer-events-none" strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={() => setProductLayout(prev => prev === 'grid' ? 'list' : 'grid')}
                      className="hover:text-slate-800 transition-colors p-2 rounded-lg hover:bg-slate-200 active:scale-95 cursor-pointer"
                      title={productLayout === 'grid' ? "Tampilan List" : "Tampilan Grid"}
                    >
                      {productLayout === 'grid' ? (
                        <LayoutDashboard className="size-5" strokeWidth={2.5} />
                      ) : (
                        <List className="size-5" strokeWidth={2.5} />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 md:p-4 min-h-0 flex flex-col">
          {posMode === 'manual' ? (
            <div className="h-full flex flex-col items-center pt-8 md:pt-16 pb-4 max-w-sm mx-auto w-full">
              <span className="text-xs font-medium text-slate-500 mb-2">Harga Satuan</span>
              <span className={`text-4xl font-extrabold mb-2 ${manualPrice > 0 ? "text-slate-800" : "text-slate-300"}`}>
                {manualPrice > 0 ? formatRupiah(manualPrice) : "Rp 0"}
              </span>
              
              {manualNote ? (
                <div className="flex items-center gap-2 mb-auto mt-2">
                  <span className="text-[11px] font-bold text-[#0b172a] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">{manualNote}</span>
                  <button onClick={() => setManualNote("")} className="text-red-500 p-1 hover:bg-red-50 rounded-full transition-colors"><X className="size-3.5" /></button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    const note = prompt("Masukkan keterangan manual:");
                    if (note) setManualNote(note);
                  }}
                  className="text-blue-500 font-bold text-xs mb-auto flex items-center gap-1 hover:underline mt-2"
                >
                  <Plus className="size-3.5" /> Tambah Keterangan
                </button>
              )}

              <div className="w-full mt-8 flex-1 flex flex-col justify-end">
                <div className="grid grid-cols-4 gap-0 border-t border-l border-slate-100 bg-white">
                  {/* Row 1 */}
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '1'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">1</button>
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '2'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">2</button>
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '3'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">3</button>
                  <button onClick={() => setManualPrice(p => Math.floor(p / 10))} className="h-14 flex items-center justify-center border-b border-r border-slate-100 text-slate-400 hover:bg-slate-50 active:bg-slate-100 transition-colors"><span className="border border-slate-300 rounded px-2 text-sm font-bold pb-0.5">⌫</span></button>
                  
                  {/* Row 2 */}
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '4'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">4</button>
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '5'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">5</button>
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '6'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">6</button>
                  <button onClick={handleAddManualToCart} className="h-14 flex items-center justify-center row-span-3 bg-slate-200/50 hover:bg-slate-200 active:bg-slate-300 transition-colors text-white font-bold text-2xl border-r border-b border-slate-100" disabled={manualPrice <= 0}>
                    <div className="bg-slate-300 w-full h-full flex items-center justify-center text-white text-3xl">
                      +
                    </div>
                  </button>

                  {/* Row 3 */}
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '7'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">7</button>
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '8'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">8</button>
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '9'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">9</button>

                  {/* Row 4 */}
                  <button onClick={() => setManualPrice(0)} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">C</button>
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '0'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">0</button>
                  <button onClick={() => setManualPrice(p => Number(p.toString() + '000'))} className="h-14 font-bold text-lg text-[#0b172a] border-b border-r border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">000</button>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[150px]">
              <Loader2 className="size-7 animate-spin mb-2 text-[#0b172a]" />
              <p className="text-xs">Memuat daftar menu...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[200px] p-6 text-center space-y-3">
              <Utensils className="size-12 mb-1 opacity-20 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Menu / Produk</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Anda belum menambahkan produk untuk toko ini. Silakan tambahkan produk baru di Manajemen Produk.
                </p>
              </div>
              <Link to="/app/products">
                <Button size="sm" className="bg-[#0b172a] text-white hover:bg-slate-800 font-extrabold text-xs h-9 px-4 rounded-xl shadow-sm gap-1.5 mt-1 transition-all">
                  <Plus className="size-4" /> Tambah Produk Baru
                </Button>
              </Link>
            </div>
          ) : (
            <div className={productLayout === 'grid' ? "grid grid-cols-3 gap-x-2 gap-y-3" : "flex flex-col gap-2.5"}>
              {filteredProducts.map((product) => {
                const cartItem = cart.find(i => i.id === product.id);
                const qty = cartItem ? cartItem.qty : 0;
                
                return productLayout === 'grid' ? (
                  <div key={product.id} className="flex flex-col items-center">
                    <div className="relative w-full aspect-square mb-3 rounded-xl bg-slate-200">
                      <button
                        onClick={() => qty === 0 ? addToCart(product) : null}
                        disabled={product.stock === 0}
                        className={`absolute inset-0 w-full h-full rounded-xl overflow-hidden transition-all ${product.stock === 0 ? "opacity-50 cursor-not-allowed" : "active:scale-95"}`}
                      >
                        {product.stock === 0 && (
                          <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                            <span className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm transform -rotate-12">
                              HABIS
                            </span>
                          </div>
                        )}
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <span className="font-extrabold text-2xl text-slate-400 opacity-60">
                              {product.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </button>
  
                      {/* Floating Quantity Adjuster */}
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 z-20 w-[85%]">
                        {qty > 0 && (
                          <div className="flex items-center justify-between bg-white rounded-full px-1.5 py-1 shadow-md border border-slate-200">
                            <button onClick={() => updateQty(product.id, -1)} className="text-slate-800 font-bold px-1.5 text-sm active:scale-90">-</button>
                            <span className="font-bold text-slate-900 text-xs leading-none mt-0.5">{qty}</span>
                            <button onClick={() => addToCart(product)} className="text-slate-800 font-bold px-1.5 text-sm active:scale-90">+</button>
                          </div>
                        )}
                      </div>
                    </div>
  
                    <div className="w-full text-left pl-0.5 mt-1">
                      <p className="font-medium text-xs text-slate-700 leading-tight mb-0.5 line-clamp-2">{product.name.toLowerCase()}</p>
                      <p className="font-semibold text-[11px] text-slate-400 leading-none">Stok: {product.stock === null || product.stock === -1 ? '∞' : product.stock}</p>
                      <p className="font-bold text-sm text-slate-800 mt-0.5">{formatRupiah(product.price)}</p>
                    </div>
                  </div>
                ) : (
                  <div key={product.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2.5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition-all">
                    {/* Image */}
                    <button 
                      onClick={() => qty === 0 ? addToCart(product) : null}
                      disabled={product.stock === 0}
                      className={`relative w-16 h-16 shrink-0 rounded-lg bg-slate-100 overflow-hidden ${product.stock === 0 ? "opacity-50 cursor-not-allowed" : "active:scale-95 cursor-pointer"}`}
                    >
                      {product.stock === 0 && (
                        <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                          <span className="bg-red-500 text-white font-bold text-[8px] px-1 py-0.5 rounded shadow-sm transform -rotate-12">
                            HABIS
                          </span>
                        </div>
                      )}
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <span className="font-extrabold text-sm text-slate-400 opacity-60">
                            {product.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </button>
                    
                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5" onClick={() => qty === 0 && product.stock !== 0 ? addToCart(product) : null}>
                      <p className="font-bold text-xs text-slate-700 truncate mb-0.5 leading-tight cursor-pointer">{product.name}</p>
                      <p className="font-medium text-[10px] text-slate-400 mb-1 leading-none">Stok: {product.stock === null || product.stock === -1 ? '∞' : product.stock}</p>
                      <p className="font-extrabold text-sm text-slate-800 leading-none">{formatRupiah(product.price)}</p>
                    </div>
                    
                    {/* Controls */}
                    <div className="shrink-0 flex items-center pr-1">
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1 border border-slate-200">
                          <button onClick={() => updateQty(product.id, -1)} className="bg-white rounded-md shadow-sm text-slate-800 font-bold h-7 w-7 flex items-center justify-center active:scale-90 transition-transform">-</button>
                          <span className="font-bold text-slate-900 text-xs w-4 text-center">{qty}</span>
                          <button onClick={() => addToCart(product)} className="bg-[#0b172a] rounded-md shadow-sm text-white font-bold h-7 w-7 flex items-center justify-center active:scale-90 transition-transform">+</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0}
                          className={`bg-[#0b172a] text-white p-2 rounded-xl font-bold shadow-sm hover:bg-slate-800 active:scale-95 transition-all ${product.stock === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <Plus className="size-4" strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FAB (Floating Action Button) Tambah Produk di Kasir */}
        <Link to="/app/products">
          <Button 
            className="absolute bottom-6 right-6 z-40 bg-[#0b172a] text-white hover:bg-slate-800 rounded-full md:rounded-2xl h-14 w-14 md:w-auto md:px-6 font-bold flex items-center justify-center gap-2 shadow-xl shadow-[#0b172a]/30 transition-transform active:scale-95"
          >
            <Plus className="size-6 md:size-5" />
            <span className="hidden md:inline text-sm">Buat Produk</span>
          </Button>
        </Link>
      </div>

      {/* KANAN: Keranjang */}
      {isMobileCartOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 z-30 backdrop-blur-sm"
          onClick={() => setIsMobileCartOpen(false)}
        />
      )}
      
      <div className={`${isMobileCartOpen ? 'fixed inset-0 z-40 shadow-2xl flex' : 'hidden md:flex'} md:static w-full landscape:w-72 sm:landscape:w-80 md:w-96 flex-col rounded-none md:rounded-xl bg-white md:shadow-sm border-0 md:border md:border-slate-200 overflow-hidden shrink-0 h-[100dvh] md:h-full max-h-full min-h-0`}>
        <div className="p-4 md:p-3 landscape:p-2 flex justify-between items-center shrink-0 border-b border-slate-100 md:border-0 pt-safe">
          <button 
            onClick={() => setIsMobileCartOpen(false)} 
            className="md:hidden text-slate-500 hover:text-slate-800 p-2 -ml-2"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center justify-center flex-1 font-display font-bold text-slate-800 text-[15px] md:text-sm md:justify-start gap-2">
            Pesanan
            {heldOrders.length > 0 && (
              <button 
                onClick={() => setIsHeldOrdersOpen(true)}
                className="bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-[10px] md:text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 active:scale-95"
              >
                <Clock className="size-3" /> {heldOrders.length} Tertunda
              </button>
            )}
            {heldOrders.length === 0 && (
              <button 
                onClick={() => setIsHeldOrdersOpen(true)}
                className="text-slate-400 hover:text-amber-600 transition-colors text-[10px] md:text-[11px] p-1 rounded-full flex items-center gap-1 active:scale-95"
              >
                <Clock className="size-3.5" />
              </button>
            )}
          </div>
          {cart.length > 0 ? (
            <button
              onClick={clearCart}
              className="text-red-500 hover:text-red-700 p-2 -mr-2 bg-red-50 hover:bg-red-100 rounded-full md:bg-transparent md:rounded-none md:p-1"
            >
              <Trash2 className="size-4 md:size-5" />
            </button>
          ) : <div className="w-8 md:w-7"></div>}
        </div>

        <div className="px-4 py-3 md:pb-4 flex justify-between items-start shrink-0">
          <div>
            <h3 className="font-bold text-sm text-slate-800 leading-none mb-1">Daftar Pesanan</h3>
            <p className="text-[11px] text-slate-500 font-medium">{cart.reduce((s, i) => s + i.qty, 0)} Items</p>
          </div>
          <button 
            onClick={() => setIsMobileCartOpen(false)}
            className="text-[#0b172a] text-[11px] font-bold flex items-center gap-1 hover:underline"
          >
            <Plus className="size-3.5" /> Tambah Item Lainnya
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
              <ShoppingCart className="size-10 mb-2 opacity-20" />
              <p className="text-xs">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="space-y-5 pb-4">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 items-center relative">
                  <div className="w-[52px] h-[52px] bg-slate-200 rounded flex items-center justify-center font-bold text-slate-400 text-xl shrink-0">
                    {item.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 pr-10">
                    <p className="font-bold text-[12px] text-slate-800 truncate mb-1">{item.name.toLowerCase()}</p>
                    <p className="text-[11px] text-slate-500 font-semibold">{formatRupiah(item.price)}</p>
                  </div>
                  <button className="absolute top-0 right-0 text-slate-600 p-1">
                    <MoreHorizontal className="size-4" />
                  </button>
                  <div className="absolute bottom-0 right-0 flex items-center justify-between border border-slate-200 rounded-full px-2 py-1 bg-white w-[80px]">
                    <button onClick={() => updateQty(item.id, -1)} className="text-slate-800 font-extrabold text-[12px] active:scale-90">-</button>
                    <span className="text-[11px] font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="text-slate-800 font-extrabold text-[12px] active:scale-90">+</button>
                  </div>
                </div>
              ))}
            {cart.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                <div className="flex justify-between items-center text-[13px] md:text-xs font-bold text-slate-700">
                  <span>Subtotal</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <button 
                    onClick={() => {
                      setTempDiscount(discount);
                      setTempDiscountType(discountType);
                      setIsDiscountOpen(true);
                    }}
                    className={`flex items-center gap-1 hover:underline font-medium ${discountAmount > 0 ? "text-red-500" : "text-red-500/90"}`}
                  >
                    Diskon {discountAmount > 0 && (discountType === "percent" ? `(${discount}%)` : "(Nominal)")}
                  </button>
                  <div className="flex items-center gap-1" onClick={() => setIsDiscountOpen(true)}>
                    {discountAmount > 0 && <span className="text-red-500 font-bold">-{formatRupiah(discountAmount)}</span>}
                    <ChevronRight className={`size-4 ${discountAmount > 0 ? "text-red-500" : "text-slate-500"}`} />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <button 
                    onClick={() => {
                      setTempTaxRate(taxRate);
                      setIsTaxOpen(true);
                    }}
                    className={`flex items-center gap-1 hover:underline font-medium ${taxRate > 0 ? "text-slate-800" : "text-slate-500"}`}
                  >
                    Pajak {taxRate > 0 && `(${taxRate}%)`}
                  </button>
                  <div className="flex items-center gap-1" onClick={() => setIsTaxOpen(true)}>
                    {taxRate > 0 && <span className="text-slate-800 font-bold">{formatRupiah(taxAmount)}</span>}
                    <ChevronRight className="size-4 text-slate-500" />
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
        </div>

        {/* Footer Bawah: Modifier & Tombol Bayar */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-24">
          <div className="flex gap-2 mb-3">
            <button 
              onClick={() => setIsOrderTypeOpen(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg relative overflow-hidden transition-all ${orderType !== "take_away" ? "bg-cyan-50/70 text-slate-800" : "bg-slate-50/80 text-slate-500"}`}
            >
              <Utensils className={`size-4 ${orderType !== "take_away" ? "text-slate-800" : "text-slate-500"}`} />
              <span className="text-[9px] font-medium line-clamp-1 text-center w-full px-1">
                {orderType === "dine_in" ? "Makan di tempat" : orderType === "delivery" ? "Pesan Antar" : "Bawa Pulang"}
              </span>
            </button>
            
            <button 
              onClick={() => setIsCustomerDrawerOpen(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg relative overflow-hidden transition-all ${selectedCustomerId ? "bg-cyan-50/70 text-slate-800" : "bg-slate-50/80 text-slate-500 hover:bg-slate-100"}`}
            >
              <User className={`size-4 ${selectedCustomerId ? "text-slate-800" : "text-slate-500"}`} />
              <span className="text-[9px] font-medium">Pelanggan</span>
            </button>
            
            <button 
              onClick={() => orderType === "dine_in" ? setIsTableDrawerOpen(true) : alert("Pilih tipe pesanan 'Makan di Tempat' untuk memilih meja.")}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg relative overflow-hidden transition-all ${(orderType === "dine_in" && selectedTable) ? "bg-cyan-50/70 text-slate-800" : "bg-slate-50/80 text-slate-500 hover:bg-slate-100"}`}
            >
              <LayoutDashboard className={`size-4 ${(orderType === "dine_in" && selectedTable) ? "text-slate-800" : "text-slate-500"}`} />
              <span className="text-[9px] font-medium">Nomor Meja</span>
            </button>
          </div>
          
          <div className="flex gap-2.5">
            <Button
              onClick={() => confirmPayment("hold")}
              disabled={cart.length === 0 || isCheckingOut}
              variant="outline"
              className="w-28 border-slate-200 text-slate-600 font-bold rounded-[10px] h-12 px-1 text-[11px] shadow-sm active:scale-95 transition-all"
            >
              Bayar Nanti
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
              className="flex-1 bg-[#0b172a] text-white hover:bg-slate-800 h-12 text-[13px] font-bold rounded-[10px] shadow-sm active:scale-95 transition-all"
            >
              Bayar {formatRupiah(total)}
            </Button>
          </div>
        </div>
      </div>

      {/* Pop-up Diskon */}
      <Dialog open={isDiscountOpen} onOpenChange={setIsDiscountOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-center mb-2">Atur Diskon</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setTempDiscountType("nominal")}
                className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition-colors ${tempDiscountType === "nominal" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Rp Nominal
              </button>
              <button
                onClick={() => setTempDiscountType("percent")}
                className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition-colors ${tempDiscountType === "percent" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                % Persen
              </button>
            </div>
            <div className="relative">
              {tempDiscountType === "nominal" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">Rp</span>
              )}
              <input 
                type="number"
                min="0"
                value={tempDiscount || ""}
                onChange={(e) => setTempDiscount(Number(e.target.value))}
                className={`w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20 focus:border-[#0b172a] font-semibold ${tempDiscountType === "nominal" ? "pl-9" : "pr-9"}`}
                placeholder="0"
              />
              {tempDiscountType === "percent" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">%</span>
              )}
            </div>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="ghost" onClick={() => { setDiscount(0); setIsDiscountOpen(false); }}>
              Hapus Diskon
            </Button>
            <Button onClick={handleApplyDiscount} className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl">
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pop-up Pajak */}
      <Dialog open={isTaxOpen} onOpenChange={setIsTaxOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-center mb-2">Atur Pajak (%)</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={tempTaxRate || ""}
                onChange={(e) => setTempTaxRate(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-3 pr-9 focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20 focus:border-[#0b172a] font-semibold"
                placeholder="Masukkan persentase..."
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</div>
            </div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2 mt-2">
            <Button variant="ghost" onClick={() => { setTaxRate(0); setIsTaxOpen(false); }}>
              Hapus Pajak
            </Button>
            <Button onClick={handleApplyTax} className="bg-[#0b172a] hover:bg-slate-800 text-white rounded-xl">
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pop-up Held Orders */}
      <Dialog open={isHeldOrdersOpen} onOpenChange={setIsHeldOrdersOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl mb-2">Pesanan Di-Hold</DialogTitle>
          </DialogHeader>
          <div className="py-2 max-h-96 overflow-auto">
            {heldOrders.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <Clock className="size-12 mx-auto mb-3 opacity-20" />
                <p>Tidak ada pesanan yang di-hold.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {heldOrders.map((order) => (
                  <div key={order.id} className="border border-slate-200 rounded-xl p-4 hover:border-[#0b172a] transition-colors flex justify-between items-center cursor-pointer" onClick={() => resumeOrder(order)}>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {order.order_type === "dine_in" ? `Dine In - ${order.tables?.name || 'Meja'}` : order.order_type === "delivery" ? "Pesan Antar" : "Bawa Pulang"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0b172a]">{formatRupiah(order.total_amount)}</p>
                      <span className="text-xs text-[#0b172a] bg-[#0b172a]/10 px-2 py-1 rounded-full font-semibold">Lanjutkan</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pop-up Pembayaran (Desain Baru - Modern Minimalist) */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="w-full sm:max-w-[380px] h-[100dvh] sm:h-auto sm:min-h-[600px] p-0 flex flex-col overflow-hidden [&>button]:hidden bg-white border-0 sm:border rounded-none sm:rounded-2xl top-0 translate-y-0 sm:top-1/2 sm:-translate-y-1/2">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-white shrink-0">
            <button onClick={() => setIsPaymentOpen(false)} className="p-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors active:scale-95">
              <ChevronLeft className="size-4" />
            </button>
            <h2 className="font-bold text-slate-800 text-[15px]">Pembayaran</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 pb-safe">
            <div className="text-center mt-2 mb-4 sm:mt-6 sm:mb-10">
              <p className="text-[12px] sm:text-[13px] text-slate-500 mb-1 font-medium">Total Tagihan</p>
              <p className="font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight mb-2">{formatRupiah(total)}</p>
              <button onClick={() => setIsPaymentOpen(false)} className="text-blue-500 hover:text-blue-600 text-[11px] sm:text-[13px] font-bold">
                Detail Pesanan
              </button>
            </div>

            <div className="mt-auto pt-2 sm:pt-8 flex flex-col flex-1 justify-end">
              <p className="text-[11px] text-slate-400 text-center mb-3 font-medium">Pilih Metode Pembayaran</p>
              <div className="grid grid-cols-3 gap-2.5 mb-6">
                <button
                  onClick={() => setPaymentMethod("qris")}
                  className={`flex flex-col items-center justify-center py-2 sm:py-3 border rounded-xl transition-all ${paymentMethod === "qris" ? "border-[#0b172a] bg-cyan-50/50 shadow-sm" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"}`}
                >
                  <QrCode className="size-5 sm:size-6 mb-1 text-slate-800" />
                  <span className="font-bold text-[9px] sm:text-[10px] text-slate-800">QRIS</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex flex-col items-center justify-center py-2 sm:py-3 border rounded-xl transition-all ${paymentMethod === "cash" ? "border-[#0b172a] bg-cyan-50/50 shadow-sm" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"}`}
                >
                  <Banknote className="size-5 sm:size-6 mb-1 text-slate-800" />
                  <span className="font-bold text-[9px] sm:text-[10px] text-slate-800">Tunai</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("other")}
                  className={`flex flex-col items-center justify-center py-2 sm:py-3 border rounded-xl transition-all ${paymentMethod === "other" ? "border-[#0b172a] bg-cyan-50/50 shadow-sm" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"}`}
                >
                  <MoreHorizontal className="size-5 sm:size-6 mb-1 text-slate-800" />
                  <span className="font-bold text-[9px] sm:text-[10px] text-slate-800">Lainnya</span>
                </button>
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">Uang Diterima</label>
                    <input
                      type="number"
                      value={amountReceived || ""}
                      onChange={(e) => setAmountReceived(Number(e.target.value))}
                      className="w-full text-right text-2xl sm:text-3xl font-extrabold py-1 border-b-2 border-slate-200 focus:border-[#0b172a] focus:outline-none bg-transparent transition-colors"
                      placeholder="0"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {['1','2','3'].map(num => (
                      <Button key={num} variant="outline" size="lg" className="text-base sm:text-lg font-bold rounded-xl h-10 sm:h-12 shadow-sm border-slate-200" onClick={() => setAmountReceived(prev => Number((prev === 0 ? '' : prev.toString()) + num))}>{num}</Button>
                    ))}
                    <Button variant="outline" size="lg" className="text-xs font-extrabold rounded-xl h-10 sm:h-12 shadow-sm bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border-rose-200" onClick={() => setAmountReceived(0)}>C</Button>

                    {['4','5','6'].map(num => (
                      <Button key={num} variant="outline" size="lg" className="text-base sm:text-lg font-bold rounded-xl h-10 sm:h-12 shadow-sm border-slate-200" onClick={() => setAmountReceived(prev => Number((prev === 0 ? '' : prev.toString()) + num))}>{num}</Button>
                    ))}
                    <Button variant="outline" size="lg" className="text-[10px] font-extrabold rounded-xl h-10 sm:h-12 shadow-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={() => setAmountReceived(total)}>PAS</Button>

                    {['7','8','9'].map(num => (
                      <Button key={num} variant="outline" size="lg" className="text-base sm:text-lg font-bold rounded-xl h-10 sm:h-12 shadow-sm border-slate-200" onClick={() => setAmountReceived(prev => Number((prev === 0 ? '' : prev.toString()) + num))}>{num}</Button>
                    ))}
                    <Button variant="outline" size="lg" className="text-[11px] sm:text-xs font-bold rounded-xl h-10 sm:h-12 shadow-sm border-slate-200 text-slate-600" onClick={() => setAmountReceived(50000)}>50k</Button>

                    <Button variant="outline" size="lg" className="text-base sm:text-lg font-bold rounded-xl h-10 sm:h-12 shadow-sm border-slate-200" onClick={() => setAmountReceived(prev => Number((prev === 0 ? '' : prev.toString()) + '00'))}>00</Button>
                    <Button variant="outline" size="lg" className="text-base sm:text-lg font-bold rounded-xl h-10 sm:h-12 shadow-sm border-slate-200" onClick={() => setAmountReceived(prev => Number((prev === 0 ? '' : prev.toString()) + '0'))}>0</Button>
                    <Button variant="outline" size="lg" className="text-lg sm:text-xl font-bold rounded-xl h-10 sm:h-12 shadow-sm border-slate-200 text-slate-500" onClick={() => setAmountReceived(prev => Math.floor(prev / 10))}>⌫</Button>
                    <Button variant="outline" size="lg" className="text-[11px] sm:text-xs font-bold rounded-xl h-10 sm:h-12 shadow-sm border-slate-200 text-slate-600" onClick={() => setAmountReceived(100000)}>100k</Button>
                  </div>

                  <div className="flex justify-between items-center p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-100 mt-2">
                    <span className="text-[11px] sm:text-[13px] font-semibold text-slate-500">Kembalian</span>
                    <span className={`text-base sm:text-lg font-extrabold ${amountReceived >= total ? "text-emerald-600" : "text-slate-400"}`}>
                      {amountReceived >= total ? formatRupiah(amountReceived - total) : "-"}
                    </span>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => confirmPayment(paymentMethod, amountReceived)} 
                disabled={isCheckingOut || (paymentMethod === "cash" && amountReceived < total)}
                className="w-full mt-auto mb-2 bg-[#0b172a] hover:bg-slate-900 text-white font-extrabold rounded-xl h-12 text-[12px] shadow-md transition-all active:scale-[0.98]"
              >
                {isCheckingOut ? "MEMPROSES..." : "LAKUKAN PEMBAYARAN"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pop-up Struk (Receipt Preview) */}
      <Dialog open={isReceiptOpen} onOpenChange={handleCloseReceipt}>
        <DialogContent className="w-full sm:max-w-[400px] h-[100dvh] sm:h-auto sm:max-h-[600px] p-0 flex flex-col overflow-hidden bg-slate-100 border-0 sm:border rounded-none sm:rounded-2xl top-0 translate-y-0 sm:top-1/2 sm:-translate-y-1/2 [&>button]:hidden sm:[&>button]:flex">
          {lastReceipt && (
            <div className="flex flex-col h-full">
              <div className="bg-white p-4 border-b border-slate-200 text-center flex-shrink-0">
                <h3 className="font-display font-bold text-lg text-slate-800">Pratinjau Struk</h3>
              </div>
              
              <div className="flex-1 overflow-auto p-6" id="receipt-printable-area">
                <div className="bg-white shadow-sm p-6 mx-auto w-full max-w-[320px] font-mono text-sm text-slate-800 border-t-4 border-slate-800">
                  <div className="text-center mb-4">
                    <h2 className="font-bold text-xl uppercase mb-1">Toko Saya</h2>
                    <p className="text-xs text-slate-500 mb-2">Jl. Contoh Alamat No. 123</p>
                    <div className="border-b border-dashed border-slate-300 pb-4 text-xs">
                      <div className="flex justify-between">
                        <span>Tgl:</span>
                        <span>{new Date(lastReceipt.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kasir:</span>
                        <span>{lastReceipt.cashier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>No. Invoice:</span>
                        <span>{lastReceipt.invoice_code || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>No. Trx:</span>
                        <span>{lastReceipt.transaction_id.substring(0, 8)}</span>
                      </div>
                      <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-slate-200">
                        <span>Pelanggan:</span>
                        <span>{lastReceipt.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tipe:</span>
                        <span>{lastReceipt.order_type === "dine_in" ? `Makan di Tempat (${lastReceipt.table_name})` : lastReceipt.order_type === "delivery" ? "Pesan Antar" : "Bawa Pulang"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-300 pb-4 mb-4">
                    {lastReceipt.items.map((item: any, idx: number) => (
                      <div key={idx} className="mb-2">
                        <div className="flex justify-between font-semibold">
                          <span>{item.name}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>{item.qty} x {formatRupiah(item.price)}</span>
                          <span>{formatRupiah(item.qty * item.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 mb-4 text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatRupiah(lastReceipt.subtotal)}</span>
                    </div>
                    {lastReceipt.discount_amount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Diskon</span>
                        <span>-{formatRupiah(lastReceipt.discount_amount)}</span>
                      </div>
                    )}
                    {lastReceipt.tax_amount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Pajak</span>
                        <span>{formatRupiah(lastReceipt.tax_amount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-y border-dashed border-slate-300 py-3 mb-6 font-bold text-base">
                    <span>TOTAL</span>
                    <span>{formatRupiah(lastReceipt.total)}</span>
                  </div>

                  <div className="text-center text-xs space-y-1 text-slate-500">
                    <p>Pembayaran: {lastReceipt.payment_method === "cash" ? "Tunai" : "Non-Tunai"}</p>
                    <p className="mt-4 pt-4 border-t border-dashed border-slate-300 italic">Terima kasih atas kunjungan Anda!</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 border-t border-slate-200 flex gap-2 flex-shrink-0">
                <Button 
                  onClick={() => {
                    const printContent = document.getElementById("receipt-printable-area");
                    const originalContent = document.body.innerHTML;
                    if (printContent) {
                      document.body.innerHTML = printContent.innerHTML;
                      window.print();
                      document.body.innerHTML = originalContent;
                      window.location.reload(); 
                    }
                  }}
                  variant="outline" 
                  className="flex-1 font-bold border-slate-300"
                >
                  <Printer className="size-4 mr-1.5" /> Cetak
                </Button>
                


                <Button onClick={handleCloseReceipt} className="flex-1 bg-[#0b172a] hover:bg-slate-800 text-white font-bold">
                  Selesai
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Catat Belanja Toko dari Kasir */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-xl p-0 overflow-hidden">
          <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-amber-400" />
              <DialogTitle className="text-white text-base font-bold">Catat Belanja Toko (Kasir)</DialogTitle>
            </div>
          </div>

          <form onSubmit={handleExpenseSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nama / Deskripsi Belanja <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Beli Es Batu 5 Plastik, Isi Gas 3kg"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20 focus:border-[#0b172a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nominal (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="0"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20 focus:border-[#0b172a] font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20 focus:border-[#0b172a] bg-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Sumber Dana</label>
              <select
                value={expensePaymentMethod}
                onChange={(e) => setExpensePaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20 focus:border-[#0b172a] bg-white"
              >
                <option value="Kas Laci (Petty Cash)">💵 Kas Laci (Petty Cash)</option>
                <option value="Transfer Bank">💳 Transfer Bank / Rekening Toko</option>
                <option value="Uang Pribadi Owner/Manajer">👤 Uang Pribadi Owner / Kasir</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Staf Penanggung Jawab</label>
              <input
                type="text"
                value={activeShift?.cashier_name || user?.name || "Kasir"}
                disabled
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-100 text-slate-600 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan / No. Nota (Opsional)</label>
              <textarea
                rows={2}
                placeholder="Catatan tambahan..."
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20 focus:border-[#0b172a]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmittingExpense} className="bg-[#0b172a] hover:bg-slate-800 rounded-xl text-white font-semibold">
                {isSubmittingExpense ? "Menyimpan..." : "Simpan Belanja"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Riwayat Transaksi (Kasir) */}
      <Dialog open={isTransactionHistoryOpen} onOpenChange={setIsTransactionHistoryOpen}>
        <DialogContent className="max-w-3xl bg-slate-50 rounded-xl p-0 overflow-hidden flex flex-col h-[85vh] sm:h-[80vh]">
          <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-slate-800 text-lg font-extrabold flex items-center gap-2">
                <Clock className="size-5 text-brand" /> Riwayat Transaksi
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-1">Daftar transaksi kasir yang telah diselesaikan.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsTransactionHistoryOpen(false)} className="rounded-full">
              <X className="size-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoadingHistory ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="size-8 animate-spin mb-3 text-brand" />
                <p className="text-sm">Memuat riwayat transaksi...</p>
              </div>
            ) : historyTransactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-4">
                <Receipt className="size-16 mb-2 opacity-20 text-slate-400" />
                <div>
                  <h3 className="font-display font-bold text-xl text-slate-700">Transaksi Kosong</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                    Belum ada transaksi penjualan yang tercatat pada sistem. Transaksi yang selesai akan muncul di sini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {historyTransactions.map((trx) => (
                  <div key={trx.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={() => {
                      try {
                        setLastReceipt({
                          transaction_id: trx.id,
                          invoice_code: trx.invoice_code || trx.id,
                          cashier: trx.cashier_shifts?.cashier_name || trx.cashier_name || 'Kasir',
                          customer_name: trx.customers?.name || trx.customer_name_custom || 'Umum',
                          order_type: trx.order_type || 'take_away',
                          table_name: trx.tables?.name || null,
                          created_at: trx.created_at,
                          payment_method: trx.payment_method,
                          subtotal: trx.subtotal,
                          discount_amount: trx.discount_amount,
                          tax_amount: trx.tax_amount,
                          total: trx.total_amount,
                          items: (trx.transaction_items || trx.items || []).map((item: any) => ({
                            ...item,
                            name: item.product_name || item.name,
                            qty: item.qty || item.quantity
                          }))
                        });
                        setIsTransactionHistoryOpen(false);
                        setTimeout(() => setIsReceiptOpen(true), 100);
                      } catch (e) {
                        console.error(e);
                      }
                    }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider mb-2 inline-block">
                          {trx.payment_method === 'cash' ? 'Tunai' : 'Non-Tunai'}
                        </span>
                        <h4 className="font-mono text-xs font-bold text-slate-800">#{trx.id.substring(0, 8).toUpperCase()}</h4>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-brand block">{formatRupiah(trx.total_amount)}</span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(trx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <User className="size-3" />
                        <span className="truncate max-w-[100px]">{trx.cashier_shifts?.cashier_name || 'Kasir'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-brand font-medium group-hover:underline">
                        <Printer className="size-3" /> Cetak
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog Order Type Pop-up Minimalist (Footer/Bottom Sheet) */}
      <Drawer open={isOrderTypeOpen} onOpenChange={setIsOrderTypeOpen}>
        <DrawerContent className="bg-white dark:bg-slate-900 border-t-0 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="mx-auto mt-4 h-1.5 w-[50px] rounded-full bg-slate-200 dark:bg-slate-800" />
          <DrawerHeader className="px-6 pb-2 pt-4">
            <DrawerTitle className="text-center text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Tipe Pesanan
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col p-2">
            <button
              onClick={() => { setOrderType("take_away"); setIsOrderTypeOpen(false); }}
              className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                orderType === "take_away"
                  ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className={`size-5 ${orderType === "take_away" ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`} />
                <span className="font-medium text-[15px]">Bawa Pulang</span>
              </div>
              {orderType === "take_away" && <Check className="size-5 text-cyan-600 dark:text-cyan-400" />}
            </button>
            
            <button
              onClick={() => { setOrderType("dine_in"); setIsOrderTypeOpen(false); }}
              className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                orderType === "dine_in"
                  ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <Utensils className={`size-5 ${orderType === "dine_in" ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`} />
                <span className="font-medium text-[15px]">Makan di Tempat</span>
              </div>
              {orderType === "dine_in" && <Check className="size-5 text-cyan-600 dark:text-cyan-400" />}
            </button>

            <button
              onClick={() => { setOrderType("delivery"); setIsOrderTypeOpen(false); }}
              className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                orderType === "delivery"
                  ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <Truck className={`size-5 ${orderType === "delivery" ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`} />
                <span className="font-medium text-[15px]">Pesan Antar</span>
              </div>
              {orderType === "delivery" && <Check className="size-5 text-cyan-600 dark:text-cyan-400" />}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawer Pelanggan Minimalist (Bottom Sheet) */}
      <Drawer open={isCustomerDrawerOpen} onOpenChange={setIsCustomerDrawerOpen}>
        <DrawerContent className="bg-white dark:bg-slate-900 border-t-0 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[85vh]">
          <div className="mx-auto mt-4 h-1.5 w-[50px] rounded-full bg-slate-200 dark:bg-slate-800" />
          <DrawerHeader className="px-6 pb-2 pt-4">
            <DrawerTitle className="text-center text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Pilih Pelanggan
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col p-4 overflow-y-auto max-h-[50vh]">
            <button
              onClick={() => { setSelectedCustomerId(""); setIsCustomerDrawerOpen(false); }}
              className={`flex items-center justify-between p-4 rounded-xl transition-all mb-2 ${
                !selectedCustomerId
                  ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <User className={`size-5 ${!selectedCustomerId ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`} />
                <span className="font-medium text-[15px]">Pelanggan Umum (Tanpa Nama)</span>
              </div>
              {!selectedCustomerId && <Check className="size-5 text-cyan-600 dark:text-cyan-400" />}
            </button>

            {customers.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedCustomerId(c.id); setIsCustomerDrawerOpen(false); }}
                className={`flex items-center justify-between p-4 rounded-xl transition-all mb-2 ${
                  selectedCustomerId === c.id
                    ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-100"
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="font-medium text-[15px]">{c.name}</span>
                  {c.phone && <span className="text-xs text-slate-500 mt-0.5">{c.phone}</span>}
                </div>
                {selectedCustomerId === c.id && <Check className="size-5 text-cyan-600 dark:text-cyan-400" />}
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Link to="/app/customers" onClick={() => setIsCustomerDrawerOpen(false)} className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold hover:opacity-90 transition-opacity">
              <Plus className="size-4" />
              Kelola Data Pelanggan Baru
            </Link>
          </div>
        </DrawerContent>
      </Drawer>
      
      {/* Drawer Nomor Meja Minimalist (Bottom Sheet) */}
      <Drawer open={isTableDrawerOpen} onOpenChange={setIsTableDrawerOpen}>
        <DrawerContent className="bg-white dark:bg-slate-900 border-t-0 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[85vh]">
          <div className="mx-auto mt-4 h-1.5 w-[50px] rounded-full bg-slate-200 dark:bg-slate-800" />
          <DrawerHeader className="px-6 pb-2 pt-4">
            <DrawerTitle className="text-center text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Pilih Nomor Meja
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col p-4 overflow-y-auto max-h-[60vh]">
            <button
              onClick={() => { setSelectedTable("no_table"); setIsTableDrawerOpen(false); }}
              className={`flex items-center justify-between p-4 rounded-xl transition-all mb-2 ${
                selectedTable === "no_table"
                  ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className={`size-5 ${selectedTable === "no_table" ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`} />
                <span className="font-medium text-[15px]">Tanpa Meja / Belum Diisi</span>
              </div>
              {selectedTable === "no_table" && <Check className="size-5 text-cyan-600 dark:text-cyan-400" />}
            </button>

            {tables.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTable(t.id); setIsTableDrawerOpen(false); }}
                className={`flex items-center justify-between p-4 rounded-xl transition-all mb-2 ${
                  selectedTable === t.id
                    ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className={`size-5 ${selectedTable === t.id ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`} />
                  <span className="font-medium text-[15px]">{t.name}</span>
                </div>
                {selectedTable === t.id && <Check className="size-5 text-cyan-600 dark:text-cyan-400" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
      
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
}
