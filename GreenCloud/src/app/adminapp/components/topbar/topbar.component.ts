import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class AdminTopbarComponent {
  private authService = inject(AdminAuthService);

  toggleSidebar = output<void>();

  onToggle(): void {
    this.toggleSidebar.emit();
  }

  getUserImage(): string {
    return this.authService.getAdmin()?.profileImage || '';
  }

  getUserName(): string {
    const admin = this.authService.getAdmin();
    return admin?.name || admin?.username || admin?.email || 'Admin';
  }

  getUserRole(): string {
    return this.authService.getAdmin()?.role || 'Admin';
  }

  onLogout(): void {
    this.authService.logout();
  }
}
