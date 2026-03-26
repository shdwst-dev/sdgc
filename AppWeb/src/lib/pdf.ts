type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  size?: number;
};

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildTextBlock(lines: PdfTextLine[]) {
  return lines.map((line) => {
    const fontSize = line.size ?? 11;
    return `BT /F1 ${fontSize} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${escapePdfText(line.text)}) Tj ET`;
  }).join("\n");
}

function createPdfDocument(lines: PdfTextLine[]) {
  const stream = buildTextBlock(lines);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export type InvoicePdfDetail = {
  producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

export type InvoicePdfData = {
  folio: string;
  fecha: string;
  cliente: string;
  estado: string;
  total: number;
  codigo_hash: string;
  detalles: InvoicePdfDetail[];
};

export function downloadInvoicePdf(invoice: InvoicePdfData) {
  const lines: PdfTextLine[] = [
    { text: "PI Gestion - Factura", x: 40, y: 760, size: 18 },
    { text: `Folio: ${invoice.folio}`, x: 40, y: 730 },
    { text: `Fecha: ${invoice.fecha}`, x: 40, y: 712 },
    { text: `Cliente: ${invoice.cliente}`, x: 40, y: 694 },
    { text: `Estado: ${invoice.estado}`, x: 40, y: 676 },
    { text: `Codigo hash: ${invoice.codigo_hash}`, x: 40, y: 658, size: 10 },
    { text: "Detalle", x: 40, y: 626, size: 14 },
    { text: "Producto", x: 40, y: 604, size: 10 },
    { text: "Cant.", x: 300, y: 604, size: 10 },
    { text: "P. Unit.", x: 360, y: 604, size: 10 },
    { text: "Subtotal", x: 470, y: 604, size: 10 },
  ];

  let currentY = 584;

  invoice.detalles.slice(0, 18).forEach((detalle) => {
    lines.push(
      { text: detalle.producto, x: 40, y: currentY, size: 10 },
      { text: String(detalle.cantidad), x: 305, y: currentY, size: 10 },
      { text: `$${detalle.precio_unitario.toFixed(2)}`, x: 360, y: currentY, size: 10 },
      { text: `$${detalle.subtotal.toFixed(2)}`, x: 470, y: currentY, size: 10 },
    );

    currentY -= 18;
  });

  lines.push(
    { text: `Conceptos: ${invoice.detalles.length}`, x: 40, y: currentY - 16 },
    { text: `Total: $${invoice.total.toFixed(2)}`, x: 400, y: currentY - 16, size: 14 },
  );

  const blob = createPdfDocument(lines);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.folio}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
