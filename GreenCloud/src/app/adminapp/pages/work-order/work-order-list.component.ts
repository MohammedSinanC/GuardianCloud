import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkOrderService, WorkOrder } from '../../services/work-order.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-work-order-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './work-order-list.component.html',
  styleUrl: '../erp-shared.css',
})
export class WorkOrderListComponent implements OnInit {
  private service = inject(WorkOrderService);
  orders = signal<WorkOrder[]>([]);
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
      this.orders.set(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load work orders:', error);
      this.orders.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  filter() { this.load(); }
  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
  serviceType(order: any) { return order.serviceType || order.inquiryId?.serviceType || 'Pest Control'; }
  location(order: any) { return order.serviceLocation || order.inquiryId?.serviceLocation || order.inquiryId?.location || '-'; }

  /** ERP document chain numbers (populated by the backend list endpoint) */
  leadNo(order: any) { return order.leadId?.leadNo || ''; }
  inquiryNo(order: any) { return order.inquiryId?.inquiryNo || ''; }
  inspectionNo(order: any) { return order.inspectionId?.inspectionNo || ''; }
  quotationNo(order: any) { return order.quotationId?.quotationNo || ''; }
  /** Raw ref id whether the populate returned an object or the field holds a plain id */
  refId(value: any) { return value && typeof value === 'object' ? value._id : value || ''; }
}
