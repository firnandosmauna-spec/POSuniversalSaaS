import { useState, useEffect } from "react";
import { 
  ChefHat, 
  Wine, 
  Clock, 
  CheckCircle2, 
  Play, 
  Check, 
  RotateCcw, 
  RefreshCw, 
  Search, 
  Flame, 
  Sparkles, 
  Printer, 
  Loader2,
  Utensils,
  Bell,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";

type TransactionItem = {
  id: string;
  product_name: string;
  qty: number;
  price: number;
  product_id?: string;
};

type KitchenOrder = {
  id: string;
  created_at: string;
  order_type: string;
  status: string;
  kitchen_status?: "pending" | "preparing" | "ready" | "served";
  tables?: { name: string } | null;
  customers?: { name: string } | null;
  transaction_items: TransactionItem[];
};

export function KitchenView() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Local state storage for kitchen status (fallback if DB column not present)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, "pending" | "preparing" | "ready" | "served">>({});
  // Item completion state per order: orderId -> itemId -> boolean
  const [completedItems, setCompletedItems] = useState<Record<string, Record<string, boolean>>>({});
  
  // Filters
  const [stationFilter, setStationFilter] = useState<"all" | "kitchen" | "bar">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "preparing" | "ready" | "served">("all");
  
  // Auto refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Load status overrides from localStorage for persistence across reloads
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_kitchen_status_overrides");
      if (saved) setStatusOverrides(JSON.parse(saved));
      
      const savedItems = localStorage.getItem("pos_kitchen_completed_items");
      if (savedItems) setCompletedItems(JSON.parse(savedItems));
    } catch (e) {
      console.error("Error reading kitchen local storage:", e);
    }
  }, []);

  // Save status overrides to localStorage
  const updateOrderStatus = async (orderId: string, newStatus: "pending" | "preparing" | "ready" | "served") => {
    const updated = { ...statusOverrides, [orderId]: newStatus };
    setStatusOverrides(updated);
    localStorage.setItem("pos_kitchen_status_overrides", JSON.stringify(updated));

    // Try updating Supabase database if kitchen_status column exists
    try {
      await supabase.from("transactions").update({ kitchen_status: newStatus }).eq("id", orderId);
    } catch (err) {
      // Non-fatal if column doesn't exist
    }
  };

  const toggleItemCheck = (orderId: string, itemId: string) => {
    setCompletedItems(prev => {
      const orderState = prev[orderId] || {};
      const nextOrderState = { ...orderState, [itemId]: !orderState[itemId] };
      const nextState = { ...prev, [orderId]: nextOrderState };
      localStorage.setItem("pos_kitchen_completed_items", JSON.stringify(nextState));
      return nextState;
    });
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          created_at,
          order_type,
          status,
          kitchen_status,
          tables ( name ),
          customers ( name ),
          transaction_items ( id, product_name, qty, price, product_id )
        `)
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);

      if (error) throw error;
      setOrders((data as any) || []);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Error fetching kitchen orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Polling auto refresh every 6 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchOrders();
    }, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh, user]);

  const getProductStationMap = (): Record<string, "dapur" | "bar"> => {
    try {
      const saved = localStorage.getItem("pos_product_stations");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const isBarProduct = (productName: string, productId?: string) => {
    const map = getProductStationMap();
    if (productId && map[productId]) {
      return map[productId] === "bar";
    }
    const name = productName.toLowerCase();
    return (
      name.includes("es ") ||
      name.includes("kopi") ||
      name.includes("jus") ||
      name.includes("teh") ||
      name.includes("drink") ||
      name.includes("minum") ||
      name.includes("air") ||
      name.includes("susu") ||
      name.includes("boba") ||
      name.includes("latte") ||
      name.includes("tea") ||
      name.includes("matcha") ||
      name.includes("mocktail")
    );
  };

  const isDrinkItem = (item: TransactionItem) => {
    const name = item.product_name.toLowerCase();
    return (
      name.includes("es ") ||
      name.includes("kopi") ||
      name.includes("jus") ||
      name.includes("es") ||
      name.includes("boba") ||
      name.includes("latte") ||
      name.includes("tea") ||
      name.includes("matcha") ||
      name.includes("mocktail")
    );
  };

  const getEffectiveStatus = (order: KitchenOrder): "pending" | "preparing" | "ready" | "served" => {
    if (statusOverrides[order.id]) return statusOverrides[order.id]!;
    if (order.kitchen_status) return order.kitchen_status;
    return "pending";
  };

  const getTimeElapsedMinutes = (dateString: string) => {
    const start = new Date(dateString).getTime();
    const now = new Date().getTime();
    return Math.floor((now - start) / (1000 * 60));
  };

  // Filter logic
  const processedOrders = orders.map(order => ({
    ...order,
    effectiveStatus: getEffectiveStatus(order)
  }));

  const filteredOrders = processedOrders.filter(order => {
    // Exclude hold orders unless needed
    if (order.status === "hold") return false;

    // Search filter
    const matchesSearch = 
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      (order.tables?.name && order.tables.name.toLowerCase().includes(search.toLowerCase())) ||
      (order.customers?.name && order.customers.name.toLowerCase().includes(search.toLowerCase())) ||
      order.transaction_items.some(i => i.product_name.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter !== "all" && order.effectiveStatus !== statusFilter) {
      return false;
    }

    // Station filter (Dapur vs Bar)
    if (stationFilter === "kitchen") {
      // Must have at least 1 non-bar item
      return order.transaction_items.some(i => !isBarProduct(i.product_name, i.product_id));
    }
    if (stationFilter === "bar") {
      // Must have at least 1 bar item
      return order.transaction_items.some(i => isBarProduct(i.product_name, i.product_id));
    }

    return true;
  });

  // Calculate counts for header
  const pendingCount = processedOrders.filter(o => o.effectiveStatus === "pending").length;
  const preparingCount = processedOrders.filter(o => o.effectiveStatus === "preparing").length;
  const readyCount = processedOrders.filter(o => o.effectiveStatus === "ready").length;

  const printKitchenTicket = (order: KitchenOrder) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const itemsHtml = order.transaction_items.map(item => `
      <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:bold; margin-bottom:6px;">
        <span>${item.qty} x ${item.product_name}</span>
      </div>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Tiket Dapur #${order.id.substring(0, 8)}</title>
          <style>
            body { font-family: monospace; padding: 10px; width: 280px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 18px; font-weight: bold; }
            .footer { border-top: 2px dashed #000; pt-8px; margin-top: 12px; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">TIKET DAPUR / BAR</div>
            <div>#${order.id.substring(0, 8)}</div>
            <div style="font-size:14px; font-weight:bold; margin-top:4px;">
              ${order.order_type === 'dine_in' ? `DINE IN - ${order.tables?.name || 'MEJA'}` : 'TAKE AWAY'}
            </div>
            <div>Waktu: ${new Date(order.created_at).toLocaleTimeString('id-ID')}</div>
          </div>
          <div>${itemsHtml}</div>
          <div class="footer">
            <p>Antrean Dapur POS Universal</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-100 overflow-y-auto">
      {/* Header Utama */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Layar Dapur & Bar (KDS)
            </h1>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor pesanan masuk, proses memasak, dan status penyajian makanan & minuman.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Badge Ringkasan Antrean */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs">
            <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              <Flame className="size-3.5" /> {pendingCount} Antrean
            </span>
            <span className="flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              <Utensils className="size-3.5" /> {preparingCount} Dimasak
            </span>
            <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <CheckCircle2 className="size-3.5" /> {readyCount} Siap
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`border-slate-200 font-semibold text-xs ${autoRefresh ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-600'}`}
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? "Auto Sync On" : "Auto Sync Off"}
          </Button>

          <Button
            size="sm"
            onClick={fetchOrders}
            className="bg-brand text-white hover:bg-brand/90 font-semibold text-xs"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Control Bar: Stasiun Filter (Semua / Dapur / Bar) & Filter Status */}
      <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Tab Stasiun (Semua / Dapur / Bar) */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStationFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                stationFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="size-3.5 text-amber-500" /> Semua Stasiun
            </button>
            <button
              onClick={() => setStationFilter("kitchen")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                stationFilter === "kitchen" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ChefHat className="size-3.5 text-orange-500" /> 🍳 Dapur (Makanan)
            </button>
            <button
              onClick={() => setStationFilter("bar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                stationFilter === "bar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wine className="size-3.5 text-purple-500" /> 🥤 Bar (Minuman)
            </button>
          </div>
        </div>

        {/* Filter Status & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${statusFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${statusFilter === "pending" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500"}`}
            >
              Antrean ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("preparing")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${statusFilter === "preparing" ? "bg-blue-500 text-white shadow-sm" : "text-slate-500"}`}
            >
              Memasak ({preparingCount})
            </button>
            <button
              onClick={() => setStatusFilter("ready")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${statusFilter === "ready" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500"}`}
            >
              Siap Saji ({readyCount})
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari meja, item, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      {/* Grid Kartu Pesanan Dapur */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="size-8 animate-spin text-brand mb-3" />
          <p className="text-sm font-medium text-slate-500">Memuat antrean dapur...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm flex-1 flex flex-col items-center justify-center min-h-[350px]">
          <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
            <ChefHat className="size-8" />
          </div>
          <h2 className="mb-1 font-display text-lg font-bold text-slate-800">
            Tidak Ada Pesanan Aktif
          </h2>
          <p className="text-sm text-slate-500 max-w-sm">
            Semua pesanan di stasiun ini telah selesai atau belum ada pesanan baru dari Kasir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 flex-1 items-start">
          {filteredOrders.map(order => {
            const minutesElapsed = getTimeElapsedMinutes(order.created_at);
            const isLate = minutesElapsed >= 15;
            const orderStatus = order.effectiveStatus;
            
            // Filter items for station display if active
            const displayItems = order.transaction_items.filter(item => {
              if (stationFilter === "kitchen") return !isBarProduct(item.product_name, item.product_id);
              if (stationFilter === "bar") return isBarProduct(item.product_name, item.product_id);
              return true;
            });

            if (displayItems.length === 0) return null;

            return (
              <div 
                key={order.id} 
                className={`bg-white rounded-xl border shadow-sm transition-all overflow-hidden flex flex-col ${
                  orderStatus === "pending" 
                    ? "border-amber-300 ring-1 ring-amber-200" 
                    : orderStatus === "preparing" 
                    ? "border-blue-300 ring-1 ring-blue-200" 
                    : orderStatus === "ready" 
                    ? "border-emerald-300 ring-1 ring-emerald-200" 
                    : "border-slate-200 opacity-75"
                }`}
              >
                {/* Header Kartu Pesanan */}
                <div className={`p-4 border-b flex items-start justify-between ${
                  orderStatus === "pending" ? "bg-amber-50/70 border-amber-100" :
                  orderStatus === "preparing" ? "bg-blue-50/70 border-blue-100" :
                  orderStatus === "ready" ? "bg-emerald-50/70 border-emerald-100" : "bg-slate-50 border-slate-100"
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        #{order.id.substring(0, 8)}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        order.order_type === "dine_in" 
                          ? "bg-indigo-100 text-indigo-700 border border-indigo-200" 
                          : "bg-orange-100 text-orange-700 border border-orange-200"
                      }`}>
                        {order.order_type === "dine_in" ? `Meja: ${order.tables?.name || '-'}` : "Take Away"}
                      </span>
                    </div>

                    {order.customers?.name && (
                      <p className="text-xs font-semibold text-slate-600 mt-1">
                        Pelanggan: {order.customers.name}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className={`flex items-center justify-end gap-1 text-xs font-bold ${
                      isLate ? "text-red-600 animate-pulse" : "text-slate-600"
                    }`}>
                      <Clock className="size-3.5" />
                      <span>{minutesElapsed} mnt</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Body: Daftar Item Pesanan */}
                <div className="p-4 flex-1 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Item Pesanan ({displayItems.length})
                  </div>

                  {displayItems.map(item => {
                    const isChecked = completedItems[order.id]?.[item.id] || false;
                    const isBar = isBarProduct(item.product_name, item.product_id);

                    return (
                      <div 
                        key={item.id}
                        onClick={() => toggleItemCheck(order.id, item.id)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isChecked 
                            ? "bg-slate-50 border-slate-200 opacity-50 line-through" 
                            : "bg-slate-50/50 border-slate-200/80 hover:border-brand/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="size-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                          />
                          <div>
                            <p className="font-bold text-slate-800 text-sm">
                              <span className="text-brand font-black mr-1 text-base">{item.qty}x</span> {item.product_name}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isBar ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {isBar ? "BAR" : "DAPUR"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Controls & Stepper */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    {orderStatus === "pending" && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, "preparing")}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Flame className="size-4" /> Mulai Olah / Masak
                      </Button>
                    )}

                    {orderStatus === "preparing" && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, "ready")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Check className="size-4" /> Tandai Siap Saji
                      </Button>
                    )}

                    {orderStatus === "ready" && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, "served")}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="size-4" /> Selesai Disajikan
                      </Button>
                    )}

                    {orderStatus === "served" && (
                      <div className="w-full text-center text-xs font-bold text-emerald-600 bg-emerald-50 py-1.5 rounded border border-emerald-200">
                        ✓ Pesanan Selesai
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <button
                      onClick={() => updateOrderStatus(order.id, "pending")}
                      className="hover:text-slate-800 underline flex items-center gap-1"
                    >
                      <RotateCcw className="size-3" /> Reset Status
                    </button>

                    <button
                      onClick={() => printKitchenTicket(order)}
                      className="hover:text-brand font-semibold flex items-center gap-1"
                    >
                      <Printer className="size-3" /> Cetak Tiket
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

