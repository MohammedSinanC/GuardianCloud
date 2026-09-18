import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerService, ErpCustomer } from '../../services/customer.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-admin-customer-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './customer-list.component.html',
  styleUrl: '../erp-shared.css',
})
export class AdminCustomerListComponent implements OnInit {
  private customerService = inject(CustomerService);
  private confirmService = inject(ConfirmService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  customers = signal<ErpCustomer[]>([]);
  loading = signal(true);
  search = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  // New/edit-customer dialog
  showDialog = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  dialogError = signal('');
  form: any = this.emptyForm();

  readonly customerTypes = ['COMPANY', 'INDIVIDUAL', 'GOVERNMENT'];
  readonly paymentTermsOptions = ['CASH', 'NET_15', 'NET_30', 'NET_60'];

  ngOnInit() {
    this.loadCustomers();
  }

  private emptyForm() {
    return {
      companyName: '',
      contactPerson: '',
      mobile: '',
      email: '',
      address: '',
      location: '',
      customerType: 'COMPANY',
      trnNumber: '',
      paymentTerms: 'NET_30',
    };
  }

  async loadCustomers() {
    this.loading.set(true);
    try {
      const res = await this.customerService.list({
        page: this.currentPage(),
        limit: 15,
        search: this.search(),
      });
      this.customers.set(res.data);
      this.total.set(res.pagination.total);
      this.totalPages.set(res.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadCustomers();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadCustomers();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadCustomers();
    }
  }

  openAddDialog() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.dialogError.set('');
    this.showDialog.set(true);
  }

  openEditDialog(customer: ErpCustomer) {
    this.editingId.set(customer._id);
    this.form = {
      companyName: customer.companyName || '',
      contactPerson: customer.contactPerson || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      address: customer.address || '',
      location: customer.location || '',
      customerType: customer.customerType || 'COMPANY',
      trnNumber: customer.trnNumber || '',
      paymentTerms: customer.paymentTerms || 'NET_30',
    };
    this.dialogError.set('');
    this.showDialog.set(true);
  }

  async saveCustomer() {
    if (!this.form.companyName?.trim() || !this.form.mobile?.trim()) {
      this.dialogError.set('Company name and mobile are required.');
      return;
    }
    this.saving.set(true);
    this.dialogError.set('');
    try {
      if (this.editingId()) {
        await this.customerService.update(this.editingId()!, this.form);
      } else {
        await this.customerService.create(this.form);
      }
      this.showDialog.set(false);
      this.editingId.set(null);
      this.loadCustomers();
    } catch (err: any) {
      this.dialogError.set(err?.error?.message || `Unable to ${this.editingId() ? 'update' : 'create'} the customer.`);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteCustomer(customer: ErpCustomer) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Customer',
      message: `Delete ${customer.companyName || customer.customerCode}? This removes the customer and its account ledger records.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await this.customerService.remove(customer._id);
      if (this.customers().length === 1 && this.currentPage() > 1) {
        this.currentPage.update((page) => page - 1);
      }
      await this.loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}
