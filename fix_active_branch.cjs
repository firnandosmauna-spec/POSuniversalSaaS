const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src/domains');
let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  if (content.includes('activeBranchId === "main"')) {
    content = content.replace(/activeBranchId === "main"/g, 'activeBranchId?.startsWith("main")');
    changed = true;
  }
  // Also look for branchId: "main" and branch_id: "main" in UsersView where staff gets created with "main" 
  // Wait, replacing those might be tricky. Let's start with activeBranchId === "main"
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
    count++;
  }
});
console.log('Done activeBranchId', count);
