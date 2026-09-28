'use client';

import { useState } from 'react';
import { Eye, EyeOff, LogOut, Pencil, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type DemoUser,
  type UserRole,
  roles,
  textField,
} from '@/lib/collections';
import { Brand, Choice, errorMessage, initials } from './shared';

export function LoginScreen({
  onLogin,
}: {
  onLogin: (username: string, password: string) => void;
}) {
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  return (
    <main className="login-page">
      <section className="login-card">
        <Brand />
        <h1>Ingresa a tu espacio</h1>
        <p>Acceso de demostración · Sin cuentas reales</p>
        <form
          className="contract-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            try {
              const password = form.get('password');
              onLogin(
                textField(form, 'username'),
                typeof password === 'string' ? password : '',
              );
            } catch (error) {
              setError(errorMessage(error));
            }
          }}
        >
          <label htmlFor="login-username">
            Usuario
            <Input
              id="login-username"
              name="username"
              autoComplete="off"
              required
            />
          </label>
          <label htmlFor="login-password">Contraseña de prueba</label>
          <div className="password-field">
            <Input
              id="login-password"
              name="password"
              type={visible ? 'text' : 'password'}
              autoComplete="off"
              required
            />
            <button
              type="button"
              className="row-open"
              onClick={() => setVisible((value) => !value)}
              aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="primary-button" type="submit">
            Ingresar a la demostración
          </button>
        </form>
        <div className="demo-credentials">
          <strong>Cuentas para probar</strong>
          <p>
            <code>admin</code> · Administrador
            <br />
            <code>laura</code> / <code>andres</code> · Gestores
            <br />
            <code>consulta</code> · Solo lectura
          </p>
          <p>
            Contraseña de todas: <code>demo123</code>
          </p>
          <small>
            Los usuarios creados o editados en esta sesión conservan los cambios
            hasta recargar. No uses contraseñas reales.
          </small>
        </div>
      </section>
    </main>
  );
}

export function AccountDialog({
  user,
  onClose,
  onLogout,
}: {
  user: DemoUser;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="access-dialog">
        <DialogHeader>
          <DialogTitle>Tu sesión de prueba</DialogTitle>
          <DialogDescription>
            El acceso y los roles son simulados en esta demostración pública.
          </DialogDescription>
        </DialogHeader>
        <span className="avatar">{initials(user.name)}</span>
        <dl className="detail-list">
          <div>
            <dt>Nombre</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Usuario</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>
        <button className="primary-button" onClick={onLogout}>
          <LogOut size={17} /> Cerrar sesión
        </button>
        <button className="secondary-button" onClick={onClose}>
          Volver al sistema
        </button>
      </DialogContent>
    </Dialog>
  );
}

