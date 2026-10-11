/**
 * Safe browser element printing helper using an isolated hidden iframe.
 * Prevents DOM destruction and prevents destructive window.location.reload().
 */
export const printElement = (elementId: string, title: string = "Cetak Dokumen"): void => {
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    console.warn(`Element with ID ${elementId} not found for printing.`);
    return;
  }

  // Create isolated hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    return;
  }

  // Collect stylesheet tags from host document
  const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((tag) => tag.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: auto;
            margin: 4mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            margin: 0;
            padding: 8px;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
          .border-dashed { border-style: dashed !important; }
          .border-b { border-bottom-width: 1px !important; }
          .border-t { border-top-width: 1px !important; }
          .border-y { border-top-width: 1px !important; border-bottom-width: 1px !important; }
          .flex { display: flex !important; }
          .justify-between { justify-content: space-between !important; }
          .text-center { text-align: center !important; }
          .font-bold { font-weight: 700 !important; }
          .font-black { font-weight: 900 !important; }
          .uppercase { text-transform: uppercase !important; }
        </style>
        ${styleTags}
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Print error:", err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  }, 300);
};
