import { supabase } from "@/shared/lib/supabase";

export const DEFAULT_PERMANENT_MATERIALS = [
  { id: "mat_1", name: "Flexi China 280gr (Standard Banner)", category: "OUTDOOR", unitType: "m²", costPrice: 12000, price: 25000, stock: 450, minOrder: 1, description: "Bahan spanduk outdoor ekonomis standar event & toko", finishingsAllowed: ["Mata Ayam", "Pres Keliling"], isAvailable: true },
  { id: "mat_2", name: "Flexi Korea 440gr (High Quality Thick)", category: "OUTDOOR", unitType: "m²", costPrice: 22000, price: 45000, stock: 280, minOrder: 1, description: "Flexi tebal outdoor anti sobek premium baliho", finishingsAllowed: ["Mata Ayam", "Pres Keliling", "Kantung Selongsong"], isAvailable: true },
  { id: "mat_3", name: "Stiker Vinyl Matte / Glossy Indoor", category: "INDOOR", unitType: "m²", costPrice: 35000, price: 75000, stock: 120, minOrder: 1, description: "Stiker vinyl cetak tajam indoor waterproof high resolution", finishingsAllowed: ["Laminasi Doff", "Laminasi Glossy", "Potong Die Cut"], isAvailable: true },
  { id: "mat_4", name: "Art Carton 260gr (A3+ Sheet)", category: "SHEET_DOC", unitType: "lembar", costPrice: 2500, price: 6000, stock: 1500, minOrder: 1, description: "Kertas tebal premium untuk kartu nama, brosur & booklet", finishingsAllowed: ["Laminasi Doff", "Laminasi Glossy", "Potong Rapi"], isAvailable: true },
  { id: "mat_5", name: "Mug Coated Sublimasi White", category: "MERCHANDISE", unitType: "pcs", costPrice: 12000, price: 25000, stock: 85, minOrder: 1, description: "Mug keramik putih cetak sublimasi full color souvenir", finishingsAllowed: ["Kotak Dus Souvenir"], isAvailable: true }
];

export const DEFAULT_PERMANENT_CUSTOMERS = [
  { id: "cust_1", name: "Budi Santoso", companyName: "PT Sinar Merdeka Utama", customerType: "CORPORATE", phone: "081298765432", email: "budi@sinarmerdeka.co.id", address: "Jl. Industri Raya No. 45, Jakarta Barat", npwp: "01.234.567.8-012.000", tier: "VIP_CORPORATE", discountPercent: 10, totalSpkCount: 14, totalSpent: 8500000, unpaidDpBalance: 74000, notes: "Langganan spanduk event bulanan, butuh nota resmi NPWP" },
  { id: "cust_2", name: "Siti Rahmawati", companyName: "Warung Kopi Jaya EO", customerType: "AGENCY", phone: "085611223344", email: "siti.eo@gmail.com", address: "Ruko Sentra Bisnis Blok B3", tier: "RESELLER", discountPercent: 5, totalSpkCount: 8, totalSpent: 3200000, unpaidDpBalance: 0, notes: "Reseller brosur A3+ & tumbler merchandise" },
  { id: "cust_3", name: "Agus Prasetyo", companyName: "-", customerType: "INDIVIDUAL", phone: "087855443322", email: "agus.pras@gmail.com", address: "Jl. Mangga Dua Raya No. 12", tier: "REGULAR", discountPercent: 0, totalSpkCount: 2, totalSpent: 350000, unpaidDpBalance: 0, notes: "Cetak stiker vinyl & kartu nama pribadi" }
];

export const DEFAULT_PERMANENT_FINISHINGS = [
  { id: "fin_eyelet", name: "Mata Ayam (Ring Seng 4 Sudut)", price: 2000, isPerM2: false, isAvailable: true },
  { id: "fin_sew", name: "Lipat Pas / Pres Keliling", price: 3000, isPerM2: false, isAvailable: true },
  { id: "fin_lam_doff", name: "Laminasi Doff (Per m² / Lembar)", price: 15000, isPerM2: true, isAvailable: true },
  { id: "fin_lam_glossy", name: "Laminasi Glossy (Per m² / Lembar)", price: 15000, isPerM2: true, isAvailable: true },
  { id: "fin_cut_die", name: "Potong Rapi (Cut to Size / Die Cut)", price: 2000, isPerM2: false, isAvailable: true },
  { id: "fin_spiral", name: "Jilid Spiral Kawat", price: 10000, isPerM2: false, isAvailable: true }
];

