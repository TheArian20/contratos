import type { DemoUser } from '@/lib/collections';

// Credenciales públicas y deliberadamente ficticias; no son autenticación real.
export const demoUsers: DemoUser[] = [
  {
    id: 'demo-admin',
    name: 'Administrador',
    username: 'admin',
    password: 'demo123',
    role: 'Administrador',
    active: true,
  },
  {
    id: 'demo-laura',
    name: 'Laura Méndez',
    username: 'laura',
    password: 'demo123',
    role: 'Gestor de cobranza',
    active: true,
  },
  {
    id: 'demo-andres',
    name: 'Andrés Rojas',
    username: 'andres',
    password: 'demo123',
    role: 'Gestor de cobranza',
    active: true,
  },
  {
    id: 'demo-consulta',
    name: 'Consulta de cartera',
    username: 'consulta',
    password: 'demo123',
    role: 'Consulta',
    active: true,
  },
];
