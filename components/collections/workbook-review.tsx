'use client';

import { useMemo, useState } from 'react';
import {
  columnName,
  reviewSheet,
  reviewText,
  type SourceSheet,
} from '@/lib/workbook-review';
import { Choice } from './shared';

export function WorkbookReview() {
  const [sheets, setSheets] = useState<SourceSheet[]>([]);
  const [filename, setFilename] = useState('');
  const [sheetIndex, setSheetIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sheet = useMemo(
    () => (sheets[sheetIndex] ? reviewSheet(sheets[sheetIndex]) : null),
    [sheets, sheetIndex],
  );
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es');
    return (
      sheet?.rows.filter(
        (row) =>
          !term ||
          row.cells.some((cell) =>
            reviewText(cell).toLocaleLowerCase('es').includes(term),
          ),
      ) ?? []
    );
  }, [sheet, query]);
  const detail = sheet?.rows.find((row) => row.row === selected);
  async function load(file: File) {
    setError('');
    if (!/\.xlsx$/i.test(file.name) || file.size > 15 * 1024 * 1024) {
      setError('Selecciona un archivo .xlsx de hasta 15 MB.');
      return;
    }
    setBusy(true);
    try {
      const { default: readExcelFile } =
        await import('read-excel-file/browser');
      const result = await readExcelFile(file, { trim: false });
      if (!result.length) throw new Error('empty');
      setSheets(
        result.map((source) => ({
          sheet: source.sheet,
          data: source.data.map((row) =>
            row.map((cell) =>
              cell instanceof Date ||
              typeof cell === 'string' ||
              typeof cell === 'number' ||
              typeof cell === 'boolean'
                ? cell
                : null,
            ),
          ),
        })),
      );
      setFilename(file.name);
      setSheetIndex(0);
      setQuery('');
      setPage(0);
      setSelected(null);
    } catch {
      setError(
        'No se pudo leer el archivo. Comprueba que sea un .xlsx válido y sin contraseña.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel excel-review">
      <div className="panel-heading">
        <div>
          <h2>Revisar la base de datos</h2>
          <p>Busca personas, lotes y los importes anotados en cada hoja.</p>
        </div>
      </div>
      <div className="excel-body">
        <p>
          El archivo se lee en esta pestaña y no se envía al servidor. Al salir
          de esta sección se descarta la revisión. El Excel original no se
          modifica.
        </p>
        <label className="excel-upload">
          {busy ? 'Leyendo el archivo…' : 'Abrir archivo Excel (.xlsx)'}
          <input
            aria-label="Abrir archivo Excel"
            type="file"
            accept=".xlsx"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void load(file);
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        {!!sheets.length && (
          <>
            <div className="excel-controls">
              <strong>{filename}</strong>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  setSheets([]);
                  setFilename('');
                  setSelected(null);
                  setError('');
                }}
              >
                Cerrar archivo
              </button>
            </div>
            <p className="excel-caution">
              Revisión preliminar · No se calculan deudas ni se confirman pagos
              automáticamente. Los vacíos siguen pendientes; los colores y
              estados del Excel deben revisarse en el original. Las rutas a
              documentos no adjuntan los archivos.
            </p>
            <div className="excel-controls">
              <label htmlFor="excel-sheet">
                Hoja
                <Choice
                  id="excel-sheet"
                  label="Seleccionar hoja"
                  value={sheets[sheetIndex].sheet}
                  options={sheets.map((item) => item.sheet)}
                  onChange={(value) => {
                    setSheetIndex(
                      sheets.findIndex((item) => item.sheet === value),
                    );
                    setPage(0);
                    setSelected(null);
                  }}
                />
              </label>
              <label>
                Buscar en esta hoja
                <input
                  className="excel-search"
                  placeholder="Persona, DNI, lote o recibo"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                    setSelected(null);
                  }}
                />
              </label>
            </div>
            <p>
              {sheets.length} hojas · {matches.length} filas encontradas. Cada
              fila conserva su origen; las personas repetidas no se fusionan.
            </p>
            {!sheet?.recognized && (
              <p className="excel-caution">
                Esta hoja no tiene un encabezado de personas reconocido.
                Consulta sus filas completas antes de clasificarla.
              </p>
            )}
            <div className="excel-scroll">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th>Fila de Excel</th>
                    <th>Persona / referencia</th>
                    <th>DNI</th>
                    <th>Ubicación del lote</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.slice(page * 30, page * 30 + 30).map((row) => (
                    <tr key={row.row}>
                      <td>{row.row}</td>
                      <td>
                        {row.person ||
                          (sheet?.recognized
                            ? 'Sin nombre / revisar fila'
                            : row.cells
                                .map(reviewText)
                                .filter(Boolean)
                                .slice(0, 2)
                                .join(' · '))}
                      </td>
                      <td>{row.document || 'Por revisar'}</td>
                      <td>{row.lot || 'Por revisar'}</td>
                      <td>
                        <button
                          className="secondary-button"
                          onClick={() => setSelected(row.row)}
                        >
                          Ver fila
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!matches.length && <p>No hay coincidencias en esta hoja.</p>}
            <div className="excel-controls">
              <button
                className="secondary-button"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page + 1} de{' '}
                {Math.max(1, Math.ceil(matches.length / 30))}
              </span>
              <button
                className="secondary-button"
                disabled={(page + 1) * 30 >= matches.length}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </div>
            {detail && (
              <section className="excel-detail" aria-label="Detalle de fila">
                <div className="excel-controls">
                  <h3>
                    {sheet?.name} · Fila {detail.row}
                  </h3>
                  <button
                    className="secondary-button"
                    onClick={() => setSelected(null)}
                  >
                    Cerrar detalle
                  </button>
                </div>
                <p>
                  Valores registrados en el archivo, sin validar su vigencia.
                  Las fórmulas muestran su último resultado guardado.
                </p>
                <dl>
                  {detail.cells.flatMap((cell, index) =>
                    reviewText(cell)
                      ? [
                          <div key={index}>
                            <dt>
                              {columnName(index)}
                              {detail.row} ·{' '}
                              {reviewText(sheet?.headers[index]) ||
                                'Sin encabezado'}
                            </dt>
                            <dd>{reviewText(cell)}</dd>
                          </div>,
                        ]
                      : [],
                  )}
                </dl>
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
}
