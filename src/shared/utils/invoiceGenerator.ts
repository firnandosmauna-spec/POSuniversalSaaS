export type InvoiceSettings = {
  invoicePrefix: string;
  invoiceFormat: string;
  invoiceCounterDigits: number;
  invoiceCounterReset: "DAILY" | "MONTHLY" | "YEARLY" | "NEVER";
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  invoicePrefix: "INV",
  invoiceFormat: "{PREFIX}-{YYYYMMDD}-{COUNTER}",
  invoiceCounterDigits: 4,
  invoiceCounterReset: "DAILY",
};

export function getInvoiceSettings(): InvoiceSettings {
  try {
    const saved = localStorage.getItem("pos_invoice_settings");
    if (saved) {
      return { ...DEFAULT_INVOICE_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to parse invoice settings:", e);
  }
  return DEFAULT_INVOICE_SETTINGS;
}

export function saveInvoiceSettings(settings: InvoiceSettings): void {
  try {
    localStorage.setItem("pos_invoice_settings", JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save invoice settings:", e);
  }
}

export function generateInvoiceCode(
  settings: Partial<InvoiceSettings> = {},
  counter = 1,
  branchCode = "PUSAT"
): string {
  const merged = { ...DEFAULT_INVOICE_SETTINGS, ...settings };
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyymmdd = `${yyyy}${mm}${dd}`;

  const paddedCounter = String(counter).padStart(merged.invoiceCounterDigits || 4, "0");
  const cleanBranch = branchCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "MAIN";

  return (merged.invoiceFormat || "{PREFIX}-{YYYYMMDD}-{COUNTER}")
    .replace("{PREFIX}", (merged.invoicePrefix || "INV").toUpperCase())
    .replace("{YYYYMMDD}", yyyymmdd)
    .replace("{COUNTER}", paddedCounter)
    .replace("{BRANCH}", cleanBranch);
}
