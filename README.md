# Cartera

Sistema en español para expedientes, contratos extrajudiciales, documentos y cobranzas. La entrada es pública; los datos y documentos requieren autenticación de servidor. El código no contiene registros reales ni contraseñas de producción.

## Versión actual

- Acceso con usuario y contraseña; roles Administrador, Gestor y Consulta. Todas las cuentas activas pueden consultar la base. El gestor registra abonos, documentos y seguimiento; solo Administración administra usuarios e importa el origen.
- Contraseñas bcrypt con costo 12, sesiones aleatorias de 256 bits almacenadas como hash, cookies HttpOnly/Secure/SameSite=Strict, expiración de 8 horas, limitación de intentos por usuario e IP y comprobación de Origin en escrituras.
- Desactivación de cuentas y cambios de contraseña revocan las sesiones. Las cuentas nuevas deben cambiar su contraseña inicial. No hay autorregistro público.
- Importación inmutable con el Excel original en R2 privado, una representación fiel de sus celdas y un manifiesto por hoja. Verificación de coordenadas, filas y huellas SHA-256. Reimportar el mismo contenido es idempotente; no se reemplazan bases por otra versión sin conciliación.
- Navegación por proyectos, servicios, casos especiales y guía; búsqueda global por valores, filtros, paginación y fichas con persona, contrato, lote, observaciones, cuotas y origen completo.
- Cada fila mantiene un identificador compuesto de archivo, hoja y fila. Nunca se fusionan personas por nombre ni se reparten pagos entre lotes automáticamente.
- Referencias de documentos del Excel se conservan como texto. Nuevos adjuntos PDF/JPG/PNG/WebP se almacenan en R2, hasta 10 MB, con comprobación de firma del archivo y descarga autenticada.
- Gestiones y correcciones pendientes se guardan como anotaciones con autor y fecha, sin alterar el origen.
- Nuevos abonos en soles por concepto y lote: Lote, Luz, Agua, Título, Autovalúo, Faenas, Vías y Otros servicios. Importes enteros en céntimos, referencia obligatoria, validación de fecha y protección contra recibos duplicados en el mismo concepto/expediente. Se separan de los importes históricos para evitar doble conteo.

## Trabajo diario y fichas confirmadas

La entrada principal es Trabajo diario: Hoy, Personas, Registrar pago y Pendientes de revisar. Archivo original conserva la organización por hojas y todas las celdas de origen.

- Administración confirma manualmente los registros de una persona; la identificación exacta sugiere coincidencias pero nunca las une sin confirmación. Identificaciones no vacías únicas y cada origen solo puede pertenecer a una ficha. Las correcciones mantienen un historial.
- Una persona puede tener varios lotes. Cada lote tiene cuentas independientes por concepto. No se generan importes financieros ni lotes confirmados a partir de columnas ambiguas.
- El saldo requiere un importe acordado y un histórico pagado explícitamente confirmado. Un histórico desconocido no es cero. Los pagos históricos confirmados requieren fecha de corte anterior a hoy; los nuevos abonos deben ser posteriores.
- Los planes mensuales dividen el saldo exacto en céntimos, ajustando el día al final de cada mes cuando corresponde. Los abonos se aplican a la cuota seleccionada, sin distribuirse entre otros lotes o conceptos.
- Registro guiado en tres pasos con resumen antes de confirmar. Operaciones idempotentes, referencias únicas, comprobación de cuenta/cuota y control de concurrencia evitan duplicados y sobrepagos de saldos conocidos.
- Las anulaciones requieren Administración y un motivo. Conservan el pago, autor, fecha y motivo; el importe deja de descontarse de la cuenta y cuota. No se borran pagos.
- Hoy muestra cuotas vencidas y próximas de planes confirmados, compromisos y gestiones pendientes. Completar una gestión no registra un pago.
- El historial de la ficha conserva antes, después, autor, fecha y motivo para personas, lotes, cuentas, vencimientos, vínculos y movimientos.
- Los abonos de la versión anterior conservan sus datos y quedan pendientes de asignación a una cuenta. Administración puede vincularlos, con motivo, antes de programar cuotas y siempre fuera del corte histórico. El asistente no modifica vínculos reales ni confirma saldos por su cuenta.

## Datos pendientes de confirmar

TOTAL A COBRAR queda fuera de cálculos por instrucción del propietario. No se presenta como deuda cero ningún saldo desconocido. Los conceptos pueden tener cuotas propias; no se deduce de cada importe si es precio, saldo o pago. Las filas sin encabezados se conservan como anotaciones pendientes de clasificación. Los colores se muestran como referencia visual, sin adjudicar automáticamente estados legales o de pago. Las fórmulas usan su resultado guardado; no se recalculan. El original descargable permite comprobar formatos y contexto completos.

