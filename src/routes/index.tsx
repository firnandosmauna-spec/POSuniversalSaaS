import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BusinessType } from "@/shared/auth/AuthContext";
import {
  BarChart3,
  Building2,
  Check,
  CreditCard,
  LayoutDashboard,
  QrCode,
  Receipt,
  ShieldCheck,
  Smartphone,
  Store,
  Users,
  Coffee,
  Utensils,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Dumbbell,
  Printer,
  Scissors,
  Wrench,
  Pill,
  Truck,
  Globe,
  ChevronRight,
} from "lucide-react";
import { getLandingCmsContent, LandingCmsContent } from "@/shared/utils/cmsStore";

const BUSINESS_TYPE_MAPPING: Record<string, BusinessType> = {
  "Cafe & Coffee Shop": "CAFE",
  "F&B": "FNB",
  "Retail": "RETAIL",
  "Toko Kelontong": "GROCERY",
  "Laundry": "LAUNDRY",
  "Gym": "GYM",
  "Percetakan": "PRINTING",
  "Salon & Barber shop": "SALON",
  "Bengkel": "WORKSHOP",
  "Apotek": "PHARMACY",
  "Distributor": "DISTRIBUTOR",
  "Toko Online": "E_COMMERCE",
};

const BUSINESS_CONFIG: Record<BusinessType, {
  name: string;
  category: string;
  icon: any;
  desc: string;
}> = {
  CAFE: { name: "Cafe & Coffee Shop", category: "Kuliner", icon: Coffee, desc: "Manajemen meja, open bill, & pesanan dapur" },
  FNB: { name: "Restoran & F&B", category: "Kuliner", icon: Utensils, desc: "Order per meja, resep bahan, & pesanan online" },
  RETAIL: { name: "Retail & Fashion", category: "Ritel", icon: ShoppingBag, desc: "Barcode scanner, varian ukuran & warna" },
  GROCERY: { name: "Toko Kelontong", category: "Ritel", icon: ShoppingCart, desc: "Kasir cepat, stok grosir, & nota cetak" },
  LAUNDRY: { name: "Laundry & Dry Clean", category: "Jasa", icon: Shirt, desc: "Status cuci/setrika, kiloan, & struk WA" },
  GYM: { name: "Gym & Fitness", category: "Jasa", icon: Dumbbell, desc: "Absensi member, sewa PT, & kuota visit" },
  PRINTING: { name: "Percetakan & Print", category: "Jasa", icon: Printer, desc: "Kalkulator m², job order produksi, & DP" },
  SALON: { name: "Salon & Barbershop", category: "Jasa", icon: Scissors, desc: "Booking stylist, komisi kapster, & paket" },
  WORKSHOP: { name: "Bengkel & Otomotif", category: "Jasa", icon: Wrench, desc: "WO mekanik, jualan sparepart, & garansi" },
  PHARMACY: { name: "Apotek & Klinik", category: "Kesehatan", icon: Pill, desc: "Expired date batch lot & obat racikan" },
  DISTRIBUTOR: { name: "Distributor & Grosir", category: "Ritel", icon: Truck, desc: "Multi gudang, harga bertingkat, & piutang" },
  E_COMMERCE: { name: "Toko Online", category: "Ritel", icon: Globe, desc: "Sinkronisasi marketplace & kurir pengiriman" },
};

