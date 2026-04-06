import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export type PdfVentaResumen = {
  factura: string;
  cliente: string;
  responsable: string;
  monto: number;
  fecha: string;
  metodoPago?: string;
  periodo?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  if (!value) {
    return 'Sin fecha';
  }

  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function createReceiptHtml(venta: PdfVentaResumen): string {
  const metodoPago = venta.metodoPago ?? 'No disponible';
  const periodo = venta.periodo ?? 'Periodo actual';
  const titulo = `Comprobante de venta ${venta.factura}`;

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(titulo)}</title>
        <style>
          :root {
            color-scheme: light;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 24px;
            font-family: Arial, Helvetica, sans-serif;
            color: #101828;
            background: #f8fafc;
          }

          .page {
            max-width: 760px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #dbe4f0;
            border-radius: 16px;
            overflow: hidden;
          }

          .header {
            background: #1c273f;
            color: #fff;
            padding: 22px 24px;
          }

          .header h1 {
            margin: 0 0 6px;
            font-size: 24px;
          }

          .header p {
            margin: 0;
            opacity: 0.85;
            font-size: 13px;
          }

          .content {
            padding: 24px;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 20px;
          }

          .card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px;
            background: #f9fafb;
          }

          .label {
            display: block;
            font-size: 11px;
            letter-spacing: .04em;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .value {
            font-size: 14px;
            font-weight: 700;
            color: #101828;
            word-break: break-word;
          }

          .summary {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }

          .summary .card {
            flex: 1 1 180px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }

          th, td {
            border: 1px solid #dbe4f0;
            padding: 10px 8px;
            font-size: 12px;
            text-align: left;
          }

          th {
            background: #1c273f;
            color: #fff;
          }

          tfoot td {
            font-weight: 700;
            background: #f8fafc;
          }

          .footer {
            padding: 16px 24px 24px;
            font-size: 12px;
            color: #64748b;
          }

          .badge {
            display: inline-block;
            margin-top: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            background: #dbeafe;
            color: #1d4ed8;
            font-size: 12px;
            font-weight: 700;
          }

          @media print {
            body {
              background: #fff;
              padding: 0;
            }

            .page {
              border: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <h1>Comprobante de venta</h1>
            <p>${escapeHtml(venta.factura)} · ${escapeHtml(periodo)}</p>
          </div>

          <div class="content">
            <div class="grid">
              <div class="card">
                <span class="label">Factura</span>
                <div class="value">${escapeHtml(venta.factura)}</div>
                <span class="badge">${escapeHtml(venta.cliente === 'Venta mostrador' ? 'Venta mostrador' : 'Venta registrada')}</span>
              </div>
              <div class="card">
                <span class="label">Fecha</span>
                <div class="value">${escapeHtml(formatDate(venta.fecha))}</div>
              </div>
              <div class="card">
                <span class="label">Cliente</span>
                <div class="value">${escapeHtml(venta.cliente)}</div>
              </div>
              <div class="card">
                <span class="label">Responsable</span>
                <div class="value">${escapeHtml(venta.responsable)}</div>
              </div>
            </div>

            <div class="summary">
              <div class="card">
                <span class="label">Método de pago</span>
                <div class="value">${escapeHtml(metodoPago)}</div>
              </div>
              <div class="card">
                <span class="label">Total</span>
                <div class="value">${escapeHtml(formatCurrency(venta.monto))}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Folio / Factura</td>
                  <td>${escapeHtml(venta.factura)}</td>
                </tr>
                <tr>
                  <td>Emitido</td>
                  <td>${escapeHtml(formatDate(venta.fecha))}</td>
                </tr>
                <tr>
                  <td>Periodo</td>
                  <td>${escapeHtml(periodo)}</td>
                </tr>
                <tr>
                  <td>Observación</td>
                  <td>Este PDF se genera localmente desde la aplicación móvil con los datos disponibles de la venta.</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td>${escapeHtml(formatCurrency(venta.monto))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="footer">
            <p>SDGC · Exportación de comprobante generada desde el móvil.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function exportSaleReceiptPdf(venta: PdfVentaResumen) {
  const html = createReceiptHtml(venta);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  try {
    const result = await Print.printToFileAsync({ html });
    const sourceUri = result?.uri;
    if (!sourceUri) {
      throw new Error('No se pudo generar el archivo PDF.');
    }

    // Crear nombre de archivo sanitizado
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeFactura = venta.factura.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const fileName = `Comprobante-${safeFactura}-${timestamp}.pdf`;

    let savedUri = sourceUri;

    // Persistir el archivo fuera de cache temporal cuando sea posible.
    try {
      if (FileSystem.documentDirectory) {
        const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
        const fileInfo = await FileSystem.getInfoAsync(destinationUri);
        if (fileInfo.exists) {
          savedUri = destinationUri;
        }
      }
    } catch {
      // Si falla la copia, usamos el URI temporal generado por expo-print.
      savedUri = sourceUri;
    }

    // Mostrar opción de compartir
    if (await Sharing.isAvailableAsync()) {
      Alert.alert(
        'PDF Exportado',
        `El comprobante se ha guardado exitosamente como "${fileName}"`,
        [
          {
            text: 'Compartir',
            onPress: async () => {
              await Sharing.shareAsync(savedUri, {
                mimeType: 'application/pdf',
                dialogTitle: `Compartir ${venta.factura}`,
                UTI: 'com.adobe.pdf',
              });
            },
          },
          {
            text: 'OK',
            onPress: () => {},
            style: 'default',
          },
        ]
      );
      return;
    }

    await Print.printAsync({ html });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`No se pudo exportar el PDF: ${errorMessage}`);
  }
}

