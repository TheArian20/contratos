# Respaldo y recuperación de Cartera

Administración puede descargar una copia desde **Respaldos y recuperación**. La copia contiene tablas de negocio, usuarios con hashes de contraseña, historial, todas las versiones registradas del Excel y los documentos referenciados. No incluye sesiones abiertas, intentos de acceso, credenciales del alojamiento ni el token de configuración.

Las copias son manuales. Haz una antes de importar una base y después de jornadas con cambios importantes. Guarda varias versiones en almacenamiento privado y comprueba que la descarga terminó. No subas las copias a GitHub. La comprobación SHA-256 detecta daños o archivos faltantes; no certifica quién creó la copia.

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
