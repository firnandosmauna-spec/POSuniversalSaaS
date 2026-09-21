const fs = require('fs');

// 1. Fix POSView.tsx
let posViewPath = 'src/domains/printing/POSView.tsx';
let posViewContent = fs.readFileSync(posViewPath, 'utf8');

posViewContent = posViewContent.replace(
  'const isMaterialDimensionBased = (material: PrintingMaterial | null) => {',
  'const isMaterialDimensionBased = (material: MaterialOption | null) => {'
);

posViewContent = posViewContent.replace(
  'if (!selectedMaterial) return { baseTotal: 0, finishingTotal: 0, chosenDesignFee: 0, finalTotal: 0, chosenFinishingsObj: [] };',
  'if (!selectedMaterial) return { baseTotal: 0, finishingTotal: 0, chosenDesignFee: 0, chosenDesignFeeName: "File Siap Cetak (Rp 0)", finalTotal: 0, chosenFinishingsObj: [] };'
);

fs.writeFileSync(posViewPath, posViewContent, 'utf8');

// 2. Fix ShiftsView.tsx
let shiftsViewPath = 'src/domains/fnb/ShiftsView.tsx';
let shiftsViewContent = fs.readFileSync(shiftsViewPath, 'utf8');

shiftsViewContent = shiftsViewContent.replace(
  'const currentStaff = data.find(s => s.name === user.name);',
  'const currentStaff = data.find(s => s.name === user?.name);'
);

fs.writeFileSync(shiftsViewPath, shiftsViewContent, 'utf8');

console.log("Fixed TS Errors");
