const fs = require('fs');
let shiftsViewPath = 'src/domains/fnb/ShiftsView.tsx';
let shiftsViewContent = fs.readFileSync(shiftsViewPath, 'utf8');

shiftsViewContent = shiftsViewContent.replace(
  'setCashierName(user.name);',
  'if (user?.name) setCashierName(user.name);'
);

fs.writeFileSync(shiftsViewPath, shiftsViewContent, 'utf8');
