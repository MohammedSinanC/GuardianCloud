import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClientService } from './http-client.service';
import { firstValueFrom } from 'rxjs';

export interface UserPermissions {
  [page: string]: {
    visible: boolean;
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  mobile: string;
  profileImage: string;
  companyId: string;
  companyName: string;
  roleId: string;
  roleName: string;
  role: string;
}

export interface AuthMeResponse {
  success: boolean;
  data: {
    user: UserInfo;
    permissions: UserPermissions;
  };
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private httpClient = inject(HttpClientService);
  private platformId = inject(PLATFORM_ID);

  private readonly USER_KEY = 'admin_user';
  private readonly PERMS_KEY = 'admin_permissions';

  currentUser = signal<UserInfo | null>(this.loadUser());
  permissions = signal<UserPermissions>(this.loadPermissions());

  /** Check if current user has a specific permission */
  hasPermission(page: string, action: 'visible' | 'view' | 'create' | 'edit' | 'delete'): boolean {
    const user = this.currentUser();
    if (!user) return false;

    // Super admins have all permissions
    if (user.role === 'superadmin') return true;

    const pagePerms = this.permissions()[page];
    if (!pagePerms) return false;
    return pagePerms[action] === true;
  }

  /** Check if user is super admin */
  isSuperAdmin(): boolean {
    return this.currentUser()?.role === 'superadmin';
  }

  /** Get visible menu items based on permissions */
  getVisibleMenuItems(): string[] {
    const visible: string[] = [];
    const perms = this.permissions();
    Object.keys(perms).forEach(page => {
      if (perms[page].visible) {
        visible.push(page);
      }
    });
    return visible;
  }

  /** Fetch user info + permissions from /api/auth/me */
  async loadPermissionsFromApi(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const response = await firstValueFrom(
        this.httpClient.get<AuthMeResponse>('/auth/me')
      );

      if (response.success) {
        this.setUser(response.data.user);
        this.setPermissions(response.data.permissions);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  }

  /** Set user data */
  setUser(user: UserInfo): void {
    this.currentUser.set(user);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /** Set permissions */
  setPermissions(perms: UserPermissions): void {
    this.permissions.set(perms);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.PERMS_KEY, JSON.stringify(perms));
    }
  }

  /** Clear all auth data */
  clear(): void {
    this.currentUser.set(null);
    this.permissions.set({});
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.PERMS_KEY);
    }
  }

  private loadUser(): UserInfo | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private loadPermissions(): UserPermissions {
    if (!isPlatformBrowser(this.platformId)) return {};
    try {
      const data = localStorage.getItem(this.PERMS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }
}
