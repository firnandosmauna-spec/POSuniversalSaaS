const fs = require('fs');
let productsViewPath = 'src/domains/printing/ProductsView.tsx';
let content = fs.readFileSync(productsViewPath, 'utf8');

// Replace the ID generation logic
const searchString = `    let updated: PrintingMaterial[];
    const currentId = editingMaterial ? editingMaterial.id : crypto.randomUUID();`;

const replaceString = `    let updated: PrintingMaterial[];
    
    // Ensure currentId is a valid UUID, otherwise Supabase throws 400 Bad Request
    let currentId = editingMaterial ? editingMaterial.id : crypto.randomUUID();
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(currentId)) {
      currentId = crypto.randomUUID();
    }`;

content = content.replace(searchString, replaceString);

// Also log error gracefully
content = content.replace(
  'alert("Data tersimpan lokal, namun gagal sinkronisasi ke cloud (Supabase).");',
  'alert("Data tersimpan lokal, namun gagal sinkronisasi ke cloud (Supabase): " + JSON.stringify(error));'
);

fs.writeFileSync(productsViewPath, content, 'utf8');
