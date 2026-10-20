import { TriangleAlert } from 'lucide-react';
export function ComplainantAlert() {
  return (
    <div
      className="complainant-alert"
      role="note"
      aria-label="Alerta de denunciante"
    >
      <TriangleAlert size={20} aria-hidden="true" />
      <div>
        <strong>Atención: registrado como denunciante</strong>
        <p>
          Revisa las observaciones del expediente y consulta con Administración
          antes de continuar la gestión.
        </p>
      </div>
    </div>
  );
}
