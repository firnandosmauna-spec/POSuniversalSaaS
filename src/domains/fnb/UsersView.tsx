import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  KeyRound,
  Filter,
  UserCheck,
  UserX,
  Sparkles,
  Lock,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useAuth } from "@/shared/auth/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { PrintingUsersView } from "@/domains/printing/UsersView";

export type StaffRole = "Owner Tenant" | "Manager Cabang" | "Kasir" | "Koki / Operator";

export type StaffUser = {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  pin_code?: string;
  role: StaffRole;
  branch_id?: string;
  branch_name?: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
};

export function UsersView() {
  const { user, branches } = useAuth();

  if ((user?.businessType as string) === "PRINTING") {
    return <PrintingUsersView />;
  }
  
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formRole, setFormRole] = useState<StaffRole>("Kasir");
  const [formBranchId, setFormBranchId] = useState<string>("main");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Storage Key specific to tenant ID
  const tenantStorageKey = user ? `pos_tenant_${user.id}_staff` : "pos_tenant_demo_staff";

  // Fetch staff list for active tenant
  const fetchStaff = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Fetch from Supabase store_users table
      const { data, error } = await supabase
        .from("store_users")
        .select("*")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mappedData: StaffUser[] = data.map((d: any) => ({
          id: d.id,
          tenant_id: d.tenant_id,
          name: d.name || "Staf Kasir",
          email: d.email || "",
          pin_code: d.pin_code || "1234",
          role: (d.role as StaffRole) || "Kasir",
          branch_id: d.branch_id || "main",
          branch_name: d.branch_name || "Cabang Utama",
          status: (d.status === "INACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
          created_at: d.created_at || new Date().toISOString()
        }));
        setStaffList(mappedData);
        localStorage.setItem(tenantStorageKey, JSON.stringify(mappedData));
      } else {
        // Fallback to local storage (current key)
        const saved = localStorage.getItem(tenantStorageKey);
        if (saved) {
          setStaffList(JSON.parse(saved) as StaffUser[]);
        } else {
          // Fallback: search ALL localStorage staff keys (handles ID migration from temp → UUID)
          let migratedStaff: StaffUser[] | null = null;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.endsWith("_staff") && key.includes("pos_tenant_") && key !== tenantStorageKey) {
              try {
                const val = localStorage.getItem(key);
                if (val) {
                  const parsed = JSON.parse(val) as StaffUser[];
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    // Migrate: update tenant_id to current user.id
                    migratedStaff = parsed.map(s => ({ ...s, tenant_id: user.id }));
                    break;
                  }
                }
              } catch {}
            }
          }

          if (migratedStaff && migratedStaff.length > 0) {
            // Save under correct key and sync owner record to Supabase
            setStaffList(migratedStaff);
            localStorage.setItem(tenantStorageKey, JSON.stringify(migratedStaff));
            try {
              const owner = migratedStaff.find(s => s.role === "Owner Tenant");
              if (owner) {
                await supabase.from("store_users").upsert({
                  id: owner.id,
                  tenant_id: user.id,
                  name: owner.name,
                  email: owner.email,
                  pin_code: owner.pin_code,
                  role: owner.role,
                  status: owner.status
                }, { onConflict: "id" });
              }
            } catch {}
          } else {
            // Provision initial Owner account for this tenant
            const initialOwner: StaffUser = {
              id: `staff_owner_${user.id}`,
              tenant_id: user.id,
              name: user.name || "Owner Utama",
              email: user.email || "owner@pos.id",
              pin_code: "1234",
              role: "Owner Tenant",
              branch_id: "main",
              branch_name: "Cabang Utama (Pusat)",
              status: "ACTIVE",
              created_at: new Date().toISOString()
            };
            setStaffList([initialOwner]);
            localStorage.setItem(tenantStorageKey, JSON.stringify([initialOwner]));
          }
        }
      }
    } catch (e) {
      console.error("Error fetching staff:", e);
      const saved = localStorage.getItem(tenantStorageKey);
      if (saved) {
        setStaffList(JSON.parse(saved) as StaffUser[]);
      }
    } finally {
      setIsLoading(false);
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
    setFormBranchId(branches[0]?.id || "main");
    setFormStatus("ACTIVE");
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffUser) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormEmail(staff.email);
    setFormPin(staff.pin_code || "1234");
    setFormRole(staff.role);
    setFormBranchId(staff.branch_id || "main");
    setFormStatus(staff.status);
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formName.trim()) return;

    setIsSubmitting(true);
    const selectedBranch = branches.find((b) => b.id === formBranchId);
    const branchName = selectedBranch ? selectedBranch.name : "Cabang Utama";

    try {
      if (editingStaff) {
        // Update existing staff
        const updatedItem: StaffUser = {
          ...editingStaff,
          name: formName.trim(),
          email: formEmail.trim(),
          pin_code: formPin.trim(),
          role: formRole,
          branch_id: formBranchId,
          branch_name: branchName,
          status: formStatus
        };

        const updatedList = staffList.map((s) => (s.id === editingStaff.id ? updatedItem : s));
        setStaffList(updatedList);
        localStorage.setItem(tenantStorageKey, JSON.stringify(updatedList));

        // Sync to Supabase
        const { error: updateErr } = await supabase
          .from("store_users")
          .update({
            name: formName.trim(),
            email: formEmail.trim(),
            pin_code: formPin.trim(),
            role: formRole,
            branch_id: formBranchId || null,
            branch_name: branchName,
            status: formStatus
          })
          .eq("id", editingStaff.id);
          
        if (updateErr) {
          const isColumnErr = updateErr.message?.includes("column") || updateErr.code === "42703" || updateErr.message?.includes("does not exist");
          if (isColumnErr) {
            await supabase
              .from("store_users")
              .update({
                name: formName.trim(),
                email: formEmail.trim(),
                role: formRole,
                status: formStatus
              })
              .eq("id", editingStaff.id);
          }
        }
      } else {
        // Create new staff
        const newStaffId = crypto.randomUUID();
        const newStaffItem: StaffUser = {
          id: newStaffId,
          tenant_id: user.id,
          name: formName.trim(),
          email: formEmail.trim() || `${formName.toLowerCase().replace(/\s+/g, ".")}@pos.id`,
          pin_code: formPin.trim() || "1234",
          role: formRole,
          branch_id: formBranchId,
          branch_name: branchName,
          status: formStatus,
          created_at: new Date().toISOString()
        };

        const updatedList = [newStaffItem, ...staffList];
        setStaffList(updatedList);
        localStorage.setItem(tenantStorageKey, JSON.stringify(updatedList));

        // Sync to Supabase
        const { error: insertErr } = await supabase.from("store_users").insert({
          id: newStaffItem.id,
          tenant_id: user.id,
          name: newStaffItem.name,
          email: newStaffItem.email,
          pin_code: newStaffItem.pin_code,
          role: newStaffItem.role,
          branch_id: newStaffItem.branch_id || null,
          branch_name: newStaffItem.branch_name,
          status: newStaffItem.status
        });
        
        if (insertErr) {
          const isColumnErr = insertErr.message?.includes("column") || insertErr.code === "42703" || insertErr.message?.includes("does not exist");
          if (isColumnErr) {
            await supabase.from("store_users").insert({
              id: newStaffItem.id,
              tenant_id: user.id,
              name: newStaffItem.name,
              email: newStaffItem.email,
              role: newStaffItem.role,
              status: newStaffItem.status
            });
          } else {
            console.error("Store users Supabase insert error:", insertErr.message);
          }
        }
      }

      setIsModalOpen(false);
    } catch (e) {
      console.error("Error saving staff:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStaffStatus = async (staff: StaffUser) => {
    const nextStatus: "ACTIVE" | "INACTIVE" = staff.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const updatedList: StaffUser[] = staffList.map((s) => (s.id === staff.id ? { ...s, status: nextStatus } : s));
    setStaffList(updatedList);
    localStorage.setItem(tenantStorageKey, JSON.stringify(updatedList));

    try {
      await supabase
        .from("store_users")
        .update({ status: nextStatus })
        .eq("id", staff.id);
    } catch (e) {}
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus akun staf ini?")) return;

    const updatedList = staffList.filter((s) => s.id !== staffId);
    setStaffList(updatedList);
    localStorage.setItem(tenantStorageKey, JSON.stringify(updatedList));

    try {
      await supabase.from("store_users").delete().eq("id", staffId);
    } catch (e) {}
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.pin_code && s.pin_code.includes(search));
    const matchRole = roleFilter === "ALL" || s.role === roleFilter;
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const activeStaffCount = staffList.filter((s) => s.status === "ACTIVE").length;
  const cashierCount = staffList.filter((s) => s.role === "Kasir").length;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-brand/10 border border-brand/20 grid place-items-center text-brand shrink-0">
            <Users className="size-6 text-brand" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Kelola Staf & Akun Pengguna POS
              <span className="text-xs bg-brand/10 text-brand font-mono font-bold px-2 py-0.5 rounded border border-brand/20">
                Tenant: {user?.name}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daftarkan kasir, manager, dan koki/operator cabang untuk akses terbatas operasional POS Anda.
            </p>
          </div>
        </div>

        <Button
          onClick={openAddModal}
          className="bg-brand hover:bg-brand/90 text-white font-extrabold text-xs h-10 px-4 rounded-lg shadow-sm gap-2 shrink-0"
        >
          <UserPlus className="size-4" /> Tambah Staf Baru
        </Button>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 grid place-items-center shrink-0">
            <UserCheck className="size-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Staf Aktif
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{activeStaffCount} Orang</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 grid place-items-center shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Kasir
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{cashierCount} Orang</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 grid place-items-center shrink-0">
            <Building2 className="size-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Cabang Terhubung
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{branches.length} Outlet</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 grid place-items-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Keamanan PIN
            </span>
            <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">Terisolasi Tenant</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Nama, Email, atau PIN Kasir..."
            className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-lg h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold shrink-0">
            <Filter className="size-3.5" /> Filter:
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">Semua Peran</option>
            <option value="Kasir">Kasir</option>
            <option value="Manager Cabang">Manager Cabang</option>
            <option value="Koki / Operator">Koki / Operator</option>
            <option value="Owner Tenant">Owner Tenant</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">🟢 Aktif</option>
            <option value="INACTIVE">🔴 Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Staff Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex-1 min-h-[300px]">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="size-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-medium">Memuat data staf...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Users className="size-12 mx-auto opacity-20 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada data staf yang ditemukan</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Klik tombol "Tambah Staf Baru" untuk mendaftarkan akun kasir atau manajer toko Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Nama Staf & Email</th>
                  <th className="py-3 px-4">PIN Kasir</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Hak Cabang</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-brand/10 text-brand font-bold grid place-items-center text-xs shrink-0">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-snug">{staff.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="size-3 text-slate-400" /> {staff.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs">
                        <KeyRound className="size-3 text-amber-500" />
                        <span>{staff.pin_code || "1234"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                        staff.role === "Owner Tenant"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900"
                          : staff.role === "Manager Cabang"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900"
                          : staff.role === "Koki / Operator"
                          ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900"
                      }`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Building2 className="size-3.5 text-brand" />
                        <span>{staff.branch_name || "Cabang Utama"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {staff.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 text-[11px]">
                          <CheckCircle2 className="size-3.5" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-900 text-[11px]">
                          <XCircle className="size-3.5" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStaffStatus(staff)}
                          className={`size-8 p-0 rounded-lg ${
                            staff.status === "ACTIVE"
                              ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={staff.status === "ACTIVE" ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                        >
                          {staff.status === "ACTIVE" ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(staff)}
                          className="size-8 p-0 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10"
                          title="Edit Akun Staf"
                        >
                          <Pencil className="size-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="size-8 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Hapus Akun Staf"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog Form Tambah / Edit Staf */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <UserPlus className="size-5 text-brand" />
              {editingStaff ? "Edit Akun Staf Kasir" : "Tambah Staf / Akun Kasir Baru"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveStaff} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap Staf <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Cth: Siti Rahmawati"
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email / Username Login
              </label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="Cth: kasir1@toko.com"
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PIN Kasir (4-6 Angka)
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value)}
                  placeholder="Cth: 1234"
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-mono font-bold rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Peran / Access Role
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as StaffRole)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none"
                >
                  <option value="Kasir">Kasir</option>
                  <option value="Manager Cabang">Manager Cabang</option>
                  <option value="Koki / Operator">Koki / Operator</option>
                  <option value="Owner Tenant">Owner Tenant</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Penetapan Cabang
                </label>
                <select
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Akun
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 rounded-lg p-2.5 focus:outline-none"
                >
                  <option value="ACTIVE">🟢 Aktif</option>
                  <option value="INACTIVE">🔴 Nonaktif</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-brand text-white hover:bg-brand/90 text-xs font-bold px-4"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Akun Staf"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
