const fs = require('fs');

const filePath = 'src/domains/printing/POSView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace ANY variation of the ugly check with isMaterialDimensionBased(selectedMaterial)
// Example: (selectedMaterial?.unitName.toLowerCase() === "m²" || selectedMaterial?.unitName.toLowerCase() === "mÂ²")
content = content.replace(/\(selectedMaterial\?\.unitName\.toLowerCase\(\)\s*===\s*['"][^'"]+['"]\s*\|\|\s*selectedMaterial\?\.unitName\.toLowerCase\(\)\s*===\s*['"][^'"]+['"]\)/g, 'isMaterialDimensionBased(selectedMaterial)');

// Without ?
content = content.replace(/\(selectedMaterial\.unitName\.toLowerCase\(\)\s*===\s*['"][^'"]+['"]\s*\|\|\s*selectedMaterial\.unitName\.toLowerCase\(\)\s*===\s*['"][^'"]+['"]\)/g, 'isMaterialDimensionBased(selectedMaterial)');

// Not equals
content = content.replace(/selectedMaterial\.unitName\.toLowerCase\(\)\s*!==\s*['"][^'"]+['"]\s*&&\s*selectedMaterial\.unitName\.toLowerCase\(\)\s*!==\s*['"][^'"]+['"]/g, '!isMaterialDimensionBased(selectedMaterial)');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Replaced using wildcard regex.");
