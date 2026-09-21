const fs = require('fs');
let settingsPath = 'src/domains/printing/SettingsView.tsx';
let content = fs.readFileSync(settingsPath, 'utf8');

// 1. Add state
const stateReplacement = `  // SPK & DP Workflow Settings
  const [minDpPercentage, setMinDpPercentage] = useState<number>(50);
  const [paymentMethodsStr, setPaymentMethodsStr] = useState<string>("Tunai, QRIS, Transfer Bank, Debit / Kredit");`;

content = content.replace(
  '  // SPK & DP Workflow Settings\n  const [minDpPercentage, setMinDpPercentage] = useState<number>(50);',
  stateReplacement
);

// 2. Load payment methods from local storage
const loadReplacement = `        const savedSettings = localStorage.getItem(\`pos_tenant_\${user.id}_printing_settings\`);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.machines) setMachines(parsed.machines);
          if (parsed.minDpPercentage) setMinDpPercentage(parsed.minDpPercentage);
          if (parsed.paymentMethodsStr) setPaymentMethodsStr(parsed.paymentMethodsStr);`;

content = content.replace(
  `        const savedSettings = localStorage.getItem(\`pos_tenant_\${user.id}_printing_settings\`);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.machines) setMachines(parsed.machines);
          if (parsed.minDpPercentage) setMinDpPercentage(parsed.minDpPercentage);`,
  loadReplacement
);

// 3. Save payment methods to local storage
const saveReplacement = `        const dataToSave = {
          machines,
          minDpPercentage,
          paymentMethodsStr,`;

content = content.replace(
  `        const dataToSave = {
          machines,
          minDpPercentage,`,
  saveReplacement
);

// 4. Add UI
const uiReplacement = `                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Daftar Metode Pembayaran (Pisahkan dengan koma)
                  </label>
                  <Input
                    type="text"
                    value={paymentMethodsStr}
                    onChange={(e) => setPaymentMethodsStr(e.target.value)}
                    className="h-9 w-full bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                    placeholder="Contoh: Tunai, QRIS, Transfer Bank"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Daftar ini akan muncul sebagai opsi di menu Kasir dan Ringkasan Laporan Penjualan.
                  </p>
                </div>

                <div>`;

content = content.replace(
  `                <div>`,
  uiReplacement
);

fs.writeFileSync(settingsPath, content, 'utf8');
console.log("Updated SettingsView.tsx");
