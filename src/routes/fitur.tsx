import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Building2,
  Check,
  CreditCard,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Smartphone,
  Store,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/fitur")({
  head: () => ({
    meta: [
      { title: "Fitur — UniversalPOS" },
      {
        name: "description",
        content:
          "Jelajahi fitur lengkap UniversalPOS: multi-toko, pembayaran QRIS & kartu, laporan real-time, manajemen stok, dan keamanan data.",
      },
      { property: "og:title", content: "Fitur — UniversalPOS" },
      {
        property: "og:description",
        content:
          "Multi-toko, pembayaran lengkap, laporan real-time, dan manajemen stok dalam satu aplikasi kasir.",
      },
      { property: "og:url", content: "/fitur" },
    ],
    links: [{ rel: "canonical", href: "/fitur" }],
  }),
  component: FiturPage,
});

const navLinks = [
  { label: "Fitur", to: "/fitur" },
  { label: "Harga", to: "/harga" },
  { label: "Integrasi", to: "/integrasi" },
  { label: "Bantuan", to: "/bantuan" },
];

const features = [
  {
    icon: Building2,
    title: "Multi-toko real-time",
    description:
      "Kelola puluhan cabang dari satu dasbor. Stok dan penjualan tersinkron seketika, di tiap perangkat.",
  },
  {
    icon: CreditCard,
    title: "Pembayaran tanpa friksi",
    description:
      "QRIS, kartu, e-wallet, dan tunai dalam satu layar. Checkout instan bikin antrian makin cepat.",
  },
  {
    icon: BarChart3,
    title: "Laporan yang jernih",
    description:
      "Insight laba-rugi, produk terlaris, dan tren harian — siap dibagikan ke tim dalam sekali klik.",
  },
  {
    icon: LayoutDashboard,
    title: "Dasbor intuitif",
    description:
      "Tampilan ringkas dengan metrik penting: omzet, transaksi, dan performa toko setiap hari.",
  },
  {
    icon: Receipt,
    title: "Struk digital & cetak",
    description:
      "Kirim struk via WhatsApp atau email, atau cetak langsung ke printer kasir yang kompatibel.",
  },
  {
    icon: ShieldCheck,
    title: "Keamanan terjamin",
    description:
      "Data dienkripsi dan tersimpan aman di cloud. Hak akses staff dapat diatur per peran.",
  },
  {
    icon: Smartphone,
    title: "Berjalan di semua perangkat",
    description:
      "Akses dari HP, tablet, atau komputer. Tidak perlu instalasi, cukup login dan mulai berjualan.",
  },
  {
    icon: Store,
    title: "Manajemen cabang",
    description:
      "Atur harga berbeda per lokasi, pantau performa masing-masing cabang, dan kelola stok terpusat.",
  },
  {
    icon: Users,
    title: "Peran & izin pengguna",
    description:
      "Tentukan siapa yang boleh mengakses fitur apa. Kasir, manajer, dan owner punya hak akses berbeda.",
  },
];

function FiturPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-brand">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-white">
              <span className="font-display text-xl font-bold leading-none text-brand">U</span>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              UniversalPOS
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="hidden text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              Masuk
            </Button>
            <Button className="rounded-full bg-white text-ink hover:bg-mist">
              Mulai Gratis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-brand py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            <span className="size-1.5 rounded-full bg-accent" />
            Fitur Lengkap
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Semua yang dibutuhkan kasir modern.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Dari transaksi harian hingga analitik multi-cabang, UniversalPOS
            hadir dengan fitur yang mudah dipakai namun powerful.
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`rounded-2xl p-7 transition-all hover:-translate-y-1 ${
                  index === 1 || index === 7
                    ? "bg-accent text-ink"
                    : "bg-mist text-ink hover:shadow-lg"
                }`}
              >
                <div
                  className={`grid size-11 place-items-center rounded-xl ${
                    index === 1 || index === 7
                      ? "bg-ink text-white"
                      : "bg-brand text-white"
                  }`}
                >
                  <feature.icon className="size-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">
                  {feature.title}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    index === 1 || index === 7
                      ? "text-ink/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ingin mencoba langsung?
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Coba gratis 14 hari dengan akses penuh ke semua fitur Growth.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full bg-accent px-7 text-base font-semibold text-ink hover:brightness-105"
            >
              Coba Gratis 14 Hari
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/25 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10"
            >
              Jadwalkan Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-ink py-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-white">
                <span className="font-display text-base font-bold leading-none text-brand">
                  U
                </span>
              </div>
              <span className="font-display text-lg font-semibold text-white">
                UniversalPOS
              </span>
            </div>
            <p className="text-sm text-white/50">
              © 2024 UniversalPOS. Dibuat untuk bisnis yang bergerak cepat.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
