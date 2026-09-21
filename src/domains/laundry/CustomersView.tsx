import { useState, useEffect } from "react";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
};

export function LaundryCustomersView() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: ""
  });

  const fetchCustomers = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", user.id)
        .order("name", { ascending: true });
        
      if (data) {
        setCustomers(data.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          email: c.email || null,
          notes: c.notes || null
        })));
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        notes: customer.notes || ""
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", phone: "", email: "", notes: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("Nama wajib diisi!");
    if (!formData.phone.trim()) return alert("No. HP wajib diisi!");
    
    setIsSubmitting(true);
    let targetId = editingId || `cust_${Date.now()}`;
    
    const payload = {
      id: targetId,
      tenant_id: user?.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email || null,
      notes: formData.notes || null
    };

    if (user) {
      const { error } = await supabase.from("customers").upsert(payload);
      if (!error) {
        fetchCustomers();
      }
    }
    
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus pelanggan ini?")) {
      await supabase.from("customers").delete().eq("id", id).eq("tenant_id", user?.id);
      setCustomers(customers.filter(c => c.id !== id));
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="size-6" />
            Data Pelanggan
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola daftar pelanggan, no. HP, dan catatan khusus.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Button 
            onClick={() => handleOpenModal()}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-none h-10 px-4 font-bold"
          >
            <Plus className="size-4 mr-2" />
            Tambah Pelanggan Baru
          </Button>
          <DialogContent className="sm:max-w-[425px] rounded-none">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-lg">
                {editingId ? "Ubah Pelanggan" : "Tambah Pelanggan Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Nama Pelanggan</label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Cth: Budi Santoso"
                  className="rounded-none h-10 font-medium border-slate-300 focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Nomor HP / WA</label>
                <Input 
                  required 
                  type="tel"
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="Cth: 08123456789"
                  className="rounded-none h-10 font-medium border-slate-300 focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Email (Opsional)</label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="Cth: budi@email.com"
                  className="rounded-none h-10 font-medium border-slate-300 focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Catatan Tambahan (Opsional)</label>
                <Input 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  placeholder="Cth: Alergi deterjen, minta pisah warna, dll."
                  className="rounded-none h-10 font-medium border-slate-300 focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-none font-bold" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-none bg-slate-900 hover:bg-slate-800 text-white font-bold">
                  {isSubmitting ? "Menyimpan..." : "Simpan Pelanggan"}
                </Button>
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
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider w-1/4">Nama Pelanggan</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider w-1/4">Kontak</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider w-1/3">Catatan</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-mono text-sm">
                    Belum ada data pelanggan.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {c.name}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">
                      <div className="flex flex-col">
                        <span>{c.phone}</span>
                        {c.email && <span className="text-[10px] text-slate-400">{c.email}</span>}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 text-xs italic">
                      {c.notes || "-"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(c)}
                          className="h-8 w-8 p-0 rounded-none text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(c.id)}
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
