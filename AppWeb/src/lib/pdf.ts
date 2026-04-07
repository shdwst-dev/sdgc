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

const QR_SIZE = 21;
const ISSUER_NAME = "PI GESTION (SDGC)";
const ISSUER_RFC = "AAA010101AAA";
const ISSUER_ADDRESS_LINE_1 = "Domicilio fiscal generico del proyecto";
const ISSUER_ADDRESS_LINE_2 = "Villahermosa, Tabasco, Mexico C.P. 86000";
const ISSUER_PHONE = "No disponible";
const ISSUER_EMAIL = "soporte@pigestion.local";
const RECEIVER_GENERIC_RFC = "XAXX010101000";
const RECEIVER_GENERIC_ADDRESS = "Domicilio generico del receptor";

const WIN_ANSI_MAP: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

function encodePdfText(value: string) {
  const bytes: number[] = [];

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0x3f;

    if (codePoint >= 0x20 && codePoint <= 0x7e) {
      bytes.push(codePoint);
      continue;
    }

    if (codePoint >= 0xa0 && codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    bytes.push(WIN_ANSI_MAP[character] ?? 0x3f);
  }

  return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join("")}>`;
}

function formatColor([red, green, blue]: [number, number, number]) {
  return `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)}`;
}

function buildTextBlock(lines: PdfTextLine[]) {
  return lines.map((line) => {
    const fontSize = line.size ?? 11;
    const font = line.font ?? "F1";
    const color = formatColor(line.color ?? [0.145, 0.173, 0.239]);
    return `BT /${font} ${fontSize} Tf ${color} rg 1 0 0 1 ${line.x} ${line.y} Tm ${encodePdfText(line.text)} Tj ET`;
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
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
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

function encodePdfString(value: string) {
  return new TextEncoder().encode(value);
}

function concatPdfBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((accumulator, chunk) => accumulator + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });

  return output;
}

function createMultiPagePdfDocument(pageStreams: string[]) {
  const fontObjectStart = 3 + pageStreams.length;
  const contentObjectStart = fontObjectStart + 2;
  const pageObjectRefs = pageStreams.map((_, index) => `${3 + index} 0 R`).join(" ");
  const objects: Uint8Array[] = [
    encodePdfString("<< /Type /Catalog /Pages 2 0 R >>"),
    encodePdfString(`<< /Type /Pages /Kids [${pageObjectRefs}] /Count ${pageStreams.length} >>`),
  ];

  pageStreams.forEach((_, index) => {
    const contentObjectRef = `${contentObjectStart + index} 0 R`;
    objects.push(
      encodePdfString(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectStart} 0 R /F2 ${fontObjectStart + 1} 0 R >> >> /Contents ${contentObjectRef} >>`,
      ),
    );
  });

  objects.push(
    encodePdfString("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
    encodePdfString("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"),
  );

  pageStreams.forEach((stream) => {
    objects.push(encodePdfString(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
  });

  const chunks: Uint8Array[] = [encodePdfString("%PDF-1.4\n")];
  const offsets = [0];
  let pdfLength = chunks[0].length;

  objects.forEach((object, index) => {
    offsets.push(pdfLength);
    const objectHeader = encodePdfString(`${index + 1} 0 obj\n`);
    const objectFooter = encodePdfString("\nendobj\n");
    chunks.push(objectHeader, object, objectFooter);
    pdfLength += objectHeader.length + object.length + objectFooter.length;
  });

  const xrefOffset = pdfLength;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encodePdfString(xref));

  return new Blob([concatPdfBytes(chunks)], { type: "application/pdf" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type ReportChartPdfData = {
  title: string;
  subtitle?: string;
  period?: string;
  headers: string[];
  rows: string[][];
  summary?: Array<{ label: string; value: string }>;
  fileName: string;
};

type ReportTableLayout = {
  columnXs: number[];
  columnWidths: number[];
};

function fitTableCell(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function chunkRows<T>(rows: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }

  return chunks;
}

function createTableLayout(columnCount: number): ReportTableLayout {
  if (columnCount === 2) {
    return { columnXs: [42, 332], columnWidths: [270, 238] };
  }

  if (columnCount === 3) {
    return { columnXs: [42, 202, 372], columnWidths: [148, 158, 138] };
  }

  return { columnXs: [42, 152, 282, 412], columnWidths: [98, 118, 118, 96] };
}

function createReportTablePdfDocument(report: Omit<ReportChartPdfData, "fileName">) {
  const generatedAt = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const layout = createTableLayout(report.headers.length);
  const summaryItems = report.summary?.slice(0, 4) ?? [];
  const headerHeight = 24;
  const rowHeight = 18;
  const firstPageTableTop = summaryItems.length > 0 ? 560 : 610;
  const laterPageTableTop = 686;
  const firstPageRows = Math.floor((firstPageTableTop - 126) / rowHeight);
  const laterPageRows = Math.floor((laterPageTableTop - 126) / rowHeight);
  const pageRowGroups = report.rows.length === 0
    ? [[]]
    : [
        report.rows.slice(0, firstPageRows),
        ...chunkRows(report.rows.slice(firstPageRows), laterPageRows),
      ].filter((group, index) => index === 0 || group.length > 0);

  const pageStreams = pageRowGroups.map((rows, pageIndex) => {
    const isFirstPage = pageIndex === 0;
    const tableTop = isFirstPage ? firstPageTableTop : laterPageTableTop;
    const rectangles: PdfRect[] = [
      { x: 28, y: 736, width: 556, height: 34, color: [0.055, 0.302, 0.522] },
      { x: 28, y: 112, width: 556, height: 600, color: [1, 1, 1], strokeColor: [0.83, 0.87, 0.92], lineWidth: 1 },
    ];
    const lines: PdfTextLine[] = [
      { text: report.title, x: 42, y: 748, size: 16, font: "F2", color: [1, 1, 1] },
      { text: report.subtitle || "Reporte tabular", x: 42, y: 714, size: 11, font: "F2", color: [0.145, 0.173, 0.239] },
      { text: `PI Gestion - Reporte PDF${pageRowGroups.length > 1 ? ` (${pageIndex + 1}/${pageRowGroups.length})` : ""}`, x: 340, y: 748, size: 10, font: "F2", color: [1, 1, 1] },
    ];

    if (isFirstPage) {
      lines.push(
        { text: report.period ? `Periodo: ${report.period}` : "Periodo: General", x: 42, y: 696, size: 10, color: [0.286, 0.333, 0.408] },
        { text: `Generado: ${generatedAt}`, x: 42, y: 680, size: 10, color: [0.286, 0.333, 0.408] },
      );
    }

    if (isFirstPage) {
      summaryItems.forEach((item, index) => {
        const boxX = 42 + (index * 132);
        rectangles.push({ x: boxX, y: 610, width: 122, height: 42, color: [0.961, 0.973, 0.992], strokeColor: [0.79, 0.86, 0.96], lineWidth: 0.8 });
        lines.push(
          { text: fitTableCell(item.label, 18), x: boxX + 8, y: 636, size: 8, font: "F2", color: [0.055, 0.302, 0.522] },
          { text: fitTableCell(item.value, 20), x: boxX + 8, y: 620, size: 10, color: [0.145, 0.173, 0.239] },
        );
      });
    }

    rectangles.push({ x: 42, y: tableTop, width: 514, height: headerHeight, color: [0.055, 0.302, 0.522] });

    report.headers.forEach((header, index) => {
      lines.push({
        text: fitTableCell(header, Math.floor(layout.columnWidths[index] / 7)),
        x: layout.columnXs[index] + 6,
        y: tableTop + 8,
        size: 9,
        font: "F2",
        color: [1, 1, 1],
      });
    });

    rows.forEach((row, rowIndex) => {
      const rowY = tableTop - ((rowIndex + 1) * rowHeight);
      rectangles.push({
        x: 42,
        y: rowY,
        width: 514,
        height: rowHeight,
        color: rowIndex % 2 === 0 ? [0.984, 0.988, 0.996] : [1, 1, 1],
        strokeColor: [0.89, 0.92, 0.96],
        lineWidth: 0.4,
      });

      row.forEach((cell, index) => {
        lines.push({
          text: fitTableCell(cell, Math.floor(layout.columnWidths[index] / 6.6)),
          x: layout.columnXs[index] + 6,
          y: rowY + 6,
          size: 8,
          color: [0.145, 0.173, 0.239],
        });
      });
    });

    if (report.rows.length === 0) {
      lines.push({
        text: "No hay datos disponibles para este reporte.",
        x: 42,
        y: tableTop - 24,
        size: 10,
        color: [0.286, 0.333, 0.408],
      });
    }

    return [buildRectBlock(rectangles), buildTextBlock(lines)].filter(Boolean).join("\n");
  });

  return createMultiPagePdfDocument(pageStreams);
}

export async function downloadReportChartPdf(reportChart: ReportChartPdfData) {
  const blob = createReportTablePdfDocument(reportChart);
  downloadBlob(blob, reportChart.fileName);
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

function buildFakeStamp(seed: string, length: number) {
  const source = `${seed}ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;
  let output = "";

  while (output.length < length) {
    output += source;
  }

  return output.slice(0, length);
}

function createQrMatrix(seed: string, size = QR_SIZE) {
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  const paintFinder = (startRow: number, startColumn: number) => {
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const isBorder = row === 0 || row === 6 || column === 0 || column === 6;
        const isCore = row >= 2 && row <= 4 && column >= 2 && column <= 4;
        matrix[startRow + row][startColumn + column] = isBorder || isCore;
      }
    }
  };

  paintFinder(0, 0);
  paintFinder(0, size - 7);
  paintFinder(size - 7, 0);

  let hash = 0;
  const normalizedSeed = seed || "FACTURA";

  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = ((hash << 5) - hash + normalizedSeed.charCodeAt(index)) >>> 0;
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const inFinderZone =
        (row < 7 && column < 7) ||
        (row < 7 && column >= size - 7) ||
        (row >= size - 7 && column < 7);

      if (inFinderZone) {
        continue;
      }

      hash = (hash * 1664525 + 1013904223) >>> 0;
      matrix[row][column] = ((hash >> 28) & 1) === 1;
    }
  }

  return matrix;
}

function getReceiverName(cliente: string) {
  return cliente === "Venta mostrador" ? "PUBLICO EN GENERAL" : cliente;
}

export function downloadInvoicePdf(invoice: InvoicePdfData) {
  const subtotal = invoice.detalles.reduce((accumulator, detail) => accumulator + detail.subtotal, 0);
  const stampSeed = `${invoice.folio}${invoice.fecha}${invoice.total.toFixed(2)}`.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const selloCfdi = buildFakeStamp(stampSeed, 220);
  const cadenaOriginal = `||4.0|${invoice.folio}|${invoice.fecha}|${invoice.total.toFixed(2)}|MXN|PPD|99||`;
  const qrMatrix = createQrMatrix(stampSeed);
  const receiverName = getReceiverName(invoice.cliente);
  const rectangles: PdfRect[] = [
    { x: 28, y: 764, width: 556, height: 24, color: [0.055, 0.302, 0.522] },
    { x: 28, y: 680, width: 96, height: 72, color: [0.965, 0.972, 0.988], strokeColor: [0.055, 0.302, 0.522], lineWidth: 1 },
    { x: 28, y: 638, width: 556, height: 1, color: [0.412, 0.565, 0.714] },
    { x: 28, y: 522, width: 556, height: 20, color: [0.925, 0.925, 0.925], strokeColor: [0.48, 0.48, 0.48], lineWidth: 0.8 },
    { x: 28, y: 206, width: 556, height: 1, color: [0.412, 0.565, 0.714] },
    { x: 28, y: 96, width: 112, height: 112, color: [1, 1, 1], strokeColor: [0.25, 0.25, 0.25], lineWidth: 1 },
  ];

  const lines: PdfTextLine[] = [
    { text: "FACTURA ELECTRONICA 4.0 (CFDI)", x: 145, y: 771, size: 13, font: "F2", color: [1, 1, 1] },
    { text: "CFDI", x: 48, y: 710, size: 20, font: "F2", color: [0.082, 0.2, 0.62] },
    { text: ISSUER_NAME, x: 150, y: 742, size: 18, font: "F2", color: [0.12, 0.12, 0.12] },
    { text: `RFC: ${ISSUER_RFC}`, x: 132, y: 710, size: 9 },
    { text: ISSUER_ADDRESS_LINE_1, x: 132, y: 696, size: 9 },
    { text: ISSUER_ADDRESS_LINE_2, x: 132, y: 684, size: 9 },
    { text: `Tel: ${ISSUER_PHONE}`, x: 132, y: 670, size: 9 },
    { text: `E-mail: ${ISSUER_EMAIL}`, x: 132, y: 658, size: 9 },
    { text: "FACTURA:", x: 500, y: 714, size: 10, font: "F2", color: [0.055, 0.302, 0.522] },
    { text: invoice.folio, x: 478, y: 698, size: 12, font: "F2", color: [0.859, 0.267, 0.235] },
    { text: "Serie del certificado CSD:", x: 426, y: 672, size: 8, font: "F2", color: [0.055, 0.302, 0.522] },
    { text: "00001000000500000000", x: 450, y: 660, size: 8 },
    { text: "Fecha y hora de emision:", x: 446, y: 644, size: 8, font: "F2", color: [0.055, 0.302, 0.522] },
    { text: invoice.fecha, x: 490, y: 632, size: 8 },
    { text: "LUGAR DE EXPEDICION:", x: 28, y: 624, size: 8, font: "F2" },
    { text: "86000", x: 122, y: 624, size: 8 },
    { text: "TIPO DE COMPROBANTE:", x: 184, y: 624, size: 8, font: "F2" },
    { text: "I - Ingreso", x: 296, y: 624, size: 8 },
    { text: "ESTADO:", x: 430, y: 624, size: 8, font: "F2" },
    { text: invoice.estado, x: 472, y: 624, size: 8 },
    { text: "RECEPTOR:", x: 28, y: 606, size: 8, font: "F2" },
    { text: fitText(receiverName, 48), x: 92, y: 606, size: 9, font: "F2" },
    { text: "RFC CLIENTE:", x: 28, y: 592, size: 8, font: "F2" },
    { text: RECEIVER_GENERIC_RFC, x: 92, y: 592, size: 8 },
    { text: "DOMICILIO:", x: 28, y: 578, size: 8, font: "F2" },
    { text: fitText(RECEIVER_GENERIC_ADDRESS, 64), x: 92, y: 578, size: 8 },
    { text: "USO CFDI:", x: 28, y: 564, size: 8, font: "F2" },
    { text: "S01 - Sin efectos fiscales", x: 92, y: 564, size: 8 },
    { text: "CANTIDAD", x: 34, y: 528, size: 8, font: "F2" },
    { text: "UNIDAD", x: 112, y: 528, size: 8, font: "F2" },
    { text: "CLAVE", x: 174, y: 528, size: 8, font: "F2" },
    { text: "DESCRIPCION", x: 264, y: 528, size: 8, font: "F2" },
    { text: "P. UNITARIO", x: 444, y: 528, size: 8, font: "F2" },
    { text: "IMPORTE", x: 529, y: 528, size: 8, font: "F2" },
  ];

  let currentY = 506;

  invoice.detalles.slice(0, 10).forEach((detalle) => {
    const wrappedProduct = wrapText(detalle.producto, 28, 4);
    const rowHeight = Math.max(36, wrappedProduct.length * 12 + 18);
    const rowBottom = currentY - rowHeight + 12;

    rectangles.push({
      x: 36,
      y: rowBottom,
      width: 58,
      height: rowHeight,
      color: [1, 1, 1],
      strokeColor: [0.48, 0.48, 0.48],
      lineWidth: 0.7,
    });
    rectangles.push({
      x: 94,
      y: rowBottom,
      width: 54,
      height: rowHeight,
      color: [1, 1, 1],
      strokeColor: [0.48, 0.48, 0.48],
      lineWidth: 0.7,
    });
    rectangles.push({
      x: 148,
      y: rowBottom,
      width: 68,
      height: rowHeight,
      color: [1, 1, 1],
      strokeColor: [0.48, 0.48, 0.48],
      lineWidth: 0.7,
    });
    rectangles.push({
      x: 216,
      y: rowBottom,
      width: 214,
      height: rowHeight,
      color: [1, 1, 1],
      strokeColor: [0.48, 0.48, 0.48],
      lineWidth: 0.7,
    });
    rectangles.push({
      x: 430,
      y: rowBottom,
      width: 76,
      height: rowHeight,
      color: [1, 1, 1],
      strokeColor: [0.48, 0.48, 0.48],
      lineWidth: 0.7,
    });
    rectangles.push({
      x: 506,
      y: rowBottom,
      width: 78,
      height: rowHeight,
      color: [1, 1, 1],
      strokeColor: [0.48, 0.48, 0.48],
      lineWidth: 0.7,
    });

    wrappedProduct.forEach((line, lineIndex) => {
      lines.push({
        text: line,
        x: 222,
        y: currentY - (lineIndex * 12),
        size: 8,
      });
    });

    lines.push(
      { text: detalle.cantidad.toFixed(2), x: 42, y: currentY, size: 8 },
      { text: "Pieza", x: 105, y: currentY, size: 8 },
      { text: "H87", x: 170, y: currentY, size: 8 },
      { text: formatMoney(detalle.precio_unitario), x: 438, y: currentY, size: 8 },
      { text: formatMoney(detalle.subtotal), x: 514, y: currentY, size: 8, font: "F2" },
    );

    currentY -= rowHeight;
  });

  lines.push(
    { text: "Datos fiscales complementarios", x: 206, y: 196, size: 9, font: "F2", color: [0.055, 0.302, 0.522] },
    { text: "FORMA DE PAGO :", x: 206, y: 182, size: 8, font: "F2" },
    { text: "99 - Por definir", x: 284, y: 182, size: 8 },
    { text: "REGIMEN FISCAL :", x: 206, y: 168, size: 8, font: "F2" },
    { text: "601 - General de Ley Personas Morales", x: 292, y: 168, size: 8 },
    { text: "MONEDA :", x: 206, y: 148, size: 8, font: "F2" },
    { text: "MXN - Peso Mexicano", x: 250, y: 148, size: 8 },
    { text: "METODO PAGO :", x: 206, y: 134, size: 8, font: "F2" },
    { text: "PPD - Pago en parcialidades o diferido", x: 272, y: 134, size: 8 },
    { text: "SUBTOTAL", x: 450, y: 180, size: 9, font: "F2" },
    { text: formatMoney(subtotal), x: 522, y: 180, size: 9 },
    { text: "IVA", x: 450, y: 164, size: 9, font: "F2" },
    { text: "No desg.", x: 520, y: 164, size: 9 },
    { text: "TOTAL", x: 450, y: 144, size: 10, font: "F2" },
    { text: formatMoney(invoice.total), x: 514, y: 144, size: 10, font: "F2" },
    { text: "Sello Digital del CFDI", x: 28, y: 82, size: 9, font: "F2" },
    { text: fitText(selloCfdi, 118), x: 28, y: 70, size: 6 },
    { text: fitText(selloCfdi.slice(118), 118), x: 28, y: 60, size: 6 },
    { text: "Cadena Original", x: 28, y: 46, size: 9, font: "F2" },
    { text: fitText(cadenaOriginal, 118), x: 28, y: 34, size: 6 },
    { text: "No de Serie del Certificado del SAT: 000010000005280994", x: 28, y: 18, size: 7, font: "F2", color: [0.055, 0.302, 0.522] },
    { text: `Fecha y hora de certificacion: ${invoice.fecha}`, x: 342, y: 18, size: 7, font: "F2", color: [0.055, 0.302, 0.522] },
  );

  rectangles.push(
    { x: 430, y: 136, width: 154, height: 1, color: [0.48, 0.48, 0.48] },
    { x: 430, y: 156, width: 154, height: 1, color: [0.48, 0.48, 0.48] },
    { x: 430, y: 172, width: 154, height: 1, color: [0.48, 0.48, 0.48] },
  );

  const qrCellSize = 4.5;
  const qrOriginX = 33;
  const qrOriginY = 101;

  qrMatrix.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (!cell) {
        return;
      }

      rectangles.push({
        x: qrOriginX + (columnIndex * qrCellSize),
        y: qrOriginY + ((QR_SIZE - 1 - rowIndex) * qrCellSize),
        width: qrCellSize,
        height: qrCellSize,
        color: [0.05, 0.05, 0.05],
      });
    });
  });

  if (invoice.detalles.length > 10) {
    lines.push({
      text: `Se muestran 10 de ${invoice.detalles.length} conceptos en este PDF.`,
      x: 28,
      y: 116,
      size: 8,
      color: [0.584, 0.318, 0.118],
    });
  }

  const blob = createPdfDocument(rectangles, lines);
  downloadBlob(blob, `${invoice.folio}.pdf`);
}
