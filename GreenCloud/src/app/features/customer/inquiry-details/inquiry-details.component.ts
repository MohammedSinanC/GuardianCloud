import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InquiryService, Inquiry } from '../../../core/services/inquiry.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-inquiry-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StatusBadgeComponent,
  ],
  templateUrl: './inquiry-details.component.html',
  styleUrl: './inquiry-details.component.css',
})
export class InquiryDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private inquiryService = inject(InquiryService);

  inquiry = signal<Inquiry | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInquiry(id);
    }
  }

  async loadInquiry(id: string) {
    this.loading.set(true);
    try {
      const response = await this.inquiryService.getInquiryById(id);
      if (response.success) {
        this.inquiry.set(response.data);
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to load inquiry');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
