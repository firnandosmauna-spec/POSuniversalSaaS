import { useState, useEffect } from "react";
import { Package, Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Upload, ChefHat, Wine } from "lucide-react";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

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
      setProducts(loadedProducts);
      setIsLoading(false);
      return loadedProducts; // Return for fetchCategories to use
    }
  };

  const DEFAULT_FNB_CATEGORIES = [
    { id: "cat_main", name: "Makanan Utama" },
    { id: "cat_drink", name: "Minuman" },
    { id: "cat_snack", name: "Camilan" },
    { id: "cat_dessert", name: "Dessert" },
    { id: "cat_package", name: "Paket Menu" },
    { id: "cat_other", name: "Lain-lain" }
  ];

  const fetchCategories = async (loadedProducts?: Product[]) => {
    if (!user) return;
    try {
      const { data } = await supabase.from("categories").select("*").order("name");
      let currentCategories: any[] = [];
      
      if (data && data.length > 0) {
        currentCategories = data;
      } else {
        currentCategories = [...DEFAULT_FNB_CATEGORIES];
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

      const fallbackUUID = () => `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const productId = editingProduct ? editingProduct.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : fallbackUUID());
      const newProductItem: Product = {
        id: productId,
        name: name.trim(),
        sku: null,
        cost_price: parseFloat(costPrice) || 0,
        price: parseFloat(price) || 0,
        stock: stock.trim() === "" ? -1 : parseInt(stock, 10),
        category: category || "Umum",
        image_url: imageUrl,
        status,
        target_station: targetStation
      };

      // 1. Local update immediately for instant user feedback
      let updatedProductsList: Product[] = [];
      if (editingProduct) {
        updatedProductsList = products.map((p) => (p.id === editingProduct.id ? newProductItem : p));
      } else {
        updatedProductsList = [newProductItem, ...products];
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
            const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
            if (error) {
              console.error("Update error:", error);
              alert("Data tersimpan lokal, namun gagal sinkronisasi ke cloud.");
            }
          } else {
            const { error } = await supabase.from("products").insert([productData]);
            if (error) {
              console.error("Insert error:", error);
              alert("Data tersimpan lokal, namun gagal sinkronisasi ke cloud.");
            }
          }

          // 3. Sync newly typed category to `categories` table if it doesn't exist
          if (newProductItem.category && newProductItem.category !== "Umum") {
            const categoryExists = categories.some(c => c.name.toLowerCase() === newProductItem.category.toLowerCase());
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
    if (isPrinting) return "Katalog Bahan & Material Cetak";
    if (isLaundry) return "Daftar Layanan & Tarif Laundry";
    if (isFnb) return "Katalog Menu & Produk Resto";
    return "Katalog Produk & Stok";
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {getPageTitle()}
        </h1>
        
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-none h-10 px-4 font-bold flex items-center gap-2"
          >
            <Plus className="size-4" />
            Tambah Produk
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingProduct(null);
          }}>
            <DialogContent className="sm:max-w-[425px] rounded-none p-0 overflow-hidden">
              <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50">
                <DialogTitle className="font-display font-bold text-lg">{editingProduct ? "Ubah Produk" : "Tambah Produk Baru"}</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              
              <div className="flex justify-center mb-2">
                <div className="relative">
                  <div 
                    className="size-20 border border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden group cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <ImageIcon className="size-6 mb-1" />
                        <span className="text-[10px] font-bold uppercase">Foto</span>
                      </div>
                    )}
                    
                    {imagePreview && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="size-4 text-white" />
                      </div>
                    )}
                  </div>
                  <input 
                    id="image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase text-slate-500">Nama Produk</Label>
                <Input 
                  id="name" 
                  required 
                  placeholder="Cth: Kopi Susu Aren" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-none h-8 text-xs font-medium border-slate-300 focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-[10px] font-bold uppercase text-slate-500">Kategori</Label>
                  <Input
                    id="category"
                    list="category-options"
                    value={category}
                    placeholder="Pilih atau ketik kategori..."
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-none h-8 text-xs font-medium border-slate-300 focus-visible:ring-0 focus-visible:border-slate-900"
                  />
                  <datalist id="category-options">
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stock" className="text-[10px] font-bold uppercase text-slate-500">Stok (Kosong = Unlimited)</Label>
                  <Input 
                    id="stock" 
                    type="number" 
                    placeholder="Unlimited" 
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="rounded-none h-8 text-xs font-medium border-slate-300 focus-visible:ring-0 focus-visible:border-slate-900"
                  />
                </div>
              </div>

              {isFnb && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Stasiun Tujuan</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetStation("dapur")}
                      className={`p-2 border flex items-center justify-center gap-1 text-[10px] uppercase font-bold transition-all cursor-pointer rounded-none ${
                        targetStation === "dapur"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <ChefHat className="size-3" /> Dapur
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetStation("bar")}
                      className={`p-2 border flex items-center justify-center gap-1 text-[10px] uppercase font-bold transition-all cursor-pointer rounded-none ${
                        targetStation === "bar"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Wine className="size-3" /> Bar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-y border-slate-200 py-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Tampilkan Produk (Aktif)</Label>
                <Switch 
                  checked={status === "active"}
                  onCheckedChange={(checked) => setStatus(checked ? "active" : "hold")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="costPrice" className="text-[10px] font-bold uppercase text-slate-500">Harga Modal (Rp)</Label>
                  <Input 
                    id="costPrice" 
                    type="number" 
                    placeholder="0" 
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="rounded-none h-8 text-xs font-mono font-bold border-slate-300 focus-visible:ring-0 focus-visible:border-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="price" className="text-[10px] font-bold uppercase text-slate-900">Harga Jual (Rp)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    required 
                    placeholder="0" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="rounded-none h-8 text-xs font-mono font-bold border-slate-900 focus-visible:ring-0 focus-visible:border-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-none font-bold h-10 text-xs" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit" className="flex-1 rounded-none bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 text-xs" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : (editingProduct ? "Simpan Perubahan" : "Simpan Produk")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 text-brand animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm flex-1 flex flex-col items-center justify-center">
          <Package className="mx-auto mb-4 size-12 text-slate-300" />
          <h2 className="mb-2 font-display text-lg font-semibold text-slate-700">
            Katalog Masih Kosong
          </h2>
          <p className="text-sm max-w-md mx-auto">
            Mulai tambahkan produk, menu makanan, atau minuman beserta harga dan gambarnya ke dalam katalog.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex-1">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px]">Foto</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Kategori</TableHead>
                {isFnb && <TableHead className="text-center">Stasiun</TableHead>}
                <TableHead className="text-right">Harga Modal</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[100px] text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image_url ? (
                      <div className="size-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="size-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                        <Package className="size-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{product.name}</TableCell>
                  <TableCell>
                    {product.category ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
                        {product.category}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  {isFnb && (
                    <TableCell className="text-center">
                      {product.target_station === "bar" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                          <Wine className="size-3" /> Bar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-700 border border-orange-200">
                          <ChefHat className="size-3" /> Dapur
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-slate-500">
                    Rp {product.cost_price.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-700">
                    Rp {product.price.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-slate-700">
                      {product.stock !== null && product.stock !== -1 ? product.stock : <span className="text-slate-400 font-normal text-xs">Tak Terbatas</span>}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {product.status === "hold" ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                        Hold
                      </span>
                    ) : product.stock === null || product.stock === -1 ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        Tersedia
                      </span>
                    ) : product.stock === 0 ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
                        Habis
                      </span>
                    ) : product.stock <= 5 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                        Menipis
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        Tersedia
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-brand hover:bg-brand/10"
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
