import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'services',
    renderMode: RenderMode.Server,
  },
  {
    path: 'services/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'about',
    renderMode: RenderMode.Server,
  },
  {
    path: 'branches',
    renderMode: RenderMode.Server,
  },
  {
    path: 'contact',
    renderMode: RenderMode.Server,
  },
  {
    path: 'faq',
    renderMode: RenderMode.Server,
  },
  // Admin App routes (client-rendered for localStorage auth)
  {
    path: 'adminapp/login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'adminapp/dashboard',
    renderMode: RenderMode.Client,
  },
  // All admin child routes use browser-only localStorage authentication.
  // Keep refreshes on /adminapp/leads, /invoices, /account-ledger, etc. client-rendered.
  {
    path: 'adminapp/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'adminapp',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
