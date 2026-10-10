import { useState, useEffect } from "react";
import { Package, Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Upload, ChefHat, Wine, ChevronLeft, ChevronRight, ChevronDown, ScanLine, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";
import { PrintingProductsView } from "@/domains/printing/ProductsView";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  cost_price: number;
  price: number;
  stock: number | null;
  category: string | null;
  image_url: string | null;
  status: string;
  target_station?: "dapur" | "bar" | string;
};

export function ProductsView() {
  const { user } = useAuth();

  if ((user?.businessType as string) === "PRINTING") {
    return <PrintingProductsView />;
  }
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<"menu" | "daftar" | "kategori" | "diskon" | "tipe_pesanan">("menu");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  
  // Dummy State for Diskon and Tipe Pesanan to make them interactive
  const [discounts, setDiscounts] = useState<{id: string, name: string, value: string}[]>([
    { id: "1", name: "Diskon Karyawan", value: "20%" },
    { id: "2", name: "Promo Akhir Tahun", value: "10%" }
  ]);
  const [orderTypes, setOrderTypes] = useState<{id: string, name: string}[]>([
    { id: "1", name: "Dine In (Makan di Tempat)" },
    { id: "2", name: "Takeaway (Bungkus)" },
    { id: "3", name: "GoFood / GrabFood" }
  ]);

  // Form State
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [targetStation, setTargetStation] = useState<"dapur" | "bar">("dapur");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "stock">("info");
  const [trackStock, setTrackStock] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState<"recount" | "add" | "reduce">("recount");
  const [minStock, setMinStock] = useState("0");
  const [stockNotes, setStockNotes] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const getLocalStations = (): Record<string, "dapur" | "bar"> => {
    try {
      const saved = localStorage.getItem("pos_product_stations");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const saveLocalStation = (productId: string, station: "dapur" | "bar") => {
    try {
      const current = getLocalStations();
      current[productId] = station;
      localStorage.setItem("pos_product_stations", JSON.stringify(current));
    } catch {}
  };

  const isBarName = (productName: string) => {
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
      name.includes("tea")
    );
  };

  const tenantProductKey = user ? `pos_tenant_${user.id}_products` : "pos_tenant_demo_products";

  const fetchProducts = async () => {
    if (!user) return;
    setIsLoading(true);
    const localStations = getLocalStations();
    let loadedProducts: Product[] = [];

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        loadedProducts = data.map((p: any) => ({
          ...p,
          target_station: p.target_station || localStations[p.id] || (isBarName(p.name) ? "bar" : "dapur")
        }));
        localStorage.setItem(tenantProductKey, JSON.stringify(loadedProducts));
      } else {
        const saved = localStorage.getItem(tenantProductKey);
        if (saved) {
          loadedProducts = JSON.parse(saved);
        }
      }
    } catch (error) {
      console.warn("Error fetching products from Supabase (using local fallback):", error);
      const saved = localStorage.getItem(tenantProductKey);
      if (saved) {
        loadedProducts = JSON.parse(saved);
      }
    } finally {
      // Global cleanup for bad UUIDs
      const validProducts = loadedProducts.filter((p: any) => !p.id.startsWith("prod_"));
      if (validProducts.length !== loadedProducts.length) {
        loadedProducts = validProducts;
        localStorage.setItem(tenantProductKey, JSON.stringify(validProducts));
      }

      setProducts(loadedProducts);
      setIsLoading(false);
      return loadedProducts; // Return for fetchCategories to use
    }
  };

  const fetchCategories = async (loadedProducts?: Product[]) => {
    if (!user) return;
    try {
      const { data } = await supabase.from("categories").select("*").order("name");
      let currentCategories: any[] = [];
      
      if (data && data.length > 0) {
        currentCategories = data;
      }

      // Dynamically extract unique categories from products
      const currentProducts = loadedProducts || products;
      if (currentProducts && currentProducts.length > 0) {
        const productCategories = Array.from(new Set(currentProducts.map(p => p.category).filter(Boolean) as string[]));
        
        for (const catName of productCategories) {
          if (catName === "Umum") continue;
          
          const exists = currentCategories.some(c => c.name.toLowerCase() === catName.toLowerCase());
          if (!exists) {
            const newCat = {
              id: crypto.randomUUID(),
              name: catName,
              tenant_id: user.id
            };
            currentCategories.push(newCat);
            
            // Background sync to Supabase
            supabase.from("categories").insert([newCat]).then(({ error }) => {
              if (error) console.warn("Background category sync failed", error);
            });
          }
        }
      }

      setCategories(currentCategories);
    } catch (error) {
      setCategories(DEFAULT_FNB_CATEGORIES);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProducts().then(loaded => {
        fetchCategories(loaded);
      });
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setCostPrice(product.cost_price.toString());
      setPrice(product.price.toString());
      setStock(product.stock !== null && product.stock !== -1 ? product.stock.toString() : "");
      setCategory(product.category || "");
      setStatus(product.status || "active");
      setTargetStation((product.target_station as any) || (isBarName(product.name) ? "bar" : "dapur"));
      setImagePreview(product.image_url);
      setTrackStock(product.stock !== null && product.stock !== -1);
      setActiveTab("info");
      setStockAdjustment("recount");
      setMinStock("0");
      setStockNotes("");
      setIsHistoryOpen(false);
    } else {
      setEditingProduct(null);
      setName("");
      setCostPrice("");
      setPrice("");
      setStock("");
      setCategory("");
      setStatus("active");
      setTargetStation("dapur");
      setImagePreview(null);
      setTrackStock(false);
      setActiveTab("info");
      setStockAdjustment("recount");
      setMinStock("0");
      setStockNotes("");
      setIsHistoryOpen(false);
    }
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Gagal mengunggah foto: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      let imageUrl = editingProduct?.image_url || null;
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
        } catch (e) {
          console.warn("Image upload warning:", e);
        }
      }

      const fallbackUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const productId = editingProduct ? editingProduct.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : fallbackUUID());
      let finalStock = -1;
      if (trackStock) {
        const currentStock = editingProduct?.stock && editingProduct.stock !== -1 ? editingProduct.stock : 0;
        const adjustAmount = parseInt(stock, 10) || 0;
        if (stockAdjustment === "recount") {
          finalStock = adjustAmount;
        } else if (stockAdjustment === "add") {
          finalStock = currentStock + adjustAmount;
        } else if (stockAdjustment === "reduce") {
          finalStock = Math.max(0, currentStock - adjustAmount);
        }
      }

      const newProductItem: Product = {
        id: productId,
        name: name.trim(),
        sku: null,
        cost_price: parseFloat(costPrice) || 0,
        price: parseFloat(price) || 0,
        stock: finalStock,
        category: category || "Umum",
        image_url: imageUrl,
        status,
        target_station: targetStation
      };

      // 1. Local update immediately for instant user feedback
      let updatedProductsList: Product[] = [];
      if (editingProduct) {
        updatedProductsList = products.map((p) => (p.id === editingProduct.id ? newProductItem : p));
        
        // Save Stock History
        if (trackStock && finalStock !== editingProduct.stock) {
          const historyEntry = {
            tenant_id: user.id,
            product_id: productId,
            product_name: newProductItem.name,
            previous_stock: editingProduct.stock === -1 ? 0 : editingProduct.stock,
            new_stock: finalStock,
            adjustment_type: stockAdjustment,
            adjustment_amount: stockAdjustment === "recount" ? finalStock : parseInt(stock, 10) || 0,
            notes: stockNotes || null,
            created_at: new Date().toISOString()
          };
          try {
            const lsKey = `pos_stock_history_${user.id}_${productId}`;
            const saved = localStorage.getItem(lsKey);
            const historyList = saved ? JSON.parse(saved) : [];
            localStorage.setItem(lsKey, JSON.stringify([historyEntry, ...historyList].slice(0, 50)));
          } catch (e) { }
        }
      } else {
        updatedProductsList = [newProductItem, ...products];
        // Save initial stock history if tracked
        if (trackStock) {
          const historyEntry = {
            tenant_id: user.id,
            product_id: productId,
            product_name: newProductItem.name,
            previous_stock: 0,
            new_stock: finalStock,
            adjustment_type: "recount",
            adjustment_amount: finalStock,
            notes: stockNotes || "Stok awal",
            created_at: new Date().toISOString()
          };
          try {
            const lsKey = `pos_stock_history_${user.id}_${productId}`;
            localStorage.setItem(lsKey, JSON.stringify([historyEntry]));
          } catch (e) { }
        }
      }
      setProducts(updatedProductsList);
      localStorage.setItem(tenantProductKey, JSON.stringify(updatedProductsList));
      saveLocalStation(productId, targetStation);

      // 2. Async sync to Supabase
      if (user && !user.id.includes("tenant_")) {
        try {
          const productData = {
            id: productId,
            tenant_id: user.id,
            name: newProductItem.name,
            cost_price: newProductItem.cost_price,
            price: newProductItem.price,
            stock: newProductItem.stock,
            category: newProductItem.category,
            status: newProductItem.status,
            image_url: newProductItem.image_url
          };

          if (editingProduct) {
            // Remove id and tenant_id from update payload to avoid RLS/PK conflicts
            const { id: _omitId, tenant_id: _omitTenant, ...updatePayload } = productData;
            const { error } = await supabase.from("products").update(updatePayload).eq("id", editingProduct.id);
            if (error) {
              console.error("Update error:", error);
              alert("Data tersimpan lokal, namun gagal sinkronisasi ke cloud: " + (error?.message || "Error tidak diketahui"));
            }
          } else {
            const { error } = await supabase.from("products").insert([productData]);
            if (error) {
              console.error("Insert error:", error);
              alert("Data tersimpan lokal, namun gagal sinkronisasi ke cloud: " + (error?.message || "Error tidak diketahui"));
            }
          }

          // 3. Sync newly typed category to `categories` table if it doesn't exist
          if (newProductItem.category && newProductItem.category !== "Umum") {
            const catName = newProductItem.category;
            const categoryExists = categories.some(c => c.name.toLowerCase() === catName.toLowerCase());
            if (!categoryExists) {
              const newCat = {
                id: crypto.randomUUID(),
                name: newProductItem.category,
                tenant_id: user.id
              };
              // Add to local state immediately
              setCategories(prev => [...prev, newCat]);
              // Insert to Supabase
              supabase.from("categories").insert([newCat]).then(({ error }) => {
                if (error) console.warn("Failed to sync new category to Supabase", error);
              });
            }
          }

        } catch (err) {
          console.warn("Supabase product sync exception (saved locally):", err);
        }
      }
      
      // Reset form
      setEditingProduct(null);
      setName("");
      setCostPrice("");
      setPrice("");
      setStock("");
      setCategory("");
      setImageFile(null);
      setImagePreview(null);
      
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini?")) return;
    
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    localStorage.setItem(tenantProductKey, JSON.stringify(updated));

    if (user && !user.id.includes("tenant_")) {
      try {
        await supabase.from("products").delete().eq("id", id);
      } catch (error) {
        console.warn("Supabase product delete sync error:", error);
      }
    }
  };

  const isFnb = user?.businessType === "FNB" || user?.businessType === "CAFE";
  const isPrinting = user?.businessType === "PRINTING";
  const isLaundry = user?.businessType === "LAUNDRY";

  const getPageTitle = () => {
    return "Daftar Produk";
  };

  if (activeView === "menu") {
    return (
      <div className="flex flex-col h-full bg-white md:bg-transparent overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center h-14 px-4 bg-white border-b border-slate-100 shrink-0">
          <button onClick={() => document.dispatchEvent(new CustomEvent('toggleSidebar'))} className="p-2 -ml-2 mr-2 text-slate-800">
            <Menu className="size-5" />
          </button>
          <h1 className="font-extrabold text-slate-900 text-[17px]">Kelola Produk</h1>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex mb-4 md:mb-6 items-center justify-between gap-2 px-6 pt-6">
          <h1 className="font-display text-xl md:text-2xl font-bold text-slate-900">Kelola Produk</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 md:px-6">
          <div className="bg-white md:border md:border-slate-100 md:shadow-sm md:rounded-2xl flex flex-col">
            <button onClick={() => setActiveView("daftar")} className="flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <span className="text-[15px] font-medium text-slate-700">Daftar Produk</span>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-[13px]">{products.length} Produk</span>
                <ChevronRight className="size-4" />
              </div>
            </button>
            <button onClick={() => setActiveView("kategori")} className="flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors w-full">
              <span className="text-[15px] font-medium text-slate-700">Kategori</span>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-[13px]">{categories.length} Kategori</span>
                <ChevronRight className="size-4" />
              </div>
            </button>
            <button onClick={() => setActiveView("diskon")} className="flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors w-full">
              <span className="text-[15px] font-medium text-slate-700">Diskon</span>
              <div className="flex items-center gap-2 text-slate-400">
                <ChevronRight className="size-4" />
              </div>
            </button>
            <button onClick={() => setActiveView("tipe_pesanan")} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors w-full">
              <span className="text-[15px] font-medium text-slate-700">Tipe Pesanan</span>
              <div className="flex items-center gap-2 text-slate-400">
                <ChevronRight className="size-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "kategori") {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="flex items-center h-14 px-4 bg-white border-b border-slate-100 shrink-0">
          <button onClick={() => setActiveView("menu")} className="p-2 -ml-2 mr-2 text-slate-800">
            <ChevronLeft className="size-6" />
          </button>
          <h1 className="font-extrabold text-slate-900 text-[17px] flex-1">Kategori Produk</h1>
          <Button className="bg-[#0b172a] text-white rounded-xl h-8 px-3 text-xs font-bold">
            <Plus className="size-3 mr-1" /> Tambah
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden">
            {categories.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Belum ada kategori.</div>
            ) : (
              categories.map((cat, i) => (
                <div key={cat.id} className={`flex items-center justify-between p-4 ${i !== categories.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "diskon") {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="flex items-center h-14 px-4 bg-white border-b border-slate-100 shrink-0">
          <button onClick={() => setActiveView("menu")} className="p-2 -ml-2 mr-2 text-slate-800">
            <ChevronLeft className="size-6" />
          </button>
          <h1 className="font-extrabold text-slate-900 text-[17px] flex-1">Manajemen Diskon</h1>
          <Button 
            onClick={() => {
              const name = prompt("Masukkan nama diskon (contoh: Promo Kemerdekaan):");
              if (!name) return;
              const val = prompt("Masukkan nilai diskon (contoh: 15%):");
              if (!val) return;
              setDiscounts([...discounts, { id: Date.now().toString(), name, value: val }]);
            }}
            className="bg-[#0b172a] text-white rounded-xl h-8 px-3 text-xs font-bold"
          >
            <Plus className="size-3 mr-1" /> Tambah
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden">
            {discounts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Belum ada diskon.</div>
            ) : (
              discounts.map((disc, i) => (
                <div key={disc.id} className={`flex items-center justify-between p-4 ${i !== discounts.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{disc.name}</span>
                    <span className="text-xs text-slate-500">{disc.value}</span>
                  </div>
                  <button onClick={() => setDiscounts(discounts.filter(d => d.id !== disc.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "tipe_pesanan") {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="flex items-center h-14 px-4 bg-white border-b border-slate-100 shrink-0">
          <button onClick={() => setActiveView("menu")} className="p-2 -ml-2 mr-2 text-slate-800">
            <ChevronLeft className="size-6" />
          </button>
          <h1 className="font-extrabold text-slate-900 text-[17px] flex-1">Tipe Pesanan</h1>
          <Button 
            onClick={() => {
              const name = prompt("Masukkan tipe pesanan baru (contoh: Pre-Order):");
              if (name) {
                setOrderTypes([...orderTypes, { id: Date.now().toString(), name }]);
              }
            }}
            className="bg-[#0b172a] text-white rounded-xl h-8 px-3 text-xs font-bold"
          >
            <Plus className="size-3 mr-1" /> Tambah
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden">
            {orderTypes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Belum ada tipe pesanan.</div>
            ) : (
              orderTypes.map((type, i) => (
                <div key={type.id} className={`flex items-center justify-between p-4 ${i !== orderTypes.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <span className="font-bold text-slate-800">{type.name}</span>
                  <button onClick={() => setOrderTypes(orderTypes.filter(t => t.id !== type.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 md:p-6 pb-24 md:pb-6 h-full flex flex-col bg-slate-50/50 md:bg-transparent">
        <div className="flex items-center h-14 px-4 bg-white border-b border-slate-100 md:hidden shrink-0">
          <button onClick={() => setActiveView("menu")} className="p-2 -ml-2 mr-2 text-slate-800">
            <ChevronLeft className="size-6" />
          </button>
          <h1 className="font-extrabold text-slate-900 text-[17px] flex-1">Daftar Produk</h1>
        </div>

        <div className="hidden md:flex mb-4 md:mb-6 items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveView("menu")} className="p-2 -ml-2 bg-white rounded-full hover:bg-slate-100 text-slate-600 shadow-sm border border-slate-200">
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="font-display text-xl md:text-2xl font-bold text-slate-900">
              {getPageTitle()}
            </h1>
          </div>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-[#0b172a] text-white hover:bg-slate-800 rounded-xl h-10 md:h-11 px-4 md:px-5 font-bold flex items-center gap-2 text-xs md:text-sm shadow-sm"
          >
            <Plus className="size-4" />
            <span>Tambah Produk</span>
          </Button>
        </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingProduct(null);
          }}>
            <DialogContent className="w-full sm:max-w-[450px] h-[100dvh] sm:h-auto sm:max-h-[85vh] p-0 flex flex-col overflow-hidden bg-white border-0 sm:border rounded-none sm:rounded-2xl top-0 translate-y-0 sm:top-1/2 sm:-translate-y-1/2">
              {isHistoryOpen ? (
                <>
                  <DialogHeader className="p-3 border-b border-slate-200 bg-white flex flex-row items-center justify-between shrink-0 pt-safe">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setIsHistoryOpen(false)} className="p-2 -ml-2 text-slate-700">
                        <ChevronLeft className="size-6" />
                      </button>
                      <DialogTitle className="font-display font-bold text-lg text-slate-800">Riwayat Stok</DialogTitle>
                    </div>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
                    <Package className="size-16 text-slate-300 mb-4" />
                    <h3 className="font-display font-bold text-lg text-slate-700 mb-2">Riwayat Belum Tersedia</h3>
                    <p className="text-sm text-slate-500 max-w-[250px] mb-6">
                      Fitur pelacakan riwayat dan kartu stok secara mendetail akan segera hadir di pembaruan selanjutnya.
                    </p>
                    <Button 
                      onClick={() => setIsHistoryOpen(false)}
                      className="bg-[#0b172a] text-white hover:bg-slate-800 rounded-xl px-6 font-bold"
                    >
                      Kembali
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader className="p-3 border-b border-slate-200 bg-white flex flex-row items-center justify-between shrink-0 pt-safe">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setIsDialogOpen(false)} className="p-2 -ml-2 text-slate-700">
                        <ChevronLeft className="size-6" />
                      </button>
                  <DialogTitle className="font-display font-bold text-lg text-slate-800">{editingProduct ? "Ubah Produk" : "Buat Produk Baru"}</DialogTitle>
                </div>
              </DialogHeader>
              
              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-white shrink-0 px-4 pt-2">
                <div 
                  onClick={() => setActiveTab("info")}
                  className={`flex-1 py-3 text-center font-bold text-sm cursor-pointer transition-colors ${activeTab === "info" ? "border-b-2 border-[#0b172a] text-[#0b172a]" : "text-slate-300 hover:text-slate-500"}`}
                >
                  Informasi Produk
                </div>
                <div 
                  onClick={() => setActiveTab("stock")}
                  className={`flex-1 py-3 text-center font-bold text-sm cursor-pointer transition-colors ${activeTab === "stock" ? "border-b-2 border-[#0b172a] text-[#0b172a]" : "text-slate-300 hover:text-slate-500"}`}
                >
                  Manajemen Stok
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                <form id="product-form" onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6">
                  {activeTab === "info" ? (
                    <>
                      <div>
                        <h2 className="font-display font-extrabold text-xl text-slate-800 mb-4">Detail Produk</h2>
                    
                    <div className="mb-6">
                      <Label className="text-sm font-medium text-slate-600 mb-2 block">Foto Produk</Label>
                      <div className="flex items-center gap-4 mb-3">
                        <div 
                          className="size-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                          onClick={() => document.getElementById('image-upload')?.click()}
                        >
                           {imagePreview ? (
                              <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                           ) : (
                              <ImageIcon className="size-6 text-slate-400" />
                           )}
                        </div>
                        <Button 
                          type="button" 
                          onClick={() => document.getElementById('image-upload')?.click()}
                          className="bg-[#0b172a] text-white hover:bg-slate-800 font-bold px-6 tracking-widest rounded-lg text-xs h-10 shadow-sm"
                        >
                          PILIH FOTO
                        </Button>
                        <input 
                          id="image-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageChange}
                        />
                      </div>
                      <p className="text-sm text-slate-500 mb-3 font-medium">Tap untuk mengganti warna background</p>
                      <div className="flex gap-2.5">
                        {['bg-slate-100', 'bg-red-600', 'bg-orange-500', 'bg-yellow-400', 'bg-blue-500', 'bg-purple-600', 'bg-emerald-500', 'bg-amber-800'].map(color => (
                          <div key={color} className={`size-8 rounded-full ${color} border-2 border-white ring-1 ring-slate-200 cursor-pointer active:scale-95 transition-transform`} />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Nama Produk</Label>
                        <Input 
                          required 
                          placeholder="Ayam Goreng" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-12 rounded-xl text-slate-800 font-medium placeholder:text-slate-300"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Harga Jual</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-medium">Rp</span>
                          <Input 
                            type="number" 
                            required 
                            placeholder="15.000" 
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="h-12 rounded-xl pl-10 text-slate-800 font-medium placeholder:text-slate-300"
                          />
                        </div>
                      </div>

                      <div className="flex items-start justify-between py-2 border-b border-dashed border-slate-200 pb-6">
                        <div>
                          <Label className="text-sm font-medium text-slate-700 block">Harga Jual per Tipe Pesanan</Label>
                          <p className="text-[13px] text-slate-500 mt-1 max-w-[280px]">Terapkan harga berbeda untuk setiap tipe pesanan (contoh: Makan Di Tempat, Go-Food, Tokopedia)</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsDetailOpen(!isDetailOpen)}
                      className="flex items-center justify-between w-full py-2 group"
                    >
                      <h3 className="font-extrabold text-[17px] text-slate-800">Detail Tambahan (Opsional)</h3>
                      <ChevronDown className={`size-5 text-slate-500 group-hover:text-slate-800 transition-transform ${isDetailOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isDetailOpen && (
                      <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Deskripsi Produk (Opsional)</Label>
                        <div className="relative">
                          <textarea 
                            placeholder="Tulis Deskripsi"
                            className="w-full h-32 rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20 resize-none placeholder:text-slate-400"
                          />
                          <span className="absolute bottom-3 right-3 text-xs text-slate-400 font-medium">160 / 160</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Kategori</Label>
                        <div className="relative">
                          <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm appearance-none bg-white text-slate-400"
                          >
                            <option value="">Pilih category</option>
                            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                          </select>
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-800 font-bold" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Harga Modal</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-medium">Rp</span>
                          <Input 
                            type="number" 
                            placeholder="15.000" 
                            value={costPrice}
                            onChange={(e) => setCostPrice(e.target.value)}
                            className="h-12 rounded-xl pl-10 text-slate-800 font-medium bg-white placeholder:text-slate-300"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">SKU</Label>
                        <Input placeholder="KS94RUUR" className="h-12 rounded-xl bg-white placeholder:text-slate-300" />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Barcode Produk</Label>
                        <div className="relative">
                          <Input placeholder="Tulis catatan" className="h-12 rounded-xl pr-12 bg-white placeholder:text-slate-300" />
                          <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-slate-600" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Outlet</Label>
                        <div className="relative">
                          <select className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm appearance-none bg-white text-slate-700 font-medium">
                            <option>Semua Outlet</option>
                          </select>
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-800 font-bold" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Berat Produk (Gram)</Label>
                        <Input placeholder="500" className="h-12 rounded-xl bg-white placeholder:text-slate-300" />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Ukuran Produk (cm)</Label>
                        <div className="flex items-center gap-2">
                          <Input placeholder="Panjang" className="h-12 rounded-xl text-center bg-white placeholder:text-slate-300" />
                          <span className="text-slate-700 font-medium">X</span>
                          <Input placeholder="Lebar" className="h-12 rounded-xl text-center bg-white placeholder:text-slate-300" />
                          <span className="text-slate-700 font-medium">X</span>
                          <Input placeholder="Tinggi" className="h-12 rounded-xl text-center bg-white placeholder:text-slate-300" />
                        </div>
                      </div>

                        <div className="bg-[#fff8d6] text-slate-600 font-medium p-4 rounded-xl text-[13px] border border-[#f0e6b2]">
                          Berat dan dimensi diperlukan untuk kurir Pesan Antar.
                        </div>
                      </div>
                    )}
                  </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-6">
                        <div>
                          <h2 className="font-display font-extrabold text-xl text-slate-800 mb-2">Stok Produk</h2>
                          <p className="text-[13px] text-slate-500 max-w-[250px]">Lacak pengurangan dan penambahan stok produk ini</p>
                        </div>
                        <Switch checked={trackStock} onCheckedChange={setTrackStock} />
                      </div>

                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 font-medium mb-1">Stok Saat Ini:</p>
                          <div className="flex items-center gap-3">
                            <span className="font-display font-bold text-2xl text-slate-800">
                              {editingProduct?.stock && editingProduct.stock !== -1 ? editingProduct.stock : '0'}
                            </span>
                          </div>
                        </div>
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsHistoryOpen(true)}
                          className="bg-white hover:bg-slate-100 text-slate-700 border-slate-200 font-bold tracking-widest text-[11px] h-10 px-4 rounded-lg transition-colors"
                        >
                          RIWAYAT
                        </Button>
                      </div>

                      {trackStock && (
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Penyesuaian Stok</Label>
                            <div className="relative">
                              <select 
                                value={stockAdjustment}
                                onChange={(e) => setStockAdjustment(e.target.value as any)}
                                className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm appearance-none bg-white text-slate-700 font-medium"
                              >
                                <option value="recount">Hitung Ulang Stok</option>
                                <option value="add">Penambahan Stok</option>
                                <option value="reduce">Pengurangan Stok</option>
                              </select>
                              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-800 font-bold" />
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Jumlah Stok Terbaru</Label>
                            <Input 
                              type="number" 
                              placeholder="Contoh: 6" 
                              value={stock}
                              onChange={(e) => setStock(e.target.value)}
                              className="h-12 rounded-xl text-slate-800 font-medium placeholder:text-slate-300"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Stok Minimum</Label>
                            <Input 
                              type="number" 
                              value={minStock}
                              onChange={(e) => setMinStock(e.target.value)}
                              className="h-12 rounded-xl text-slate-800 font-medium placeholder:text-slate-300"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-slate-600 mb-1.5 block">Catatan (Opsional)</Label>
                            <textarea 
                              placeholder="Tulis catatan" 
                              value={stockNotes}
                              onChange={(e) => setStockNotes(e.target.value)}
                              className="w-full h-24 rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b172a]/20 resize-none placeholder:text-slate-300"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>

              <div className="p-4 border-t border-slate-100 bg-white pb-safe shrink-0">
                <Button 
                  form="product-form"
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-lg transition-colors font-bold uppercase tracking-widest shadow-none"
                  style={{ backgroundColor: (name && price) ? '#0b172a' : '#e2e8f0', color: (name && price) ? 'white' : 'white' }}
                >
                  {isSubmitting ? "MENYIMPAN..." : "SIMPAN"}
                </Button>
              </div>
                </>
              )}
            </DialogContent>
        </Dialog>

        {/* History Modal */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-slate-50 flex flex-col h-[85vh] sm:h-[600px] rounded-2xl">
            <DialogHeader className="p-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 -ml-2 text-slate-700">
                  <ChevronLeft className="size-6" />
                </button>
                <DialogTitle className="font-display font-bold text-lg text-slate-800">Riwayat Stok</DialogTitle>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(() => {
                const lsKey = user ? `pos_stock_history_${user.id}_${editingProduct?.id}` : "";
                const saved = localStorage.getItem(lsKey);
                const historyList = saved ? JSON.parse(saved) : [];
                
                if (historyList.length === 0) {
                  return (
                    <div className="text-center text-slate-400 py-10 text-sm">
                      Belum ada riwayat perubahan stok untuk produk ini.
                    </div>
                  );
                }

                return historyList.map((entry: any, i: number) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(entry.created_at).toLocaleString("id-ID", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        entry.adjustment_type === 'add' ? 'bg-green-100 text-green-700' :
                        entry.adjustment_type === 'reduce' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {entry.adjustment_type === 'add' ? 'PENAMBAHAN' :
                         entry.adjustment_type === 'reduce' ? 'PENGURANGAN' :
                         'HITUNG ULANG'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium text-sm line-through decoration-slate-300">{entry.previous_stock}</span>
                        <ChevronRight className="size-3 text-slate-400" />
                        <span className="text-slate-800 font-bold text-base">{entry.new_stock}</span>
                      </div>
                      <div className="text-slate-800 font-bold text-sm">
                        {entry.adjustment_type === 'add' ? '+' : entry.adjustment_type === 'reduce' ? '-' : ''}{entry.adjustment_amount}
                      </div>
                    </div>
                    {entry.notes && (
                      <div className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </DialogContent>
        </Dialog>
      

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 text-[#0b172a] animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-8 text-center text-slate-500 shadow-sm flex-1 flex flex-col items-center justify-center">
          <Package className="mx-auto mb-4 size-8 md:size-12 text-slate-300" />
          <h2 className="mb-2 font-display text-base md:text-lg font-semibold text-slate-700">
            Katalog Masih Kosong
          </h2>
          <p className="text-[10px] md:text-sm max-w-md mx-auto">
            Mulai tambahkan produk, menu makanan, atau minuman beserta harga dan gambarnya ke dalam katalog.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-white border border-slate-200 rounded-2xl p-3 flex gap-4 items-center shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => handleOpenDialog(product)}
              >
                {product.image_url ? (
                  <div className="size-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="size-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    <ImageIcon className="size-6 opacity-30" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-800 truncate mb-1">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-extrabold text-[#0b172a]">
                      Rp {product.price.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                    {product.category && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[80px]">
                        {product.category}
                      </span>
                    )}
                    <span>Stok: {product.stock === null || product.stock === -1 ? '∞' : product.stock}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Hapus produk ini?")) handleDelete(product.id);
                    }}
                    className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {product.status !== "active" && (
                  <div className="absolute top-0 right-0 bg-slate-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                    Nonaktif
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
