import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/shared/auth/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Ruler, 
  Printer, 
  Layers, 
  Scissors, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Box, 
  Tag
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export interface PrintingMaterial {
  id: string;
  name: string;
  category: "OUTDOOR" | "INDOOR" | "SHEET_DOC" | "MERCHANDISE";
  unitType: "m²" | "lembar" | "pcs" | "box" | "roll";
  costPrice: number; // HPP
  price: number; // Harga Jual
  stock: number; // Sisa Stok
  minOrder: number; // Min Order
  description: string;
  finishingsAllowed: string[]; // e.g. ["Laminasi Glossy", "Mata Ayam", "Potong Die Cut"]
  isAvailable: boolean;
  branchId?: string;
  branchName?: string;
  createdAt?: string;
}

const DEFAULT_MATERIALS: PrintingMaterial[] = [
  {
    id: "mat_1",
    name: "Flexi China Standard 280g",
    category: "OUTDOOR",
    unitType: "m²",
    costPrice: 12000,
    price: 20000,
    stock: 500,
    minOrder: 1,
    description: "Bahan spanduk banner standar outdoor ekonomis tahan cuaca",
    finishingsAllowed: ["Mata Ayam (Ring)", "Lipat Pres / Lem", "Kolong Kayu"],
    isAvailable: true
  },
  {
    id: "mat_2",
    name: "Flexi Korchin High Resolution 380g",
    category: "OUTDOOR",
    unitType: "m²",
    costPrice: 18000,
    price: 35000,
    stock: 350,
    minOrder: 1,
    description: "Bahan baliho tebal serat rapat warna tajam hasil cetak cetar",
    finishingsAllowed: ["Mata Ayam (Ring)", "Lipat Pres / Lem"],
    isAvailable: true
  },
  {
    id: "mat_3",
    name: "Albatros Synthetic Film 180g",
    category: "INDOOR",
    unitType: "m²",
    costPrice: 30000,
    price: 60000,
    stock: 120,
    minOrder: 1,
    description: "Bahan halus matte indoor cocok untuk Roll Up Banner & X-Banner",
    finishingsAllowed: ["Laminasi Glossy", "Laminasi Doff"],
    isAvailable: true
  },
  {
    id: "mat_4",
    name: "Stiker Vinyl Camel Glossy",
    category: "INDOOR",
    unitType: "m²",
    costPrice: 35000,
    price: 75000,
    stock: 200,
    minOrder: 1,
    description: "Stiker vinyl tahan air perekat kuat cocok cetak label & dekorasi",
    finishingsAllowed: ["Laminasi Glossy", "Laminasi Doff", "Potong Kiss Cut", "Potong Die Cut"],
    isAvailable: true
  },
  {
    id: "mat_5",
    name: "Art Paper 150g A3+",
    category: "SHEET_DOC",
    unitType: "lembar",
    costPrice: 800,
    price: 2500,
    stock: 2000,
    minOrder: 5,
    description: "Kertas licin brosur / poster A3+ cetak digital press warna hidup",
    finishingsAllowed: ["Laminasi Glossy", "Laminasi Doff", "Lipat Brosur"],
    isAvailable: true
  },
  {
    id: "mat_6",
    name: "Art Carton 260g A3+",
    category: "SHEET_DOC",
    unitType: "lembar",
    costPrice: 1200,
    price: 4000,
    stock: 1500,
    minOrder: 5,
    description: "Kertas tebal cocok untuk kartu nama, cover buku, & hanger tag",
    finishingsAllowed: ["Laminasi Glossy", "Laminasi Doff", "Potong Die Cut", "Rel / Creasing"],
    isAvailable: true
  },
  {
    id: "mat_7",
    name: "Mug Coating Keramik Standard",
    category: "MERCHANDISE",
    unitType: "pcs",
    costPrice: 10000,
    price: 25000,
    stock: 80,
    minOrder: 1,
    description: "Mug keramik putih sablon press sublimasi warna tahan cuci",
    finishingsAllowed: ["Kemasan Dus Box Single"],
    isAvailable: true
  }
];