function getBusinessCode(name: string): BusinessType {
  return BUSINESS_TYPE_MAPPING[name] || "RETAIL";
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UniversalPOS, Aplikasi Kasir untuk Semua Bisnis" },
      {
        name: "description",
        content:
          "UniversalPOS menyatukan penjualan, stok, dan laporan ke satu aplikasi kasir modern. Kelola multi-toko dengan mudah.",
      },
      {
        property: "og:title",
        content: "UniversalPOS, Aplikasi Kasir untuk Semua Bisnis",
      },
      {
        property: "og:description",
        content:
          "Satu POS untuk semua toko. Kelola penjualan, stok, dan laporan dengan cepat.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const navLinks = [
  { label: "Fitur", to: "/fitur" },
  { label: "Harga", to: "/harga" },
  { label: "Integrasi", to: "/integrasi" },
  { label: "Bantuan", to: "/bantuan" },
];

const ICON_MAP: Record<string, any> = {
  Building2,
  CreditCard,
  BarChart3,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
};

function Index() {
  const [cms, setCms] = useState<LandingCmsContent>(getLandingCmsContent());

  useEffect(() => {
    setCms(getLandingCmsContent());
  }, []);

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
              className="text-white/80 hover:bg-white/10 hover:text-white inline-flex"
              asChild
            >
              <Link to="/login">Masuk</Link>
            </Button>
            <Button className="rounded-full bg-white text-ink hover:bg-mist" asChild>
              <Link to="/register">{cms.hero.ctaText || "Buat Akun"}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-52 -left-32 size-[440px] rounded-full bg-accent/20" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              <span className="size-1.5 rounded-full bg-accent" />
              {cms.hero.badgeText}
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {cms.hero.headingLine1}
              <br />
              {cms.hero.headingLine2}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/70">
              {cms.hero.subtitle}
            </p>
            <div className="mt-9 flex flex-wrap justify-center items-center gap-4">
              <Button
                size="lg"
                className="rounded-full bg-white px-7 text-base font-semibold text-ink hover:bg-mist"
                asChild
              >
                <Link to="/register">{cms.hero.ctaText}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Businesses Section (Anti-Slop Craftsmanship) */}
      <section className="border-b border-slate-200/80 bg-slate-50/70 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block rounded-full bg-brand/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand mb-3">
              Solusi POS Sesuai Industri
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Pilih Bidang Usaha Anda
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Sistem kasir UniversalPOS menyesuaikan alur transaksi, cetak nota, dan manajemen stok otomatis sesuai spesifikasi unik setiap jenis toko.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cms.businessTypes.map((business, i) => {
              const code = getBusinessCode(business);
              const config = BUSINESS_CONFIG[code] || {
                name: business,
                category: "Ritel",
                icon: Store,
                desc: "Aplikasi kasir & kontrol stok otomatis"
              };
              const IconComponent = config.icon;

              return (
                <Link
                  key={i}
                  to="/register"
                  search={{ type: code }}
                  className="group relative flex flex-col justify-between rounded-2xl bg-white p-5 border border-slate-200/90 shadow-sm hover:border-brand/50 hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold transition-colors group-hover:bg-brand group-hover:text-white">
                        <IconComponent className="size-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                        {config.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-brand transition-colors">
                      {config.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      {config.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-brand transition-colors">
                    <span>Mendaftar Akun Kasir</span>
                    <ChevronRight className="size-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-brand" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              {cms.featuresHeader.badgeText}
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              {cms.featuresHeader.heading}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {cms.featuresHeader.subtitle}
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cms.features.map((feature, index) => {
              const IconComp = ICON_MAP[feature.iconName] || Building2;
              return (
                <div
                  key={feature.id || feature.title}
                  className={`rounded-2xl p-7 transition-all hover:-translate-y-1 ${
                    index === 2
                      ? "bg-accent text-ink"
                      : "bg-mist text-ink hover:shadow-lg"
                  }`}
                >
                  <div
                    className={`grid size-11 place-items-center rounded-xl ${
                      index === 2 ? "bg-ink text-white" : "bg-brand text-white"
                    }`}
                  >
                    <IconComp className="size-5" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      index === 2 ? "text-ink/70" : "text-muted-foreground"
                    }`}
                  >
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-mist">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                {cms.stepsHeader.badgeText}
              </span>
              <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                {cms.stepsHeader.heading}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {cms.stepsHeader.subtitle}
              </p>
              <div className="mt-10 space-y-8">
                {cms.steps.map((step) => (
                  <div key={step.id || step.title} className="flex gap-4">
                    <Check className="mt-1 size-5 shrink-0 text-brand" />
                    <div>
                      <h3 className="font-display text-lg font-semibold text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-xl shadow-ink/5">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border bg-mist px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Smartphone className="size-5 text-brand" />
                    <span className="text-sm font-medium">Kasir POS Mobile</span>
                  </div>
                  <span className="text-sm font-semibold text-ink">Aktif</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-mist px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="size-5 text-brand" />
                    <span className="text-sm font-medium">Multi-Pembayaran</span>
                  </div>
                  <span className="text-sm font-semibold text-ink">QRIS & Kartu</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-mist px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Store className="size-5 text-brand" />
                    <span className="text-sm font-medium">Sinkron Cabang</span>
                  </div>
                  <span className="text-sm font-semibold text-ink">Real-time</span>
                </div>
                <div className="rounded-xl bg-brand p-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total transaksi</span>
                    <span className="font-display text-xl font-bold">Rp 240.000</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/80">
                    <Check className="size-3.5" />
                    Pembayaran berhasil dicatat
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              {cms.pricingHeader.badgeText}
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              {cms.pricingHeader.heading}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {cms.pricingHeader.subtitle}
            </p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {cms.pricingPlans.map((plan) => (
              <div
                key={plan.id || plan.name}
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
                  <Link to="/register">{plan.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3">
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
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-ink">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-10 lg:py-28">
          <h2 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {cms.ctaSection.heading}
          </h2>
          <p className="mt-5 text-lg text-white/60">
            {cms.ctaSection.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full bg-accent px-7 text-base font-semibold text-ink hover:brightness-105"
              asChild
            >
              <Link to="/register">{cms.ctaSection.ctaText}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-ink">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-white">
                  <span className="font-display text-base font-bold leading-none text-brand">
                    U
                  </span>
                </div>
                <span className="font-display text-lg font-semibold text-white">
                  UniversalPOS
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
                {cms.footer.description}
              </p>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold text-white">
                Produk
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-white/50">
                <li>
                  <Link to="/fitur" className="hover:text-white">
                    Fitur
                  </Link>
                </li>
                <li>
                  <Link to="/harga" className="hover:text-white">
                    Harga
                  </Link>
                </li>
                <li>
                  <Link to="/integrasi" className="hover:text-white">
                    Integrasi
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold text-white">
                Perusahaan
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-white/50">
                <li>
                  <Link to="/bantuan" className="hover:text-white">
                    Bantuan
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8">
            <p className="text-center text-xs text-white/40">
              {cms.footer.copyrightText}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
