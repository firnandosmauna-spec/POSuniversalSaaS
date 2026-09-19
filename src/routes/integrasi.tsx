import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  CreditCard,
  Package,
  Receipt,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/integrasi")({
  head: () => ({
    meta: [
      { title: "Integrasi — UniversalPOS" },
      {
        name: "description",
        content:
          "Hubungkan UniversalPOS dengan payment gateway, akuntansi, e-commerce, pengiriman, dan tools bisnis lainnya.",
      },
      { property: "og:title", content: "Integrasi — UniversalPOS" },
      {
        property: "og:description",
        content:
          "Integrasi UniversalPOS dengan payment gateway, akuntansi, e-commerce, dan pengiriman.",
      },
      { property: "og:url", content: "/integrasi" },
    ],
    links: [{ rel: "canonical", href: "/integrasi" }],
  }),
  component: IntegrasiPage,
});

const navLinks = [
  { label: "Fitur", to: "/fitur" },
  { label: "Harga", to: "/harga" },
  { label: "Integrasi", to: "/integrasi" },
  { label: "Bantuan", to: "/bantuan" },
];

const integrations = [
  {
    icon: CreditCard,
    category: "Pembayaran",
    title: "Payment Gateway",
    description:
      "Terima pembayaran via QRIS, kartu kredit/debit, dan virtual account dengan mitra terpercaya.",
  },
  {
    icon: Wallet,
    category: "E-Wallet",
    title: "Dompet Digital",
    description:
      "Hubungkan GoPay, OVO, DANA, dan LinkAja untuk checkout yang lebih cepat.",
  },
  {
    icon: Receipt,
    category: "Akuntansi",
    title: "Laporan Keuangan",
    description:
      "Sinkronkan transaksi harian ke software akuntansi favorit Anda secara otomatis.",
  },
  {
    icon: ShoppingCart,
    category: "E-commerce",
    title: "Toko Online",
    description:
      "Sinkronkan stok antara toko fisik dan marketplace atau website Anda.",
  },
  {
    icon: Truck,
    category: "Pengiriman",
    title: "Logistik",
    description:
      "Cetak resi dan pantau pengiriman langsung dari dashboard UniversalPOS.",
  },
  {
    icon: Package,
    category: "Inventory",
    title: "Manajemen Gudang",
    description:
      "Integrasi dengan sistem gudang untuk kontrol stok yang lebih akurat.",
  },
];

function IntegrasiPage() {
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
            Terhubung dengan Ekosistem
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Integrasi dengan tools yang Anda pakai.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            UniversalPOS terhubung dengan payment gateway, akuntansi,
            e-commerce, dan logistik — semuanya untuk memperlancar operasional
            Anda.
          </p>
        </div>
      </section>

      {/* Integrations grid */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((item, index) => (
              <div
                key={item.title}
                className={`rounded-2xl p-7 transition-all hover:-translate-y-1 ${
                  index === 0 || index === 4
                    ? "bg-accent text-ink"
                    : "bg-mist text-ink hover:shadow-lg"
                }`}
              >
                <div
                  className={`grid size-11 place-items-center rounded-xl ${
                    index === 0 || index === 4
                      ? "bg-ink text-white"
                      : "bg-brand text-white"
                  }`}
                >
                  <item.icon className="size-5" />
                </div>
                <p
                  className={`mt-4 text-xs font-semibold uppercase tracking-[0.15em] ${
                    index === 0 || index === 4 ? "text-ink/60" : "text-brand"
                  }`}
                >
                  {item.category}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold">
                  {item.title}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    index === 0 || index === 4 ? "text-ink/70" : "text-muted-foreground"
                  }`}
                >
                  {item.description}
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
            Butuh integrasi kustom?
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Tim teknis kami siap membantu menghubungkan UniversalPOS dengan
            sistem internal Anda.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full bg-accent px-7 text-base font-semibold text-ink hover:brightness-105"
            >
              Hubungi Sales
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/25 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10"
            >
              Lihat Dokumentasi API
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
