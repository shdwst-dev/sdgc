<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ventas;
use App\Models\comprobantes;

class ComprobanteController extends Controller
{
    const CFDI_VERSION = "4.0";
    const ISSUER_NAME = "PI GESTION (SDGC)";
    const ISSUER_RFC = "AAA010101AAA";
    const ISSUER_ADDRESS = "Domicilio fiscal generico del proyecto, Villahermosa, Tabasco, Mexico C.P. 86000";
    const ISSUER_PHONE = "No disponible";
    const ISSUER_EMAIL = "soporte@pigestion.local";

    public function getFacturaHtml(Request $request, $idVenta)
    {
        $venta = $this->getVentaDetalle($idVenta);
        if (!$venta) return response()->json(['message' => 'Venta no encontrada'], 404);

        $comprobante = comprobantes::where('id_venta', $idVenta)->first();
        $folio = $comprobante ? $comprobante->numero_correlativo : 'S/F';

        $html = $this->generateHighFidelityHtml('FACTURA ELECTRONICA 4.0 (CFDI)', $venta, $folio, true);
        
        return response($html)->header('Content-Type', 'text/html');
    }

    public function getReciboHtml(Request $request, $idVenta)
    {
        $venta = $this->getVentaDetalle($idVenta);
        if (!$venta) return response()->json(['message' => 'Venta no encontrada'], 404);

        $html = $this->generateHighFidelityHtml('RECIBO DE PAGO / NOTA DE VENTA', $venta, $venta->id_venta, false);
        
        return response($html)->header('Content-Type', 'text/html');
    }

    private function getVentaDetalle($id)
    {
        return ventas::with(['usuario.persona', 'detalles_venta.producto', 'metodo_pago', 'estatus'])
            ->where('id_venta', $id)
            ->first();
    }

