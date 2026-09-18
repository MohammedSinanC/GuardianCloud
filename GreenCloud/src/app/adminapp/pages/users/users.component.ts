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

interface UserData {
  _id: string;
  username: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  companyId?: any;
  roleId?: any;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class AdminUsersComponent implements OnInit {
  private httpClient = inject(HttpClientService);
  private permissionService = inject(PermissionService);
  private toaster = inject(ToasterService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;
  loading = signal(true);
  users = signal<UserData[]>([]);
  roles = signal<any[]>([]);
  companies = signal<any[]>([]);

  // Dialog state
  showDialog = signal(false);
  isEditing = signal(false);
  saving = signal(false);
  dialogError = signal('');
  selectedUser: UserData | null = null;

  // Confirm dialog state
  showConfirmDialog = signal(false);
  confirming = signal(false);
  confirmUser: UserData | null = null;

  // Form fields
  formUsername = '';
  formName = '';
  formEmail = '';
  formMobile = '';
  formPassword = '';
  formRoleId = '';
  formCompanyId = '';
  formIsActive = true;
  formProfileImage = '';

  get isSuperAdmin(): boolean {
    return this.permissionService.isSuperAdmin();
  }

  canCreate(): boolean { return this.permissionService.hasPermission('usersPage', 'create'); }
  canEdit(): boolean { return this.permissionService.hasPermission('usersPage', 'edit'); }
  canDelete(): boolean { return this.permissionService.hasPermission('usersPage', 'delete'); }

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
    this.loadCompanies();
  }

  async loadUsers() {
    this.loading.set(true);
    try {
      const res: any = await firstValueFrom(this.httpClient.get('/users'));
      if (res.success) this.users.set(res.data || []);
    } catch { this.users.set([]); }
    finally { this.loading.set(false); }
  }

  async loadRoles() {
    try {
      const res: any = await firstValueFrom(this.httpClient.get('/roles'));
      if (res.success) this.roles.set(res.data || []);
    } catch { this.roles.set([]); }
  }

  async loadCompanies() {
    try {
      const res: any = await firstValueFrom(this.httpClient.get('/companies'));
      if (res.success) this.companies.set(res.data || []);
    } catch { this.companies.set([]); }
  }

  openAddDialog() {
    this.isEditing.set(false);
    this.selectedUser = null;
    this.formUsername = '';
    this.formName = '';
    this.formEmail = '';
    this.formMobile = '';
    this.formPassword = '';
    this.formRoleId = '';
    this.formCompanyId = '';
    this.formIsActive = true;
    this.formProfileImage = '';
    this.dialogError.set('');

    // Auto-assign company for company admins
    const user = this.permissionService.currentUser();
    if (user && user.companyId && !this.isSuperAdmin) {
      this.formCompanyId = user.companyId;
    }

    this.showDialog.set(true);
  }

  openEditDialog(user: UserData) {
    this.isEditing.set(true);
    this.selectedUser = user;
    this.formUsername = user.username;
    this.formName = user.name || '';
    this.formEmail = user.email || '';
    this.formMobile = user.mobile || '';
    this.formPassword = '';
    this.formRoleId = user.roleId?._id || user.roleId || '';
    this.formCompanyId = user.companyId?._id || user.companyId || '';
    this.formIsActive = user.isActive;
    this.formProfileImage = (user as any).profileImage || '';
    this.dialogError.set('');
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.selectedUser = null;
    this.dialogError.set('');
  }

  async saveUser() {
    if (!this.formUsername || !this.formName) {
      this.dialogError.set('Username and name are required');
      return;
    }
    if (!this.isEditing() && !this.formPassword) {
      this.dialogError.set('Password is required for new users');
      return;
    }

    this.saving.set(true);
    this.dialogError.set('');

    try {
      const body: any = {
        username: this.formUsername,
        name: this.formName,
        email: this.formEmail,
        mobile: this.formMobile,
        roleId: this.formRoleId || null,
        isActive: this.formIsActive,
      };

      if (this.isSuperAdmin && this.formCompanyId) {
        body.companyId = this.formCompanyId;
      }

      if (this.formProfileImage) {
        body.profileImage = this.formProfileImage;
      }

      if (this.isEditing()) {
        if (this.formPassword) body.password = this.formPassword;
        await firstValueFrom(this.httpClient.put(`/users/${this.selectedUser!._id}`, body, { toastAction: 'user.update' }));
      } else {
        body.password = this.formPassword;
        await firstValueFrom(this.httpClient.post('/users', body, { toastAction: 'user.create' }));
      }

      this.closeDialog();
      await this.loadUsers();
    } catch (err: any) {
      this.dialogError.set(err?.error?.message || 'Failed to save user');
    } finally {
      this.saving.set(false);
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
      this.dialogError.set('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.formProfileImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.formProfileImage = '';
  }

  openConfirmDialog(user: UserData) {
    this.confirmUser = user;
    this.showConfirmDialog.set(true);
  }

  closeConfirmDialog() {
    this.showConfirmDialog.set(false);
    this.confirmUser = null;
  }

  async confirmToggleActive() {
    if (!this.confirmUser) return;
    this.confirming.set(true);
    try {
      const action = this.confirmUser.isActive ? 'user.deactivate' : 'user.activate';
      await firstValueFrom(this.httpClient.put(`/users/${this.confirmUser._id}`, { isActive: !this.confirmUser.isActive }, { toastAction: action }));
      this.closeConfirmDialog();
      await this.loadUsers();
    } catch (err: any) {

    } finally {
      this.confirming.set(false);
    }
  }

  getRoleName(roleId: any): string {
    if (!roleId) return '-';
    if (typeof roleId === 'object' && roleId.name) return roleId.name;
    const role = this.roles().find(r => r._id === roleId);
    return role?.name || '-';
  }

  getCompanyName(companyId: any): string {
    if (!companyId) return '-';
    if (typeof companyId === 'object' && companyId.name) return companyId.name;
    const company = this.companies().find(c => c._id === companyId);
    return company?.name || '-';
  }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
}
