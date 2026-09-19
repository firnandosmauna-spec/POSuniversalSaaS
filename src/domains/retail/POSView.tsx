import { useState, useEffect } from "react";
import { useAuth } from "@/shared/auth/AuthContext";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Barcode,
  CheckCircle2,
  Printer,
  Sparkles,
  Tag,
  PackageCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateInvoiceCode } from "@/shared/utils/invoiceGenerator";

export type RetailProduct = {
  id: string;
  sku: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  unit: string;
  image_url: string;
};

export type RetailCartItem = {
  product: RetailProduct;
  qty: number;
};

const DEFAULT_RETAIL_PRODUCTS: RetailProduct[] = [
  {
    id: "ret_1",
    sku: "8991001001",
    name: "Minyak Goreng Tropical 2 Litr Pouch",
    price: 38000,
    category: "Sembako",
    stock: 45,
    unit: "pouch",
    image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300"
  },
  {
    id: "ret_2",
    sku: "8991001002",
    name: "Beras Premium Pandan Wangi 5 kg",
    price: 75000,
    category: "Sembako",
    stock: 20,
    unit: "sak",
    image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300"
  },
  {
    id: "ret_3",
    sku: "8991001003",
    name: "Indomie Goreng Spesial 85g",
    price: 3500,
    category: "Makanan Ringan",
    stock: 120,
    unit: "pcs",
    image_url: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300"
  },
  {
    id: "ret_4",
    sku: "8991001004",
    name: "Susu UHT Ultramilk Full Cream 1 Liter",
    price: 19500,
    category: "Minuman",
    stock: 35,
    unit: "tpk",
    image_url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300"
  },
  {
    id: "ret_5",
    sku: "8991001005",
    name: "Sabun Cair Lifebuoy Total 10 450ml Refill",
    price: 26000,
    category: "Kebersihan",
    stock: 28,
    unit: "pouch",
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300"
  },
  {
    id: "ret_6",
    sku: "8991001006",
    name: "Air Mineral Le Minerale Botol 600ml",
    price: 3500,
    category: "Minuman",
    stock: 200,
    unit: "btl",
    image_url: "https://images.unsplash.com/photo-1560023907-5f339617ea30?w=300"
  },
  {
    id: "ret_7",
    sku: "8991001007",
    name: "Kopi Kapal Api Spesial Mix 20g (Pack)",
    price: 15000,
    category: "Minuman",
    stock: 50,
    unit: "pack",
    image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300"
  },
  {
    id: "ret_8",
    sku: "8991001008",
    name: "Deterjen Rinso Anti Noda 770g",
    price: 28500,
    category: "Kebersihan",
    stock: 18,
    unit: "bag",
    image_url: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=300"
  },
  {
    id: "ret_9",
    sku: "8991001009",
    name: "Biskuit Oreo Original 133g",
    price: 10500,
    category: "Makanan Ringan",
    stock: 60,
    unit: "pcs",
    image_url: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300"
  },
  {
    id: "ret_10",
    sku: "8991001010",
    name: "Kecap Manis Bango Botol 520ml",
    price: 24000,
    category: "Bumbu & Dapur",
    stock: 24,
    unit: "btl",
    image_url: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300"
  }
];

const RETAIL_CATEGORIES = ["Semua", "Sembako", "Minuman", "Makanan Ringan", "Kebersihan", "Bumbu & Dapur"];

