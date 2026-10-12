'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { matchesSearch } from '@/lib/person-search';
type DocumentItem = {
  id: string;
  name: string;
  category: string;
  author: string;
  created?: string;
};
export function DocumentLibrary({ documents }: { documents: DocumentItem[] }) {
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState(''),
    [preview, setPreview] = useState<DocumentItem | null>(null);
  const rows = documents.filter(
    (d) =>
      (!category || d.category === category) &&
      matchesSearch(query, [d.name, d.category, d.author]),
  );
  return (
    <div className="document-library">
      <div className="secure-filters">
        <label>
          Buscar documento
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre del archivo o responsable"
          />
        </label>
        <label>
          Tipo
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todos los documentos</option>
            {['Contrato', 'Cobranza', 'Otro documento'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          onClick={() => {
            setQuery('');
            setCategory('');
          }}
        >
          Limpiar filtros
        </button>
      </div>
      <p role="status">{rows.length} documento(s)</p>
      <div className="document-grid">
        {rows.map((d) => (
          <article className="document-card" key={d.id}>
            <span className="document-category">{d.category}</span>
            <h3>{d.name}</h3>
            <p>
              {d.author}
              {d.created
                ? ` · ${new Date(d.created).toLocaleDateString('es-PE')}`
                : ''}
            </p>
            <div className="work-actions">
              <button
                className="secondary-button"
                onClick={() => setPreview(d)}
              >
                Vista previa
              </button>
              <a
                className="secondary-button"
                download
                href={`/api/secure/document?id=${encodeURIComponent(d.id)}`}
              >
                Descargar
              </a>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <p>No hay documentos que coincidan con esta selección.</p>
      )}
      {preview && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v) setPreview(null);
          }}
        >
          <DialogContent className="document-preview">
            <DialogHeader>
              <DialogTitle>{preview.name}</DialogTitle>
              <DialogDescription>
                {preview.category} · Acceso protegido con tu sesión.
              </DialogDescription>
            </DialogHeader>
            {/\.pdf$/i.test(preview.name) ? (
              <iframe
                title={`Vista previa de ${preview.name}`}
                src={`/api/secure/document?id=${encodeURIComponent(preview.id)}&preview=1`}
              />
            ) : (
              <img
                alt={preview.name}
                src={`/api/secure/document?id=${encodeURIComponent(preview.id)}&preview=1`}
              />
            )}
            <p>Si tu navegador no muestra el archivo, puedes descargarlo.</p>
            <a
              className="secondary-button"
              download
              href={`/api/secure/document?id=${encodeURIComponent(preview.id)}`}
            >
              Descargar archivo
            </a>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
