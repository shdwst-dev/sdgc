import { apiRequest } from './apiClient';

/**
 * Obtener el HTML de la factura para impresión.
 */
export async function getFacturaHtml(token: string, idVenta: number): Promise<string> {
  const result = await apiRequest<string>(`/ventas/${idVenta}/factura`, {
    token,
    responseType: 'text',
    fallbackError: 'No se pudo obtener la plantilla de la factura.',
  });
  return result;
}

/**
 * Obtener el HTML del recibo para impresión.
 */
export async function getReciboHtml(token: string, idVenta: number): Promise<string> {
  const result = await apiRequest<string>(`/ventas/${idVenta}/recibo`, {
    token,
    responseType: 'text',
    fallbackError: 'No se pudo obtener la plantilla del recibo.',
  });
  return result;
}
