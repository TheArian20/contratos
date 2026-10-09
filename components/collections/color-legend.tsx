import { recordColors, colorLegends, colorLabel } from '@/lib/record-colors';

function Swatch({ color }: { color: string }) {
  const c = recordColors.find((c) => c.value === color)!;
  return (
    <span
      className="legend-swatch"
      aria-hidden="true"
      style={{
        background: c.hex || (color === 'text-white' ? '#526678' : '#fff'),
        color: c.fg,
      }}
    >
      {color.startsWith('text-') || color === 'green-red' ? 'Ab' : ''}
    </span>
  );
}
export function ColorLegend() {
  return (
    <details className="color-legend legend-panel">
      <summary>
        Leyenda de colores{' '}
        <span className="legend-preview" aria-hidden="true">
          {['green', 'pink', 'yellow', 'red', 'blue', 'black'].map((color) => (
            <Swatch key={color} color={color} />
          ))}
        </span>
        <span className="legend-hint">Ver significados</span>
      </summary>
      <p>
        <Swatch color="pink" />
        <strong>Rosado:</strong> sin deuda solo en la sección Ciudad de Dios. En
        AA DATOS y las demás secciones es una etiqueta; no confirma la deuda.
      </p>
      <div className="legend-columns">
        {Object.entries(colorLegends).map(([section, rows]) => (
          <section key={section}>
            <h3>{section}</h3>
            <dl>
              {rows.map(([color, text]) => (
                <div key={color}>
                  <dt>
                    <Swatch color={color} />
                    {colorLabel(color)}
                  </dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p>
        Referencia: «DESCRIPCION DE BASE DE DATOS» del Excel. Un mismo color
        puede tener distinto significado según la sección. En las fichas nuevas
        los colores son etiquetas; los saldos se revisan por lote.
      </p>
      <p>Los colores no registran pagos ni modifican importes.</p>
    </details>
  );
}
