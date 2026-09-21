const fs = require('fs');
let posViewPath = 'src/domains/printing/POSView.tsx';
let content = fs.readFileSync(posViewPath, 'utf8');

// 1. Add import
if (!content.includes('useNavigate')) {
  content = content.replace(
    'import { useState, useMemo, useEffect } from "react";',
    'import { useState, useMemo, useEffect } from "react";\nimport { useNavigate } from "react-router-dom";'
  );
}

// 2. Add hook
if (!content.includes('const navigate = useNavigate();')) {
  content = content.replace(
    'export default function PrintingPOSView() {',
    'export default function PrintingPOSView() {\n  const navigate = useNavigate();'
  );
}

// 3. Add button
const oldButtonHtml = `            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (recentJobs.length > 0 && recentJobs[0]) setSelectedSpkJob(recentJobs[0]);
                }}
                className="text-[10px] h-7 px-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 gap-1 rounded-none"
              >
                <Eye className="size-3 text-brand" /> Job Order ({recentJobs.length})
              </Button>
            </div>`;

const newButtonHtml = `            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/app/sales")}
                className="text-[10px] h-7 px-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 gap-1 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <FileText className="size-3 text-brand" /> SPK & Riwayat Cetak
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (recentJobs.length > 0 && recentJobs[0]) setSelectedSpkJob(recentJobs[0]);
                }}
                className="text-[10px] h-7 px-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 gap-1 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Eye className="size-3 text-brand" /> Antrean JO ({recentJobs.length})
              </Button>
            </div>`;

// Since formatting might differ slightly (like line breaks), let's use replace with a slightly looser match or exact string match if possible.
// Wait, I will use regex because of whitespace.
content = content.replace(/<div className="flex items-center gap-2">\s*<Button\s*variant="outline"\s*size="sm"\s*onClick=\{\(\) => \{\s*if \(recentJobs\.length > 0 && recentJobs\[0\]\) setSelectedSpkJob\(recentJobs\[0\]\);\s*\}\}\s*className="text-\[10px\] h-7 px-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800\s*text-slate-700 dark:text-slate-200 gap-1 rounded-none"\s*>\s*<Eye className="size-3 text-brand" \/> Job Order \(\{recentJobs\.length\}\)\s*<\/Button>\s*<\/div>/, newButtonHtml);

fs.writeFileSync(posViewPath, content, 'utf8');
console.log("Added SPK & Riwayat button to header.");
