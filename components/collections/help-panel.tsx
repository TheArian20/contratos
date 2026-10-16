'use client';
import { useState } from 'react';
import { matchesSearch } from '@/lib/person-search';
type Guide = {
  id: string;
  title: string;
  steps: string[];
  note?: string;
  view?: string;
  tab?: string;
  editor?: boolean;
  admin?: boolean;
};
export const guides: Guide[] = [
  {
    id: 'buscar',
    title: 'Encontrar una persona o un lote',
    steps: [
      'Entra a Trabajo diario y escribe parte del nombre, DNI, contrato o lote.',
      'Puedes escribir B24AA aunque el lote figure como B.24AA o B-24AA.',
      'Compara el DNI, el proyecto y el lote antes de abrir la ficha.',
    ],
    view: 'Trabajo diario',
    tab: 'Buscar',
  },
  {
    id: 'persona',
    title: 'Crear una persona o corregir sus datos',
    editor: true,
    steps: [
      'Busca primero para comprobar que no exista.',
      'En Inicio, elige Nueva persona e indica el nombre y el proyecto. Añade el lote si lo conoces.',
      'Revisa los avisos de coincidencias. Para corregir una ficha existente usa Editar datos.',
      'Escribe el motivo, revisa el resumen y confirma. Si otra cuenta cambió la ficha, carga la versión actual antes de volver a editar.',
    ],
    view: 'Trabajo diario',
    tab: 'Hoy',
  },
  {
    id: 'pago',
    title: 'Registrar un pago recibido',
    editor: true,
    steps: [
      'Selecciona la persona, su lote y el concepto exacto: por ejemplo, agua o lote.',
      'Escribe el importe, la fecha y el número de recibo. Selecciona la cuota cuando corresponda.',
      'Revisa el resumen y pulsa Confirmar y guardar pago.',
      'Adjunta el comprobante desde Documentos de la ficha.',
    ],
    note: 'Si falta una cuenta o su configuración, pide a Administración que la confirme. Un compromiso de pago no es un abono recibido.',
    view: 'Trabajo diario',
    tab: 'Registrar pago',
  },
  {
    id: 'compromiso',
    title: 'Anotar y atender un compromiso de pago',
    editor: true,
    steps: [
      'Entra a Compromisos de pago y pulsa Nuevo compromiso.',
      'Elige la ficha, el importe, la fecha acordada y, si se conoce, la cuenta.',
      'Revisa Vencidos o Para hoy para hacer seguimiento.',
      'Si llegó el dinero, regístralo como pago. Marca Atendido solo para cerrar el seguimiento y explica el resultado.',
    ],
    view: 'Trabajo diario',
    tab: 'Compromisos',
  },
  {
    id: 'documentos',
    title: 'Consultar o adjuntar documentos',
    steps: [
      'Abre la ficha y entra a Documentos.',
      'Usa la búsqueda y la categoría para localizar el archivo.',
      'Abre la vista previa o descarga el documento.',
    ],
    note: 'Administración y Gestor pueden adjuntar PDF, JPG, PNG o WebP de hasta 10 MB. Verifica que pertenezca a la persona y al lote correctos.',
    view: 'Trabajo diario',
    tab: 'Buscar',
  },
  {
    id: 'contrato',
    title: 'Revisar el estado del contrato',
    steps: [
      'Abre el expediente original o el lote dentro de la ficha.',
      'Busca Estado del contrato. Administración y Gestor pueden cambiarlo indicando el motivo.',
      'Usa Firmado solo después de comprobar el documento.',
    ],
    note: 'El estado corresponde a ese lote o expediente; no confirma pagos ni cambia la deuda.',
    view: 'Trabajo diario',
    tab: 'Buscar',
  },
  {
    id: 'observaciones',
    title: 'Dejar una observación importante',
    editor: true,
    steps: [
      'Abre la ficha y elige Añadir observación.',
      'Escribe lo acordado o pendiente y guarda.',
      'Pulsa Destacar observación para mostrarla arriba. Quitar el destacado conserva el texto.',
    ],
    view: 'Trabajo diario',
    tab: 'Buscar',
  },
  {
    id: 'colores',
    title: 'Entender los colores y los saldos',
    steps: [
      'Consulta la leyenda de colores junto a los listados.',
      'El rosado del Excel significa sin deuda únicamente en Ciudad de Dios. En AA DATOS y otras secciones puede ser una etiqueta diferente.',
      'Por confirmar significa que falta revisar información; no significa deuda cero.',
    ],
    note: 'Cambiar un color no registra un pago. Administración confirma los importes y las correcciones de deuda.',
    view: 'Trabajo diario',
    tab: 'Buscar',
  },
  {
    id: 'duplicados',
    title: 'Revisar posibles duplicados',
    steps: [
      'Abre Posibles duplicados y busca por DNI o lote.',
      'Abre cada ficha y compara persona, proyecto, contrato y observaciones.',
      'Un registro histórico, traslado o pareja puede explicar la coincidencia. Solicita revisión a Administración antes de corregir relaciones.',
    ],
    note: 'La herramienta muestra coincidencias; no fusiona ni elimina registros.',
    view: 'Trabajo diario',
    tab: 'Duplicados',
  },
  {
    id: 'cierre',
    title: 'Preparar el cierre diario',
    steps: [
      'Entra a Cierre diario y selecciona una fecha.',
      'Elige fecha del pago o fecha de registro según lo que quieras revisar.',
      'Comprueba el detalle, los recibos y las anulaciones.',
      'Pulsa Imprimir / guardar PDF para conservar el resumen.',
    ],
    note: 'Los compromisos y los pagos anulados no se suman a los pagos vigentes. El resumen puede cambiar si se corrigen registros después.',
    view: 'Trabajo diario',
    tab: 'Cierre diario',
  },
  {
    id: 'respaldo',
    title: 'Guardar y comprobar un respaldo',
    admin: true,
    steps: [
      'Entra a Respaldos y recuperación y revisa la última copia completa.',
      'Puedes crear una copia privada ahora o descargar una de las guardadas.',
      'Conserva también una descarga fuera del alojamiento, en una carpeta privada.',
      'Usa Comprobar una copia guardada para verificar el archivo. Para recuperar datos, solicita al responsable técnico un ensayo antes de cambiar la web.',
    ],
    note: 'Una copia dentro del mismo alojamiento no reemplaza tu copia descargada. Los respaldos contienen información privada.',
    view: 'Respaldos',
  },
  {
    id: 'error',
    title: 'Qué hacer si no puedes guardar',
    steps: [
      'Lee el aviso sin cerrar el formulario: puede faltar un campo, un motivo o permiso.',
      'Si hay una versión más reciente, revisa tu borrador antes de elegir descartarlo y cargar los datos actuales.',
      'Si una operación tarda, comprueba la ficha antes de repetirla.',
      'Si el problema sigue, informa a Administración qué acción hiciste y el mensaje que apareció. Nunca compartas tu contraseña.',
    ],
  },
];
export function HelpTip({ id }: { id: string }) {
  const guide = guides.find((g) => g.id === id);
  return guide ? (
    <details className="context-help">
      <summary>¿Cómo hago esto?</summary>
      <ol>
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {guide.note && <p>{guide.note}</p>}
    </details>
  ) : null;
}
export function HelpPanel({
  role,
  onNavigate,
}: {
  role: string;
  onNavigate: (view: string, tab?: string) => void;
}) {
  const [query, setQuery] = useState('');
  const available = guides.filter(
    (g) =>
      (!g.admin || role === 'Administrador') &&
      (!g.editor || role !== 'Consulta'),
  );
  const visible = available.filter((g) =>
    matchesSearch(query, [g.title, ...g.steps, g.note]),
  );
  return (
    <section className="panel secure-content help-panel">
      <p className="eyebrow">GUÍA PARA EL EQUIPO</p>
      <h1>Ayuda paso a paso</h1>
      <p>
        Busca una tarea y abre sus instrucciones. Tu cuenta es {role}; las
        opciones disponibles dependen de ese permiso.
      </p>
      <label className="secure-form">
        ¿Qué necesitas hacer?
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ejemplo: pago, contrato, contraseña o respaldo"
        />
      </label>
      <div className="help-topics">
        {visible.map((g) => (
          <details className="source-group" key={g.id}>
            <summary>{g.title}</summary>
            <ol>
              {g.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {g.note && <p className="report-note">{g.note}</p>}
            {g.view && (
              <button
                className="secondary-button"
                data-navigation
                onClick={() => onNavigate(g.view!, g.tab)}
              >
                Ir a {g.view === 'Trabajo diario' ? g.tab : g.view}
              </button>
            )}
          </details>
        ))}
      </div>
      {!visible.length && (
        <p>
          No encontramos esa tarea. Prueba con «pago», «persona» o «documentos».
        </p>
      )}
    </section>
  );
}
