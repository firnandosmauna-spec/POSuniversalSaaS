export type PaymentMethodItem = {
  id: string;
  name: string;
  type: "cash" | "qris" | "transfer" | "debit" | "ewallet" | "other";
  enabled: boolean;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  notes?: string;
};

export type FnBPaymentSettings = {
  taxRate: number; // PB1 Resto, e.g. 10%
  serviceChargeRate: number; // e.g. 5%
  enableServiceCharge: boolean;
  enableTax: boolean;
  roundingEnabled: boolean; // pembulatan nominal ratusan
  qrisImageUrl?: string;
  qrisMerchantName?: string;
  qrisNmid?: string;
  paymentMethods: PaymentMethodItem[];
};

export const DEFAULT_FNB_PAYMENT_METHODS: PaymentMethodItem[] = [
  { id: "cash", name: "Tunai (Cash)", type: "cash", enabled: true },
  { id: "qris", name: "QRIS", type: "qris", enabled: true },
  { id: "debit_bca", name: "Debit BCA", type: "debit", enabled: true, bankName: "BCA" },
  { id: "debit_mandiri", name: "Debit Mandiri", type: "debit", enabled: true, bankName: "Mandiri" },
  { id: "transfer_bca", name: "Transfer Bank BCA", type: "transfer", enabled: true, bankName: "BCA" },
  { id: "gopay", name: "GoPay", type: "ewallet", enabled: true },
  { id: "ovo", name: "OVO / DANA / ShopeePay", type: "ewallet", enabled: true },
];

export const DEFAULT_FNB_PAYMENT_SETTINGS: FnBPaymentSettings = {
  taxRate: 10,
  serviceChargeRate: 5,
  enableServiceCharge: false,
  enableTax: false,
  roundingEnabled: false,
  qrisImageUrl: "",
  qrisMerchantName: "CAFE & RESTO",
  qrisNmid: "",
  paymentMethods: DEFAULT_FNB_PAYMENT_METHODS,
};

export function getFnBPaymentSettings(tenantId?: string): FnBPaymentSettings {
  try {
    const key = tenantId ? `pos_fnb_payment_settings_${tenantId}` : "pos_fnb_payment_settings";
    let saved = localStorage.getItem(key);
    if (!saved && tenantId) {
      saved = localStorage.getItem("pos_fnb_payment_settings");
    }
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_FNB_PAYMENT_SETTINGS,
        ...parsed,
        paymentMethods: parsed.paymentMethods || DEFAULT_FNB_PAYMENT_METHODS,
      };
    }
  } catch (e) {
    console.error("Gagal memuat pengaturan pembayaran F&B:", e);
  }
  return DEFAULT_FNB_PAYMENT_SETTINGS;
}

export function saveFnBPaymentSettings(settings: FnBPaymentSettings, tenantId?: string): void {
  try {
    const key = tenantId ? `pos_fnb_payment_settings_${tenantId}` : "pos_fnb_payment_settings";
    localStorage.setItem(key, JSON.stringify(settings));
    // Simpan juga ke key umum agar kompatibel
    localStorage.setItem("pos_fnb_payment_settings", JSON.stringify(settings));

    // Dispatch event agar POSView dan komponen lain langsung bereaksi tanpa refresh halaman
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pos_fnb_payment_settings_updated", { detail: settings }));
    }
  } catch (e) {
    console.error("Gagal menyimpan pengaturan pembayaran F&B:", e);
  }
}

/**
 * Tambah metode pembayaran baru (Create)
 */
export function addPaymentMethodItem(
  newMethod: Omit<PaymentMethodItem, "id">,
  tenantId?: string
): PaymentMethodItem {
  const current = getFnBPaymentSettings(tenantId);
  const created: PaymentMethodItem = {
    ...newMethod,
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
  const updatedMethods = [...current.paymentMethods, created];
  saveFnBPaymentSettings({ ...current, paymentMethods: updatedMethods }, tenantId);
  return created;
}

/**
 * Perbarui metode pembayaran (Update)
 */
export function updatePaymentMethodItem(
  id: string,
  updates: Partial<PaymentMethodItem>,
  tenantId?: string
): PaymentMethodItem[] {
  const current = getFnBPaymentSettings(tenantId);
  const updatedMethods = current.paymentMethods.map((m) =>
    m.id === id ? { ...m, ...updates } : m
  );
  saveFnBPaymentSettings({ ...current, paymentMethods: updatedMethods }, tenantId);
  return updatedMethods;
}

/**
 * Hapus metode pembayaran (Delete)
 */
export function deletePaymentMethodItem(
  id: string,
  tenantId?: string
): PaymentMethodItem[] {
  const current = getFnBPaymentSettings(tenantId);
  const updatedMethods = current.paymentMethods.filter((m) => m.id !== id);
  saveFnBPaymentSettings({ ...current, paymentMethods: updatedMethods }, tenantId);
  return updatedMethods;
}

/**
 * Toggle status aktif/nonaktif metode
 */
export function togglePaymentMethodItem(
  id: string,
  tenantId?: string
): PaymentMethodItem[] {
  const current = getFnBPaymentSettings(tenantId);
  const updatedMethods = current.paymentMethods.map((m) =>
    m.id === id ? { ...m, enabled: !m.enabled } : m
  );
  saveFnBPaymentSettings({ ...current, paymentMethods: updatedMethods }, tenantId);
  return updatedMethods;
}

/**
 * Reset daftar metode pembayaran ke default F&B
 */
export function resetPaymentMethodsToDefault(tenantId?: string): PaymentMethodItem[] {
  const current = getFnBPaymentSettings(tenantId);
  const resetMethods = [...DEFAULT_FNB_PAYMENT_METHODS];
  saveFnBPaymentSettings({ ...current, paymentMethods: resetMethods }, tenantId);
  return resetMethods;
}
