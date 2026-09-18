import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InquiryService, Inquiry } from '../../../core/services/inquiry.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-inquiry-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadgeComponent],
  templateUrl: './inquiry-list.component.html',
  styleUrl: './inquiry-list.component.css',
})
export class InquiryListComponent implements OnInit {
  private inquiryService = inject(InquiryService);

  inquiries = signal<Inquiry[]>([]);
  loading = signal(false);
  search = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  ngOnInit() {
    this.loadInquiries();
  }

  async loadInquiries() {
    this.loading.set(true);
    try {
      const response = await this.inquiryService.listInquiries({
        page: this.currentPage(),
        limit: 10,
        search: this.search(),
      });
      if (response.success) {
        this.inquiries.set(response.data);
        this.totalPages.set(response.pagination.totalPages);
        this.total.set(response.pagination.total);
      }
    } catch (error) {
      console.error('Failed to load inquiries:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadInquiries();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadInquiries();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadInquiries();
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
