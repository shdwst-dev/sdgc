import type { TiendaVenta } from "./types";

type SalesStoreStepProps = {
  tiendaSeleccionada: string;
  tiendas: TiendaVenta[];
  onChange: (value: string) => void;
};

export function SalesStoreStep({ tiendaSeleccionada, tiendas, onChange }: SalesStoreStepProps) {
  return (
    <section className="panel sales-store-panel">
      <div className="sales-store-panel-copy">
        <h3>1. Selecciona la tienda</h3>
        <p>El catalogo y el stock disponible se mostraran segun la sucursal que elijas.</p>
      </div>
      <div className="sales-store-panel-control">
        <label htmlFor="tienda-inicial">Tienda</label>
        <select id="tienda-inicial" value={tiendaSeleccionada} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecciona una tienda</option>
          {tiendas.map((tienda) => (
            <option key={tienda.id_tienda} value={tienda.id_tienda}>
              {tienda.nombre}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
