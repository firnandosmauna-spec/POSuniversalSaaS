import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CmsView } from "@/domains/fnb/CmsView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Lock, ShieldCheck, LogOut, KeyRound, UserCheck, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/cms")({
  head: () => ({
    meta: [
      { title: "CMS Landing Page Admin - UniversalPOS" },
      { name: "description", content: "Panel CMS terpisah untuk mengelola seluruh konten halaman depan UniversalPOS." }
    ]
  }),
  component: StandaloneCmsView,
});

const CMS_AUTH_KEY = "pos_cms_auth_token";

function StandaloneCmsView() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(CMS_AUTH_KEY) === "admin_cms_token";
    } catch {
      return false;
    }
  });

  const [email, setEmail] = useState("admin@cms.com");
  const [password, setPassword] = useState("admin");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMsg("");

    setTimeout(() => {
      // Automatic Admin CMS validation
      if (email.trim() && password.trim()) {
        sessionStorage.setItem(CMS_AUTH_KEY, "admin_cms_token");
        setIsAuthenticated(true);
      } else {
        setErrorMsg("Email dan kata sandi wajib diisi.");
      }
      setIsLoggingIn(false);
    }, 400);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(CMS_AUTH_KEY);
    setIsAuthenticated(false);
  };

  // If user is NOT authenticated, show the CMS Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Ambient Glow background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-brand/20 blur-3xl rounded-full pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-8 rounded-none shadow-2xl relative z-10 backdrop-blur-md">
          {/* Header Portal */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="size-12 rounded-none bg-brand text-white grid place-items-center mb-3 shadow-lg">
              <Lock className="size-6" />
            </div>
            <h1 className="font-display font-extrabold text-xl text-white">
              Portal Admin CMS Landing Page
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Masuk untuk mengelola seluruh teks, paket harga, dan konten halaman utama UniversalPOS.
            </p>
          </div>

          {/* Form Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Email / Username Admin CMS
              </label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cms.com"
                  className="bg-slate-950 border-slate-800 text-sm font-medium focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-950 border-slate-800 text-sm font-medium focus:border-brand"
                />
              </div>
            </div>

            {/* Quick Demo Hint */}
            <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 text-[11px] text-indigo-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand shrink-0" />
                <span>Otomatis masuk sebagai <strong>Admin CMS</strong></span>
              </div>
              <span className="font-mono text-[10px] bg-brand/20 px-2 py-0.5 rounded text-brand">Auto-Admin</span>
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-brand hover:bg-brand/90 text-white font-bold text-sm py-2.5 rounded-none shadow-md transition-all mt-2"
            >
              {isLoggingIn ? "Memverifikasi Sesi..." : "Masuk Sebagai Admin CMS"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <Globe className="size-3.5" /> Kembalikan ke Halaman Depan Landing Page
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Render Admin CMS Panel once logged in
  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Standalone CMS Top Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center bg-brand text-white font-display font-bold text-sm">
            U
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm font-bold text-white tracking-tight">
                UniversalPOS CMS Admin Portal
              </h1>
              <span className="bg-emerald-950 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-800">
                ADMIN CMS ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sesi terotentikasi pengelola konten Landing Page
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 border border-slate-800 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Globe className="size-3.5" /> Buka Landing Page Utama
          </a>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 border border-rose-900/50 flex items-center gap-1.5"
            title="Keluar dari Sesi CMS"
          >
            <LogOut className="size-3.5" /> Keluar Admin CMS
          </Button>
        </div>
      </header>

      {/* Main CMS Container */}
      <div className="flex-1 overflow-hidden">
        <CmsView />
      </div>
    </div>
  );
}
