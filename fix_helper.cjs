const fs = require('fs');
let posViewPath = 'src/domains/printing/POSView.tsx';
let posViewContent = fs.readFileSync(posViewPath, 'utf8');

const oldHelperRegex = /const isMaterialDimensionBased = \(material: MaterialOption \| null\) => \{[\s\S]*?return false;\s*\};\s*/;

const newHelper = `const isMaterialDimensionBased = (material: MaterialOption | null) => {
    if (!material) return false;
    const unit = (material.unitName || "").toLowerCase();
    
    // If they explicitly use pcs/lembar etc, definitely not dimension
    if (unit.includes("pcs") || unit.includes("lembar") || unit.includes("lbr") || unit.includes("pack") || unit.includes("rim") || unit.includes("buku") || unit.includes("a3") || unit.includes("box")) return false;

    // Dimension based if unit mentions m, m2, meter, meter persegi, cm
    if (unit.includes("m2") || unit.includes("m²") || unit.includes("meter") || unit === "m" || unit.includes("cm") || unit.includes("mÂ²") || unit.includes("mÃ‚Â²")) return true;
    
    return false;
  };
`;

posViewContent = posViewContent.replace(oldHelperRegex, newHelper);

fs.writeFileSync(posViewPath, posViewContent, 'utf8');
console.log("Updated dimension helper");
