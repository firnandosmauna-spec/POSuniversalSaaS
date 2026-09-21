import { useState, useEffect } from "react";
import { Users, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/auth/AuthContext";
import { PrintingCustomersView } from "@/domains/printing/CustomersView";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
};

export function CustomersView() {
  const { user } = useAuth();

  if ((user?.businessType as string) === "PRINTING") {
    return <PrintingCustomersView />;
  }
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: ""
  });

  const isUUID = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const deletedIdsStr = localStorage.getItem("pos_deleted_customer_ids");
      const deletedIds: string[] = deletedIdsStr ? JSON.parse(deletedIdsStr) : [];
      const deletedNamesStr = localStorage.getItem("pos_deleted_customer_names");
      const deletedNames: string[] = deletedNamesStr ? JSON.parse(deletedNamesStr) : [];

      let list: Customer[] = [];
      const savedStr = localStorage.getItem("pos_printing_customers");
      if (savedStr) {
        try {
          const parsed = JSON.parse(savedStr);
          list = parsed.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email || null,
            notes: c.notes || null
          }));
        } catch (e) {}
      }

      if (user) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("tenant_id", user.id)
          .order("name", { ascending: true });
          
        if (data && data.length > 0) {
          const remoteList: Customer[] = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || "",
            email: c.email || null,
            notes: c.notes || null
          }));

          const mergedMap = new Map<string, Customer>();
          list.forEach((lc) => mergedMap.set(lc.id, lc));
          remoteList.forEach((rc) => {
            const isDeletedById = deletedIds.includes(rc.id);
            const isDeletedByName = deletedNames.includes(rc.name?.trim().toLowerCase());
            if (!isDeletedById && !isDeletedByName) {
              mergedMap.set(rc.id, rc);
            }
          });
          list = Array.from(mergedMap.values());
        }
      }

      list = list.filter((c) => !deletedIds.includes(c.id) && !deletedNames.includes(c.name?.trim().toLowerCase()));
      setCustomers(list);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
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
    if (!formData.name.trim()) return alert("Nama pelanggan wajib diisi!");
    setIsSubmitting(true);
    
    let targetId = editingId || `cust_${Date.now()}`;
    const payload: any = {
      tenant_id: user?.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email || null,
      notes: formData.notes || null
    };

    if (editingId && isUUID(editingId)) {
      payload.id = editingId;
    }

    if (user) {
      try {
        const { data: savedDb, error } = await supabase
          .from("customers")
          .upsert(payload)
          .select()
          .single();

        if (savedDb && savedDb.id) {
          targetId = savedDb.id;
        } else if (error) {
          console.error("Supabase customer save error:", error);
        }
      } catch (error) {
        console.error("Supabase exception:", error);
      }
    }

    let updated: Customer[];
    if (editingId) {
      updated = customers.map((c) =>
        c.id === editingId
          ? {
              ...c,
              id: targetId,
              name: formData.name,
              phone: formData.phone,
              email: formData.email || null,
              notes: formData.notes || null
            }
          : c
      );
    } else {
      const newCust: Customer = {
        id: targetId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        notes: formData.notes || null
      };
      updated = [newCust, ...customers];
    }

    setCustomers(updated);
    try {
      localStorage.setItem("pos_printing_customers", JSON.stringify(updated));
    } catch (e) {}

    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pelanggan ini?")) return;
    
    const deletedCustomer = customers.find((c) => c.id === id);

    try {
      const deletedIdsStr = localStorage.getItem("pos_deleted_customer_ids");
      const deletedIds: string[] = deletedIdsStr ? JSON.parse(deletedIdsStr) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem("pos_deleted_customer_ids", JSON.stringify(deletedIds));
      }

      // Track by name too (handles mock IDs that don't match Supabase UUIDs)
      if (deletedCustomer?.name) {
        const deletedNamesStr = localStorage.getItem("pos_deleted_customer_names");
        const deletedNames: string[] = deletedNamesStr ? JSON.parse(deletedNamesStr) : [];
        const nameLower = deletedCustomer.name.trim().toLowerCase();
        if (!deletedNames.includes(nameLower)) {
          deletedNames.push(nameLower);
          localStorage.setItem("pos_deleted_customer_names", JSON.stringify(deletedNames));
        }
      }
    } catch (e) {}

    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    try {
      localStorage.setItem("pos_printing_customers", JSON.stringify(updated));
    } catch (e) {}

    if (user) {
      try {
        await supabase.from("customers").delete().eq("id", id);
        if (deletedCustomer?.name) {
          await supabase.from("customers").delete()
            .eq("tenant_id", user.id)
            .eq("name", deletedCustomer.name);
        }
      } catch (error) {
        console.error("Failed to delete from Supabase:", error);
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Modul Pelanggan
        </h1>
        <Button onClick={() => handleOpenModal()} className="bg-brand text-white hover:bg-brand/90">
          <Plus className="mr-2 size-4" /> Tambah Pelanggan
        </Button>
      </div>
      
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau nomor HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-white"
            />
          </div>
          <div className="text-sm text-slate-500">
            Total: <span className="font-bold text-slate-700">{filteredCustomers.length}</span> Pelanggan
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="size-8 animate-spin mb-3 text-brand" />
              <p>Memuat data...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Users className="size-16 mb-4 opacity-20" />
              <p>Belum ada data pelanggan.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                <tr>
                  <th className="p-4 font-semibold">Nama Pelanggan</th>
                  <th className="p-4 font-semibold">Nomor HP</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Catatan</th>
                  <th className="p-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{customer.name}</td>
                    <td className="p-4 text-slate-600">{customer.phone}</td>
                    <td className="p-4 text-slate-600">{customer.email || "-"}</td>
                    <td className="p-4 text-slate-500 max-w-[200px] truncate" title={customer.notes || ""}>{customer.notes || "-"}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(customer)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Nama Pelanggan <span className="text-red-500">*</span></label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Cth: Budi Santoso"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Nomor HP/WhatsApp <span className="text-red-500">*</span></label>
              <Input 
                required 
                type="tel"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                placeholder="Cth: 08123456789"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Email</label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                placeholder="Cth: budi@email.com (Opsional)"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Catatan Tambahan</label>
              <Input 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                placeholder={user?.businessType === "LAUNDRY" ? "Cth: Alergi deterjen, minta pisah warna (Opsional)" : "Cth: Suka kopi tanpa gula (Opsional)"}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-brand text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
