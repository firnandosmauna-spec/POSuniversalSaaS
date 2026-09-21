const fs = require('fs');
let posViewPath = 'src/domains/printing/POSView.tsx';
let content = fs.readFileSync(posViewPath, 'utf8');

content = content.replace(
  'import { useNavigate } from "react-router-dom";',
  'import { useNavigate } from "@tanstack/react-router";'
);

fs.writeFileSync(posViewPath, content, 'utf8');
