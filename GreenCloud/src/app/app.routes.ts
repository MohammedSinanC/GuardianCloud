import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'Al Waha Hygiene | Professional Hygiene & Facility Solutions UAE',
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./features/services/services.component').then(
        (m) => m.ServicesComponent,
      ),
    title: 'Our Services | Al Waha Hygiene UAE',
  },
  {
    path: 'services/:slug',
    loadComponent: () =>
      import('./features/services/service-detail.component').then(
        (m) => m.ServiceDetailComponent,
      ),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/about.component').then((m) => m.AboutComponent),
    title: 'About Us | Al Waha Hygiene UAE',
  },
  {
    path: 'branches',
    loadComponent: () =>
      import('./features/branches/branches.component').then(
        (m) => m.BranchesComponent,
      ),
    title: 'Our Branches | Al Waha Hygiene UAE',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component').then(
        (m) => m.ContactComponent,
      ),
    title: 'Contact Us | Al Waha Hygiene UAE',
  },
  {
    path: 'faq',
    loadComponent: () =>
      import('./features/faq/faq.component').then((m) => m.FaqComponent),
    title: 'FAQ | Al Waha Hygiene UAE',
  },
  // Admin App routes
  {
    path: 'adminapp',
    loadChildren: () =>
      import('./adminapp/adminapp.routes').then((m) => m.adminRoutes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
