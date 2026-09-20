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
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("categories").select("*").order("name");
      setCategories(data || []);
    } catch (error) {}
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
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

      const productId = editingProduct ? editingProduct.id : crypto.randomUUID();
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
      const productData = {
        id: productId,
        tenant_id: user.id,
        name: newProductItem.name,
        cost_price: newProductItem.cost_price,
        price: newProductItem.price,
        stock: newProductItem.stock,
        category: newProductItem.category,
        status: newProductItem.status,
        image_url: newProductItem.image_url,
        target_station: targetStation
      };

      try {
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
      } catch (err) {
        console.warn("Supabase product sync exception (saved locally):", err);
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

    try {
      await supabase.from("products").delete().eq("id", id);
    } catch (error) {
      console.warn("Supabase product delete sync error:", error);
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
            className="bg-brand text-white hover:bg-brand/90 flex items-center gap-2"
          >
            <Plus className="size-4" />
            Tambah Produk
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingProduct(null);
          }}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Ubah Produk" : "Tambah Produk Baru"}</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              
              {/* Image Upload Area */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div 
                    className="size-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden group cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <ImageIcon className="size-8 mb-2" />
                        <span className="text-xs font-medium">Unggah Foto</span>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    {imagePreview && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="size-6 text-white" />
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

              <div className="space-y-2">
                <Label htmlFor="name">Nama Produk</Label>
                <Input 
                  id="name" 
                  required 
                  placeholder="Cth: Kopi Susu Aren" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Tanpa Kategori --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stok Awal (Kosong = Unlimited)</Label>
                  <Input 
                    id="stock" 
                    type="number" 
                    placeholder="Unlimited" 
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
              </div>

              {/* Stasiun Tujuan (Dapur vs Bar - Khusus F&B) */}
              {isFnb && (
                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center justify-between">
                    <span>Stasiun Tujuan Pesanan</span>
                    <span className="text-[11px] font-normal text-slate-500">Dapur (Makanan) / Bar (Minuman)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTargetStation("dapur")}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                        targetStation === "dapur"
                          ? "bg-orange-50 border-orange-400 text-orange-700 ring-2 ring-orange-400/20 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <ChefHat className="size-4 text-orange-500" /> 🍳 Dapur (Makanan)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetStation("bar")}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                        targetStation === "bar"
                          ? "bg-purple-50 border-purple-400 text-purple-700 ring-2 ring-purple-400/20 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Wine className="size-4 text-purple-500" /> 🥤 Bar (Minuman)
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-white">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Tampilkan Produk (Dijual)</Label>
                  <p className="text-xs text-slate-500">Matikan untuk menyimpan produk ini ke status Hold / Draft.</p>
                </div>
                <Switch 
                  checked={status === "active"}
                  onCheckedChange={(checked) => setStatus(checked ? "active" : "hold")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  <Label htmlFor="costPrice" className="text-slate-600">Harga Modal (Rp)</Label>
                  <Input 
                    id="costPrice" 
                    type="number" 
                    placeholder="0" 
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-brand font-bold">Harga Jual (Rp)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    required 
                    placeholder="0" 
                    value={price}
                    className="font-bold border-brand/30 focus-visible:ring-brand/50"
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isSubmitting || !name || !price}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : null}
                {isSubmitting ? "Menyimpan ke Cloud..." : (editingProduct ? "Simpan Perubahan" : "Simpan Produk")}
              </Button>
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
