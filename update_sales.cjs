const fs = require('fs');
let salesViewPath = 'src/domains/printing/SalesView.tsx';
let content = fs.readFileSync(salesViewPath, 'utf8');

// 1. Add paymentMethodsList state
const stateReplacement = `  const [payAmountInput, setPayAmountInput] = useState<number>(0);
  const [paymentMethodsList, setPaymentMethodsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pos_payment_methods");
      if (saved) return saved.split(",").map(s => s.trim()).filter(Boolean);
    } catch(e) {}
    return ["Tunai", "QRIS", "Transfer Bank", "Debit / Kredit"];
  });
  const [payMethodInput, setPayMethodInput] = useState<string>(paymentMethodsList[0] || "Tunai");`;

content = content.replace(
  `  const [payAmountInput, setPayAmountInput] = useState<number>(0);
  const [payMethodInput, setPayMethodInput] = useState<string>("cash");`,
  stateReplacement
);

// 2. Update handleOpenPayRemaining to use the first method from the list
content = content.replace(
  'setPayMethodInput("cash");',
  'setPayMethodInput(paymentMethodsList[0] || "Tunai");'
);

// 3. Update the modal's <select>
const selectReplacement = `                  <select
                    value={payMethodInput}
                    onChange={(e) => setPayMethodInput(e.target.value)}
                    className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    {paymentMethodsList.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>`;

content = content.replace(
  /<select[\s\S]*?value=\{payMethodInput\}[\s\S]*?onChange=\{\(e\) => setPayMethodInput\(e\.target\.value\)\}[\s\S]*?className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2\.5 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"[\s\S]*?>[\s\S]*?<\/select>/,
  selectReplacement
);

// 4. Update the `metrics` calculation
const metricsCalculationReplacement = `    const paymentBreakdown = paymentMethodsList.map(method => {
      const total = filteredJobs.filter(j => j.paymentMethod === method || (method === 'Tunai' && j.paymentMethod === 'cash') || (method === 'QRIS' && j.paymentMethod === 'qris') || (method === 'Transfer Bank' && j.paymentMethod === 'transfer')).reduce((acc, j) => acc + j.dpAmount, 0);
      return { method, total };
    });

    return {
      totalRevenue,
      totalReceived,
      totalRemaining,
      countActive,
      countCompleted,
      outdoorM2,
      outdoorOmzet,
      sheetCount,
      sheetOmzet,
      merchCount,
      merchOmzet,
      paymentBreakdown
    };
  }, [filteredJobs, paymentMethodsList]);`;

content = content.replace(
  /    const cashTotal = filteredJobs\.filter[\s\S]*?transferTotal\n    \};\n  \}, \[filteredJobs\]\);/,
  metricsCalculationReplacement
);

// 5. Update the rendering of the payment totals
const metricsRenderingReplacement = `                  <div className="space-y-1 mt-2">
                    {metrics.paymentBreakdown.map(p => (
                      <div key={p.method} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{p.method}</span>
                        <span className="font-mono font-extrabold text-slate-700 dark:text-slate-300">
                          {formatRupiah(p.total)}
                        </span>
                      </div>
                    ))}
                  </div>`;

content = content.replace(
  /                  <div className="space-y-1 mt-2">\s*<div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800">[\s\S]*?<\/div>\s*<\/div>/,
  metricsRenderingReplacement
);

fs.writeFileSync(salesViewPath, content, 'utf8');
console.log("Updated SalesView.tsx");
