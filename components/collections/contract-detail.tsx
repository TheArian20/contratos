'use client';

import { useState } from 'react';
import { Download, FileText, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  type Contract,
  type DocumentCategory,
  type Payment,
  documentCategories,
  dateLabel,
  money,
  textField,
  today,
} from '@/lib/collections';
import { Choice, StatusBadge, errorMessage } from './shared';

export type DetailTab = 'general' | 'payments' | 'documents' | 'notes';
export function ContractDetail({
  contract,
  initialTab,
  canEdit,
  canManage,
  onClose,
  onEdit,
  onPay,
  onNote,
  onAttach,
  onRemove,
}: {
  contract: Contract;
  initialTab: DetailTab;
  canEdit: boolean;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPay: (payment: Omit<Payment, 'id' | 'author'>) => void;
  onNote: (text: string) => void;
  onAttach: (files: File[], category: DocumentCategory) => void;
  onRemove: (id: string) => void;
}) {
  const [error, setError] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Contrato');
  const [feedback, setFeedback] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const baselinePaid =
    contract.paid -
    (contract.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="contract-sheet">
        <SheetHeader>
          <p className="eyebrow">FICHA DEL CONTRATO</p>
          <SheetTitle>{contract.client}</SheetTitle>
          <SheetDescription>
            {contract.id} · Datos de demostración
          </SheetDescription>
        </SheetHeader>
        <div className="sheet-body">
          <div className="detail-heading">
            <StatusBadge status={contract.status} />
            {canManage && (
              <button className="secondary-button" onClick={onEdit}>
                <Pencil size={16} /> Editar
              </button>
            )}
          </div>
          <div className="balance-block">
            <p className="detail-lot">{contract.lot || 'Lote por asignar'}</p>
            <span>Saldo pendiente</span>
            <strong>{money(contract.amount - contract.paid)}</strong>
            <p>Valor del contrato: {money(contract.amount)}</p>
            <p>Total pagado: {money(contract.paid)}</p>
          </div>
          <Tabs
            defaultValue={initialTab}
            onValueChange={() => {
              setError('');
              setFeedback('');
            }}
          >
            <TabsList className="detail-tabs">
              <TabsTrigger value="general">Información</TabsTrigger>
              <TabsTrigger value="payments">Pagos</TabsTrigger>
              <TabsTrigger value="documents">Archivos</TabsTrigger>
              <TabsTrigger value="notes">Gestiones</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <dl className="detail-list">
                <div>
                  <dt>Lote / referencia</dt>
                  <dd>{contract.lot || 'Por asignar'}</dd>
                </div>
                <div>
                  <dt>Identificación</dt>
                  <dd>{contract.document}</dd>
                </div>
                <div>
                  <dt>Responsable</dt>
                  <dd>{contract.owner}</dd>
                </div>
                <div>
                  <dt>Fecha de compromiso</dt>
                  <dd>{dateLabel(contract.due)}</dd>
                </div>
                <div>
                  <dt>Ubicación en papel</dt>
                  <dd>{contract.location}</dd>
                </div>
              </dl>
              <p className="detail-callout">
                {contract.status === 'Finalizado'
                  ? 'Contrato sin saldo pendiente.'
                  : 'Consulta los pagos y registra el seguimiento desde las pestañas de esta ficha.'}
              </p>
            </TabsContent>
            <TabsContent value="payments">
              <div className="section-title">
                <h3>Historial de abonos</h3>
                <strong>{money(contract.paid)}</strong>
              </div>
              {baselinePaid > 0 && (
                <div className="history-item">
                  <div>
                    <strong>Abonos iniciales de ejemplo</strong>
                    <span>Saldo acumulado al iniciar la demostración</span>
                  </div>
                  <strong>{money(baselinePaid)}</strong>
                </div>
              )}
              {(contract.payments ?? []).map((payment) => (
                <div className="history-item" key={payment.id}>
                  <div>
                    <strong>{dateLabel(payment.date)}</strong>
                    <span>
                      {payment.reference || 'Sin referencia'} · {payment.author}
                    </span>
                  </div>
                  <strong>{money(payment.amount)}</strong>
                </div>
              ))}
              {contract.paid === 0 && (
                <p className="inline-empty">
                  Este contrato todavía no tiene pagos.
                </p>
              )}
              {canEdit && contract.amount > contract.paid ? (
                <form
                  className="contract-form inset-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    setError('');
                    setFeedback('');
                    try {
                      onPay({
                        amount: Number(textField(form, 'amount')),
                        date: textField(form, 'date'),
                        reference: textField(form, 'reference'),
                      });
                      event.currentTarget.reset();
                      setFeedback(
                        'Pago registrado. El saldo y el historial están actualizados.',
                      );
                    } catch (error) {
                      setError(errorMessage(error));
                    }
                  }}
                >
                  <h3>Registrar un pago de prueba</h3>
                  <label htmlFor="payment-amount">
                    Valor del abono (COP)
                    <Input
                      id="payment-amount"
                      name="amount"
                      type="number"
                      min="1"
                      max={contract.amount - contract.paid}
                      step="1"
                      required
                    />
                  </label>
                  <label htmlFor="payment-date">
                    Fecha del pago
                    <Input
                      id="payment-date"
                      name="date"
                      type="date"
                      defaultValue={today()}
                      min="2000-01-01"
                      max={today()}
                      required
                    />
                  </label>
                  <label htmlFor="payment-reference">
                    Referencia o comprobante
                    <Input
                      id="payment-reference"
                      name="reference"
                      maxLength={100}
                    />
                  </label>
                  <button className="primary-button" type="submit">
                    <Plus size={16} /> Registrar pago
                  </button>
                </form>
              ) : (
                <p className="detail-callout">
                  {contract.amount === contract.paid
                    ? 'El contrato está pagado en su totalidad.'
                    : 'Tu rol permite consultar los pagos.'}
                </p>
              )}
            </TabsContent>
            <TabsContent value="documents">
              <div className="section-title">
                <h3>Documentos de {contract.client}</h3>
                <span>{contract.attachments?.length ?? 0} archivos</span>
              </div>
              {canEdit && (
                <div className="form-field">
                  <span>Tipo de documento</span>
                  <Choice
                    label="Tipo de documento"
                    value={category}
                    options={documentCategories}
                    onChange={(value) => setCategory(value as DocumentCategory)}
                  />
                </div>
              )}
              {canEdit && (
                <label className="upload-zone" htmlFor="contract-files">
                  <Upload size={24} />
                  <strong>Adjuntar archivos de prueba</strong>
                  <span>PDF, JPG, PNG o WebP · máximo 10 MB por archivo</span>
                  <input
                    id="contract-files"
                    aria-label="Adjuntar archivos de prueba"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    multiple
                    onChange={(event) => {
                      setError('');
                      setFeedback('');
                      try {
                        const files = Array.from(event.target.files ?? []);
                        if (files.length) {
                          onAttach(files, category);
                          setFeedback(
                            `${files.length} archivo(s) adjuntado(s) a esta sesión.`,
                          );
                        }
                      } catch (error) {
                        setError(errorMessage(error));
                      }
                      event.target.value = '';
                    }}
                  />
                </label>
              )}
              {!contract.attachments?.length && (
                <div className="empty-state">
                  <FileText size={32} />
                  <h3>Aún no hay archivos</h3>
                  <p>
                    Los archivos de prueba permanecen solo en esta página; no se
                    suben a un servidor.
                  </p>
                </div>
              )}
              {contract.attachments?.map((file) => (
                <div className="file-item" key={file.id}>
                  <FileText size={22} />
                  <div>
                    <a href={file.url} target="_blank" rel="noreferrer">
                      {file.name}
                    </a>
                    <small>
                      {file.category} · {(file.size / 1024).toFixed(0)} KB
                    </small>
                  </div>
                  <a
                    className="row-open"
                    href={file.url}
                    download={file.name}
                    aria-label={`Descargar ${file.name}`}
                  >
                    <Download size={18} />
                  </a>
                  {canEdit && (
                    <button
                      className="row-open"
                      onClick={() => setRemoveId(file.id)}
                      aria-label={`Quitar ${file.name}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              ))}
              <p className="detail-callout">
                Archivo físico: {contract.location}
              </p>
            </TabsContent>
            <TabsContent value="notes">
              <div className="section-title">
                <h3>Seguimiento de cobranza</h3>
              </div>
              {canEdit && (
                <form
                  className="contract-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setError('');
                    setFeedback('');
                    const text = textField(
                      new FormData(event.currentTarget),
                      'note',
                    );
                    try {
                      onNote(text);
                      event.currentTarget.reset();
                      setFeedback('Gestión registrada.');
                    } catch (error) {
                      setError(errorMessage(error));
                    }
                  }}
                >
                  <label htmlFor="collection-note">
                    Resultado de la gestión
                    <Textarea
                      id="collection-note"
                      name="note"
                      placeholder="Ej. El cliente confirma que realizará el pago el viernes."
                      required
                      maxLength={1500}
                      rows={4}
                    />
                  </label>
                  <button className="primary-button" type="submit">
                    <Plus size={16} /> Guardar gestión
                  </button>
                </form>
              )}
              {!contract.notes?.length && (
                <p className="inline-empty">No hay gestiones registradas.</p>
              )}
              {[...(contract.notes ?? [])].reverse().map((note) => (
                <article className="note-item" key={note.id}>
                  <strong>{note.author}</strong>
                  <small>{dateLabel(note.date)}</small>
                  <p>{note.text}</p>
                </article>
              ))}
            </TabsContent>
          </Tabs>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {feedback && <output className="inline-success">{feedback}</output>}
        </div>
        <AlertDialog
          open={!!removeId}
          onOpenChange={(open) => {
            if (!open) setRemoveId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Quitar este archivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Se quitará de esta demostración. El archivo original en tu
                equipo no se modifica.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (removeId) {
                    try {
                      onRemove(removeId);
                      setRemoveId(null);
                      setFeedback('Archivo retirado.');
                    } catch (error) {
                      setError(errorMessage(error));
                      setRemoveId(null);
                    }
                  }
                }}
              >
                Quitar archivo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
