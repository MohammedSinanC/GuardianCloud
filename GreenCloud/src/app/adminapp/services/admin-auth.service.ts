import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';
import { PermissionService } from '../../core/services/permission.service';

export interface AdminLoginPayload {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  admin?: {
    id: string;
    username: string;
    name?: string;
    email?: string;
    profileImage?: string;
    role: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private httpClient = inject(HttpClientService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private permissionService = inject(PermissionService);

  private readonly TOKEN_KEY = 'admin_token';
  private readonly ADMIN_KEY = 'admin_data';

  readonly isLoggedIn = signal<boolean>(this.checkAuth());

  /** Login */
  async login(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpClient.post<AdminLoginResponse>('/admin/login', { username, password }),
      );

      if (response.success && response.token) {
        this.setToken(response.token);
        if (response.admin) {
          this.setAdmin(response.admin);
        }
        this.isLoggedIn.set(true);

        // Load permissions after successful login
        await this.permissionService.loadPermissionsFromApi();

        return { success: true, message: response.message };
      }

      return { success: false, message: response.message || 'Login failed' };
    } catch (err: any) {
      const message = err?.error?.message || 'Invalid username or password';
      return { success: false, message };
    }
  }

  /** Logout */
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.ADMIN_KEY);
    }
    this.permissionService.clear();
    this.isLoggedIn.set(false);
    this.router.navigate(['/adminapp/login']);
  }

  /** Check if authenticated */
  isAuthenticated(): boolean {
    return this.checkAuth();
  }

  /** Get stored token */
  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** Get stored admin data */
  getAdmin(): { id: string; username: string; name?: string; email?: string; profileImage?: string; role: string } | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const data = localStorage.getItem(this.ADMIN_KEY);
    return data ? JSON.parse(data) : null;
  }

  /** Navigate to dashboard */
  redirectToDashboard(): void {
    this.router.navigate(['/adminapp/dashboard']);
  }

  /** Navigate to login */
  redirectToLogin(): void {
    this.router.navigate(['/adminapp/login']);
  }

  private checkAuth(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private setToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  private setAdmin(admin: { id: string; username: string; name?: string; email?: string; profileImage?: string; role: string }): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.ADMIN_KEY, JSON.stringify(admin));
    }
  }
}
