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
  const [fetchError, setFetchError] = useState<string | null>(null);
  
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
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      // 1. Fetch transactions safely without foreign keys to avoid schema errors
      const { data: trxData, error: trxError } = await supabase
        .from("transactions")
        .select(`id, created_at, order_type, status, kitchen_status, table_id, customer_id`)
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);

      let fetchedTransactions = trxData as any[];

      if (trxError) {
        // Fallback without kitchen_status if it fails
        const retry = await supabase
          .from("transactions")
          .select(`id, created_at, order_type, status, table_id, customer_id`)
          .eq("tenant_id", user.id)
          .order("created_at", { ascending: false })
          .limit(40);
        
        if (retry.error) {
          setFetchError(`Trx Error: ${retry.error.message || JSON.stringify(retry.error)}`);
          throw retry.error;
        }
        fetchedTransactions = retry.data as any[];
      }

      if (!fetchedTransactions) {
        fetchedTransactions = [];
      }

      // 2. Fetch transaction items manually
      const trxIds = fetchedTransactions.map(t => t.id);
      let itemsData: any[] = [];
      try {
        const { data: items } = await supabase
          .from("transaction_items")
          .select(`id, transaction_id, product_name, qty, price, product_id`)
          .in("transaction_id", trxIds);
        if (items) itemsData = items;
      } catch (e) {
        console.error("Error fetching items:", e);
      }

      // 3. Assemble the final orders array
      const assembledOrders = fetchedTransactions.map(t => {
        const tItems = itemsData.filter(i => i.transaction_id === t.id);
        return {
          ...t,
          tables: null, // we skip tables/customers join for now to ensure reliability
          customers: null,
          transaction_items: tItems.map(item => ({
            id: item.id,
            product_name: item.product_name,
            qty: item.qty,
            price: item.price,
            product_id: item.product_id
          }))
        };
      });

      // 4. Merge with localStorage fallback transactions
      let mergedOrders = [...assembledOrders];
      try {
        const saved = localStorage.getItem(`pos_transactions_${user.id}`);
        if (saved) {
          const localTrx = JSON.parse(saved);
          // Only add local transactions that are not already from Supabase
          const existingIds = new Set(mergedOrders.map(o => o.id));
          const newLocalTrx = localTrx.filter((lt: any) => !existingIds.has(lt.id));
          mergedOrders = [...newLocalTrx, ...mergedOrders];
          // Sort by created_at descending
          mergedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (e) {
        console.error("Failed to merge local transactions", e);
      }

      setFetchError(null);
      setOrders(mergedOrders as any);
      setLastRefreshed(new Date());
    } catch (error: any) {
      console.error("Error fetching kitchen orders:", error);
      if (!fetchError) {
        setFetchError(`Catch: ${error.message || JSON.stringify(error)}`);
      }
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
    const name = (productName || "").toLowerCase();
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
    const name = (item.product_name || "").toLowerCase();
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
              ${order.order_type === 'dine_in' ? `DINE IN - ${order.tables?.name || 'MEJA'}` : order.order_type === 'delivery' ? 'PESAN ANTAR' : 'TAKE AWAY'}
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

  const injectDummyOrder = () => {
    try {
      const lsKey = `pos_transactions_${user?.id}`;
      const saved = localStorage.getItem(lsKey);
      const currentTrx = saved ? JSON.parse(saved) : [];
      const dummyTrx = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        order_type: "dine_in",
        status: "completed",
        kitchen_status: "pending",
        tables: { name: "Meja Uji Coba" },
        transaction_items: [
          { id: `item_${Date.now()}_1`, product_name: "Nasi Goreng Spesial", qty: 2, price: 25000 },
          { id: `item_${Date.now()}_2`, product_name: "Es Teh Manis", qty: 2, price: 5000 }
        ]
      };
      localStorage.setItem(lsKey, JSON.stringify([dummyTrx, ...currentTrx]));
      fetchOrders();
    } catch (e) {
      alert("Gagal inject dummy order: " + e);
    }
  };

  return (
    <div className="p-2 md:p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header Utama */}
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg md:text-2xl font-bold text-slate-900 dark:text-white">
              Layar Dapur & Bar (KDS)
            </h1>
            <span className="flex h-2 w-2 md:h-2.5 md:w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5 hidden md:block">
            Monitor pesanan masuk, proses memasak, dan status penyajian makanan & minuman.
          </p>
        </div>

        <div className="hidden md:flex flex-wrap items-center gap-3">
          {/* Badge Ringkasan Antrean */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-[10px] md:text-xs">
            <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-900/50">
              <Flame className="size-3.5" /> {pendingCount} Antrean
            </span>
            <span className="flex items-center gap-1 font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
              <Utensils className="size-3.5" /> {preparingCount} Dimasak
            </span>
            <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle2 className="size-3.5" /> {readyCount} Siap
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={injectDummyOrder}
            className="border-dashed border-amber-300 text-amber-600 hover:text-amber-800 bg-amber-50 rounded-xl h-9"
          >
            <Sparkles className="size-3.5 mr-1.5" />
            Tes Dummy
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`rounded-xl h-9 font-semibold text-xs border ${autoRefresh ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-600 border-slate-200'}`}
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? "Auto Sync On" : "Auto Sync Off"}
          </Button>

          <Button
            size="sm"
            onClick={fetchOrders}
            className="bg-[#0b172a] text-white hover:bg-slate-800 font-bold text-xs rounded-xl h-9 px-4 shadow-sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Control Bar: Stasiun Filter (Semua / Dapur / Bar) & Filter Status */}
      {/* Control Bar: Stasiun Filter (Semua / Dapur / Bar) & Filter Status */}
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 bg-white dark:bg-slate-900 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        {/* Tab Stasiun (Semua / Dapur / Bar) */}
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1 md:pb-0">
          <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700/50 shrink-0">
            <button
              onClick={() => setStationFilter("all")}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all ${
                stationFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="size-3.5 text-amber-500" /> Semua Stasiun
            </button>
            <button
              onClick={() => setStationFilter("kitchen")}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all ${
                stationFilter === "kitchen" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ChefHat className="size-3.5 text-orange-500" /> 🍳 Dapur (Makanan)
            </button>
            <button
              onClick={() => setStationFilter("bar")}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all ${
                stationFilter === "bar" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Wine className="size-3.5 text-purple-500" /> 🥤 Bar (Minuman)
            </button>
          </div>
        </div>

        {/* Filter Status & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="hidden md:flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700/50 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg ${statusFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg ${statusFilter === "pending" ? "bg-[#0b172a] text-white shadow-sm" : "text-slate-500"}`}
            >
              Antrean ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("preparing")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg ${statusFilter === "preparing" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500"}`}
            >
              Memasak ({preparingCount})
            </button>
            <button
              onClick={() => setStatusFilter("ready")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg ${statusFilter === "ready" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500"}`}
            >
              Siap Saji ({readyCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari meja, item, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="mx-4 mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-bold">Gagal memuat pesanan dapur:</p>
          <p className="font-mono text-xs mt-1 break-all">{fetchError}</p>
        </div>
      )}

      {/* Grid Kartu Pesanan Dapur */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="size-8 animate-spin text-[#0b172a] mb-3" />
          <p className="text-sm font-bold text-slate-500">Memuat antrean dapur...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-slate-500 shadow-sm flex-1 flex flex-col items-center justify-center min-h-[350px]">
          <div className="size-16 rounded-[16px] bg-slate-50 flex items-center justify-center mb-4 text-slate-300">
            <ChefHat className="size-8" />
          </div>
          <h2 className="mb-1 font-display text-lg font-bold text-slate-800">
            Tidak Ada Pesanan Aktif
          </h2>
          <p className="text-sm text-slate-400 font-medium max-w-sm">
            Semua pesanan di stasiun ini telah selesai atau belum ada pesanan baru dari Kasir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 flex-1 items-start">
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
                className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden flex flex-col ${
                  orderStatus === "pending" 
                    ? "border-amber-200 ring-1 ring-amber-100/50" 
                    : orderStatus === "preparing" 
                    ? "border-blue-200 ring-1 ring-blue-100/50" 
                    : orderStatus === "ready" 
                    ? "border-emerald-200 ring-1 ring-emerald-100/50" 
                    : "border-slate-100 opacity-75"
                }`}
              >
                {/* Header Kartu Pesanan */}
                <div className={`p-3 md:p-4 border-b flex items-start justify-between ${
                  orderStatus === "pending" ? "bg-amber-50/50 border-amber-100" :
                  orderStatus === "preparing" ? "bg-blue-50/50 border-blue-100" :
                  orderStatus === "ready" ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50/50 border-slate-100"
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                      <span className="font-mono text-[9px] sm:text-[10px] font-extrabold uppercase text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-sm">
                        #{order.id.substring(0, 8)}
                      </span>
                      <span className={`text-[8px] sm:text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        order.order_type === "dine_in" 
                          ? "bg-[#0b172a] text-white" 
                          : "bg-slate-200 text-slate-700"
                      }`}>
                        {order.order_type === "dine_in" ? `Meja: ${order.tables?.name || '-'}` : "Take Away"}
                      </span>
                    </div>

                    {order.customers?.name && (
                      <p className="text-[9px] sm:text-[11px] font-bold text-slate-700 mt-1">
                        Cust: {order.customers.name}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <div className={`flex items-center justify-end gap-1 text-[10px] sm:text-xs font-extrabold px-2 py-1 rounded-lg ${
                      isLate ? "bg-red-50 text-red-600 animate-pulse border border-red-100" : "bg-white text-slate-600 border border-slate-100 shadow-sm"
                    }`}>
                      <Clock className="size-3 sm:size-3.5" />
                      <span>{minutesElapsed}m</span>
                    </div>
                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-1">
                      {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Body: Daftar Item Pesanan */}
                <div className="p-2 md:p-4 flex-1 space-y-2 md:space-y-3">
                  <div className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Pesanan ({displayItems.length})
                  </div>

                  {displayItems.map(item => {
                    const isChecked = completedItems[order.id]?.[item.id] || false;
                    const isBar = isBarProduct(item.product_name, item.product_id);

                    return (
                      <div 
                        key={item.id}
                        onClick={() => toggleItemCheck(order.id, item.id)}
                        className={`p-2 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                          isChecked 
                            ? "bg-slate-50 border-slate-200 opacity-50" 
                            : "bg-white border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="size-4 sm:size-5 rounded-md text-[#0b172a] focus:ring-[#0b172a] accent-[#0b172a] cursor-pointer"
                          />
                          <div>
                            <p className={`font-bold text-[10px] sm:text-[13px] leading-tight ${isChecked ? "line-through text-slate-500" : "text-slate-800"}`}>
                              <span className="text-[#0b172a] font-black mr-1 text-[11px] sm:text-base">{item.qty}x</span> {item.product_name}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[7px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          isBar ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {isBar ? "BAR" : "KITCHEN"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Controls & Stepper */}
                <div className="p-2 md:p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2 sm:gap-3">
                  <div className="flex items-center justify-between gap-2">
                    {orderStatus === "pending" && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, "preparing")}
                        className="w-full bg-[#0b172a] hover:bg-slate-800 text-white font-bold text-[10px] sm:text-[11px] py-1.5 sm:py-2.5 px-2 h-auto shadow-md rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Flame className="size-3.5 sm:size-4" /> Mulai Olah
                      </Button>
                    )}

                    {orderStatus === "preparing" && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, "ready")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] sm:text-[11px] py-1.5 sm:py-2.5 px-2 h-auto shadow-md rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Check className="size-3.5 sm:size-4" /> Siap Saji
                      </Button>
                    )}

                    {orderStatus === "ready" && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, "served")}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-[11px] py-1.5 sm:py-2.5 px-2 h-auto shadow-md rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="size-3.5 sm:size-4" /> Selesai
                      </Button>
                    )}

                    {orderStatus === "served" && (
                      <div className="w-full text-center text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 py-2 rounded-xl border border-emerald-200/50 shadow-sm">
                        ✓ Disajikan
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[9px] sm:text-[11px] text-slate-500 pt-1 px-1 font-semibold">
                    <button
                      onClick={() => updateOrderStatus(order.id, "pending")}
                      className="hover:text-slate-800 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="size-3 sm:size-3.5" /> Ulangi
                    </button>

                    <button
                      onClick={() => printKitchenTicket(order)}
                      className="hover:text-[#0b172a] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Printer className="size-3 sm:size-3.5" /> Cetak Tiket
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

