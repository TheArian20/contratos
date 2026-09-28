'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  type Contract,
  type ContractStatus,
  statuses,
  textField,
  today,
  validateContract,
} from '@/lib/collections';
import { Choice, errorMessage } from './shared';

export function ContractForm({
  contract,
  owners,
  onSave,
  onClose,
}: {
  contract?: Contract;
  owners: string[];
  onSave: (contract: Contract) => void;
  onClose: () => void;
}) {
  const [owner, setOwner] = useState(
    contract?.owner ?? owners[0] ?? 'Administrador',
  );
  const [status, setStatus] = useState<ContractStatus>(
    contract?.status ?? 'Al día',
  );
  const [error, setError] = useState('');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="create-dialog">
        <DialogHeader>
          <DialogTitle>
            {contract ? 'Editar contrato' : 'Nuevo contrato'}
          </DialogTitle>
          <DialogDescription>
            Usa datos de ejemplo. Los cambios duran hasta recargar la página.
          </DialogDescription>
        </DialogHeader>
        <form
          className="contract-form"
          onSubmit={(event) => {
            event.preventDefault();
            setError('');
            const form = new FormData(event.currentTarget);
            try {
              const draft: Contract = {
                ...contract,
                id: contract?.id ?? '',
                client: textField(form, 'client'),
                document: textField(form, 'document'),
                amount: Number(textField(form, 'amount')),
                paid: contract?.paid ?? 0,
                due: textField(form, 'due'),
                status,
                owner,
                location: textField(form, 'location') || 'Por asignar',
              };
              validateContract(draft);
              onSave(draft);
              onClose();
            } catch (error) {
              setError(errorMessage(error));
            }
          }}
        >
          <label htmlFor="contract-client">
            Nombre del cliente
            <Input
              id="contract-client"
              name="client"
              defaultValue={contract?.client}
              required
              maxLength={90}
            />
          </label>
          <label htmlFor="contract-document">
            Identificación
            <Input
              id="contract-document"
              name="document"
              defaultValue={contract?.document}
              required
              maxLength={30}
            />
          </label>
          <div className="form-two">
            <label htmlFor="contract-amount">
              Valor del contrato (COP)
              <Input
                id="contract-amount"
                name="amount"
                type="number"
                defaultValue={contract?.amount}
                min={Math.max(1, contract?.paid ?? 0)}
                max="999999999999"
                step="1"
                required
              />
            </label>
            <label htmlFor="contract-due">
              Fecha de compromiso
              <Input
                id="contract-due"
                name="due"
                type="date"
                defaultValue={contract?.due ?? today()}
                min="2000-01-01"
                max="2100-12-31"
                required
              />
            </label>
          </div>
          <div className="form-two">
            <div className="form-field">
              <span id="owner-label">Responsable</span>
              <Choice
                label="Responsable"
                value={owner}
                options={[...new Set([...owners, owner])]}
                onChange={setOwner}
              />
            </div>
            <div className="form-field">
              <span>Estado</span>
              <Choice
                label="Estado del contrato"
                value={status}
                options={statuses}
                onChange={(value) => setStatus(value as ContractStatus)}
              />
            </div>
          </div>
          <label htmlFor="contract-location">
            Ubicación del archivo físico
            <Input
              id="contract-location"
              name="location"
              defaultValue={contract?.location}
              placeholder="Archivador A · Carpeta 04"
              maxLength={100}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              <Check size={17} />
              {contract ? 'Guardar cambios' : 'Crear contrato'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