    private function generateHighFidelityHtml($title, $venta, $folio, $isFactura)
    {
        $detalles = $venta->detalles_venta;
        $total = $detalles->sum(function($d) { return $d->cantidad * $d->precio_unitario; });
        $fecha = date('d/m/Y', strtotime($venta->fecha_hora));
        $hora = date('H:i:s', strtotime($venta->fecha_hora));
        $cliente = $venta->usuario->persona->nombre . ' ' . $venta->usuario->persona->apellido_paterno;

        $rowsHtml = '';
        foreach ($detalles as $d) {
            $subtotal = number_format($d->cantidad * $d->precio_unitario, 2);
            $precio = number_format($d->precio_unitario, 2);
            $qty = number_format($d->cantidad, 2);
            $rowsHtml .= "
                <tr>
                    <td style='border:1px solid #7f9bb9; padding:8px; font-size:11px;'>{$qty}</td>
                    <td style='border:1px solid #7f9bb9; padding:8px; font-size:11px;'>Pieza</td>
                    <td style='border:1px solid #7f9bb9; padding:8px; font-size:11px;'>H87</td>
                    <td style='border:1px solid #7f9bb9; padding:8px; font-size:11px;'>{$d->producto->nombre}</td>
                    <td style='border:1px solid #7f9bb9; padding:8px; font-size:11px; text-align:right;'>\${$precio}</td>
                    <td style='border:1px solid #7f9bb9; padding:8px; font-size:11px; text-align:right;'><strong>\${$subtotal}</strong></td>
                </tr>";
        }

        $css = "
            body { font-family: 'Helvetica', sans-serif; margin: 0; padding: 0; background: #fff; color: #1a1a1a; }
            .container { padding: 20px; }
            .blue-band { background: #0f4d85; color: #ffffff; text-align: center; font-size: 16px; font-weight: bold; padding: 8px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            .label-sm { font-size: 10px; font-weight: bold; color: #0f4d85; text-transform: uppercase; }
            .data-sm { font-size: 11px; color: #222; }
            .header-main td { vertical-align: top; }
            .meta-bar { border-top: 2px solid #0f4d85; border-bottom: 2px solid #0f4d85; margin: 15px 0; padding: 5px 0; }
            .table-head th { background: #efefef; border: 1px solid #7f9bb9; padding: 6px; font-size: 10px; color: #333; text-transform: uppercase; }
            .qr-box { border: 1px solid #000; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; position: relative; }
            .qr-placeholder { border: 4px solid #000; border-radius: 4px; padding: 10px; text-align: center; width: 80px; height: 80px; }
            .total-table td { padding: 4px 0; font-size: 12px; border-bottom: 1px solid #ccc; }
        ";

        return "
        <html>
        <head><meta charset='utf-8'><style>{$css}</style></head>
        <body>
            <div class='container'>
                <div class='blue-band'>{$title}</div>

                <table class='header-main'>
                    <tr>
                        <td style='width: 130px;'>
                            <div style='border:1px solid #7f9bb9; width:110px; height:110px; text-align:center;'>
                                <span style='font-size:32px; font-weight:900; color:#0f4d85; line-height:110px;'>" . ($isFactura ? 'CFDI' : 'TKT') . "</span>
                            </div>
                        </td>
                        <td style='padding-left:10px;'>
                            <h2 style='margin:0; font-size:24px; color:#1a1a1a;'>" . self::ISSUER_NAME . "</h2>
                            <p class='data-sm' style='margin:10px 0 2px;'>RFC: " . self::ISSUER_RFC . "</p>
                            <p class='data-sm' style='margin:0;'>" . self::ISSUER_ADDRESS . "</p>
                            <p class='data-sm' style='margin:2px 0;'>Tel: " . self::ISSUER_PHONE . "</p>
                            <p class='data-sm' style='margin:0;'>E-mail: " . self::ISSUER_EMAIL . "</p>
                        </td>
                        <td style='text-align: right; width: 220px;'>
                            <p class='label-sm' style='margin:0;'>FACTURA:</p>
                            <p style='font-size:20px; font-weight:bold; color:#d04a3c; margin:0;'>FAC-{$folio}</p>
                            <div style='margin-top:10px;'>
                                <p class='label-sm' style='margin:0;'>Serie del certificado CSD:</p>
                                <p class='data-sm' style='margin:0;'>00001000000500000000</p>
                                <p class='label-sm' style='margin:8px 0 0;'>Fecha y hora de emision:</p>
                                <p class='data-sm' style='margin:0;'>{$fecha} {$hora}</p>
                            </div>
                        </td>
                    </tr>
                </table>

                <table class='meta-bar'>
                    <tr>
                        <td style='width:33%'><span class='label-sm'>LUGAR DE EXPEDICION:</span> <span class='data-sm'>86000</span></td>
                        <td style='width:33%'><span class='label-sm'>TIPO DE COMPROBANTE:</span> <span class='data-sm'>I - Ingreso</span></td>
                        <td style='width:34%'><span class='label-sm'>ESTADO:</span> <span class='data-sm'>" . ($venta->estatus->nombre ?? 'Completado') . "</span></td>
                    </tr>
                </table>

                <table style='margin-bottom:20px;'>
                    <tr>
                        <td>
                            <span class='label-sm'>RECEPTOR:</span> <span class='data-sm' style='font-weight:bold;'>{$cliente}</span><br/>
                            <span class='label-sm'>RFC CLIENTE:</span> <span class='data-sm'>XAXX010101000</span><br/>
                            <span class='label-sm'>DOMICILIO:</span> <span class='data-sm'>Domicilio generico del receptor</span><br/>
                            <span class='label-sm'>USO CFDI:</span> <span class='data-sm'>S01 - Sin efectos fiscales</span>
                        </td>
                    </tr>
                </table>

                <table>
                    <thead class='table-head'>
                        <tr>
                            <th style='width:70px;'>CANTIDAD</th>
                            <th style='width:80px;'>UNIDAD</th>
                            <th style='width:80px;'>CLAVE</th>
                            <th>DESCRIPCION</th>
                            <th style='width:100px;'>P. UNITARIO</th>
                            <th style='width:100px;'>IMPORTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {$rowsHtml}
                    </tbody>
                </table>

                <table style='margin-top:30px;'>
                    <tr>
                        <td style='width:140px; vertical-align:top;'>
                            <!-- Placeholder QR manual con tablas para evitar assets externos -->
                            <div style='width:120px; height:120px; border:1px solid #000; padding:4px;'>
                                <table style='width:100%; height:100%; border-collapse:collapse;'>
                                    <tr><td style='background:#000'></td><td></td><td style='background:#000'></td><td></td><td style='background:#000'></td></tr>
                                    <tr><td></td><td style='background:#000'></td><td></td><td style='background:#000'></td><td></td></tr>
                                    <tr><td style='background:#000'></td><td></td><td style='background:#000'></td><td></td><td style='background:#000'></td></tr>
                                    <tr><td></td><td style='background:#000'></td><td></td><td style='background:#000'></td><td></td></tr>
                                    <tr><td style='background:#000'></td><td></td><td style='background:#000'></td><td></td><td style='background:#000'></td></tr>
                                </table>
                            </div>
                        </td>
                        <td style='padding-left:15px; vertical-align:top;'>
                            <p class='label-sm' style='margin:0; border-bottom:1px solid #0f4d85;'>Datos fiscales complementarios</p>
                            <div style='margin-top:5px;'>
                                <span class='label-sm'>FORMA DE PAGO:</span> <span class='data-sm'>99 - Por definir</span><br/>
                                <span class='label-sm'>REGIMEN FISCAL:</span> <span class='data-sm'>601 - General de Ley Personas Morales</span><br/>
                                <span class='label-sm'>MONEDA:</span> <span class='data-sm'>MXN - Peso Mexicano</span><br/>
                                <span class='label-sm'>METODO PAGO:</span> <span class='data-sm'>PUE - Pago en una sola exhibición</span>
                            </div>
                        </td>
                        <td style='width:240px; vertical-align:top;'>
                            <table class='total-table'>
                                <tr>
                                    <td class='label-sm'>SUBTOTAL</td>
                                    <td class='data-sm' style='text-align:right;'>\$" . number_format($total, 2) . "</td>
                                </tr>
                                <tr>
                                    <td class='label-sm'>IVA</td>
                                    <td class='data-sm' style='text-align:right;'>Incluido</td>
                                </tr>
                                <tr style='border-top:2px solid #0f4d85;'>
                                    <td class='label-sm' style='font-size:14px;'>TOTAL</td>
                                    <td class='data-sm' style='text-align:right; font-size:16px; font-weight:bold; color:#0f4d85;'>\$" . number_format($total, 2) . "</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                " . ($isFactura ? "
                <div style='margin-top:25px; border-top:1px solid #ccc; padding-top:10px;'>
                    <span class='label-sm'>Sello Digital del CFDI</span><br/>
                    <div style='font-size:8px; line-height:1; color:#444; word-break:break-all;'>" . bin2hex(random_bytes(24)) . " " . bin2hex(random_bytes(24)) . "</div>
                    <br/>
                    <span class='label-sm'>Cadena Original</span><br/>
                    <div style='font-size:8px; line-height:1; color:#444; word-break:break-all;'>||" . self::CFDI_VERSION . "|FAC-{$folio}|{$fecha}|" . number_format($total, 2) . "|MXN|99||</div>
                    <br/>
                    <table style='width:100%'>
                        <tr>
                            <td><span class='label-sm'>No de Serie del Certificado del SAT:</span> <span class='data-sm'>000010000005280994</span></td>
                            <td style='text-align:right'><span class='label-sm'>Fecha y hora de certificacion:</span> <span class='data-sm'>{$fecha}</span></td>
                        </tr>
                    </table>
                </div>" : "") . "
            </div>
        </body>
        </html>";
    }
}
