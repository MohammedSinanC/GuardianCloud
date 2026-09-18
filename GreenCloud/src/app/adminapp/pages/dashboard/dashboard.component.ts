import { Component, inject, OnInit, signal, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
import { DashboardService, DashboardData, DashboardFilters } from '../../services/dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private platformId = inject(PLATFORM_ID);

  sidebarCollapsed = false;
  mobileMenuOpen = false;
  isBrowser = false;

  loading = signal(true);
  error = signal('');
  data = signal<DashboardData | null>(null);

  selectedYear = new Date().getFullYear();
  selectedDateRange = 'thisYear';
  selectedLocation = '';
  years: number[] = [];

  dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
  ];

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    const currentYear = new Date().getFullYear();
    this.years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    // Only load data in browser — SSR has no localStorage for auth token
    if (this.isBrowser) {
      this.loadDashboard();
    }
  }

  async loadDashboard() {
    this.loading.set(true);
    this.error.set('');
    try {
      const filters: DashboardFilters = {
        year: this.selectedYear,
        dateRange: this.selectedDateRange,
        location: this.selectedLocation,
      };
      const response = await this.dashboardService.getDashboard(filters);
      if (response.success) {
        this.data.set(response.data);
        if (this.isBrowser) {
          setTimeout(() => this.renderCharts(), 100);
        }
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to load dashboard data');
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange() {
    // ngModel on <select> converts year to string — force it back to number
    this.selectedYear = parseInt(String(this.selectedYear), 10);
    this.loadDashboard();
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      CREATED: '#64748b',
      SUBMITTED: '#3b82f6',
      UNDER_REVIEW: '#8b5cf6',
      INSPECTION_REQUIRED: '#f59e0b',
      INSPECTION_SCHEDULED: '#f97316',
      INSPECTION_COMPLETED: '#10b981',
      QUOTATION_PREPARED: '#06b6d4',
      QUOTATION_SENT: '#0ea5e9',
      QUOTATION_APPROVED: '#22c55e',
      SERVICE_SCHEDULED: '#6366f1',
      TECHNICIAN_ASSIGNED: '#a855f7',
      SERVICE_IN_PROGRESS: '#f43f5e',
      SERVICE_COMPLETED: '#16a34a',
      INVOICE_GENERATED: '#0d9488',
      PAYMENT_PENDING: '#eab308',
      COMPLETED: '#16a34a',
      REJECTED: '#dc2626',
      CANCELLED: '#94a3b8',
      QUOTATION_REJECTED: '#ef4444',
      INSPECTION_FAILED: '#f43f5e',
    };
    return colors[stage] || '#64748b';
  }

  getStageLabel(stage: string): string {
    return stage?.replace(/_/g, ' ') || 'Unknown';
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private async renderCharts() {
    const d = this.data();
    if (!d) return;

    const ApexCharts = (await import('apexcharts')).default;

    // Chart 1: Monthly Quotations (Line)
    const monthlyQuotEl = document.getElementById('chart-monthly-quotations');
    if (monthlyQuotEl) {
      const chart1 = new ApexCharts(monthlyQuotEl, {
        chart: { type: 'area', height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
        series: [{ name: 'Quotations', data: d.monthlyQuotations.map(m => m.count) }],
        xaxis: { categories: d.monthlyQuotations.map(m => m.month), labels: { style: { colors: '#64748b', fontSize: '12px' } } },
        yaxis: { labels: { style: { colors: '#64748b' } } },
        colors: ['#0d9488'],
        stroke: { curve: 'smooth', width: 2 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05 } },
        tooltip: { theme: 'light' },
        grid: { borderColor: '#f1f5f9' },
      });
      chart1.render();
    }

    // Chart 2: Requests by Status (Bar)
    const statusBarEl = document.getElementById('chart-status-bar');
    if (statusBarEl) {
      const chart2 = new ApexCharts(statusBarEl, {
        chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
        series: [{ name: 'Requests', data: d.requestsByStatus.map(s => s.count) }],
        xaxis: { categories: d.requestsByStatus.map(s => s.status.replace(/_/g, ' ')), labels: { style: { colors: '#64748b', fontSize: '11px' }, rotate: -45 } },
        yaxis: { labels: { style: { colors: '#64748b' } } },
        colors: ['#0d9488'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
        tooltip: { theme: 'light' },
        grid: { borderColor: '#f1f5f9' },
      });
      chart2.render();
    }

    // Chart 3: Location Donut
    const locationDonutEl = document.getElementById('chart-location-donut');
    if (locationDonutEl) {
      const chart3 = new ApexCharts(locationDonutEl, {
        chart: { type: 'donut', height: 280, fontFamily: 'Inter, sans-serif' },
        series: d.requestsByLocation.map(l => l.count),
        labels: d.requestsByLocation.map(l => l.location || 'Unknown'),
        colors: ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#16a34a', '#94a3b8'],
        plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => d.requestsByLocation.reduce((a, b) => a + b.count, 0).toString() } } } } },
        legend: { position: 'bottom', fontSize: '12px', labels: { colors: '#475569' } },
        tooltip: { theme: 'light' },
      });
      chart3.render();
    }

    // Chart 4: Monthly Requests (Line)
    const monthlyReqEl = document.getElementById('chart-monthly-requests');
    if (monthlyReqEl) {
      const chart4 = new ApexCharts(monthlyReqEl, {
        chart: { type: 'line', height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
        series: [{ name: 'Requests', data: d.monthlyRequests.map(m => m.count) }],
        xaxis: { categories: d.monthlyRequests.map(m => m.month), labels: { style: { colors: '#64748b', fontSize: '12px' } } },
        yaxis: { labels: { style: { colors: '#64748b' } } },
        colors: ['#8b5cf6'],
        stroke: { curve: 'smooth', width: 2 },
        tooltip: { theme: 'light' },
        grid: { borderColor: '#f1f5f9' },
      });
      chart4.render();
    }

    // Chart 5: Quotation Conversion (Bar)
    const conversionEl = document.getElementById('chart-conversion');
    if (conversionEl) {
      const conv = d.quotationConversion;
      const chart5 = new ApexCharts(conversionEl, {
        chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
        series: [{ name: 'Count', data: [conv.inquiries, conv.quotationsSent, conv.accepted, conv.completed] }],
        xaxis: { categories: ['Total Inquiries', 'Quotations Sent', 'Accepted', 'Completed'], labels: { style: { colors: '#475569', fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: '#64748b' } } },
        colors: ['#3b82f6'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', distributed: true } },
        tooltip: { theme: 'light' },
        grid: { borderColor: '#f1f5f9' },
        legend: { show: false },
      });
      chart5.render();
    }

    // Chart 6: Performance (Horizontal Bar)
    const perfEl = document.getElementById('chart-performance');
    if (perfEl) {
      const chart6 = new ApexCharts(perfEl, {
        chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
        series: [{ name: 'Count', data: d.performance.map(p => p.count) }],
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
        xaxis: { categories: d.performance.map(p => p.status.replace(/_/g, ' ')), labels: { style: { colors: '#475569', fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: '#64748b' } } },
        colors: ['#0d9488'],
        tooltip: { theme: 'light' },
        grid: { borderColor: '#f1f5f9' },
      });
      chart6.render();
    }
  }
}
