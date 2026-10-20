import { TriangleAlert } from 'lucide-react';
export function ComplainantAlert({ explicit = true }: { explicit?: boolean }) {
  return (
    <div
      className="complainant-alert"
      role="note"
      aria-label={
        explicit ? 'Alerta de denunciante' : 'Alerta según leyenda de colores'
      }
    >
      <TriangleAlert size={20} aria-hidden="true" />
      <div>
        <strong>
          {explicit
            ? 'Atención: registrado como denunciante'
            : 'Observación / denunciante: consultar a Gerencia o Administración'}
        </strong>
        {!explicit && (
          <p>
            Aviso según la leyenda del color de este proyecto; revisa el
            expediente para confirmar el caso.
          </p>
        )}
        <p>
          Revisa las observaciones del expediente y consulta con Administración
          antes de continuar la gestión.
        </p>
      </div>
    </div>
  );
}