export function PrintingProductsView() {
  const { user, activeBranchId, activeBranchName } = useAuth();
  const [materials, setMaterials] = useState<PrintingMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<PrintingMaterial | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<PrintingMaterial["category"]>("OUTDOOR");
  const [formUnitType, setFormUnitType] = useState<PrintingMaterial["unitType"]>("m²");
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(100);
  const [formMinOrder, setFormMinOrder] = useState<number>(1);
  const [formDescription, setFormDescription] = useState("");
  const [formFinishings, setFormFinishings] = useState<string>("Laminasi Glossy, Mata Ayam");
  const [formIsAvailable, setFormIsAvailable] = useState(true);

  // Load Materials
  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      // 1. Get from localStorage
      const savedStr = localStorage.getItem("pos_printing_materials");
      let list: PrintingMaterial[] = savedStr ? JSON.parse(savedStr) : [];

      // Remove mock data if real user
      if (user && user.id !== "tenant_demo") {
        const mockIds = ["mat_1", "mat_2", "mat_3", "mat_4", "mat_5", "mat_6", "mat_7"];
        list = list.filter(m => !mockIds.includes(m.id));
      }

      // 2. Fallback to Supabase products table
      if (user) {
        const { data: dbProducts } = await supabase
          .from("products")
          .select("*")
          .eq("tenant_id", user.id)
          .order("name", { ascending: true });

        if (dbProducts && dbProducts.length > 0) {
          const remoteMaterials: PrintingMaterial[] = dbProducts.map((p) => ({
            id: p.id,
            name: p.name,
            category: (p.category as any) || "OUTDOOR",
            unitType: p.unit_type || "m²",
            costPrice: Number(p.cost_price) || 0,
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 0,
            minOrder: 1,
            description: p.description || "Bahan material cetak percetakan",
            finishingsAllowed: ["Laminasi Glossy", "Potong Clean"],
            isAvailable: p.status === "active"
          }));

          // Merge local and remote avoiding duplicate IDs
          const merged = [...list];
          remoteMaterials.forEach((rm) => {
            if (!merged.some((lm) => lm.id === rm.id)) {
              merged.push(rm);
            }
          });
          list = merged;
        }
      }

      if (list.length === 0) {
        if (!user || user.id === "tenant_demo") {
          list = DEFAULT_MATERIALS;
        }
        localStorage.setItem("pos_printing_materials", JSON.stringify(list));
      }

      setMaterials(list);
    } catch (e) {
      console.error("Error loading materials:", e);
      setMaterials(DEFAULT_MATERIALS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [user]);

  const saveMaterials = (updated: PrintingMaterial[]) => {
    setMaterials(updated);
    try {
      localStorage.setItem("pos_printing_materials", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save materials to localStorage:", e);
    }
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setFormName("");
    setFormCategory("OUTDOOR");
    setFormUnitType("m²");
    setFormCostPrice(15000);
    setFormPrice(30000);
    setFormStock(500);
    setFormMinOrder(1);
    setFormDescription("");
    setFormFinishings("Laminasi Glossy, Mata Ayam, Potong Clean");
    setFormIsAvailable(true);
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (mat: PrintingMaterial) => {
    setEditingMaterial(mat);
    setFormName(mat.name);
    setFormCategory(mat.category);
    setFormUnitType(mat.unitType);
    setFormCostPrice(mat.costPrice);
    setFormPrice(mat.price);
    setFormStock(mat.stock);
    setFormMinOrder(mat.minOrder || 1);
    setFormDescription(mat.description || "");
    setFormFinishings(mat.finishingsAllowed ? mat.finishingsAllowed.join(", ") : "");
    setFormIsAvailable(mat.isAvailable);
    setIsDialogOpen(true);
  };

  // Save Material
  const handleSaveMaterial = async () => {
    if (!formName.trim()) return alert("Nama bahan cetak tidak boleh kosong!");

    const finishingsArr = formFinishings
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let updated: PrintingMaterial[];

    if (editingMaterial) {
      // Edit
      updated = materials.map((m) => {
        if (m.id === editingMaterial.id) {
          return {
            ...m,
            name: formName,
            category: formCategory,
            unitType: formUnitType,
            costPrice: Number(formCostPrice) || 0,
            price: Number(formPrice) || 0,
            stock: Number(formStock) || 0,
            minOrder: Number(formMinOrder) || 1,
            description: formDescription,
            finishingsAllowed: finishingsArr,
            isAvailable: formIsAvailable
          };
        }
        return m;
      });
    } else {
      // Create new
      const newMat: PrintingMaterial = {
        id: `mat_${Date.now()}`,
        name: formName,
        category: formCategory,
        unitType: formUnitType,
        costPrice: Number(formCostPrice) || 0,
        price: Number(formPrice) || 0,
        stock: Number(formStock) || 0,
        minOrder: Number(formMinOrder) || 1,
        description: formDescription,
        finishingsAllowed: finishingsArr,
        isAvailable: formIsAvailable,
        createdAt: new Date().toISOString()
      };
      updated = [newMat, ...materials];
    }

    saveMaterials(updated);

    // Sync optional with Supabase
    if (user) {
      try {
        await supabase.from("products").upsert({
          id: editingMaterial ? editingMaterial.id : undefined,
          tenant_id: user.id,
          name: formName,
          cost_price: Number(formCostPrice) || 0,
          price: Number(formPrice) || 0,
          stock: Number(formStock) || 0,
          category: formCategory,
          status: formIsAvailable ? "active" : "inactive"
        });
      } catch (e) {}
    }

    setIsDialogOpen(false);
  };

  // Delete Material
  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus bahan cetak ini dari katalog?")) {
      const updated = materials.filter((m) => m.id !== id);
      saveMaterials(updated);
    }
  };

  // Filtered List
  const filteredMaterials = useMemo(() => {
    return materials.filter((mat) => {
      const q = search.toLowerCase();
      const matchSearch =
        mat.name.toLowerCase().includes(q) ||
        mat.description.toLowerCase().includes(q) ||
        mat.category.toLowerCase().includes(q);

      const matchCategory = categoryFilter === "ALL" || mat.category === categoryFilter;
      const matchBranch =
        activeBranchId === "all" ||
        mat.branchId === activeBranchId ||
        mat.branchName === activeBranchName ||
        (!mat.branchId && (activeBranchId === "main" || activeBranchId === "all"));

      return matchSearch && matchCategory && matchBranch;
    });
  }, [materials, search, categoryFilter, activeBranchId, activeBranchName]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 md:p-5 space-y-4 overflow-y-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 md:p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-brand text-white grid place-items-center font-bold shadow-xs">
            <Package className="size-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base md:text-lg text-slate-900 dark:text-white tracking-tight">
              Katalog Bahan & Material Cetak
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAdd}
            className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1.5 rounded-none shadow-xs"
          >
            <Plus className="size-4" /> Tambah Bahan Baru
          </Button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Jenis Bahan
            </span>
            <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {materials.length} Material
            </span>
          </div>
          <div className="size-8 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900 grid place-items-center">
            <Package className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Outdoor / Indoor ($m^2$)
            </span>
            <span className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
              {materials.filter((m) => m.category === "OUTDOOR" || m.category === "INDOOR").length} Jenis
            </span>
          </div>
          <div className="size-8 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 grid place-items-center">
            <Ruler className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Digital Sheet A3+
            </span>
            <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {materials.filter((m) => m.category === "SHEET_DOC").length} Jenis
            </span>
          </div>
          <div className="size-8 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 grid place-items-center">
            <Printer className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Stok Siap Pakai
            </span>
            <span className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-0.5 block">
              {materials.filter((m) => m.isAvailable && m.stock > 0).length} Ready
            </span>
          </div>
          <div className="size-8 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 grid place-items-center">
            <CheckCircle2 className="size-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari nama bahan cetak, keterangan, atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">Semua Kategori Bahan</option>
            <option value="OUTDOOR">Outdoor Banner ($m^2$)</option>
            <option value="INDOOR">Indoor & Stiker ($m^2$)</option>
            <option value="SHEET_DOC">Digital Press A3+ (Lembar)</option>
            <option value="MERCHANDISE">Merchandise (Pcs/Box)</option>
          </select>
        </div>
      </div>

      {/* Table Katalog Bahan */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <th className="p-3">Nama Bahan & Kategori</th>
              <th className="p-3 text-center">Satuan Hitung</th>
              <th className="p-3 text-right">Modal HPP</th>
              <th className="p-3 text-right">Harga Jual / Satuan</th>
              <th className="p-3 text-center">Stok Sisa</th>
              <th className="p-3">Opsi Finishing Kompatibel</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="size-5 animate-spin text-brand" />
                    <span>Memuat katalog bahan percetakan...</span>
                  </div>
                </td>
              </tr>
            ) : filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="size-8 text-slate-300 dark:text-slate-700" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Bahan cetak tidak ditemukan
                    </span>
                    <span className="text-[11px]">Tambahkan bahan baru dengan mengklik tombol di atas.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMaterials.map((mat) => (
                <tr key={mat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Name & Category */}
                  <td className="p-3 align-top">
                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Tag className="size-3.5 text-brand" />
                      {mat.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
                      {mat.description}
                    </div>
                  </td>

                  {/* Unit Type Badge */}
                  <td className="p-3 align-top text-center">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 uppercase">
                      Per {mat.unitType}
                    </span>
                  </td>

                  {/* Cost Price */}
                  <td className="p-3 align-top text-right font-mono text-slate-500">
                    {formatRupiah(mat.costPrice)}
                  </td>

                  {/* Sale Price */}
                  <td className="p-3 align-top text-right font-mono font-extrabold text-brand">
                    {formatRupiah(mat.price)}
                  </td>

                  {/* Stock */}
                  <td className="p-3 align-top text-center font-mono">
                    <span
                      className={`font-bold ${
                        mat.stock < 50 ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {mat.stock} {mat.unitType}
                    </span>
                  </td>

                  {/* Finishing Allowed */}
                  <td className="p-3 align-top">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {mat.finishingsAllowed.map((f, i) => (
                        <span
                          key={i}
                          className="text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 border border-slate-200 dark:border-slate-700"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-3 align-top text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
                        mat.isAvailable
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {mat.isAvailable ? "Ready" : "Habis/Matikan"}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="p-3 align-top text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(mat)}
                        className="h-7 px-2 text-[10px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 gap-1 rounded-none"
                      >
                        <Pencil className="size-3" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(mat.id)}
                        className="h-7 px-1.5 text-[10px] border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 rounded-none"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit Material */}
      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 text-slate-900 dark:text-slate-100 rounded-none font-sans">
            <DialogHeader className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="size-4 text-brand" />
                {editingMaterial ? "Edit Bahan Cetak" : "Tambah Bahan Cetak Baru"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Bahan Cetak / Material
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Flexi Korchin 380g, Art Paper 260g..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 font-semibold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-semibold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="OUTDOOR">Outdoor Banner ($m^2$)</option>
                    <option value="INDOOR">Indoor & Stiker ($m^2$)</option>
                    <option value="SHEET_DOC">Digital Press A3+ (Lembar)</option>
                    <option value="MERCHANDISE">Merchandise (Pcs/Box)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Satuan Hitung
                  </label>
                  <select
                    value={formUnitType}
                    onChange={(e: any) => setFormUnitType(e.target.value)}
                    className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-semibold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="m²">m² (Meter Persegi)</option>
                    <option value="lembar">lembar (A3+/A4)</option>
                    <option value="pcs">pcs (Per Buah)</option>
                    <option value="box">box (Per Kotak)</option>
                    <option value="roll">roll (Per Roll)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Harga Modal HPP (Rp)
                  </label>
                  <Input
                    type="number"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Number(e.target.value))}
                    className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Harga Jual Standar (Rp)
                  </label>
                  <Input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none text-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Stok Tersedia
                  </label>
                  <Input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Ketersediaan
                  </label>
                  <select
                    value={formIsAvailable ? "true" : "false"}
                    onChange={(e) => setFormIsAvailable(e.target.value === "true")}
                    className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="true">Siap Pakai (Active)</option>
                    <option value="false">Habis / Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Finishing Kompatibel (Pisahkan dengan Koma)
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Laminasi Glossy, Mata Ayam, Potong Kiss Cut..."
                  value={formFinishings}
                  onChange={(e) => setFormFinishings(e.target.value)}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Spesifikasi Bahan
                </label>
                <Input
                  type="text"
                  placeholder="Penjelasan ringkas kualitas cetakan atau kecocokan mesin..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>
            </div>

            <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="h-8 text-xs border-slate-300 rounded-none"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMaterial}
                className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 rounded-none"
              >
                Simpan Bahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
