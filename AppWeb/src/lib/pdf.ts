type PdfFont = "F1" | "F2";

type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  size?: number;
  font?: PdfFont;
  color?: [number, number, number];
};

type PdfRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: [number, number, number];
  strokeColor?: [number, number, number];
  lineWidth?: number;
};

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatColor([red, green, blue]: [number, number, number]) {
  return `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)}`;
}

function buildTextBlock(lines: PdfTextLine[]) {
  return lines.map((line) => {
    const fontSize = line.size ?? 11;
    const font = line.font ?? "F1";
    const color = formatColor(line.color ?? [0.145, 0.173, 0.239]);
    return `BT /${font} ${fontSize} Tf ${color} rg 1 0 0 1 ${line.x} ${line.y} Tm (${escapePdfText(line.text)}) Tj ET`;
  }).join("\n");
}

function buildRectBlock(rectangles: PdfRect[]) {
  return rectangles.map((rectangle) => {
    const fill = `${formatColor(rectangle.color)} rg`;
    const stroke = rectangle.strokeColor
      ? `${formatColor(rectangle.strokeColor)} RG ${(rectangle.lineWidth ?? 1).toFixed(2)} w ${rectangle.x} ${rectangle.y} ${rectangle.width} ${rectangle.height} re B`
      : `${rectangle.x} ${rectangle.y} ${rectangle.width} ${rectangle.height} re f`;

    return `${fill}\n${stroke}`;
  }).join("\n");
}

function createPdfDocument(rectangles: PdfRect[], lines: PdfTextLine[]) {
  const stream = [buildRectBlock(rectangles), buildTextBlock(lines)].filter(Boolean).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
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

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function fitText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function wrapText(value: string, maxLength: number, maxLines = 2) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxLength) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    lines.push(fitText(word, maxLength));
    currentLine = "";
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  return [
    ...lines.slice(0, maxLines - 1),
    fitText(lines.slice(maxLines - 1).join(" "), maxLength),
  ];
}

export function downloadInvoicePdf(invoice: InvoicePdfData) {
  const rectangles: PdfRect[] = [
    { x: 0, y: 708, width: 612, height: 84, color: [0.118, 0.165, 0.325] },
    { x: 36, y: 612, width: 540, height: 86, color: [0.949, 0.961, 0.980] },
    { x: 36, y: 568, width: 540, height: 28, color: [0.859, 0.898, 0.973] },
    { x: 36, y: 112, width: 540, height: 72, color: [0.949, 0.961, 0.980] },
  ];

  const lines: PdfTextLine[] = [
    { text: "PI GESTION", x: 40, y: 756, size: 10, font: "F2", color: [0.741, 0.827, 0.996] },
    { text: "Simulacion de factura", x: 40, y: 726, size: 24, font: "F2", color: [1, 1, 1] },
    { text: invoice.folio, x: 458, y: 738, size: 16, font: "F2", color: [1, 1, 1] },
    { text: `Fecha de emision: ${invoice.fecha}`, x: 414, y: 718, size: 10, color: [0.875, 0.906, 0.965] },
    { text: "Datos de la factura", x: 48, y: 675, size: 12, font: "F2", color: [0.118, 0.165, 0.325] },
    { text: "Cliente", x: 48, y: 650, size: 9, font: "F2", color: [0.392, 0.451, 0.584] },
    { text: fitText(invoice.cliente, 34), x: 48, y: 632, size: 13, font: "F2" },
    { text: "Estado", x: 320, y: 650, size: 9, font: "F2", color: [0.392, 0.451, 0.584] },
    { text: invoice.estado, x: 320, y: 632, size: 13, font: "F2" },
    { text: "Producto", x: 48, y: 577, size: 10, font: "F2", color: [0.118, 0.165, 0.325] },
    { text: "Cant.", x: 330, y: 577, size: 10, font: "F2", color: [0.118, 0.165, 0.325] },
    { text: "P. Unit.", x: 395, y: 577, size: 10, font: "F2", color: [0.118, 0.165, 0.325] },
    { text: "Subtotal", x: 490, y: 577, size: 10, font: "F2", color: [0.118, 0.165, 0.325] },
  ];

  let currentY = 540;

  invoice.detalles.slice(0, 14).forEach((detalle, index) => {
    const wrappedProduct = wrapText(detalle.producto, 34, 2);
    const rowHeight = wrappedProduct.length > 1 ? 34 : 24;
    const rowBottom = currentY - 6;

    rectangles.push({
      x: 36,
      y: rowBottom,
      width: 540,
      height: rowHeight,
      color: index % 2 === 0 ? [1, 1, 1] : [0.976, 0.984, 0.996],
    });

    wrappedProduct.forEach((line, lineIndex) => {
      lines.push({
        text: line,
        x: 48,
        y: currentY - (lineIndex * 12),
        size: 10,
      });
    });

    lines.push(
      { text: `${detalle.cantidad}`, x: 334, y: currentY, size: 10 },
      { text: formatMoney(detalle.precio_unitario), x: 395, y: currentY, size: 10 },
      { text: formatMoney(detalle.subtotal), x: 490, y: currentY, size: 10, font: "F2" },
    );

    currentY -= rowHeight;
  });

  lines.push(
    { text: `Conceptos facturados: ${invoice.detalles.length}`, x: 48, y: 160, size: 12, font: "F2", color: [0.118, 0.165, 0.325] },
    { text: "Total a pagar", x: 406, y: 152, size: 10, font: "F2", color: [0.392, 0.451, 0.584] },
    { text: formatMoney(invoice.total), x: 406, y: 132, size: 18, font: "F2", color: [0.118, 0.165, 0.325] },
    { text: "Documento generado desde el modulo de facturacion.", x: 36, y: 68, size: 9, color: [0.392, 0.451, 0.584] },
  );

  if (invoice.detalles.length > 14) {
    lines.push({
      text: `Se muestran 14 de ${invoice.detalles.length} conceptos en este PDF.`,
      x: 48,
      y: 118,
      size: 9,
      color: [0.584, 0.318, 0.118],
    });
  }

  const blob = createPdfDocument(rectangles, lines);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.folio}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