No hay recuperación de contraseña por correo todavía. Las nuevas versiones de Excel se incorporan desde Actualizar base mediante un paquete preparado, revisión previa y confirmación de Administración. Las correcciones actualizan las fichas confirmadas, con historial; el Excel original permanece inmutable. No hay una garantía de exactitud de información que ya estaba incompleta o desactualizada en el Excel.

## Desarrollo

Node.js 22.13 o superior. En PowerShell usar npm.cmd.

```sh
npm ci
npm run dev
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Los enlaces D1 y R2 están en `.openai/hosting.json`. El esquema está en `db/schema.ts`, con migraciones generadas por `npx drizzle-kit generate`. Las migraciones no incluyen datos privados. Los secretos de desarrollo van en `.dev.vars`, excluido de Git. SETUP_TOKEN solo habilita la creación inicial del administrador; esa operación se cierra de forma atómica después del primer uso.

## Organización

- `components/collections/secure-portal.tsx`: aplicación autenticada.
- `app/api/secure/[...path]/route.ts`: autorización, persistencia y archivos.
- `lib/source-data.ts`: organización conservando celdas de origen.
- `lib/security.ts`, `lib/server-store.ts`: contraseñas, sesiones y conexiones.
- `lib/concept-payments.ts`: validación de abonos por concepto.
- `db/`, `drizzle/`: esquema y migraciones, sin datos de clientes.
- Los componentes anteriores de demostración y `lib/demo` conservan solo ejemplos ficticios y no se montan en la página principal.

## Verificación y límites

Pruebas de flujo locales adicionales verifican identidad única, vínculos, edición concurrente, cuentas y cuotas, pagos idempotentes, sobrepagos, anulaciones, corrección de vencimientos, compromisos y permisos.

Pruebas unitarias de preservación de filas/celdas, coordenadas, campos vacíos, céntimos, fechas, contraseñas y origen de solicitudes. Pruebas de integración locales con D1/R2 verifican acceso anónimo denegado, roles, cambio de contraseña, revocación de sesiones, importación exacta, adjuntos, referencias duplicadas y abonos. También se ejecutan tipos, lint y compilación. No se ha realizado una prueba visual en navegador.

El archivo suministrado se concilia celda a celda antes de importarse. El informe de conciliación y la copia de trabajo permanecen en `private-data/`, excluidos del repositorio. No poner datos, documentos ni credenciales reales en código, migraciones o public/. El paquete publicado contiene código y recursos compilados, no el Excel ni su extracción.

Repositorio público del código: https://github.com/TheArian20/contratos. Los datos y documentos de clientes se almacenan por separado y requieren autenticación en la aplicación.

## Actualizaciones y casos especiales

Administración puede revisar y activar paquetes de actualización que contienen el Excel original y sus celdas verificadas. La activación mantiene las versiones anteriores y sus referencias, sin reemplazar personas, pagos, documentos ni saldos confirmados. La correspondencia automática exige filas idénticas únicas o DNI, nombre y contrato coincidentes y únicos dentro del proyecto. Ciudad de Dios y Hoja1 comparten proyecto para conservar referencias de traslados. Las coincidencias dudosas quedan sin vincular y la versión anterior sigue consultable. Una comprobación de versión evita aplicar dos actualizaciones simultáneas sobre el mismo origen; la activación y su auditoría se guardan juntas.

Hoja1 se muestra como Sin lote · Ciudad de Dios por definición del propietario. Se conserva la ubicación histórica. Denunciante, Sin lote vigente, No cobrar y Revisión de administración son etiquetas independientes basadas en texto explícito; los colores, ubicaciones vacías o una futura intención de denunciar no convierten a alguien en denunciante. Las alertas también aparecen en fichas y registro de pagos, sin alterar otros lotes de la misma persona. Los paquetes con datos reales permanecen fuera de Git y requieren una sesión de Administrador para importarse.

## Edición e historial privado

Administradores y gestores pueden corregir nombre, identificación, teléfono, dirección y datos de lotes existentes (ubicación, proyecto y contrato) en fichas confirmadas. Consulta no puede modificar. La confirmación de nuevas fichas/lotes, los vínculos de origen y los importes acordados siguen reservados a Administración. Cada corrección exige motivo y comprueba la versión del registro para evitar sobrescribir cambios concurrentes.

El historial de cambios solo se consulta como Administrador: se oculta la pestaña y la API no devuelve sus filas a Gestor ni Consulta. Cada nueva entrada guarda nombre, usuario e identificador estable de la cuenta tomados de la sesión del servidor, fecha, motivo y valores anterior/nuevo. Los registros anteriores conservan su autor original sin atribuirles una cuenta retrospectivamente. Las correcciones y sus entradas de historial se guardan juntas; los intentos rechazados por conflicto no crean cambios ficticios. La prueba de integración local valida edición por gestor, consulta sin escritura, historial privado y atribución del servidor incluso ante un autor enviado por el cliente.
