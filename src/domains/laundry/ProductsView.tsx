import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LaundryService, LaundryCategory } from "./POSView";

export function LaundryProductsView() {
  const [services, setServices] = useState<LaundryService[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState<LaundryCategory>("KILOAN");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");

  useEffect(() => {
    const saved = localStorage.getItem("laundry_services");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setServices(parsed.map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category || "KILOAN",
          pricePerUnit: s.price,
          unitName: s.unit || s.unitName,
          description: s.name,
          minQty: 1
        })));
      } catch (e) {}
    }
  }, []);

  const saveToStorage = (updated: LaundryService[]) => {
    setServices(updated);
    const toSave = updated.map(s => ({
      id: s.id,
      name: s.name,
      price: s.pricePerUnit,
      unit: s.unitName,
      category: s.category
    }));
    localStorage.setItem("laundry_services", JSON.stringify(toSave));
  };

  const handleOpenDialog = (svc?: LaundryService) => {
    if (svc) {
      setEditingId(svc.id);
      setName(svc.name);
      setCategory(svc.category);
      setPrice(svc.pricePerUnit.toString());
      setUnit(svc.unitName);
    } else {
      setEditingId(null);
      setName("");
      setCategory("KILOAN");
      setPrice("");
      setUnit("kg");
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    if (editingId) {
      const updated = services.map(s => 
        s.id === editingId 
          ? { ...s, name, category, pricePerUnit: Number(price), unitName: unit }
          : s
      );
      saveToStorage(updated);
    } else {
      const newSvc: LaundryService = {
        id: "lnd_svc_" + Date.now(),
        name,
        category,
        pricePerUnit: Number(price),
        unitName: unit,
        description: name,
        minQty: 1
      };
      saveToStorage([...services, newSvc]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus layanan ini?")) {
      saveToStorage(services.filter(s => s.id !== id));
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="size-6" />
            Layanan & Tarif Laundry
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola daftar layanan, kategori, dan tarif khusus laundry.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenDialog()}
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-none h-10 px-4 font-bold"
            >
              <Plus className="size-4 mr-2" />
              Tambah Layanan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-none">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-lg">
                {editingId ? "Ubah Layanan" : "Tambah Layanan Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Kategori Layanan</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["KILOAN", "SATUAN", "EXPRESS"].map((cat) => (
                    <div
                      key={cat}
                      onClick={() => setCategory(cat as LaundryCategory)}
                      className={`text-center cursor-pointer p-2 border text-xs font-bold transition-colors ${
                        category === cat
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500" htmlFor="name">Nama Layanan</Label>
                <Input 
                  id="name" 
                  required 
                  className="rounded-none h-10 font-medium"
                  placeholder="Cth: Cuci Komplit, Bedcover, Setrika" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500" htmlFor="price">Tarif (Rp)</Label>
                  <Input 
                    id="price" 
                    required 
                    type="number"
                    className="rounded-none h-10 font-mono font-bold"
                    placeholder="6000" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500" htmlFor="unit">Satuan</Label>
                  <select
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="flex h-10 w-full items-center justify-between border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none font-medium"
                  >
                    <option value="kg">kg (Kiloan)</option>
                    <option value="pcs">pcs (Satuan)</option>
                    <option value="m2">m² (Karpet)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-none font-bold" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit" className="rounded-none bg-slate-900 hover:bg-slate-800 text-white font-bold">Simpan Layanan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider">Nama Layanan</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider">Kategori</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider text-right">Tarif</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-mono text-sm">
                    Belum ada layanan yang ditambahkan.
                  </td>
                </tr>
              ) : (
                services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {svc.name}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase rounded-sm border border-slate-200 dark:border-slate-700">
                        {svc.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      Rp {svc.pricePerUnit.toLocaleString("id-ID")}<span className="text-slate-400 text-xs font-sans font-normal">/{svc.unitName}</span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(svc)}
                          className="h-8 w-8 p-0 rounded-none text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(svc.id)}
                          className="h-8 w-8 p-0 rounded-none text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
