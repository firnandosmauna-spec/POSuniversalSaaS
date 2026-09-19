import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, BusinessType } from "@/shared/auth/AuthContext";

type RegisterSearch = {
  type?: string | undefined;
  plan?: string | undefined;
};

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => {
    return {
      type: typeof search["type"] === "string" ? search["type"].trim() : undefined,
      plan: typeof search["plan"] === "string" ? search["plan"].trim() : undefined,
    };
  },
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const searchParams = Route.useSearch();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [selectedPlan, setSelectedPlan] = useState<string>("Growth");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const rawType = searchParams?.type || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("type") : null);
    if (rawType) {
      const validTypes: BusinessType[] = [
        "PRINTING", "FNB", "CAFE", "RETAIL", "GROCERY", "LAUNDRY",
        "GYM", "SALON", "WORKSHOP", "PHARMACY", "DISTRIBUTOR", "E_COMMERCE"
      ];
      if (validTypes.includes(rawType as BusinessType)) {
        setBusinessType(rawType as BusinessType);
      }
    }

    const rawPlan = searchParams?.plan || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("plan") : null);
    if (rawPlan) {
      setSelectedPlan(rawPlan);
    }
  }, [searchParams?.type, searchParams?.plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || !businessType) return;
    
    setIsLoading(true);
    // Mendaftarkan akun melalui Supabase
    const result = await register(name, email, password, businessType as BusinessType);
    setIsLoading(false);
    
    if (result.success) {
      // Save chosen subscription plan
      try {
        const savedUserStr = localStorage.getItem("pos_active_user");
        if (savedUserStr) {
          const userObj = JSON.parse(savedUserStr);
          localStorage.setItem(`pos_tenant_${userObj.id}_subscription`, JSON.stringify({
            plan: selectedPlan,
            status: "ACTIVE",
            trialUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            registeredAt: new Date().toISOString()
          }));
        }
      } catch (e) {}

      // Arahkan otomatis ke halaman POS (dashboard)
      navigate({ to: "/app/pos" });
    } else {
      setError(result.message || "Gagal mendaftar. Silakan coba lagi.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="grid size-8 place-items-center rounded-lg bg-brand">
              <span className="font-display text-base font-bold leading-none text-white">
                U
              </span>
            </div>
            <span className="font-display text-lg font-semibold text-brand">
              UniversalPOS
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Daftar Tenant Baru
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Lengkapi data diri dan pilih jenis bisnis Anda untuk menyiapkan kasir cerdas.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Cth: Budi Santoso"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Cth: budi@contoh.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Minimal 6 karakter"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nama Toko / Bisnis
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Cth: Kopi Kenangan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Kategori Bisnis (Penting)
            </label>
            <select
              required
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand bg-white font-bold"
            >
              <option value="" disabled>Pilih Kategori Bisnis Anda</option>
              <option value="PRINTING">🖨️ Percetakan Digital & Outdoor</option>
              <option value="FNB">🍽️ F&B (Restoran & Rumah Makan)</option>
              <option value="CAFE">☕ Cafe & Coffee Shop</option>
              <option value="RETAIL">🛍️ Retail (Pakaian, Toko, dll)</option>
              <option value="GROCERY">🛒 Toko Kelontong / Minimarket</option>
              <option value="LAUNDRY">🧺 Laundry</option>
              <option value="GYM">🏋️ Gym & Fitness Center</option>
              <option value="SALON">✂️ Salon & Barber Shop</option>
              <option value="WORKSHOP">🔧 Bengkel & Servis</option>
              <option value="PHARMACY">💊 Apotek & Farmasi</option>
              <option value="DISTRIBUTOR">📦 Distributor / Grosir</option>
              <option value="E_COMMERCE">🌐 Toko Online</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Paket Langganan Terpilih
            </label>
            <select
              required
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full rounded-lg border border-brand/40 bg-brand/5 px-4 py-2.5 text-sm font-bold text-brand focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="Starter">🌱 Starter (Gratis Selamanya - 1 Toko, 2 Kasir)</option>
              <option value="Growth">🚀 Growth (Rp 299rb/Bulan - 14 Hari Gratis)</option>
              <option value="Enterprise">👑 Enterprise (Custom & Unlimited Access)</option>
            </select>
          </div>

          <Button
            type="submit"
            disabled={!name || !email || !password || !businessName || !businessType || isLoading}
            className="w-full mt-4 bg-brand text-white hover:bg-brand/90 py-6 text-base"
          >
            {isLoading ? "Mendaftarkan..." : "Daftar & Masuk ke Kasir"}
          </Button>
        </form>
      </div>
    </div>
  );
}
