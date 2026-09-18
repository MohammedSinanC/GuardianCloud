import { Component, inject, input, output, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { filter } from 'rxjs/operators';

interface MenuItem {
  key: string;
  type: 'group' | 'child';
  label: string;
  icon: string;
  children?: MenuItem[];
}

const MENU_ROUTES: Record<string, string> = {
  DASHBOARD: '/adminapp/dashboard',
  LEADS: '/adminapp/leads',
  INQUIRY: '/adminapp/inquiries',
  SITEINSPECTION: '/adminapp/site-inspection',
  QUOTATION: '/adminapp/quotation',
  INVOICES: '/adminapp/invoices',
  ACCOUNT_LEDGER: '/adminapp/account-ledger',
  PAYMENT_SCHEDULE: '/adminapp/payment-schedule-report',
  WORK_ORDERS: '/adminapp/work-orders',
  RECEIPTS: '/adminapp/receipts',
  WORKFLOW: '/adminapp/workflow',
  CUSTOMERS: '/adminapp/customers',
  USERS: '/adminapp/users',
  ROLES: '/adminapp/roles',
  REPORTS: '/adminapp/reports',
  SETTINGS: '/adminapp/settings',
};

const MENU_ITEMS: MenuItem[] = [
  { key: 'DASHBOARD', type: 'child', label: 'Dashboard', icon: 'dashboard' },
  {
    key: 'PEST_CONTROL', type: 'group', label: 'Pest Control', icon: 'pest_control', children: [
      { key: 'LEADS', type: 'child', label: 'Leads', icon: 'leaderboard' },
      { key: 'INQUIRY', type: 'child', label: 'Inquiry', icon: 'bug_report' },
      { key: 'SITEINSPECTION', type: 'child', label: 'Site Inspection', icon: 'bug_report' },
      { key: 'QUOTATION', type: 'child', label: 'Quotation', icon: 'request_quote' },
      { key: 'WORK_ORDERS', type: 'child', label: 'Work Orders', icon: 'assignment' },
      { key: 'INVOICES', type: 'child', label: 'Invoices', icon: 'receipt_long' },
      { key: 'RECEIPTS', type: 'child', label: 'Receipts', icon: 'payments' },
      { key: 'ACCOUNT_LEDGER', type: 'child', label: 'Account Ledger', icon: 'account_balance' },
      { key: 'PAYMENT_SCHEDULE', type: 'child', label: 'Payment Schedule', icon: 'calendar_month' },
      { key: 'WORKFLOW', type: 'child', label: 'Workflow', icon: 'account_tree' },
    ],
  },
  {
    key: 'USER_MASTER', type: 'group', label: 'User Master', icon: 'people', children: [
      { key: 'CUSTOMERS', type: 'child', label: 'Customers', icon: 'business' },
      { key: 'USERS', type: 'child', label: 'Users', icon: 'person' },
      { key: 'ROLES', type: 'child', label: 'Roles', icon: 'admin_panel_settings' },
    ],
  },
  { key: 'REPORTS', type: 'child', label: 'Reports', icon: 'assessment' },
  { key: 'SETTINGS', type: 'child', label: 'Settings', icon: 'settings' },
];

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class AdminSidebarComponent implements OnInit, OnDestroy {
  private authService = inject(AdminAuthService);
  private router = inject(Router);

  collapsed = input<boolean>(false);
  mobileOpen = input<boolean>(false);
  closeSidebar = output<void>();

  admin = this.authService.getAdmin();

  menuItems = signal<MenuItem[]>([]);
  loading = signal(true);
  expandedGroups = new Set<string>();

  private routerSub: any;

  ngOnInit(): void {
    this.loadMenu();

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.autoExpandActiveGroup();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private autoExpandActiveGroup(): void {
    const activeGroup = this.menuItems().find(
      (g) =>
        g.type === 'group' &&
        (g.children || []).some((c) => {
          const r = MENU_ROUTES[c.key] || '';
          return !!r && this.router.url.startsWith(r);
        }),
    );
    if (activeGroup) this.expandedGroups.add(activeGroup.key);
  }

  loadMenu(): void {
    this.menuItems.set(MENU_ITEMS);
    this.loading.set(false);
    this.autoExpandActiveGroup();
  }

  reload(): void {
    this.loadMenu();
  }

  hasChildren(item: MenuItem): boolean {
    return (item.children?.length ?? 0) > 0;
  }

  toggleGroup(item: MenuItem): void {
    if (this.expandedGroups.has(item.key)) {
      this.expandedGroups.delete(item.key);
    } else {
      // Accordion: close other groups, open this one
      this.expandedGroups.clear();
      this.expandedGroups.add(item.key);
    }
  }

  isExpanded(item: MenuItem): boolean {
    return this.expandedGroups.has(item.key);
  }

  navigate(event: MouseEvent, route: string): void {
    event.preventDefault();
    if (!route) return;
    this.router.navigateByUrl(route);
    this.onClose();
  }

  isActive(route: string): boolean {
    return !!route && this.router.url.startsWith(route);
  }

  /** Route comes from the static frontend map, not the database */
  routeOf(item: MenuItem): string {
    return MENU_ROUTES[item.key] || '';
  }

  isGroupActive(item: MenuItem): boolean {
    return (item.children || []).some((c) => {
      const r = this.routeOf(c);
      return !!r && this.router.url.startsWith(r);
    });
  }

  getUserImage(): string {
    return this.admin?.profileImage || '';
  }

  getUserName(): string {
    return this.admin?.username || this.admin?.email || 'Admin';
  }

  getUserRole(): string {
    return this.admin?.role || 'Admin';
  }

  onLogout(): void {
    this.authService.logout();
  }

  onClose(): void {
    this.closeSidebar.emit();
  }
}
