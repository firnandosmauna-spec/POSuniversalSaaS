import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, CreditCard, Banknote, Coffee, Utensils, Search, Loader2, Clock, Plus, Percent, AlertTriangle, Wallet, Printer, LayoutDashboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";
import { getInvoiceSettings, generateInvoiceCode } from "@/shared/utils/invoiceGenerator";

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
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [orderType, setOrderType] = useState<"dine_in" | "take_away">("take_away");
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Fitur Pajak & Diskon
  const [taxRate, setTaxRate] = useState<number>(0);
  const [enableDineIn, setEnableDineIn] = useState<boolean>(true);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"nominal" | "percent">("nominal");
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [tempDiscount, setTempDiscount] = useState<number>(0);
  const [tempDiscountType, setTempDiscountType] = useState<"nominal" | "percent">("nominal");

  // Fitur Struk / Receipt
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // Fitur Hold
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);

  // Fitur Pelanggan
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

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

const DEFAULT_FNB_PRODUCTS: Product[] = [
  { id: "fnb_1", name: "Nasi Goreng Spesial Telur Ceplok", price: 25000, category: "Makanan Utama", stock: 50, image_url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300" },
  { id: "fnb_2", name: "Mie Goreng Jawa Seafood", price: 28000, category: "Makanan Utama", stock: 35, image_url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300" },
  { id: "fnb_3", name: "Ayam Bakar Madu + Nasi", price: 32000, category: "Makanan Utama", stock: 40, image_url: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=300" },
  { id: "fnb_4", name: "Es Teh Manis Jumbo", price: 6000, category: "Minuman", stock: 100, image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300" },
  { id: "fnb_5", name: "Kopi Susu Gula Aren", price: 18000, category: "Minuman", stock: 60, image_url: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=300" },
  { id: "fnb_6", name: "Matcha Latte Ice", price: 22000, category: "Minuman", stock: 45, image_url: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=300" },
  { id: "fnb_7", name: "Kentang Goreng Crispy", price: 15000, category: "Camilan", stock: 50, image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300" },
  { id: "fnb_8", name: "Roti Bakar Cokelat Keju", price: 18000, category: "Camilan", stock: 30, image_url: "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=300" }
];

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
      
      // Hapus data hold agar jadi draft
      await supabase.from("transactions").delete().eq("id", order.id);
      
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

  const addToCart = (product: Product) => {
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

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  const handleCheckout = () => {
    if (!activeShift) {
      alert("Silakan buka shift kasir terlebih dahulu sebelum melakukan transaksi!");
      return;
    }
    if (cart.length === 0) return;
    if (orderType === "dine_in" && !selectedTable) {
      alert("Pilih meja terlebih dahulu untuk Dine In!");
      return;
    }
    setIsPaymentOpen(true);
  };

  const confirmPayment = async (method: string) => {
    if (!user || cart.length === 0) return;
    setIsCheckingOut(true);

    const isHold = method === "hold";

    try {
      const invSettings = getInvoiceSettings();
      const generatedInvoiceCode = generateInvoiceCode(invSettings, Math.floor(Date.now() / 1000) % 10000, "PUSAT");

      let transaction: any = null;

      // 1. Simpan Transaksi Induk (resilient to missing invoice_code column or DB schema difference)
      try {
        const { data, error: trxError } = await supabase
          .from("transactions")
          .insert({
            tenant_id: user.id,
            shift_id: activeShift ? activeShift.id : null,
            order_type: orderType,
            table_id: orderType === "dine_in" ? selectedTable : null,
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
                table_id: orderType === "dine_in" ? selectedTable : null,
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
          id: `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          created_at: new Date().toISOString(),
          tenant_id: user.id,
          total_amount: total
        };
      }
      
      // 2. Simpan Detail Produk (Items)
      try {
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
      
      // 3. Update Status Meja
      if (orderType === "dine_in" && selectedTable && !isHold) {
        await supabase.from("tables").update({ status: "occupied" }).eq("id", selectedTable);
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
          created_at: transaction.created_at || new Date().toISOString(),
          cashier: activeShift ? activeShift.cashier_name : user.name,
          customer_name: customers.find(c => c.id === selectedCustomerId)?.name || "Umum",
          order_type: orderType,
          table_name: tables.find(t => t.id === selectedTable)?.name || "-",
          items: [...cart],
          subtotal: subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total: total,
          payment_method: method
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

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleApplyDiscount = () => {
    setDiscount(tempDiscount);
    setDiscountType(tempDiscountType);
    setIsDiscountOpen(false);
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
    <div className="flex flex-col landscape:flex-row md:flex-row h-full w-full gap-2 md:gap-4 overflow-y-auto landscape:overflow-hidden md:overflow-hidden p-2 md:p-4 pb-16 md:pb-4">
      {/* KIRI: Daftar Produk */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden landscape:h-full md:h-full min-h-[350px]">
        
        {!activeShift && !isLoading && (
          <div className="bg-amber-50 border-b border-amber-200 p-2.5 flex items-center justify-between text-amber-800 shrink-0 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Shift Kasir Belum Dibuka!</span>
            </div>
            <a href="/app/shifts" className="font-bold underline hover:text-amber-900 shrink-0">
              Buka Shift
            </a>
          </div>
        )}

        <div className="p-2.5 landscape:p-2 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <h2 className="font-display text-base font-bold text-slate-800 hidden md:block">Menu F&B</h2>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-semibold text-xs h-8 px-2"
              title="Catat belanja manual / pengeluaran toko dari kasir"
            >
              <Wallet className="size-3.5 text-amber-600" /> 
              <span className="hidden sm:inline">Belanja</span>
            </Button>

            <Button 
              variant="outline"
              size="sm" 
              onClick={() => {
                fetchHeldOrders();
                setIsHeldOrdersOpen(true);
              }} 
              className="flex items-center gap-1.5 border-brand/20 text-brand hover:bg-brand/5 text-xs h-8 px-2"
            >
              <Clock className="size-3.5" /> 
              <span className="hidden lg:inline">Hold</span>
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2.5 md:p-4 min-h-0">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[150px]">
              <Loader2 className="size-7 animate-spin mb-2 text-brand" />
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
                <Button size="sm" className="bg-brand text-white font-extrabold text-xs h-9 px-4 rounded-lg shadow-sm gap-1.5 mt-1">
                  <Plus className="size-4" /> Tambah Produk Baru
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                  className={`relative flex flex-col items-center justify-center p-2 rounded-xl border border-slate-100 bg-slate-50 transition-all text-center group overflow-hidden ${
                    product.stock === 0 
                      ? "opacity-60 cursor-not-allowed" 
                      : "hover:border-brand hover:shadow-md"
                  }`}
                >
                  {product.stock === 0 && (
                    <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                      <span className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm transform -rotate-12">
                        HABIS
                      </span>
                    </div>
                  )}
                  {product.image_url ? (
                    <div className="size-12 landscape:size-10 rounded-full overflow-hidden mb-1.5 group-hover:scale-110 transition-transform shadow-sm">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="size-10 rounded-full flex items-center justify-center mb-1.5 bg-slate-200 text-slate-500 group-hover:scale-110 transition-transform">
                      {product.category?.toLowerCase().includes("minum") ? <Coffee className="size-5" /> : <Utensils className="size-5" />}
                    </div>
                  )}
                  <span className="font-semibold text-xs text-slate-700 leading-tight mb-1 line-clamp-2">
                    {product.name}
                  </span>
                  <span className="text-xs font-bold text-brand mt-auto">
                    {formatRupiah(product.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KANAN: Keranjang */}
      <div className="w-full landscape:w-72 sm:landscape:w-80 md:w-96 flex flex-col rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden shrink-0 landscape:h-full md:h-full max-h-full min-h-0">
        <div className="p-2.5 landscape:p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 font-display font-bold text-slate-800 text-xs sm:text-sm">
            <ShoppingCart className="size-4 text-brand" />
            Pesanan ({cart.reduce((s, i) => s + i.qty, 0)})
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 font-semibold hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="size-3.5" /> Bersihkan
            </button>
          )}
        </div>

        {/* Pemilih Pelanggan */}
        <div className="px-3 pt-2 bg-white shrink-0">
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-brand bg-slate-50 font-medium text-slate-700"
          >
            <option value="">-- Pelanggan (Opsional) --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
            ))}
          </select>
        </div>

        {/* Pemilih Tipe Pesanan & Meja */}
        {enableDineIn && (
          <div className="px-3 py-1.5 border-b border-slate-100 bg-white space-y-1.5 shrink-0">
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setOrderType("take_away")}
                className={`flex-1 text-xs font-semibold py-1 rounded-md transition-colors ${orderType === "take_away" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
              >
                Take Away
              </button>
              <button
                onClick={() => setOrderType("dine_in")}
                className={`flex-1 text-xs font-semibold py-1 rounded-md transition-colors ${orderType === "dine_in" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
              >
                Dine In
              </button>
            </div>
            
            {orderType === "dine_in" && (
              <div>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-brand bg-slate-50"
                >
                  <option value="" disabled>-- Pilih Meja Kosong --</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
              <ShoppingCart className="size-10 mb-2 opacity-20" />
              <p className="text-xs">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start border-b border-slate-50 pb-2.5">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-xs text-slate-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-brand font-medium">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-slate-200 rounded-lg">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-800"
                      >
                        -
                      </button>
                      <span className="text-xs font-semibold w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-800"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ringkasan & Tombol Bayar */}
        <div className="p-3 landscape:p-2 bg-slate-50 border-t border-slate-200 shrink-0 sticky bottom-0 z-10">
          <div className="space-y-1 mb-2">
            <div className="flex justify-between items-center text-xs text-slate-500">
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
                className="text-brand flex items-center gap-1 hover:underline font-medium"
              >
                {discountAmount > 0 ? (
                  <>Diskon ({discountType === "percent" ? `${discount}%` : "Nominal"})</>
                ) : (
                  <><Plus className="size-3" /> Tambah Diskon</>
                )}
              </button>
              {discountAmount > 0 && <span className="text-red-500">-{formatRupiah(discountAmount)}</span>}
            </div>

            {taxRate > 0 && (
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Pajak ({taxRate}%)</span>
                <span>{formatRupiah(taxAmount)}</span>
              </div>
            )}
            
            <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between items-center">
              <span className="text-slate-700 font-semibold text-xs">Total Akhir</span>
              <span className="font-display text-base font-bold text-slate-900">
                {formatRupiah(total)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => confirmPayment("hold")}
              disabled={cart.length === 0 || isCheckingOut || !activeShift}
              variant="outline"
              size="sm"
              className="col-span-1 border-amber-200 text-amber-600 hover:bg-amber-50 h-10 text-xs"
            >
              Hold
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut || !activeShift}
              className="col-span-2 bg-brand text-white hover:bg-brand/90 h-10 text-sm font-extrabold shadow-md"
            >
              Bayar
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
                className={`w-full border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand font-semibold ${tempDiscountType === "nominal" ? "pl-9" : "pr-9"}`}
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
            <Button onClick={handleApplyDiscount} className="bg-brand text-white">
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
                  <div key={order.id} className="border border-slate-200 rounded-xl p-4 hover:border-brand transition-colors flex justify-between items-center cursor-pointer" onClick={() => resumeOrder(order)}>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {order.order_type === "dine_in" ? `Dine In - ${order.tables?.name || 'Meja'}` : "Take Away"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand">{formatRupiah(order.total_amount)}</p>
                      <span className="text-xs text-brand bg-brand/10 px-2 py-1 rounded-full font-semibold">Lanjutkan</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pop-up Pembayaran */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-center mb-2">Pilih Metode Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="text-center mb-6">
              <p className="text-sm text-slate-500 mb-1">Total Tagihan</p>
              <p className="font-display text-4xl font-bold text-slate-900">{formatRupiah(total)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => confirmPayment("cash")}
                disabled={isCheckingOut}
                className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-xl hover:border-brand hover:bg-brand/5 transition-colors disabled:opacity-50"
              >
                <Banknote className="size-8 text-green-500 mb-2" />
                <span className="font-semibold text-slate-700">Tunai</span>
              </button>
              <button
                onClick={() => confirmPayment("debit")}
                disabled={isCheckingOut}
                className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-xl hover:border-brand hover:bg-brand/5 transition-colors disabled:opacity-50"
              >
                <CreditCard className="size-8 text-blue-500 mb-2" />
                <span className="font-semibold text-slate-700">Non Tunai</span>
              </button>
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="ghost" onClick={() => setIsPaymentOpen(false)}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pop-up Struk (Receipt Preview) */}
      <Dialog open={isReceiptOpen} onOpenChange={handleCloseReceipt}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-slate-100">
          {lastReceipt && (
            <div className="flex flex-col h-[80vh] max-h-[600px]">
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
                        <span>No. Trx:</span>
                        <span>{lastReceipt.transaction_id.substring(0, 8)}</span>
                      </div>
                      <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-slate-200">
                        <span>Pelanggan:</span>
                        <span>{lastReceipt.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tipe:</span>
                        <span>{lastReceipt.order_type === "dine_in" ? `Dine In (${lastReceipt.table_name})` : "Take Away"}</span>
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
                    // Simple hack to print only the receipt area
                    const printContent = document.getElementById("receipt-printable-area");
                    const originalContent = document.body.innerHTML;
                    if (printContent) {
                      document.body.innerHTML = printContent.innerHTML;
                      window.print();
                      document.body.innerHTML = originalContent;
                      window.location.reload(); // reload to restore React event listeners
                    }
                  }}
                  variant="outline" 
                  className="flex-1 font-bold border-slate-300"
                >
                  <Printer className="size-4 mr-2" /> Cetak
                </Button>
                <Button onClick={handleCloseReceipt} className="flex-1 bg-brand text-white font-bold">
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
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
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white"
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white"
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
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan / No. Nota (Opsional)</label>
              <textarea
                rows={2}
                placeholder="Catatan tambahan..."
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmittingExpense} className="bg-brand text-white font-semibold">
                {isSubmittingExpense ? "Menyimpan..." : "Simpan Belanja"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
