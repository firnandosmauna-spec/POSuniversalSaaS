const fs = require('fs');
let posViewPath = 'src/domains/printing/POSView.tsx';
let content = fs.readFileSync(posViewPath, 'utf8');

// Add paymentMethodsList state
const stateReplacement = `  const [paymentType, setPaymentType] = useState<"LUNAS" | "DP">("LUNAS");
  const [dpInput, setDpInput] = useState<number>(0);
  const [paymentMethodsList, setPaymentMethodsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pos_payment_methods");
      if (saved) {
        return saved.split(",").map(s => s.trim()).filter(Boolean);
      }
    } catch(e) {}
    return ["Tunai", "QRIS", "Transfer Bank", "Debit / Kredit"];
  });
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethodsList[0] || "Tunai");`;

content = content.replace(
  `  const [paymentType, setPaymentType] = useState<"LUNAS" | "DP">("LUNAS");
  const [dpInput, setDpInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Tunai");`,
  stateReplacement
);

// Update dropdown
const selectReplacement = `            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white p-1.5 rounded-none focus:outline-brand"
            >
              {paymentMethodsList.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>`;

content = content.replace(
  /<select[\s\S]*?value=\{paymentMethod\}[\s\S]*?onChange=\{\(e\) => setPaymentMethod\(e\.target\.value\)\}[\s\S]*?className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white p-1\.5 rounded-none focus:outline-brand"[\s\S]*?>\s*<option value="Tunai">Tunai \/ Cash<\/option>[\s\S]*?<\/select>/,
  selectReplacement
);

fs.writeFileSync(posViewPath, content, 'utf8');
console.log("Updated POSView.tsx");
