# Cartera

Interfaz en español para organizar contratos extrajudiciales y dar seguimiento a cobranzas.

## Estado del proyecto

Primera etapa: **prototipo de interfaz con datos ficticios**. Permite buscar por cliente, identificación o contrato, filtrar por estado, consultar una ficha y agregar contratos temporales. Incluye una propuesta de roles y una pantalla de acceso de muestra.

No implementa autenticación, permisos, almacenamiento permanente, importación de Excel ni carga de documentos. Los cambios se reinician al recargar. No ingresar datos reales ni credenciales. Los valores de ejemplo están expresados en pesos colombianos (COP); se debe confirmar la moneda antes de integrar información real.

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
npx tsc --noEmit
```

## Organización

- `app/`: página, metadatos y estilos compartidos.
- `components/collections/`: interfaz de contratos y cobranzas.
- `components/ui/`: componentes de interfaz provistos por el proyecto base.
- `lib/collections.ts`: tipos, formato de importes y búsqueda.
- `lib/demo/`: registros ficticios, separados de la lógica.
- `hooks/`: comportamiento compartido e integración opcional del navegador.
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