export const DEFAULT_PERMANENT_CATEGORIES = [
  { id: "cat_outdoor", name: "Outdoor Banner (m²)", code: "OUTDOOR", description: "Bahan Flexi, Spanduk, Baliho, Cloth", isAvailable: true },
  { id: "cat_indoor", name: "Indoor & Stiker (m²)", code: "INDOOR", description: "Stiker Vinyl, Albatros, Transparan, Luster", isAvailable: true },
  { id: "cat_sheet", name: "Digital Press A3+ (Lembar)", code: "SHEET_DOC", description: "Art Paper, Art Carton, Jasmine, HVS", isAvailable: true },
  { id: "cat_merch", name: "Merchandise & Souvenir", code: "MERCHANDISE", description: "Mug, Pin, Tumbler, Kaos Sublim, Topi", isAvailable: true },
  { id: "cat_display", name: "Akrilik & Display Rigids", code: "DISPLAY", description: "Impraboard, Akrilik, Foamboard Display", isAvailable: true }
];

export const DEFAULT_PERMANENT_STAFF = [
  { id: "stf_1", name: "Bambang Wijaya", email: "bambang.print@percetakan.com", phone: "081234567801", role: "Kasir & Operator Cetak", pinCode: "1234", isShiftActive: true, shiftStartTime: "08:00 WIB" },
  { id: "stf_2", name: "Dewi Lestari", email: "dewi.design@percetakan.com", phone: "081234567802", role: "Desainer Pre-Press", pinCode: "5678", isShiftActive: true, shiftStartTime: "09:00 WIB" },
  { id: "stf_3", name: "Rian Hidayat", email: "rian.finishing@percetakan.com", phone: "081234567803", role: "Operator Finishing", pinCode: "9999", isShiftActive: false, shiftStartTime: "-" }
];

export async function seedAllMockDataToPermanentStorage(userId?: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Permanenkan Bahan & Material
    localStorage.setItem("pos_printing_materials", JSON.stringify(DEFAULT_PERMANENT_MATERIALS));

    // 2. Permanenkan Pelanggan CRM
    localStorage.setItem("pos_printing_customers", JSON.stringify(DEFAULT_PERMANENT_CUSTOMERS));

    // 3. Permanenkan Finishing Options
    localStorage.setItem("pos_printing_finishing_options", JSON.stringify(DEFAULT_PERMANENT_FINISHINGS));

    // 4. Permanenkan Kategori
    localStorage.setItem("pos_printing_categories", JSON.stringify(DEFAULT_PERMANENT_CATEGORIES));

    // 5. Permanenkan Staff Accounts
    localStorage.setItem("pos_printing_staff", JSON.stringify(DEFAULT_PERMANENT_STAFF));

    // 6. Sync to Supabase if userId is active
    if (userId && supabase) {
      try {
        const productsToInsert = DEFAULT_PERMANENT_MATERIALS.map((m) => ({
          tenant_id: userId,
          name: m.name,
          category: m.category,
          price: m.price,
          cost_price: m.costPrice,
          stock: m.stock,
          unit_type: m.unitType,
          description: m.description,
          status: "active"
        }));
        await supabase.from("products").upsert(productsToInsert);

        const customersToInsert = DEFAULT_PERMANENT_CUSTOMERS.map((c) => ({
          tenant_id: userId,
          name: c.name,
          company_name: c.companyName,
          phone: c.phone,
          email: c.email,
          address: c.address,
          discount_percent: c.discountPercent,
          total_spent: c.totalSpent,
          total_spk_count: c.totalSpkCount
        }));
        await supabase.from("customers").upsert(customersToInsert);
      } catch (err) {
        console.warn("Supabase background sync notice:", err);
      }
    }

    return {
      success: true,
      message: "Seluruh data mock (Bahan, Pelanggan, Finishing, Kategori, & Staf) berhasil diubah menjadi DATA PERMANEN!"
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Gagal mempermanenkan data: ${error?.message || "Unknown error"}`
    };
  }
}
