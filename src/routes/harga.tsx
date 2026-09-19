import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/harga")({
  head: () => ({
    meta: [
      { title: "Harga — UniversalPOS" },
      {
        name: "description",
        content:
          "Pilih paket UniversalPOS: Starter gratis, Growth Rp 299rb/bulan, atau Enterprise custom. Tidak ada biaya tersembunyi.",
      },
      { property: "og:title", content: "Harga — UniversalPOS" },
      {
        property: "og:description",
        content:
          "Starter gratis, Growth Rp 299rb/bulan, atau Enterprise custom. Upgrade kapan saja.",
      },
      { property: "og:url", content: "/harga" },
    ],
    links: [{ rel: "canonical", href: "/harga" }],
  }),
  component: HargaPage,
});

const navLinks = [
  { label: "Fitur", to: "/fitur" },
  { label: "Harga", to: "/harga" },
  { label: "Integrasi", to: "/integrasi" },
  { label: "Bantuan", to: "/bantuan" },
];

const plans = [
  {
    name: "Starter",
    price: "Gratis",
    period: "selamanya",
    description: "Cocok untuk usaha kecil dengan 1 kasir.",
    features: [
      "1 toko & 2 pengguna",
      "Transaksi unlimited",
      "Manajemen produk dasar",
      "Laporan harian",
      "Support via chat",
    ],
    cta: "Mulai Gratis",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "Rp 299rb",
    period: "/bulan",
    description: "Untuk bisnis yang mulai scale dan butuh tim.",
    features: [
      "3 toko & 10 pengguna",
      "Multi-metode pembayaran",
      "Laporan lengkap & analitik",
      "Struk digital & cetak",
      "Priority support",
    ],
    cta: "Coba 14 Hari Gratis",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Untuk rantai toko dengan kebutuhan khusus.",
    features: [
      "Toko & pengguna unlimited",
      "API & integrasi kustom",
      "Dedicated account manager",
      "Onboarding tim",
      "SLA & audit keamanan",
    ],
    cta: "Hubungi Sales",
    highlighted: false,
  },
];

function HargaPage() {
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
              asChild
            >
              <Link to="/login">Masuk</Link>
            </Button>
            <Button className="rounded-full bg-white text-ink hover:bg-mist" asChild>
              <Link to="/register">Mulai Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-brand py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            <span className="size-1.5 rounded-full bg-accent" />
            Harga Transparan
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Pilih paket yang sesuai bisnismu.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Mulai gratis, upgrade kapan saja. Tidak ada biaya setup atau biaya
            tersembunyi.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 ${
                  plan.highlighted
                    ? "bg-ink text-white shadow-2xl shadow-ink/20"
                    : "bg-mist text-ink"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
                    Paling Populer
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold">
                  {plan.name}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    plan.highlighted ? "text-white/60" : "text-muted-foreground"
                  }`}
                >
                  {plan.description}
                </p>
                <div className="mt-6">
                  <span className="font-display text-4xl font-extrabold tracking-tight">
                    {plan.price}
                  </span>
                  <span
                    className={`text-base font-medium ${
                      plan.highlighted ? "text-white/50" : "text-muted-foreground"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
                <Button
                  className={`mt-6 w-full rounded-full ${
                    plan.highlighted
                      ? "bg-accent text-ink hover:brightness-105"
                      : "bg-white text-ink ring-1 ring-border hover:bg-muted"
                  }`}
                  asChild
                >
                  <Link to="/register" search={{ plan: plan.name }}>{plan.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        className={`mt-0.5 size-4 shrink-0 ${
                          plan.highlighted ? "text-accent" : "text-brand"
                        }`}
                      />
                      <span
                        className={
                          plan.highlighted ? "text-white/80" : "text-muted-foreground"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-2xl bg-mist p-8 lg:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  Butuh fitur khusus?
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Tim kami siap membantu integrasi dengan sistem yang sudah Anda
                  pakai, seperti akuntansi, e-commerce, atau loyalty program.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 lg:justify-end">
                <Button className="rounded-full bg-brand px-6 text-white hover:bg-brand-700">
                  Hubungi Sales
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-border bg-white px-6 text-ink hover:bg-muted"
                >
                  Lihat Integrasi
                </Button>
              </div>
            </div>
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
