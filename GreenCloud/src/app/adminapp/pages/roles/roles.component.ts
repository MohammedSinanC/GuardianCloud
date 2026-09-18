import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
import { HttpClientService } from '../../../core/services/http-client.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToasterService } from '../../../core/services/toaster.service';
import { ConfirmService } from '../../../core/services/confirm.service';

interface RoleData {
  _id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: any;
  isActive: boolean;
  createdAt: string;
}

interface PagePermission {
  visible: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

const ALL_PAGES = [
  { key: 'dashboardPage', label: 'Dashboard', hasCrud: false },
  { key: 'leadsPage', label: 'Leads', hasCrud: true },
  { key: 'customersPage', label: 'Customers', hasCrud: true },
  { key: 'inquiryPage', label: 'Inquiries', hasCrud: true },
  { key: 'quotationsPage', label: 'Quotations', hasCrud: true },
  { key: 'invoicesPage', label: 'Invoices', hasCrud: true },
  { key: 'ledgerPage', label: 'Account Ledger', hasCrud: false },
  { key: 'usersPage', label: 'Users', hasCrud: true },
  { key: 'rolesPage', label: 'Roles', hasCrud: true },
  { key: 'companiesPage', label: 'Companies', hasCrud: true },
  { key: 'reportsPage', label: 'Reports', hasCrud: true },
  { key: 'settingsPage', label: 'Settings', hasCrud: false },
];

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css',
})
export class AdminRolesComponent implements OnInit {
  private httpClient = inject(HttpClientService);
  private permissionService = inject(PermissionService);
  private toaster = inject(ToasterService);
  private confirmService = inject(ConfirmService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;
  loading = signal(true);
  roles = signal<RoleData[]>([]);

  // Dialog state
  showDialog = signal(false);
  isEditing = signal(false);
  saving = signal(false);
  dialogError = signal('');
  selectedRole: RoleData | null = null;

  // Permission matrix
  allPages = ALL_PAGES;
  // Note: allPages is a plain array, not a signal — @for iterates directly
  matrix: Record<string, PagePermission> = {};

  // Form
  formName = '';
  formDescription = '';

  get isSuperAdmin(): boolean {
    return this.permissionService.isSuperAdmin();
  }

  canCreate(): boolean { return this.permissionService.hasPermission('rolesPage', 'create'); }
  canEdit(): boolean { return this.permissionService.hasPermission('rolesPage', 'edit'); }
  canDelete(): boolean { return this.permissionService.hasPermission('rolesPage', 'delete'); }

  ngOnInit() {
    this.loadRoles();
  }

  async loadRoles() {
    this.loading.set(true);
    try {
      const res: any = await firstValueFrom(this.httpClient.get('/roles'));
      if (res.success) this.roles.set(res.data || []);
    } catch { this.roles.set([]); }
    finally { this.loading.set(false); }
  }

  initMatrix(permissions: any = {}) {
    this.matrix = {};
    ALL_PAGES.forEach(p => {
      const existing = permissions[p.key];
      this.matrix[p.key] = {
        visible: existing?.visible ?? false,
        view: existing?.view ?? false,
        create: existing?.create ?? false,
        edit: existing?.edit ?? false,
        delete: existing?.delete ?? false,
      };
    });
  }

  openAddDialog() {
    this.isEditing.set(false);
    this.selectedRole = null;
    this.formName = '';
    this.formDescription = '';
    this.dialogError.set('');
    this.initMatrix();
    this.showDialog.set(true);
  }

  openEditDialog(role: RoleData) {
    this.isEditing.set(true);
    this.selectedRole = role;
    this.formName = role.name;
    this.formDescription = role.description || '';
    this.dialogError.set('');
    this.initMatrix(role.permissions || {});
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.selectedRole = null;
    this.dialogError.set('');
  }

  // Permission matrix helpers
  togglePageVisible(pageKey: string) {
    const page = this.matrix[pageKey];
    page.visible = !page.visible;
    if (!page.visible) {
      page.view = false;
      page.create = false;
      page.edit = false;
      page.delete = false;
    }
  }

  togglePermission(pageKey: string, action: keyof PagePermission) {
    const page = this.matrix[pageKey];
    if (action === 'visible') {
      this.togglePageVisible(pageKey);
      return;
    }
    if (!page.visible) return;
    if (action === 'view') {
      page.view = !page.view;
      if (!page.view) {
        page.create = false;
        page.edit = false;
        page.delete = false;
      }
    } else {
      if (!page.view) return;
      page[action] = !page[action];
    }
  }

  toggleAllForPage(pageKey: string) {
    const page = this.matrix[pageKey];
    const allChecked = page.view && page.create && page.edit && page.delete;
    page.visible = true;
    page.view = !allChecked;
    page.create = !allChecked;
    page.edit = !allChecked;
    page.delete = !allChecked;
  }

  async saveRole() {
    if (!this.formName) {
      this.dialogError.set('Role name is required');
      return;
    }

    this.saving.set(true);
    this.dialogError.set('');

    try {
      const body: any = {
        name: this.formName,
        description: this.formDescription,
        permissions: this.matrix,
      };

      if (this.isEditing()) {
        await firstValueFrom(this.httpClient.put(`/roles/${this.selectedRole!._id}`, body, { toastAction: 'role.update' }));
      } else {
        await firstValueFrom(this.httpClient.post('/roles', body, { toastAction: 'role.create' }));
      }

      this.closeDialog();
      await this.loadRoles();
    } catch (err: any) {
      this.dialogError.set(err?.error?.message || 'Failed to save role');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteRole(role: RoleData) {
    if (role.isSystem) {
      this.toaster.warning('Cannot delete system role');
      return;
    }
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Role',
      message: `Are you sure you want to delete "${role.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.httpClient.delete(`/roles/${role._id}`, { toastAction: 'role.delete' }));
      await this.loadRoles();
    } catch { }
  }

  countPermissions(perms: any): number {
    if (!perms) return 0;
    let count = 0;
    const values = perms instanceof Map ? Object.fromEntries(perms) : perms;
    Object.values(values).forEach((p: any) => {
      if (p?.visible) count++;
      if (p?.view) count++;
      if (p?.create) count++;
      if (p?.edit) count++;
      if (p?.delete) count++;
    });
    return count;
  }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
}
