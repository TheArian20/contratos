'use client';
import { WorkSelect } from './work-select';
import { useState } from 'react';
import {
  accountTotals,
  installmentBalance,
  soles,
  todayLocal,
  centsInput,
  type WorkState,
} from '@/lib/work-ledger';
import { workError, type WorkSave } from './work-shared';
export function PaymentWizard({
  state,
  initialAccount,
  onSave,
  onOpenPerson,
}: {
  state: WorkState;
  initialAccount: string;
  onSave: WorkSave;
  onOpenPerson: (id: string) => void;
}) {
  const initial = state.accounts.find((a) => a.id === initialAccount),
    initialLot = state.lots.find((l) => l.id === initial?.lot_id);
  const [personId, setPersonId] = useState(initialLot?.person_id ?? ''),
    [lotId, setLotId] = useState(initialLot?.id ?? ''),
    [accountId, setAccountId] = useState(initialAccount),
    [step, setStep] = useState(initial ? 2 : 1),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [details, setDetails] = useState<Record<string, string>>({}),
    [operation] = useState(() => crypto.randomUUID()),
    [done, setDone] = useState(false);
  const person = state.people.find((p) => p.id === personId),
    lot = state.lots.find((l) => l.id === lotId),
    account = state.accounts.find((a) => a.id === accountId),
    plans = state.installments.filter(
      (i) =>
        i.account_id === accountId && installmentBalance(i, state.payments) > 0,
    );
  if (done)
    return (
      <section className="panel secure-content">
        <h2>Pago registrado</h2>
        <p>
          Se guardó en la cuenta de {person?.name}, lote {lot?.name}, concepto{' '}
          {account?.concept}.
        </p>
        <button
          className="primary-button"
          onClick={() => onOpenPerson(personId)}
        >
          Ver ficha y comprobación
        </button>
      </section>
    );
  return (
    <section className="panel payment-wizard">
      <h2>Registrar pago</h2>
      <ol className="wizard-steps">
        <li className={step === 1 ? 'active' : ''}>
          1. Persona, lote y concepto
        </li>
        <li className={step === 2 ? 'active' : ''}>2. Datos del pago</li>
        <li className={step === 3 ? 'active' : ''}>3. Revisar y confirmar</li>
      </ol>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {step === 1 && (
        <form
          className="secure-form"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            setStep(2);
          }}
        >
          <label htmlFor="payment-wizard-1">
            Persona
            <WorkSelect
              id="payment-wizard-1"
              value={personId}
              onChange={(e) => {
                setPersonId(e.target.value);
                setLotId('');
                setAccountId('');
              }}
              required
            >
              <option value="">Selecciona una persona confirmada</option>
              {state.people.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name} · {p.document}
                </option>
              ))}
            </WorkSelect>
          </label>
          <label htmlFor="payment-wizard-2">
            Lote
            <WorkSelect
              id="payment-wizard-2"
              value={lotId}
              onChange={(e) => {
                setLotId(e.target.value);
                setAccountId('');
              }}
              required
            >
              <option value="">Selecciona un lote</option>
              {state.lots
                .filter((l) => l.person_id === personId)
                .map((l) => (
                  <option value={l.id} key={l.id}>
                    {l.project} · {l.name}
                  </option>
                ))}
            </WorkSelect>
          </label>
          <label htmlFor="payment-wizard-3">
            Concepto
            <WorkSelect
              id="payment-wizard-3"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              <option value="">Selecciona un concepto</option>
              {state.accounts
                .filter((a) => a.lot_id === lotId)
                .map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.concept}
                  </option>
                ))}
            </WorkSelect>
          </label>
          <p>
            Si falta una persona, lote o concepto, Administración debe
            confirmarlo primero desde la ficha.
          </p>
          <button className="primary-button" disabled={!account}>
            Continuar
          </button>
        </form>
      )}
      {step === 2 && account && (
        <form
          className="secure-form"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            const f = Object.fromEntries(
              new FormData(e.currentTarget),
            ) as Record<string, string>;
            try {
              const cents = centsInput(f.amount)!;
              const balance = accountTotals(account, state.payments).balance;
              if (cents <= 0 || (balance !== null && cents > balance))
                throw new Error(
                  'El importe debe ser positivo y no superar el saldo.',
                );
              const installment = state.installments.find(
                (i) => i.id === f.installmentId,
              );
              if (
                installment &&
                cents > installmentBalance(installment, state.payments)
              )
                throw new Error(
                  'El importe supera el saldo de la cuota seleccionada.',
                );
              setDetails(f);
              setStep(3);
            } catch (err) {
              setError(workError(err));
            }
          }}
        >
          <p>
            <strong>{person?.name}</strong>
            <br />
            {lot?.name} · {account.concept}
          </p>
          <p>
            Saldo:{' '}
            {accountTotals(account, state.payments).balance === null
              ? 'Por confirmar'
              : soles(accountTotals(account, state.payments).balance!)}
          </p>
          {state.installments.some((i) => i.account_id === accountId) && (
            <label htmlFor="payment-wizard-4">
              Cuota que estás cobrando
              <WorkSelect
                id="payment-wizard-4"
                name="installmentId"
                required
                defaultValue={details.installmentId ?? ''}
              >
                <option value="">Selecciona una cuota</option>
                {plans.map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.due} · pendiente{' '}
                    {soles(installmentBalance(i, state.payments))}
                  </option>
                ))}
              </WorkSelect>
            </label>
          )}
          <label>
            Importe en soles
            <input
              name="amount"
              inputMode="decimal"
              defaultValue={details.amount ?? ''}
              required
              placeholder="0.00"
            />
          </label>
          <label>
            Fecha del pago
            <input
              name="date"
              type="date"
              max={todayLocal()}
              defaultValue={details.date ?? todayLocal()}
              required
            />
          </label>
          <label>
            Número de recibo o referencia
            <input
              name="reference"
              defaultValue={details.reference ?? ''}
              required
              maxLength={150}
            />
          </label>
          <p>
            El comprobante puede adjuntarse a la ficha después de registrar el
            pago.
          </p>
          <div className="work-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setStep(1)}
            >
              Volver
            </button>
            <button className="primary-button">Revisar pago</button>
          </div>
        </form>
      )}
      {step === 3 && account && (
        <div className="payment-review">
          <h3>Comprueba estos datos antes de guardar</h3>
          <dl>
            <dt>Persona</dt>
            <dd>
              {person?.name} · {person?.document}
            </dd>
            <dt>Lote</dt>
            <dd>
              {lot?.project} · {lot?.name}
            </dd>
            <dt>Concepto</dt>
            <dd>{account.concept}</dd>
            <dt>Importe</dt>
            <dd>{soles(centsInput(details.amount)!)}</dd>
            <dt>Fecha</dt>
            <dd>{details.date}</dd>
            <dt>Recibo</dt>
            <dd>{details.reference}</dd>
            <dt>Cuota</dt>
            <dd>
              {state.installments.find((i) => i.id === details.installmentId)
                ?.due ?? 'Sin plan de cuotas'}
            </dd>
          </dl>
          <p>
            Este pago se aplicará únicamente a la cuenta y cuota seleccionadas.
          </p>
          <div className="work-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setStep(2)}
            >
              Corregir
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await onSave('desk-payment', {
                    ...details,
                    accountId,
                    version: account.version,
                    operation,
                  });
                  setDone(true);
                } catch (err) {
                  setError(workError(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Guardando…' : 'Confirmar y guardar pago'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