export function UsersPanel({
  users,
  currentUser,
  onSave,
  onToggle,
  onAccount,
}: {
  users: DemoUser[];
  currentUser: DemoUser;
  onSave: (user: DemoUser) => void;
  onToggle: (user: DemoUser) => void;
  onAccount: () => void;
}) {
  const [editor, setEditor] = useState<DemoUser | 'new' | null>(null);
  const [error, setError] = useState('');
  if (currentUser.role !== 'Administrador')
    return (
      <section className="panel permission-panel">
        <h2>Tu cuenta</h2>
        <p>
          {currentUser.name} · {currentUser.role}
        </p>
        <p>
          La administración del equipo está disponible para el administrador de
          la demostración.
        </p>
        <button className="secondary-button" onClick={onAccount}>
          Ver mi sesión
        </button>
      </section>
    );
  return (
    <section className="panel users-panel">
      <div className="panel-heading">
        <div>
          <h2>Usuarios de la demostración</h2>
          <p>Crea usuarios de prueba y comprueba sus permisos.</p>
        </div>
        <button className="primary-button" onClick={() => setEditor('new')}>
          <Plus size={17} /> Nuevo usuario
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error panel-message">
          {error}
        </p>
      )}
      <Table className="contract-table user-table">
        <TableHeader>
          <TableRow>
            <TableHead>PERSONA</TableHead>
            <TableHead>USUARIO</TableHead>
            <TableHead>ROL</TableHead>
            <TableHead>ACCESO</TableHead>
            <TableHead>ACCIÓN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="client-cell">
                  <span className="avatar">{initials(user.name)}</span>
                  {user.name}
                </div>
              </TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>
                {user.id === currentUser.id ? (
                  <span className="role-label">Tu sesión</span>
                ) : (
                  <div className="switch-label">
                    <Switch
                      checked={user.active}
                      aria-label={`${user.active ? 'Desactivar' : 'Activar'} a ${user.name}`}
                      onCheckedChange={() => {
                        try {
                          onToggle(user);
                          setError('');
                        } catch (error) {
                          setError(errorMessage(error));
                        }
                      }}
                    />
                    <span>{user.active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <button
                  className="secondary-button"
                  onClick={() => setEditor(user)}
                >
                  <Pencil size={15} /> Editar
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="role-grid">
        {[
          {
            title: 'Administrador',
            text: 'Gestiona contratos, pagos, archivos y usuarios.',
          },
          {
            title: 'Gestor de cobranza',
            text: 'Consulta sus contratos asignados; registra pagos, archivos y gestiones.',
          },
          {
            title: 'Consulta',
            text: 'Puede buscar y revisar la cartera, sin modificar registros.',
          },
        ].map((role) => (
          <article className="role-card" key={role.title}>
            <h3>{role.title}</h3>
            <p>{role.text}</p>
          </article>
        ))}
      </div>
      <p className="panel-message">
        Usuarios temporales: no se guardan en un servidor. Usa nombres y
        contraseñas de prueba.
      </p>
      {editor && (
        <UserForm
          key={editor === 'new' ? 'new' : editor.id}
          user={editor === 'new' ? undefined : editor}
          currentId={currentUser.id}
          onSave={onSave}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}

function UserForm({
  user,
  currentId,
  onSave,
  onClose,
}: {
  user?: DemoUser;
  currentId: string;
  onSave: (user: DemoUser) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState<UserRole>(
    user?.role ?? 'Gestor de cobranza',
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
            {user ? 'Editar usuario de prueba' : 'Nuevo usuario de prueba'}
          </DialogTitle>
          <DialogDescription>
            Esta cuenta funciona únicamente en la sesión actual.
          </DialogDescription>
        </DialogHeader>
        <form
          className="contract-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const password = form.get('password');
            try {
              onSave({
                id: user?.id ?? crypto.randomUUID(),
                name: textField(form, 'name'),
                username: textField(form, 'username'),
                password:
                  typeof password === 'string' && password.length
                    ? password
                    : (user?.password ?? ''),
                role,
                active: user?.active ?? true,
              });
              onClose();
            } catch (error) {
              setError(errorMessage(error));
            }
          }}
        >
          <label htmlFor="user-name">
            Nombre
            <Input
              id="user-name"
              name="name"
              defaultValue={user?.name}
              required
              maxLength={80}
            />
          </label>
          <label htmlFor="user-username">
            Usuario
            <Input
              id="user-username"
              name="username"
              defaultValue={user?.username}
              autoComplete="off"
              required
              pattern="[a-zA-Z0-9._\-]{3,30}"
              maxLength={30}
            />
          </label>
          <label htmlFor="user-password">
            {user
              ? 'Nueva contraseña de prueba (opcional)'
              : 'Contraseña de prueba'}
            <Input
              id="user-password"
              name="password"
              type="password"
              autoComplete="off"
              required={!user}
              minLength={6}
              maxLength={80}
            />
          </label>
          {user?.id === currentId ? (
            <p>Rol: Administrador. Usa otra cuenta para probar otros roles.</p>
          ) : (
            <div className="form-field">
              <span>Rol</span>
              <Choice
                label="Rol del usuario"
                value={role}
                options={roles}
                onChange={(value) => setRole(value as UserRole)}
              />
            </div>
          )}
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
              Guardar usuario
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
