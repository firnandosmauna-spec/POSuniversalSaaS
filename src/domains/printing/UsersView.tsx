import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/shared/auth/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserPlus, 
  Search, 
  Pencil, 
  Trash2, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  KeyRound, 
  Printer, 
  Scissors, 
  Palette, 
  RefreshCw, 
  Lock, 
  Mail, 
  UserCheck, 
  UserX,
  Clock,
  Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export type PrintingStaffRole = 
  | "Manager Percetakan" 
  | "Kasir POS" 
  | "Desainer Grafis" 
  | "Operator Mesin Cetak";

export interface PrintingStaffUser {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  pin_code?: string;
  role: PrintingStaffRole;
  branch_name?: string;
  status: "ACTIVE" | "INACTIVE";
  assignedMachine?: string; // e.g. "Mesin Outdoor Banner 3.2m", "Digital Press A3+"
  createdAt: string;
}

export function PrintingUsersView() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<PrintingStaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<PrintingStaffUser | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPinCode, setFormPinCode] = useState("123456");
  const [formRole, setFormRole] = useState<PrintingStaffRole>("Kasir POS");
  const [formAssignedMachine, setFormAssignedMachine] = useState("Digital Press A3+");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Storage Key specific to tenant ID
  const tenantStorageKey = user ? `pos_printing_${user.id}_staff` : "pos_printing_demo_staff";

  // Sync password with email automatically if untouched
  const handleEmailChange = (val: string) => {
    setFormEmail(val);
    if (!editingStaff && (!formPassword || formPassword === formEmail)) {
      setFormPassword(val);
    }
  };

  // Load Staff List
  const loadStaffList = async () => {
    setIsLoading(true);
    try {
      // 1. Get from localStorage
      const savedStr = localStorage.getItem(tenantStorageKey);
      let list: PrintingStaffUser[] = savedStr ? JSON.parse(savedStr) : [];

      // 2. Fetch from Supabase as fallback
      if (user) {
        const { data: dbStaff } = await supabase
          .from("store_users")
          .select("*")
          .eq("tenant_id", user.id)
          .order("name", { ascending: true });

        if (dbStaff && dbStaff.length > 0) {
          const remoteList: PrintingStaffUser[] = dbStaff.map((st) => ({
            id: st.id,
            tenant_id: st.tenant_id,
            name: st.name || "Staf Percetakan",
            email: st.email || "staf@percetakan.com",
            pin_code: st.pin_code || "123456",
            role: (st.role as any) || "Kasir POS",
            branch_name: "Outlet Utama",
            status: st.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
            assignedMachine: "Mesin Digital",
            createdAt: st.created_at || new Date().toISOString()
          }));

          // Merge local and remote avoiding duplicate IDs
          const merged = [...list];
          remoteList.forEach((rs) => {
            if (!merged.some((ls) => ls.id === rs.id)) {
              merged.push(rs);
            }
          });
          list = merged;
        }
      }

      if (list.length === 0) {
        if (user && user.id !== "tenant_demo") {
          const initialOwner: PrintingStaffUser = {
            id: `staff_owner_${user.id}`,
            tenant_id: user.id,
            name: user.name || "Owner Percetakan",
            email: user.email || "owner@percetakan.com",
            pin_code: "123456",
            role: "Manager Percetakan",
            branch_name: "Outlet Utama",
            status: "ACTIVE",
            assignedMachine: "Semua Armada Mesin",
            createdAt: new Date().toISOString()
          };
          list = [initialOwner];
        } else {
          list = [];
        }
        localStorage.setItem(tenantStorageKey, JSON.stringify(list));
      }

      setStaffList(list);
    } catch (e) {
      console.error("Error loading printing staff:", e);
      setStaffList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffList();
  }, [user]);

  const saveStaffList = (updated: PrintingStaffUser[]) => {
    setStaffList(updated);
    try {
      localStorage.setItem(tenantStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save printing staff to localStorage:", e);
    }
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormPinCode("123456");
    setFormRole("Kasir POS");
    setFormAssignedMachine("Digital Press A3+");
    setFormStatus("ACTIVE");
    setIsModalOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (st: PrintingStaffUser) => {
    setEditingStaff(st);
    setFormName(st.name);
    setFormEmail(st.email);
    setFormPassword(st.email); // Default same
    setFormPinCode(st.pin_code || "123456");
    setFormRole(st.role);
    setFormAssignedMachine(st.assignedMachine || "Mesin Cetak");
    setFormStatus(st.status);
    setIsModalOpen(true);
  };

  // Save Staff
  const handleSaveStaff = async () => {
    if (!formName.trim()) return alert("Nama staf wajib diisi!");
    if (!formEmail.trim()) return alert("Email staf wajib diisi!");

    // Password rule enforcement: if blank, set password = email
    const finalPassword = formPassword.trim() || formEmail.trim();

    let updated: PrintingStaffUser[];

    if (editingStaff) {
      updated = staffList.map((st) => {
        if (st.id === editingStaff.id) {
          return {
            ...st,
            name: formName,
            email: formEmail,
            pin_code: formPinCode,
            role: formRole,
            assignedMachine: formAssignedMachine,
            status: formStatus
          };
        }
        return st;
      });
    } else {
      const newStaff: PrintingStaffUser = {
        id: `staf_${Date.now()}`,
        tenant_id: user ? user.id : "tenant_demo",
        name: formName,
        email: formEmail,
        pin_code: formPinCode,
        role: formRole,
        branch_name: "Outlet Utama",
        assignedMachine: formAssignedMachine,
        status: formStatus,
        createdAt: new Date().toISOString()
      };
      updated = [newStaff, ...staffList];
    }

    saveStaffList(updated);

    // Sync with Supabase
    if (user) {
      try {
        await supabase.from("store_users").upsert({
          id: editingStaff ? editingStaff.id : undefined,
          tenant_id: user.id,
          name: formName,
          email: formEmail,
          role: formRole,
          pin_code: formPinCode,
          status: formStatus
        });
      } catch (e) {}
    }

    setIsModalOpen(false);
  };

  // Toggle Status Active/Inactive
  const handleToggleStatus = (st: PrintingStaffUser) => {
    const newStatus: "ACTIVE" | "INACTIVE" = st.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const updated: PrintingStaffUser[] = staffList.map((item) => (item.id === st.id ? { ...item, status: newStatus } : item));
    saveStaffList(updated);
  };

  // Delete Staff
  const handleDeleteStaff = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus akun staf percetakan ini?")) {
      const updated = staffList.filter((s) => s.id !== id);
      saveStaffList(updated);
    }
  };

  // Filtered List
  const filteredStaff = useMemo(() => {
    return staffList.filter((st) => {
      const q = search.toLowerCase();
      const matchSearch =
        st.name.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q) ||
        (st.assignedMachine && st.assignedMachine.toLowerCase().includes(q));

      const matchRole = roleFilter === "ALL" || st.role === roleFilter;
      const matchStatus = statusFilter === "ALL" || st.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [staffList, search, roleFilter, statusFilter]);

  // Role Icon Helper
  const getRoleIcon = (role: PrintingStaffRole) => {
    switch (role) {
      case "Manager Percetakan":
        return <ShieldCheck className="size-4 text-purple-600 dark:text-purple-400" />;
      case "Kasir POS":
        return <Users className="size-4 text-emerald-600 dark:text-emerald-400" />;
      case "Desainer Grafis":
        return <Palette className="size-4 text-indigo-600 dark:text-indigo-400" />;
      case "Operator Mesin Cetak":
        return <Printer className="size-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getRoleBadgeClass = (role: PrintingStaffRole) => {
    switch (role) {
      case "Manager Percetakan":
        return "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800";
      case "Kasir POS":
        return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800";
      case "Desainer Grafis":
        return "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800";
      case "Operator Mesin Cetak":
        return "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800";
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 md:p-5 space-y-4 overflow-y-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 md:p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-brand text-white grid place-items-center font-bold shadow-xs">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base md:text-lg text-slate-900 dark:text-white tracking-tight">
              Kelola Staf & Tim Operator Percetakan
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAdd}
            className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 gap-1.5 rounded-none shadow-xs"
          >
            <UserPlus className="size-4" /> Tambah Staf Baru
          </Button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Staf Terdaftar
            </span>
            <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {staffList.length} Pengguna
            </span>
          </div>
          <div className="size-8 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 grid place-items-center">
            <Users className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Operator Mesin Cetak
            </span>
            <span className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-0.5 block">
              {staffList.filter((s) => s.role === "Operator Mesin Cetak").length} Staf
            </span>
          </div>
          <div className="size-8 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 grid place-items-center">
            <Printer className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Desainer Grafis Pre-Press
            </span>
            <span className="text-base font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-0.5 block">
              {staffList.filter((s) => s.role === "Desainer Grafis").length} Staf
            </span>
          </div>
          <div className="size-8 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900 grid place-items-center">
            <Palette className="size-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Kasir POS Active
            </span>
            <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {staffList.filter((s) => s.role === "Kasir POS" && s.status === "ACTIVE").length} Aktif
            </span>
          </div>
          <div className="size-8 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 grid place-items-center">
            <UserCheck className="size-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari nama staf, email, atau penugasan mesin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">Semua Peran / Role</option>
            <option value="Manager Percetakan">Manager Percetakan</option>
            <option value="Kasir POS">Kasir POS</option>
            <option value="Desainer Grafis">Desainer Grafis</option>
            <option value="Operator Mesin Cetak">Operator Mesin Cetak</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Status: Aktif</option>
            <option value="INACTIVE">Status: Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Main Staff Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <th className="p-3">Nama Staf & Email</th>
              <th className="p-3 text-center">Peran / Role Percetakan</th>
              <th className="p-3">Penugasan Stasiun / Mesin</th>
              <th className="p-3 text-center">PIN Kasir Shift</th>
              <th className="p-3 text-center">Status Akun</th>
              <th className="p-3 text-center">Aksi / Kontrol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="size-5 animate-spin text-brand" />
                    <span>Memuat data tim staf percetakan...</span>
                  </div>
                </td>
              </tr>
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="size-8 text-slate-300 dark:text-slate-700" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Staf percetakan tidak ditemukan
                    </span>
                    <span className="text-[11px]">Tambahkan staf baru dengan mengklik tombol di atas.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStaff.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Name & Email */}
                  <td className="p-3 align-top">
                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {getRoleIcon(st.role)}
                      {st.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Mail className="size-3 text-slate-400" /> {st.email}
                    </div>
                  </td>

                  {/* Role Badge */}
                  <td className="p-3 align-top text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeClass(
                        st.role
                      )}`}
                    >
                      {st.role}
                    </span>
                  </td>

                  {/* Machine / Station Assignment */}
                  <td className="p-3 align-top">
                    <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                      {st.assignedMachine || "Umum"}
                    </div>
                    <div className="text-[10px] text-slate-500">Cabang: {st.branch_name || "Utama"}</div>
                  </td>

                  {/* PIN Code */}
                  <td className="p-3 align-top text-center font-mono">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      •••• {st.pin_code ? st.pin_code.substring(st.pin_code.length - 2) : "56"}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="p-3 align-top text-center">
                    <button
                      onClick={() => handleToggleStatus(st)}
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider cursor-pointer transition-opacity hover:opacity-80 ${
                        st.status === "ACTIVE"
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800"
                      }`}
                    >
                      {st.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>

                  {/* Action Buttons */}
                  <td className="p-3 align-top text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(st)}
                        className="h-7 px-2 text-[10px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 gap-1 rounded-none"
                      >
                        <Pencil className="size-3" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteStaff(st.id)}
                        className="h-7 px-1.5 text-[10px] border-rose-200 dark:border-rose-900 text-rose-600 rounded-none"
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

      {/* Modal Add / Edit Form */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 text-slate-900 dark:text-slate-100 rounded-none font-sans">
            <DialogHeader className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="size-4 text-brand" />
                {editingStaff ? "Edit Akun Staf Percetakan" : "Registrasi Staf Tim Percetakan Baru"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Staf *
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Bambang Sutrisno..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 font-semibold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Pengguna (Username Login) *
                  </label>
                  <Input
                    type="email"
                    placeholder="operator@cetak.com"
                    value={formEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="h-9 font-semibold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi Awal (Password)
                  </label>
                  <Input
                    type="text"
                    placeholder="Samakan dengan email jika dikosongkan"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="h-9 font-mono text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                  />
                  <span className="text-[9.5px] text-slate-400 block mt-0.5 italic">
                    Sandi awal otomatis disamakan dengan email registrasi.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Peran / Role Percetakan *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e: any) => setFormRole(e.target.value)}
                    className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="Kasir POS">Kasir POS (Front Desk & Struk)</option>
                    <option value="Desainer Grafis">Desainer Grafis (Pre-Press & Proofing)</option>
                    <option value="Operator Mesin Cetak">Operator Mesin Cetak (Outdoor/A3+)</option>
                    <option value="Manager Percetakan">Manager Percetakan (Akses Penuh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PIN Buka/Tutup Shift Kasir (6 Angka)
                  </label>
                  <Input
                    type="text"
                    maxLength={6}
                    value={formPinCode}
                    onChange={(e) => setFormPinCode(e.target.value)}
                    className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Penugasan Stasiun Workstation / Mesin Cetak
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Outdoor Flexi 3.2m / Digital Press A3+ / Kasir Front"
                  value={formAssignedMachine}
                  onChange={(e) => setFormAssignedMachine(e.target.value)}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Akun Pengguna
                </label>
                <select
                  value={formStatus}
                  onChange={(e: any) => setFormStatus(e.target.value)}
                  className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value="ACTIVE">Aktif (Dapat Login)</option>
                  <option value="INACTIVE">Nonaktif (Blokir Akses)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 text-xs border-slate-300 rounded-none"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveStaff}
                className="h-8 text-xs bg-brand text-white font-bold hover:bg-brand/90 rounded-none"
              >
                Simpan Akun Staf
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
