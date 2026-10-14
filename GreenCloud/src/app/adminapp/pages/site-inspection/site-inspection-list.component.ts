import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SiteInspectionService, SiteInspection } from '../../services/site-inspection.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-site-inspection-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './site-inspection-list.component.html',
  styleUrl: '../erp-shared.css',
})
export class SiteInspectionListComponent implements OnInit {
  private service = inject(SiteInspectionService);
  inspections = signal<SiteInspection[]>([]);
  loading = signal(true);
  search = '';
  status = '';
  busyId = signal('');
  rejectTarget = signal<SiteInspection | null>(null);
  rejectReason = '';
  sidebarCollapsed = false;
  mobileMenuOpen = false;

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const response = await this.service.list({ search: this.search, status: this.status, limit: 50 });
      this.inspections.set(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load site inspections:', error);
      this.inspections.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  // ── Status-conditional actions (see STATUS_TRANSITIONS.INSPECTION) ──
  canApprove(status: string | undefined): boolean {
    return status === 'PENDING_APPROVAL';
  }

  /** Shared status → badge modifier class, matches erp-shared.css conventions */
  statusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'PENDING_APPROVAL': return 'erp-badge erp-badge--pending';
      case 'APPROVED': return 'erp-badge erp-badge--approved';
      case 'REJECTED': return 'erp-badge erp-badge--rejected';
      case 'CANCELLED': return 'erp-badge erp-badge--cancelled';
      default: return 'erp-badge erp-badge--draft';
    }
  }

  async approve(inspection: SiteInspection) {
    if (!this.canApprove(inspection.status)) return;
    this.busyId.set(inspection._id);
    try {
      await this.service.approve(inspection._id);
      await this.load();
    } catch (error: any) {
      console.error('Failed to approve inspection:', error);
    } finally {
      this.busyId.set('');
    }
  }

  openReject(inspection: SiteInspection) {
    if (!this.canApprove(inspection.status)) return;
    this.rejectReason = '';
    this.rejectTarget.set(inspection);
  }

  closeReject() {
    if (this.busyId() === this.rejectTarget()?._id) return;
    this.rejectTarget.set(null);
  }

  async reject() {
    const target = this.rejectTarget();
    if (!target || !this.rejectReason.trim()) return;
    this.busyId.set(target._id);
    try {
      await this.service.reject(target._id, this.rejectReason.trim());
      this.rejectTarget.set(null);
      await this.load();
    } catch (error: any) {
      console.error('Failed to reject inspection:', error);
    } finally {
      this.busyId.set('');
    }
  }

  filter() { this.load(); }
  /** Raw ref id whether the populate returned an object or the field holds a plain id */
  refId(value: any) { return value && typeof value === 'object' ? value._id : value || ''; }
  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
  formatDate(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString('en-GB') : '-'; }

  /**
   * Preferred Time comes from the inquiry: usually one of the standard buckets
   * (MORNING / AFTERNOON / EVENING / ANY), but the customer portal stores a clock
   * time such as "14:30". Show buckets in title case and clock times as stored.
   */
  formatPreferredTime(value: string | undefined): string {
    const time = (value || '').trim();
    if (!time) return '-';
    return /^[A-Z_]+$/.test(time) ? time.charAt(0) + time.slice(1).toLowerCase() : time;
  }
}