export default function RetailPOSView() {
  const { user } = useAuth();
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [cart, setCart] = useState<RetailCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS" | "DEBIT">("CASH");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(`pos_tenant_${user.id}_products`);
      if (saved) {
        setProducts(JSON.parse(saved));
      } else {
        setProducts([]);
      }
    } catch (e) {
      setProducts([]);
    }
  }, [user]);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "Semua" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const addToCart = (product: RetailProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as RetailCartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const paidVal = parseFloat(paidAmount) || 0;
  const change = Math.max(0, paidVal - subtotal);

  const handleCheckoutSubmit = () => {
    const invoiceNo = generateInvoiceCode({ invoicePrefix: "RTL" });
    const orderData = {
      invoiceNo,
      date: new Date().toLocaleString("id-ID"),
      items: [...cart],
      total: subtotal,
      paid: paymentMethod === "CASH" ? paidVal : subtotal,
      change: paymentMethod === "CASH" ? change : 0,
      paymentMethod,
    };
    setCompletedOrder(orderData);
    setIsPaymentOpen(false);
    setIsReceiptOpen(true);
    setCart([]);
    setPaidAmount("");
  };

  return (
    <div className="flex flex-col landscape:flex-row md:flex-row h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans gap-2 md:gap-4 p-2 md:p-4 overflow-y-auto landscape:overflow-hidden md:overflow-hidden pb-16 md:pb-4">
      {/* Left Area: Product Catalog & Search */}
      <div className="flex flex-col flex-1 space-y-3 landscape:h-full md:h-full min-h-[350px]">
        {/* Top Header & Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <ShoppingBag className="size-4 text-blue-600" /> Kasir Minimarket & Retail
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Pindai SKU barcode atau cari nama produk untuk transaksi cepat.
              </p>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari SKU Barcode / Nama..."
                className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-none h-8"
              />
            </div>
          </div>

          {/* Category Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {RETAIL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-all rounded-none border ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Catalog */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filteredProducts.map((p) => {
              const inCart = cart.find((item) => item.product.id === p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 flex flex-col justify-between hover:border-blue-500 hover:shadow-md transition-all cursor-pointer rounded-none"
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 z-10 shadow-xs">
                      {inCart.qty}x
                    </span>
                  )}

                  <div>
                    <div className="aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-1.5 relative">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] font-mono px-1 py-0.2">
                        {p.sku}
                      </span>
                    </div>

                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                      {p.category}
                    </span>
                    <h3 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-2 mt-0.5 leading-snug">
                      {p.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white">
                        Rp {p.price.toLocaleString("id-ID")}
                      </p>
                      <p className="text-[9px] text-slate-400">Stok: {p.stock} {p.unit}</p>
                    </div>

                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white size-6 p-0 rounded-none shadow-xs"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Area: Checkout Cart Drawer */}
      <div className="w-full landscape:w-72 sm:landscape:w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between shadow-xs shrink-0 landscape:h-full md:h-full max-h-full min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2 shrink-0">
            <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="size-4 text-blue-600" /> Keranjang ({totalItemsCount})
            </h2>

            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] text-red-500 hover:underline font-medium"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1.5">
                <ShoppingBag className="size-8 mx-auto opacity-30 text-slate-400" />
                <p className="text-xs font-medium">Keranjang masih kosong.</p>
                <p className="text-[10px] text-slate-500">Pilih atau scan barcode produk.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-slate-50 dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Rp {item.product.price.toLocaleString("id-ID")} x {item.qty}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="size-5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 grid place-items-center hover:bg-slate-300"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      className="size-5 bg-blue-600 text-white grid place-items-center hover:bg-blue-700"
                    >
                      <Plus className="size-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="size-5 text-red-500 hover:text-red-700 grid place-items-center ml-0.5"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cart Total & Checkout Button */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-2 mt-2 shrink-0 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Total Barang:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{totalItemsCount} item</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
              <span>Total Bayar:</span>
              <span className="text-blue-600 dark:text-blue-400">Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <Button
            disabled={cart.length === 0}
            onClick={() => setIsPaymentOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-10 rounded-none shadow-md gap-2"
          >
            <CreditCard className="size-4" /> Bayar (Rp {subtotal.toLocaleString("id-ID")})
          </Button>
        </div>
      </div>

      {/* Modal Pembayaran */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-md rounded-none bg-slate-900 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Banknote className="size-5 text-blue-400" /> Pembayaran Transaksi Retail
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-950 p-4 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Tagihan Kasir</p>
              <p className="text-2xl font-black text-blue-400 mt-1">
                Rp {subtotal.toLocaleString("id-ID")}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CASH", label: "Tunai (Cash)" },
                  { id: "QRIS", label: "QRIS Static" },
                  { id: "DEBIT", label: "Kartu Debit" }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 px-3 text-xs font-bold border rounded-none transition-all ${
                      paymentMethod === m.id
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "CASH" && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nominal Tunai Diterima (Rp)</label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="Masukkan jumlah uang tunai..."
                  className="bg-slate-950 border-slate-800 text-white font-mono font-bold text-base h-11 rounded-none"
                />

                <div className="flex gap-1.5 mt-2">
                  {[subtotal, 50000, 100000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPaidAmount(preset.toString())}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 text-slate-300 font-mono hover:bg-slate-700"
                    >
                      Rp {preset.toLocaleString("id-ID")}
                    </button>
                  ))}
                </div>

                <div className="mt-3 bg-slate-950 p-2.5 border border-slate-800 flex justify-between text-xs">
                  <span className="text-slate-400">Kembalian:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    Rp {change.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsPaymentOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 rounded-none text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleCheckoutSubmit}
              disabled={paymentMethod === "CASH" && paidVal < subtotal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-none"
            >
              Selesaikan Transaksi & Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Struk Struk Selesai */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-sm rounded-none bg-white text-slate-900 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-base flex flex-col items-center gap-1">
              <CheckCircle2 className="size-8 text-emerald-500" /> Transaksi Berhasil!
            </DialogTitle>
          </DialogHeader>

          {completedOrder && (
            <div className="space-y-3 py-2 font-mono text-xs">
              <div className="text-center border-b pb-2">
                <p className="font-bold text-sm">MINIMARKET RETAIL POS</p>
                <p className="text-[10px] text-slate-500">No: {completedOrder.invoiceNo}</p>
                <p className="text-[10px] text-slate-500">{completedOrder.date}</p>
              </div>

              <div className="space-y-1.5">
                {completedOrder.items.map((item: any) => (
                  <div key={item.product.id} className="flex justify-between text-[11px]">
                    <div>
                      <p className="font-bold leading-none">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500">{item.qty} x Rp {item.product.price.toLocaleString("id-ID")}</p>
                    </div>
                    <span className="font-bold">Rp {(item.qty * item.product.price).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>Rp {completedOrder.total.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Bayar ({completedOrder.paymentMethod}):</span>
                  <span>Rp {completedOrder.paid.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Kembali:</span>
                  <span>Rp {completedOrder.change.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => {
                window.print();
                setIsReceiptOpen(false);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-2 rounded-none"
            >
              <Printer className="size-4" /> Cetak Struk Struk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
