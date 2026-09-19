export type FeatureItem = {
  id?: string;
  iconName: string;
  title: string;
  description: string;
};

export type StepItem = {
  id?: string;
  title: string;
  description: string;
};

export type PricingPlan = {
  id?: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
};

export type LandingCmsContent = {
  hero: {
    badgeText: string;
    headingLine1: string;
    headingLine2: string;
    subtitle: string;
    ctaText: string;
    mockupSalesAmount: string;
    mockupSalesGrowth: string;
    mockupTxCount: string;
    mockupItemsCount: string;
    mockupAvgAmount: string;
  };
  businessTypes: string[];
  featuresHeader: {
    badgeText: string;
    heading: string;
    subtitle: string;
  };
  features: FeatureItem[];
  stepsHeader: {
    badgeText: string;
    heading: string;
    subtitle: string;
  };
  steps: StepItem[];
  pricingHeader: {
    badgeText: string;
    heading: string;
    subtitle: string;
  };
  pricingPlans: PricingPlan[];
  ctaSection: {
    heading: string;
    subtitle: string;
    ctaText: string;
  };
  footer: {
    description: string;
    copyrightText: string;
  };
};

export const DEFAULT_CMS_CONTENT: LandingCmsContent = {
  hero: {
    badgeText: "POS UNTUK SETIAP BISNIS",
    headingLine1: "Satu POS.",
    headingLine2: "Semua toko.",
    subtitle: "UniversalPOS menyatukan penjualan, stok, dan laporan ke satu aplikasi. Kelola multi-toko dalam hitungan detik, tanpa ribet.",
    ctaText: "Buat Akun",
    mockupSalesAmount: "Rp 48.2M",
    mockupSalesGrowth: "+18,4%",
    mockupTxCount: "1.284",
    mockupItemsCount: "3.910",
    mockupAvgAmount: "Rp 37k",
  },
  businessTypes: [
    "Cafe & Coffee Shop",
    "F&B",
    "Retail",
    "Toko Kelontong",
    "Laundry",
    "Gym",
    "Percetakan",
    "Salon & Barber shop",
    "Bengkel",
    "Apotek",
    "Distributor",
    "Toko Online",
  ],
  featuresHeader: {
    badgeText: "KENAPA UNIVERSALPOS",
    heading: "Kendali penuh, tanpa drama.",
    subtitle: "Semua yang Anda butuhkan untuk mengelola penjualan dalam satu platform yang ringan dan powerful.",
  },
  features: [
    {
      id: "f1",
      iconName: "Building2",
      title: "Multi-toko terpusat",
      description: "Kelola puluhan cabang dari satu dasbor. Stok dan penjualan tersinkronisasi di tiap perangkat.",
    },
    {
      id: "f2",
      iconName: "CreditCard",
      title: "Pembayaran terpadu",
      description: "Terima QRIS, kartu, e-wallet, dan tunai langsung dalam satu layar kasir.",
    },
    {
      id: "f3",
      iconName: "BarChart3",
      title: "Laporan penjualan",
      description: "Lihat laba-rugi, produk terlaris, dan tren harian toko Anda.",
    },
    {
      id: "f4",
      iconName: "LayoutDashboard",
      title: "Dasbor aktivitas",
      description: "Pantau omzet, jumlah transaksi, dan performa setiap toko harian.",
    },
    {
      id: "f5",
      iconName: "Receipt",
      title: "Struk digital & cetak",
      description: "Kirim struk lewat pesan atau cetak langsung ke printer kasir standar.",
    },
    {
      id: "f6",
      iconName: "ShieldCheck",
      title: "Keamanan akses",
      description: "Hak akses fitur dan laporan dapat dibatasi sesuai peran staf Anda.",
    },
  ],
  stepsHeader: {
    badgeText: "CARA KERJA",
    heading: "Aktif dalam 3 langkah mudah.",
    subtitle: "Tidak perlu training panjang. Tim Anda bisa langsung berjualan hari ini juga.",
  },
  steps: [
    {
      id: "s1",
      title: "Daftar & atur toko",
      description: "Buat akun dalam 2 menit. Tambahkan cabang, kategori produk, dan pengguna sesuai peran.",
    },
    {
      id: "s2",
      title: "Impor katalog",
      description: "Unggah produk via Excel atau masukkan manual. Harga dan stok langsung siap dipakai.",
    },
    {
      id: "s3",
      title: "Mulai berjualan",
      description: "Buka aplikasi di tablet, komputer, atau HP. Setiap transaksi tercatat otomatis.",
    },
  ],
  pricingHeader: {
    badgeText: "HARGA",
    heading: "Pilih paket yang sesuai bisnismu.",
    subtitle: "Mulai gratis, upgrade kapan saja. Tidak ada biaya tersembunyi.",
  },
  pricingPlans: [
    {
      id: "p1",
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
      id: "p2",
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
      cta: "Buat Akun",
      highlighted: true,
    },
    {
      id: "p3",
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
  ],
  ctaSection: {
    heading: "Siap scale-kan bisnismu?",
    subtitle: "Mulai gratis, tanpa kartu kredit. Aktif dalam 5 menit.",
    ctaText: "Buat Akun",
  },
  footer: {
    description: "Aplikasi kasir universal untuk retail, F&B, dan layanan. Kelola penjualan, stok, dan tim dalam satu platform.",
    copyrightText: "© 2024 UniversalPOS. Hak cipta dilindungi undang-undang.",
  },
};

const CMS_STORAGE_KEY = "pos_landing_cms_data";

export function getLandingCmsContent(): LandingCmsContent {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return DEFAULT_CMS_CONTENT;
  }
  try {
    const raw = localStorage.getItem(CMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CMS_CONTENT, ...parsed };
    }
  } catch (e) {
    console.error("Failed to parse CMS content from localStorage:", e);
  }
  return DEFAULT_CMS_CONTENT;
}

export function saveLandingCmsContent(content: LandingCmsContent): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(content));
  } catch (e) {
    console.error("Failed to save CMS content:", e);
  }
}

export function resetLandingCmsContent(): LandingCmsContent {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(CMS_STORAGE_KEY);
    } catch (e) {}
  }
  return DEFAULT_CMS_CONTENT;
}
