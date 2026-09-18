import { Routes } from '@angular/router';
import { adminAuthGuard } from './guards/admin-auth.guard';
import { adminLoginGuard } from './guards/admin-auth.guard';
import { permissionGuard } from './guards/permission.guard';

export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.AdminLoginComponent),
    canActivate: [adminLoginGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
    canActivate: [adminAuthGuard],
  },
  // ─── ERP: Lead → Customer → Inquiry → Quotation → Invoice → Ledger ───
  {
    path: 'leads',
    loadComponent: () =>
      import('./pages/lead/lead.component').then((m) => m.AdminLeadsComponent),
    canActivate: [adminAuthGuard, permissionGuard('leadsPage')],
  },
  {
    path: 'leads/:id',
    loadComponent: () =>
      import('./pages/leads/lead-detail.component').then((m) => m.AdminLeadDetailComponent),
    canActivate: [adminAuthGuard, permissionGuard('leadsPage')],
  },
  {
    path: 'customers',
    loadComponent: () =>
      import('./pages/customers/customer-list.component').then((m) => m.AdminCustomerListComponent),
    canActivate: [adminAuthGuard, permissionGuard('customersPage')],
  },
  {
    path: 'customers/:id',
    loadComponent: () =>
      import('./pages/customers/customer-detail.component').then((m) => m.AdminCustomerDetailComponent),
    canActivate: [adminAuthGuard, permissionGuard('customersPage')],
  },
  {
    path: 'invoices',
    loadComponent: () =>
      import('./pages/invoices/invoice-list.component').then((m) => m.AdminInvoiceListComponent),
    canActivate: [adminAuthGuard, permissionGuard('invoicesPage')],
  },
  {
    path: 'invoices/:id',
    loadComponent: () =>
      import('./pages/invoices/invoice-detail.component').then((m) => m.AdminInvoiceDetailComponent),
    canActivate: [adminAuthGuard, permissionGuard('invoicesPage')],
  },
  {
    path: 'account-ledger',
    loadComponent: () =>
      import('./pages/account-ledger/account-ledger.component').then(
        (m) => m.AdminAccountLedgerComponent,
      ),
    canActivate: [adminAuthGuard, permissionGuard('ledgerPage')],
  },
  // Inquiry Management
  {
    path: 'inquiries',
    loadComponent: () =>
      import('./pages/inquiries/inquiry-list.component').then(
        (m) => m.AdminInquiryListComponent,
      ),
    canActivate: [adminAuthGuard, permissionGuard('inquiryPage')],
  },
  {
    path: 'inquiries/create',
    loadComponent: () =>
      import('../features/customer/inquiry-create/inquiry-create.component').then(
        (m) => m.InquiryCreateComponent,
      ),
    canActivate: [adminAuthGuard, permissionGuard('inquiryPage')],
  },
  {
    path: 'inquiries/:id',
    loadComponent: () =>
      import('./pages/inquiry-detail/inquiry-detail.component').then(
        (m) => m.AdminInquiryDetailComponent,
      ),
    canActivate: [adminAuthGuard, permissionGuard('inquiryPage')],
  },
  {
    path: 'inquiry',
    redirectTo: 'inquiries',
    pathMatch: 'full',
  },
  // Dedicated workflow screens
  {
    path: 'site-inspection/:id',
    loadComponent: () => import('./pages/site-inspection/site-inspection-view.component').then((m) => m.SiteInspectionViewComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'site-inspection',
    loadComponent: () => import('./pages/site-inspection/site-inspection-list.component').then((m) => m.SiteInspectionListComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'quotation/:id',
    loadComponent: () => import('./pages/quotation/quotation-view.component').then((m) => m.QuotationViewComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'quotation',
    loadComponent: () => import('./pages/quotation/quotation-list.component').then((m) => m.QuotationListComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'work-orders/:id',
    loadComponent: () => import('./pages/work-order/work-order-view.component').then((m) => m.WorkOrderViewComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'work-orders',
    loadComponent: () => import('./pages/work-order/work-order-list.component').then((m) => m.WorkOrderListComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'receipts/:id',
    loadComponent: () => import('./pages/receipt/receipt-view.component').then((m) => m.ReceiptViewComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'receipts',
    loadComponent: () => import('./pages/receipt/receipt-list.component').then((m) => m.ReceiptListComponent),
    canActivate: [adminAuthGuard],
  },
  {
    path: 'inquiry-old',
    redirectTo: 'inquiries',
    pathMatch: 'full',
  },
  {
    path: 'siteinspection',
    redirectTo: 'site-inspection',
    pathMatch: 'full',
  },
  {
    path: 'quotation-old',
    redirectTo: 'quotation',
    pathMatch: 'full',
  },
  // Users
  {
    path: 'users',
    loadComponent: () =>
      import('./pages/users/users.component').then(
        (m) => m.AdminUsersComponent,
      ),
    canActivate: [adminAuthGuard, permissionGuard('usersPage')],
  },
  // Roles
  {
    path: 'roles',
    loadComponent: () =>
      import('./pages/roles/roles.component').then(
        (m) => m.AdminRolesComponent,
      ),
    canActivate: [adminAuthGuard, permissionGuard('rolesPage')],
  },
  // Workflow Diagram
  {
    path: 'workflow',
    loadComponent: () =>
      import('./pages/workflow/workflow.component').then(
        (m) => m.WorkflowComponent,
      ),
    canActivate: [adminAuthGuard],
  },
  // Reports
  {
    path: 'reports',
    loadComponent: () =>
      import('./pages/reports/reports.component').then(
        (m) => m.AdminReportsComponent,
      ),
    canActivate: [adminAuthGuard, permissionGuard('reportsPage')],
  },
  // Payment Schedule Report
  {
    path: 'payment-schedule-report',
    loadComponent: () =>
      import('./pages/payment-schedule-report/payment-schedule-report.component').then(
        (m) => m.PaymentScheduleReportComponent,
      ),
    canActivate: [adminAuthGuard, permissionGuard('reportsPage')],
  },
  // Settings
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.component').then(
        (m) => m.AdminSettingsComponent,
      ),
    canActivate: [adminAuthGuard, permissionGuard('settingsPage')],
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
