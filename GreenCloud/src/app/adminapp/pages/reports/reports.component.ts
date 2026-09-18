import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
import { HttpClientService } from '../../../core/services/http-client.service';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AdminSidebarComponent, AdminTopbarComponent],
  template: `
    <div class="admin-layout">
      <app-admin-sidebar
        [collapsed]="sidebarCollapsed"
        [mobileOpen]="mobileMenuOpen"
        (closeSidebar)="closeMobileMenu()" />
      <div class="admin-layout__main" [class.sidebar-collapsed]="sidebarCollapsed">
        <app-admin-topbar (toggleSidebar)="toggleMobileMenu()" />
        <div class="page-container">
          <div class="page-header">
            <h1>Reports</h1>
            <p class="page-subtitle">View and generate reports</p>
          </div>

          <div class="reports-grid">
            <div class="report-card">
              <div class="report-card__icon" style="background: #dcfce7; color: #16a34a;">
                <span class="material-icons-outlined">bug_report</span>
              </div>
              <h3>Inquiry Report</h3>
              <p>Total inquiries, stages, and conversion rates</p>
            </div>

            <div class="report-card">
              <div class="report-card__icon" style="background: #fef3c7; color: #d97706;">
                <span class="material-icons-outlined">receipt_long</span>
              </div>
              <h3>Quotation Report</h3>
              <p>Quotations sent, accepted, and rejected</p>
            </div>

            <div class="report-card">
              <div class="report-card__icon" style="background: #e0f2fe; color: #0284c7;">
                <span class="material-icons-outlined">location_on</span>
              </div>
              <h3>Location Report</h3>
              <p>Service requests by area and region</p>
            </div>

            <div class="report-card">
              <div class="report-card__icon" style="background: #fae8ff; color: #c026d3;">
                <span class="material-icons-outlined">trending_up</span>
              </div>
              <h3>Performance Report</h3>
              <p>Monthly trends and completion rates</p>
            </div>
          </div>

          <div class="coming-soon">
            <span class="material-icons-outlined coming-soon__icon">construction</span>
            <h2>Detailed Reports Coming Soon</h2>
            <p>Full report generation with date filters and export options will be available in the next release.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../users/users.component.css', './reports.component.css'],
})
export class AdminReportsComponent {
  sidebarCollapsed = false;
  mobileMenuOpen = false;

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
}
