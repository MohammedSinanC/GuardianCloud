import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuotationService } from '../../services/quotation.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-quotation-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './quotation-list.component.html',
  styleUrl: '../erp-shared.css',
})
export class QuotationListComponent implements OnInit {
  private service = inject(QuotationService);
  quotations = signal<any[]>([]);
  loading = signal(true);
  search = '';
  status = '';
  sidebarCollapsed = false;
  mobileMenuOpen = false;

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const response = await this.service.list({ search: this.search, status: this.status, limit: 50 });
      this.quotations.set(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load quotations:', error);
      this.quotations.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  filter() { this.load(); }
  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
  money(value: number) { return (Number(value) || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 }); }
  customerName(q: any) { return q.customerId?.companyName || q.inquiryId?.companyName || q.inquiryId?.customerName || '-'; }
  serviceLocation(q: any) { return q.inquiryId?.serviceLocation || q.inquiryId?.location || '-'; }
  inquiryNo(q: any) { return q.inquiryId?.inquiryNo || ''; }
  leadNo(q: any) { return q.leadId?.leadNo || ''; }
}
