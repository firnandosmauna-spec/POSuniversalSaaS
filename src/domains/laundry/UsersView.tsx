import { useState, useEffect } from "react";
import { Users, UserPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/shared/auth/AuthContext";
import { supabase } from "@/shared/lib/supabase";

export type LaundryStaffRole = "Owner Tenant" | "Manager Cabang" | "Kasir" | "Staf Produksi (Cuci/Setrika)";

export type StaffUser = {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  pin_code?: string;
  role: LaundryStaffRole;
  branch_id?: string;
  branch_name?: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
};

export function LaundryUsersView() {
  const { user, branches } = useAuth();
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formRole, setFormRole] = useState<LaundryStaffRole>("Kasir");
  const [formBranchId, setFormBranchId] = useState<string>("main");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tenantStorageKey = user ? `pos_tenant_${user.id}_staff` : "pos_tenant_demo_staff";

  const fetchStaff = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("store_users")
        .select("*")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mappedData: StaffUser[] = data.map((d: any) => ({
          id: d.id,
          tenant_id: d.tenant_id,
          name: d.name || "Staf",
          email: d.email || "",
          pin_code: d.pin_code || "1234",
          role: (d.role as LaundryStaffRole) || "Kasir",
          branch_id: d.branch_id || "main",
          branch_name: d.branch_name || "Cabang Utama",
          status: (d.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"),
          created_at: d.created_at || new Date().toISOString()
        }));
        setStaffList(mappedData);
        localStorage.setItem(tenantStorageKey, JSON.stringify(mappedData));
      } else {
        const saved = localStorage.getItem(tenantStorageKey);
        if (saved) setStaffList(JSON.parse(saved));
      }
    } catch (e) {
      const saved = localStorage.getItem(tenantStorageKey);
      if (saved) setStaffList(JSON.parse(saved));
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [user]);

  const openAddModal = () => {
    setEditingStaff(null);
    setFormName("");
    setFormEmail("");
    setFormPin("1234");
    setFormRole("Kasir");
    setFormBranchId(branches?.[0]?.id || "main");
    setFormStatus("ACTIVE");
    setIsModalOpen(true);
  };

  const openEditModal = (s: StaffUser) => {
    setEditingStaff(s);
    setFormName(s.name);
    setFormEmail(s.email);
    setFormPin(s.pin_code || "");
    setFormRole(s.role);
    setFormBranchId(s.branch_id || "main");
    setFormStatus(s.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return alert("Nama Staf wajib diisi!");
    if (!formPin || formPin.length < 4) return alert("PIN minimal 4 angka!");
    if (!user) return;

    setIsSubmitting(true);
    const selBranch = branches.find((b: any) => b.id === formBranchId);
    const branchName = selBranch ? selBranch.name : "Cabang Utama (Pusat)";
    
    const staffId = editingStaff ? editingStaff.id : `staff_${Date.now()}`;
    const payload = {
      tenant_id: user.id,
      name: formName,
      email: formEmail,
      pin_code: formPin,
      role: formRole,
      branch_id: formBranchId,
      branch_name: branchName,
      status: formStatus
    };

    const finalPin = formPin.trim();

    try {
      if (editingStaff) {
        const { error: updateErr } = await supabase
          .from("store_users")
          .update({ ...payload, pin_code: finalPin })
          .eq("id", editingStaff.id)
          .eq("tenant_id", user.id);
          
        if (updateErr && (updateErr.message?.includes("column") || updateErr.code === "42703")) {
          const fallback: any = { ...payload };
          delete fallback.pin_code;
          await supabase.from("store_users").update(fallback).eq("id", editingStaff.id).eq("tenant_id", user.id);
        }
      } else {
        const { error: insertErr } = await supabase.from("store_users").insert({
          id: staffId,
          ...payload,
          pin_code: finalPin
        });
        
        if (insertErr && (insertErr.message?.includes("column") || insertErr.code === "42703")) {
          const fallback: any = { ...payload };
          delete fallback.pin_code;
          await supabase.from("store_users").insert({
            id: staffId,
            ...fallback
          });
        }
      }
    } catch (err) {}

    await fetchStaff();
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, role: string) => {
    if (role === "Owner Tenant") return alert("Akun Owner tidak dapat dihapus!");
    if (confirm("Hapus staf ini dari sistem?")) {
      await supabase.from("store_users").delete().eq("id", id).eq("tenant_id", user?.id);
      await fetchStaff();
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="size-6" />
            Kelola Staf & Akun
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manajemen akun kasir, admin cabang, dan staf laundry.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Button 
            onClick={openAddModal}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-none h-10 px-4 font-bold"
          >
            <UserPlus className="size-4 mr-2" />
            Tambah Staf Baru
          </Button>
          <DialogContent className="sm:max-w-[425px] rounded-none">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-lg">
                {editingStaff ? "Ubah Data Staf" : "Tambah Staf Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Nama Lengkap</label>
                <Input 
                  required 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  className="rounded-none h-10 font-medium" 
                  placeholder="Cth: Siti Aminah"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Jabatan / Akses</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as LaundryStaffRole)}
                    className="w-full h-10 text-sm px-2 bg-transparent border border-slate-200 focus:outline-none focus:border-slate-900 font-medium rounded-none"
                  >
                    <option value="Kasir">Kasir</option>
                    <option value="Staf Produksi (Cuci/Setrika)">Staf Cuci/Setrika</option>
                    <option value="Manager Cabang">Manager Cabang</option>
                    <option value="Owner Tenant">Owner (Pemilik)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">PIN Akses (Min 4)</label>
                  <Input 
                    required 
                    type="text"
                    value={formPin} 
                    onChange={(e) => setFormPin(e.target.value)} 
                    className="rounded-none h-10 font-mono font-bold" 
                    placeholder="1234"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Email (Opsional)</label>
                <Input 
                  type="email"
                  value={formEmail} 
                  onChange={(e) => setFormEmail(e.target.value)} 
                  className="rounded-none h-10 font-medium" 
                  placeholder="siti@laundry.id"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Cabang Penempatan</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full h-10 text-sm px-2 bg-transparent border border-slate-200 focus:outline-none focus:border-slate-900 font-medium rounded-none"
                  >
                    {branches?.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Status Akun</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full h-10 text-sm px-2 bg-transparent border border-slate-200 focus:outline-none focus:border-slate-900 font-medium rounded-none"
                  >
                    <option value="ACTIVE">Aktif (Dapat Login)</option>
                    <option value="INACTIVE">Nonaktif (Diblokir)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-none font-bold" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-none bg-slate-900 hover:bg-slate-800 text-white font-bold">
                  {isSubmitting ? "Menyimpan..." : "Simpan Akun"}
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
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider">Nama Staf</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider">Akses & Cabang</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider text-center">PIN Login</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider text-center">Status</th>
                <th className="p-3 font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-mono text-sm">
                    Belum ada data staf.
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{s.name}</span>
                        {s.email && <span className="text-[10px] text-slate-400 font-normal">{s.email}</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit items-center px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded-sm border border-slate-200">
                          {s.role}
                        </span>
                        <span className="text-xs text-slate-500">{s.branch_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 font-bold text-xs">
                        {s.pin_code || "****"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-sm border ${
                        s.status === "ACTIVE" 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}>
                        {s.status === "ACTIVE" ? "AKTIF" : "NONAKTIF"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(s)}
                          className="h-8 w-8 p-0 rounded-none text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id, s.role)}
                          disabled={s.role === "Owner Tenant"}
                          className="h-8 w-8 p-0 rounded-none text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
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
