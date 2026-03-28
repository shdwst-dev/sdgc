import type { TiendaVenta } from "./types";

type SalesStoreStepProps = {
  tiendaSeleccionada: string;
  tiendas: TiendaVenta[];
};

export function SalesStoreStep({ tiendaSeleccionada, tiendas }: SalesStoreStepProps) {
  return (
    <section className="panel sales-store-panel">
      <div className="sales-store-panel-copy">
        <h3>1. Tienda asignada</h3>
        <p>El catalogo y el stock disponible se muestran segun la sucursal registrada para tu usuario.</p>
      </div>
      <div className="sales-store-panel-control">
        <label htmlFor="tienda-inicial">Tienda</label>
        <div className="sales-static-field sales-static-field-highlight" id="tienda-inicial">
          <strong>{tiendas.find((tienda) => String(tienda.id_tienda) === tiendaSeleccionada)?.nombre ?? "Sin tienda asignada"}</strong>
        </div>
      </div>
    </section>
  );
}
