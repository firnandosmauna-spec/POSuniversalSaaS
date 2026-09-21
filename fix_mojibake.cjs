const fs = require('fs');
let posViewPath = 'src/domains/printing/POSView.tsx';
let posViewContent = fs.readFileSync(posViewPath, 'utf8');

posViewContent = posViewContent.replace(/m Ã— /g, 'm x ');
posViewContent = posViewContent.replace(/Ã—/g, 'x');
posViewContent = posViewContent.replace(/mÂ²/g, 'm²');
posViewContent = posViewContent.replace(/mÃ‚Â²/g, 'm²');

fs.writeFileSync(posViewPath, posViewContent, 'utf8');
console.log("Fixed mojibake");
