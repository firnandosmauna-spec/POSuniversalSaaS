import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, BusinessType } from "@/shared/auth/AuthContext";
import { X } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return;
    
    setIsLoading(true);
    // Autentikasi dengan Supabase
    const result = await login(email, password);
    setIsLoading(false);
    
    if (result.success) {
      // Arahkan otomatis ke halaman POS (dashboard)
      navigate({ to: "/app/pos" });
    } else {
      setError(result.message || "Gagal masuk. Silakan periksa kembali email dan kata sandi Anda.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="w-full max-w-md relative rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
        <Link to="/" className="absolute right-5 top-5 text-slate-400 hover:text-[#0b172a] hover:bg-slate-100 rounded-full p-2 transition-colors">
          <X className="size-5" />
        </Link>
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="grid size-8 place-items-center rounded-lg bg-[#0b172a]">
              <span className="font-display text-base font-bold leading-none text-white">
                U
              </span>
            </div>
            <span className="font-display text-lg font-semibold text-[#0b172a]">
              UniversalPOS
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Selamat Datang Kembali
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Masuk ke ruang kasir bisnis Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email / Username Staf atau Owner
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-[#0b172a] focus:outline-none focus:ring-1 focus:ring-[#0b172a]"
              placeholder="Email Owner atau Email/Username Kasir"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kata Sandi / PIN Kasir
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-[#0b172a] focus:outline-none focus:ring-1 focus:ring-[#0b172a] font-mono"
              placeholder="Password atau PIN Kasir (4-6 angka)"
            />
          </div>

          <Button
            type="submit"
            disabled={!email || !password || isLoading}
            className="w-full mt-4 bg-[#0b172a] text-white hover:bg-slate-800 rounded-xl py-6 text-base shadow-sm transition-all active:scale-[0.98]"
          >
            {isLoading ? "Masuk..." : "Masuk ke Kasir"}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-sm text-slate-500">
          Belum punya akun?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
