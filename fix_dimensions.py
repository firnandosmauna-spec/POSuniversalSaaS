import re

file_path = 'src/domains/printing/POSView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

helper_function = '''
  // Helper to determine if a material uses dimension (m2) calculation
  const isMaterialDimensionBased = (material: PrintingMaterial | null) => {
    if (!material) return false;
    const unit = (material.unitName || '').toLowerCase();
    const cat = (material.category || '').toLowerCase();
    if (unit.includes('m') && (unit.includes('2') || unit.includes('²') || unit.includes('Â²') || unit.includes('Ã‚Â²'))) return true;
    if (unit.includes('meter persegi') || unit === 'm') return true;
    if (cat.includes('banner') || cat.includes('spanduk') || cat.includes('outdoor') || cat.includes('baliho') || cat.includes('stiker') || cat.includes('sticker')) return true;
    return false;
  };
'''

content = content.replace('export default function PrintingPOSView() {', 'export default function PrintingPOSView() {\n' + helper_function)

# Replace conditions
content = re.sub(r'\(selectedMaterial\?\.unitName\.toLowerCase\(\) === \"mÂ²\" \|\| selectedMaterial\?\.unitName\.toLowerCase\(\) === \"mÃ‚Â²\"\)', 'isMaterialDimensionBased(selectedMaterial)', content)

content = re.sub(r'\(selectedMaterial\.unitName\.toLowerCase\(\) === \"mÂ²\" \|\| selectedMaterial\.unitName\.toLowerCase\(\) === \"mÃ‚Â²\"\)', 'isMaterialDimensionBased(selectedMaterial)', content)

content = re.sub(r'selectedMaterial\.unitName\.toLowerCase\(\) !== \"mÂ²\" && selectedMaterial\.unitName\.toLowerCase\(\) !== \"mÃ‚Â²\"', '!isMaterialDimensionBased(selectedMaterial)', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
