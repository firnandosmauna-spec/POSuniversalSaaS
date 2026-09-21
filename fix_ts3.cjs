const fs = require('fs');
let shiftsViewPath = 'src/domains/fnb/ShiftsView.tsx';
let shiftsViewContent = fs.readFileSync(shiftsViewPath, 'utf8');

shiftsViewContent = shiftsViewContent.replace(
  'setCashierName(data[0].name);',
  'setCashierName(data[0]?.name || "");'
);

fs.writeFileSync(shiftsViewPath, shiftsViewContent, 'utf8');
