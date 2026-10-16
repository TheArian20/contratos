# Respaldo y recuperación de Cartera

Administración puede descargar una copia desde **Respaldos y recuperación**. La copia contiene tablas de negocio, usuarios con hashes de contraseña, historial, todas las versiones registradas del Excel y los documentos referenciados. No incluye sesiones abiertas, intentos de acceso, credenciales del alojamiento ni el token de configuración.

Administración puede guardar una copia privada en el alojamiento, consultar su estado y descargarla. El sistema vuelve a leer los bloques guardados y comprueba sus hashes antes de marcarla completa. Los reintentos de una misma solicitud reutilizan la copia completada. No se eliminan automáticamente copias anteriores.

El respaldo diario requiere conectar la herramienta privada de Cartera, comprobar una ejecución y crear la tarea de Sites. Hasta registrar una programación real, la pantalla muestra que su activación está pendiente. La programación registrada es informativa: si se pausa o modifica la tarea en Sites, también debe actualizarse ese registro. Las herramientas de automatización requieren la identidad verificada del propietario; nunca una contraseña de la aplicación en el mensaje de la tarea.

Haz una copia antes de importar una base y después de jornadas con cambios importantes. Descarga también varias versiones a almacenamiento privado independiente: una copia dentro del mismo alojamiento no protege contra la pérdida de acceso al alojamiento. No subas las copias a GitHub. La comprobación SHA-256 detecta daños o archivos faltantes; no certifica quién creó la copia. Los bloqueos, estados y programación operativa de respaldos no se incluyen en las tablas exportadas.

En **Ayuda paso a paso**, cada rol encuentra instrucciones para sus tareas. Los formularios de personas, pagos, compromisos y cierre incluyen ayuda contextual.

## Comprobar y ensayar la recuperación

Requiere Python 3.10 o posterior, sin paquetes adicionales. Usa solamente copias de origen confiable.

```powershell
python scripts/restore_backup.py "C:\RespaldoPrivado\cartera-respaldo.tar"
python scripts/restore_backup.py "C:\RespaldoPrivado\cartera-respaldo.tar" --output "C:\RespaldoPrivado\ensayo-nuevo"
```

El primer comando verifica hashes, reconstruye las tablas en memoria y comprueba integridad y relaciones. El segundo crea una carpeta **que no debe existir**, con `cartera.sqlite`, `database.json`, `manifest.json` y `objects/` conservando las claves originales. No se conecta a la web ni modifica producción. Una copia con archivos faltantes o alterados se rechaza. Verifica los conteos devueltos y abre algunos documentos recuperados.

## Recuperar un sitio

La recuperación de producción requiere al responsable técnico y acceso al proyecto original de Sites. Conserva primero el estado actual, identifica la fecha que se necesita recuperar y prueba la copia en un entorno aislado con el mismo esquema de código. Importa las tablas de negocio y los objetos con sus claves y tipos MIME del manifiesto. Reconstruye las tablas operativas de sesiones e intentos desde las migraciones; las sesiones anteriores no se recuperan. Configura los secretos del alojamiento por separado.

Comprueba usuarios, permisos, expedientes, pagos, documentos y conteos antes de cambiar el sitio de uso diario. No pegues SQL del respaldo en producción ni sobrescribas la base sin ese ensayo y autorización específica. El botón de la web descarga y verifica; no realiza una restauración destructiva.

## Límites

La herramienta de la web admite hasta 512 MB por respaldo y 64 MB por objeto. Exporta las tablas en una lectura por lote y descarga únicamente los objetos referenciados por esa instantánea; si un objeto falta o cambia, la descarga falla. El manifiesto final acredita que la transferencia terminó. Para bases que superen esos límites se necesita exportación técnica del alojamiento. Los archivos R2 huérfanos o cargas que nunca se asociaron a un registro no forman parte de la copia.
