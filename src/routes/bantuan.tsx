import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, Headphones, Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/bantuan")({
  head: () => ({
    meta: [
      { title: "Bantuan — UniversalPOS" },
      {
        name: "description",
        content:
          "Pusat bantuan UniversalPOS: FAQ, panduan penggunaan, kontak support, dan cara menghubungi tim kami.",
      },
      { property: "og:title", content: "Bantuan — UniversalPOS" },
      {
        property: "og:description",
        content:
          "Temukan jawaban atas pertanyaan umum dan hubungi tim support UniversalPOS.",
      },
      { property: "og:url", content: "/bantuan" },
    ],
    links: [{ rel: "canonical", href: "/bantuan" }],
  }),
  component: BantuanPage,
});

const navLinks = [
  { label: "Fitur", to: "/fitur" },
  { label: "Harga", to: "/harga" },
  { label: "Integrasi", to: "/integrasi" },
  { label: "Bantuan", to: "/bantuan" },
];

const supportChannels = [
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Respons cepat via chat di dalam aplikasi, Senin–Jumat 08.00–20.00.",
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "Kirim pertanyaan ke support@universalpos.id, kami balas dalam 1x24 jam.",
  },
  {
    icon: Headphones,
    title: "Telepon",
    description: "Hubungi tim support kami di jam kerja untuk bantuan teknis.",
  },
  {
    icon: BookOpen,
    title: "Panduan Pengguna",
    description: "Pelajari fitur lengkap UniversalPOS melalui dokumentasi dan video tutorial.",
  },
];

const faqs = [
  {
    question: "Apakah UniversalPOS bisa dipakai offline?",
    answer:
      "Ya. Transaksi tetap berjalan saat koneksi terputus dan akan tersinkronisasi otomatis ketika internet kembali tersedia.",
  },
  {
    question: "Berapa lama proses setup untuk toko saya?",
    answer:
      "Kebanyakan pengguna baru siap berjualan dalam waktu kurang dari 30 menit. Kami juga menyediakan panduan impor katalog dan onboarding gratis.",
  },
  {
    question: "Apakah bisa digunakan di HP dan tablet?",
    answer:
      "Tentu. UniversalPOS berbasis web dan responsif di semua perangkat. Tidak perlu instalasi aplikasi khusus.",
  },
  {
    question: "Bagaimana dengan keamanan data saya?",
    answer:
      "Data dienkripsi dan disimpan di cloud dengan standar keamanan industri. Anda juga dapat mengatur hak akses per pengguna.",
  },
  {
    question: "Apakah ada biaya tersembunyi?",
    answer:
      "Tidak. Harga yang tertera sudah termasuk fitur yang disebutkan. Tidak ada biaya setup atau biaya transaksi tambahan.",
  },
  {
    question: "Bisakah saya upgrade paket kapan saja?",
    answer:
      "Ya, Anda dapat upgrade atau downgrade paket kapan saja dari pengaturan akun. Perubahan akan aktif pada siklus billing berikutnya.",
  },
];

function BantuanPage() {
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
            Pusat Bantuan
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Kami siap membantu.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Temukan jawaban cepat di FAQ atau hubungi tim support kami kapan
            saja.
          </p>
        </div>
      </section>

      {/* Support channels */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {supportChannels.map((channel, index) => (
              <div
                key={channel.title}
                className={`rounded-2xl p-6 transition-all hover:-translate-y-1 ${
                  index === 0
                    ? "bg-accent text-ink"
                    : "bg-mist text-ink hover:shadow-lg"
                }`}
              >
                <div
                  className={`grid size-10 place-items-center rounded-xl ${
                    index === 0 ? "bg-ink text-white" : "bg-brand text-white"
                  }`}
                >
                  <channel.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">
                  {channel.title}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    index === 0 ? "text-ink/70" : "text-muted-foreground"
                  }`}
                >
                  {channel.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-mist py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-6 lg:px-10">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              FAQ
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Pertanyaan yang sering diajukan.
            </h2>
          </div>
          <Accordion type="single" collapsible className="mt-12">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-display text-base font-semibold text-ink hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Masih punya pertanyaan?
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Tim support kami siap membantu Anda mulai dari setup hingga
            troubleshooting.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full bg-accent px-7 text-base font-semibold text-ink hover:brightness-105"
            >
              Hubungi Support
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/25 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10"
            >
              Lihat Panduan
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
