# Cartera

Interfaz en español para organizar contratos extrajudiciales y dar seguimiento a cobranzas.

## Estado del proyecto

**Demostración interactiva con datos ficticios**, publicada con acceso público por solicitud del propietario.

- Resumen con totales, recuperación de cartera y accesos por estado.
- Búsqueda, creación y edición de contratos; asignación a responsables.
- Vista Lotes con valor total, pagado y saldo por registro. Una persona puede tener varios lotes con pagos independientes; pulsar su nombre filtra todos sus registros por identificación exacta y muestra los totales. Cada lote se registra en una ficha separada; la referencia del lote es opcional hasta recibir los datos reales.
- Registro de abonos con historial, validación de saldo y cierre al completar el pago.
- Gestiones de cobranza vinculadas a cada contrato.
- Documentos por persona y contrato: categorías Contrato, Cobranza y Otro documento. Adjuntar, abrir, descargar y quitar PDF, JPG, PNG o WebP; hasta 10 MB por archivo y 50 MB en la sesión.
- Creación y edición de usuarios de prueba, activación y desactivación, inicio y cierre de sesión. El administrador administra la cartera; los gestores trabajan sobre contratos asignados; Consulta es solo lectura.

Todo vive en memoria en la pestaña actual y se pierde al recargar o cerrar. Los documentos usan URLs de objetos locales; no se envían al servidor, no son compartidos con otros visitantes y se liberan al quitarlos o abandonar la página. No se utiliza almacenamiento persistente ni localStorage.

**El acceso y los roles son simulaciones en el navegador, no una barrera de seguridad.** Las credenciales de ejemplo son intencionalmente públicas: `admin`, `laura`, `andres` y `consulta`, con contraseña `demo123`. La aplicación abre inicialmente como administrador para facilitar la prueba; para probar el acceso, abrir el perfil y cerrar sesión. Los usuarios creados funcionan hasta recargar. No ingresar datos personales ni contraseñas reales.

No implementa autenticación o autorización de servidor, almacenamiento permanente ni importación de Excel. Los valores de ejemplo están expresados en pesos colombianos (COP); confirmar la moneda antes de integrar información real.

## Desarrollo

Requiere Node.js 22.13 o superior y npm.

```sh
npm ci
npm run dev
```

En PowerShell con ejecución de scripts restringida, usar `npm.cmd` en lugar de `npm`.

```sh
npm run build
npm run lint
npm test
npx tsc --noEmit
```

## Organización

- `app/`: página, metadatos y estilos compartidos.
- `components/collections/`: interfaz de contratos y cobranzas.
- `components/ui/`: componentes de interfaz provistos por el proyecto base.
- `lib/collections.ts`: tipos, formato de importes y búsqueda.
- `lib/attachments.ts`: validación de tipos y tamaños de documentos.
- `lib/demo/`: registros ficticios, separados de la lógica.
- `hooks/`: comportamiento compartido e integración opcional del navegador.
- `hooks/use-demo-workspace.ts`: estado temporal, acciones y reglas de la demostración.
- `tests/`: pruebas de saldos, fechas, búsquedas, acceso simulado y documentos.
- `public/`: recursos públicos sin datos de clientes.
- `.openai/hosting.json`: identificador y configuración de publicación, sin secretos.

## Preparación para GitHub

El archivo `.gitignore` excluye dependencias, compilaciones, archivos de entorno, registros de ejecución y carpetas de datos privados. El archivo de bloqueo de npm se conserva para instalaciones reproducibles. No guardar contratos escaneados, bases de datos, documentos de clientes ni contraseñas en el repositorio o en `public/`.

No hay un repositorio de GitHub vinculado todavía. Su propietario, nombre y visibilidad deben definirse antes de subir el proyecto.

## Próximas etapas

1. Ajustar los campos a las columnas del Excel real.
2. Implementar autenticación y autorización en servidor para cada rol.
3. Conectar almacenamiento persistente para contratos y pagos.
4. Incorporar importación de Excel y documentos privados.

La integración opcional WebMCP expone `show_contract_search` en navegadores compatibles. Debe comprobarse en un navegador con soporte antes de considerarse validada.

## Verificación

Las pruebas automatizadas cubren pagos parciales y totales, rechazo de sobrepagos y duplicados, fechas inválidas, consistencia de los contratos, búsquedas, inicio de sesión simulado, usuarios inactivos, conservación de administradores, contratos asignados y límites de documentos. También verifican que varios lotes de una persona mantengan saldos independientes, que los totales coincidan y que identificaciones parecidas no se mezclen. Se ejecutan además compilación, revisión de tipos y lint del código propio; los componentes provistos en `components/ui` y `hooks/use-mobile.ts` se mantienen separados de ese lint.

No hubo un navegador automatizable disponible en la sesión de desarrollo; las interacciones visuales y WebMCP no se han verificado en navegador.

## Revisión local de Excel

La sección Revisar Excel abre archivos .xlsx de hasta 15 MB en memoria del navegador. Permite seleccionar hoja, buscar cualquier valor, paginar y consultar las celdas de una fila con sus coordenadas originales. Al abandonar la sección o recargar se descartan los datos. No hay carga al servidor ni persistencia; no se modifica el archivo original.

Los encabezados de personas, DNI y ubicación se reconocen cuando existen. Las hojas no reconocidas permanecen consultables como filas originales. No se fusionan personas, contratos ni hojas. No se calculan saldos ni se importan filas a la cartera: TOTAL A COBRAR queda pendiente de definición. Los importes conservan su significado de origen; colores, formatos de presentación y estados requieren consulta del Excel. Las fórmulas usan resultados guardados, sin recalcular, y las rutas a PDF son solo texto.

Los archivos de clientes y las extracciones locales están excluidos de Git y del despliegue mediante private-data/ y work/. Nunca agregar datos reales a lib/demo ni public/. Pruebas automáticas cubren coordenadas, filas sin estructura, identificadores con ceros, valores vacíos y lotes distintos. No se ha realizado una prueba visual en navegador.
