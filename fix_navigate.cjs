const fs = require('fs');
let posViewPath = 'src/domains/printing/POSView.tsx';
let content = fs.readFileSync(posViewPath, 'utf8');

content = content.replace(
  'navigate("/app/sales")',
  'navigate({ to: "/app/sales" })'
);

fs.writeFileSync(posViewPath, content, 'utf8');
