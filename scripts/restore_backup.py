"""Verify and restore a Cartera backup to a NEW local directory. Never touches production."""
import argparse
from contextlib import closing
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sqlite3
import tarfile

TABLES = {'users', 'settings', 'datasets', 'documents', 'entries', 'audit', 'people', 'person_sources', 'lots', 'accounts', 'payments', 'installments', 'tasks', 'changes'}

def restore(archive, target=None):
    if target is not None and Path(target).resolve().exists():
        raise ValueError('La carpeta de destino debe ser nueva; no se sobrescriben archivos.')
    with tarfile.open(archive, 'r:') as tar:
        members = tar.getmembers()
        names = [m.name for m in members]
        if len(names) != len(set(names)) or any(not m.isfile() or not re.fullmatch(r'(database\.json|manifest\.json|objects/\d+\.bin)', m.name) for m in members):
            raise ValueError('El archivo contiene rutas o entradas no permitidas.')
        manifest = json.load(tar.extractfile('manifest.json'))
        if manifest.get('format') != 'cartera-backup' or manifest.get('version') != 1:
            raise ValueError('Formato no compatible.')
        expected = manifest['files']
        if len(expected) != len(set(f['path'] for f in expected)) or set(names) != {f['path'] for f in expected} | {'manifest.json'}:
            raise ValueError('Faltan archivos o hay entradas adicionales.')
        for item in expected:
            digest, size = hashlib.sha256(), 0
            with tar.extractfile(item['path']) as stream:
                while chunk := stream.read(1024 * 1024):
                    digest.update(chunk)
                    size += len(chunk)
            if size != item['size'] or digest.hexdigest() != item['sha256']:
                raise ValueError('Archivo dañado: ' + item['path'])
            if 'key' in item:
                key = PurePosixPath(item['key'])
                if key.is_absolute() or '..' in key.parts or not re.fullmatch(r'[A-Za-z0-9/._-]+', item['key']):
                    raise ValueError('Ruta de documento inválida.')
        dbdata = json.load(tar.extractfile('database.json'))
        if dbdata.get('format') != 'cartera-database' or dbdata.get('version') != 1 or set(dbdata['tables']) != TABLES:
            raise ValueError('Esquema de base de datos no compatible.')
        if any(manifest['counts'].get(t) != len(rows) for t, rows in dbdata['tables'].items()):
            raise ValueError('Los conteos no coinciden.')
        object_keys = [f['key'] for f in expected if 'key' in f]
        required_keys = {r['object_key'] for r in dbdata['tables']['documents']}
        for row in dbdata['tables']['datasets']:
            required_keys.update((row['object_key'], 'original/' + row['id'] + '.xlsx'))
        if len(object_keys) != len(set(object_keys)) or set(object_keys) != required_keys:
            raise ValueError('Los archivos no corresponden a los registros de la base.')
        # Build in memory first, so an invalid backup never creates the destination.
        conn = sqlite3.connect(':memory:')
        conn.enable_load_extension(False)
        def authorize(action, arg1, arg2, db, origin):
            if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH, sqlite3.SQLITE_CREATE_VTABLE, sqlite3.SQLITE_CREATE_TRIGGER):
                return sqlite3.SQLITE_DENY
            if action == sqlite3.SQLITE_FUNCTION and arg2 not in ('length', 'typeof'):
                return sqlite3.SQLITE_DENY
            return sqlite3.SQLITE_OK
        conn.set_authorizer(authorize)
        for entry in sorted(dbdata['schema'], key=lambda e: e['type'] != 'table'):
            if entry['tbl_name'] not in TABLES or entry['type'] not in ('table', 'index') or not re.match(r'^CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)\s', entry['sql'], re.I):
                raise ValueError('Definición SQL no permitida.')
            conn.execute(entry['sql'])
        for table, rows in dbdata['tables'].items():
            columns = {r[1] for r in conn.execute(f'PRAGMA table_info("{table}")')}
            for row in rows:
                if not set(row).issubset(columns):
                    raise ValueError('Columnas no reconocidas.')
                keys = list(row)
                quoted = ','.join('"' + k.replace('"', '""') + '"' for k in keys)
                conn.execute(f'INSERT INTO "{table}" ({quoted}) VALUES ({",".join("?" for _ in keys)})', [row[k] for k in keys])
        conn.commit()
        conn.set_authorizer(None)
        if conn.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or conn.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('La base restaurada no pasa la comprobación de integridad.')
        if target is not None:
            destination = Path(target).resolve()
            if destination.exists():
                raise ValueError('La carpeta de destino debe ser nueva; no se sobrescriben archivos.')
            destination.mkdir(parents=True, exist_ok=False)
            with closing(sqlite3.connect(destination / 'cartera.sqlite')) as output:
                conn.backup(output)
            for item in expected:
                if 'key' not in item:
                    continue
                path = destination / 'objects' / item['key']
                path.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(item['path']) as source, path.open('xb') as output:
                    while chunk := source.read(1024 * 1024):
                        output.write(chunk)
            (destination / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
            (destination / 'database.json').write_text(json.dumps(dbdata, ensure_ascii=False), encoding='utf-8')
        conn.close()
        return {'verified_files': len(expected), 'counts': manifest['counts'], 'restored': target is not None}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive')
    parser.add_argument('--output', help='New private folder; omit for validation and in-memory recovery only.')
    args = parser.parse_args()
    try:
        print(json.dumps(restore(args.archive, args.output), ensure_ascii=False))
    except (ValueError, KeyError, OSError, sqlite3.Error, tarfile.TarError) as error:
        parser.exit(1, 'No se completó la recuperación: ' + str(error) + '\n')
