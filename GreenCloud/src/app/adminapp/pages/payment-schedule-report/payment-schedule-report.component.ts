import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClientService } from '../../../core/services/http-client.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

interface PaymentRecord {
  _id: string;
  quotationId: any;
  inquiryId: any;
  paymentNo: number;
  paymentDate: string;
  dueDate: string;
  paymentTypeName: string;
  paymentFrequency: string;
  intervalMonths: number;
  amount: number;
  vat: number;
  total: number;
  status: string;
  effectiveStatus: string;
  paidAmount: number;
  remainingAmount: number;
}

interface ReportSummary {
  totalPayments: number;
  upcomingCount: number;
  overdueCount: number;
  dueTodayCount: number;
  paidCount: number;
  upcomingAmount: number;
  overdueAmount: number;
  dueTodayAmount: number;
  paidAmount: number;
  totalDueAmount: number;
}

interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  payments: PaymentRecord[];
}

@Component({
  selector: 'app-payment-schedule-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './payment-schedule-report.component.html',
  styleUrl: './payment-schedule-report.component.css',
})
export class PaymentScheduleReportComponent implements OnInit {
  private http = inject(HttpClientService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;

  loading = signal(true);
  schedule = signal<PaymentRecord[]>([]);
  summary = signal<ReportSummary | null>(null);
  selectedDayPayments = signal<PaymentRecord[]>([]);
  showDayDetail = signal(false);

  // Calendar
  calendarDays = signal<CalendarDay[]>([]);
  currentMonth = signal(new Date().getMonth());
  currentYear = signal(new Date().getFullYear());
  monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Filters
  filterDateFrom = '';
  filterDateTo = '';
  filterStatus = '';
  filterPaymentType = '';
  filterSearch = '';

  currency = 'AED';

  ngOnInit() {
    this.loadReport();
    this.loadCurrency();
  }

  async loadCurrency() {
    try {
      const res: any = await this.http.get('/companies').toPromise();
      if (res?.success && res.data?.length > 0) {
        this.currency = res.data[0].currency || 'AED';
      }
    } catch {}
  }

  async loadReport() {
    this.loading.set(true);
    try {
      const params = new URLSearchParams();
      if (this.filterDateFrom) params.set('dateFrom', this.filterDateFrom);
      if (this.filterDateTo) params.set('dateTo', this.filterDateTo);
      if (this.filterStatus) params.set('status', this.filterStatus);
      if (this.filterPaymentType) params.set('paymentType', this.filterPaymentType);
      if (this.filterSearch) params.set('search', this.filterSearch);

      const qs = params.toString();
      const url = '/payment-schedule/report' + (qs ? '?' + qs : '');

      const res: any = await this.http.get(url).toPromise();
      if (res?.success) {
        this.schedule.set(res.data.schedule || []);
        this.summary.set(res.data.summary || null);
        this.buildCalendar();
      }
    } catch {} finally { this.loading.set(false); }
  }

  applyFilters() { this.loadReport(); }

  resetFilters() {
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterStatus = '';
    this.filterPaymentType = '';
    this.filterSearch = '';
    this.loadReport();
  }

  // ===== CALENDAR =====
  buildCalendar() {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Previous month padding
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLast - i);
      days.push({ date: d, dayNum: prevMonthLast - i, isCurrentMonth: false, isToday: false, payments: [] });
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const payments = this.schedule().filter(p => {
        const pd = new Date(p.dueDate);
        pd.setHours(0, 0, 0, 0);
        return pd.toISOString().split('T')[0] === dateStr;
      });
      days.push({ date, dayNum: d, isCurrentMonth: true, isToday: date.getTime() === today.getTime(), payments });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      days.push({ date, dayNum: d, isCurrentMonth: false, isToday: false, payments: [] });
    }

    this.calendarDays.set(days);
  }

  prevMonth() {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.update(y => y - 1);
    } else {
      this.currentMonth.update(m => m - 1);
    }
    this.buildCalendar();
  }

  nextMonth() {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.update(y => y + 1);
    } else {
      this.currentMonth.update(m => m + 1);
    }
    this.buildCalendar();
  }

  goToToday() {
    const now = new Date();
    this.currentMonth.set(now.getMonth());
    this.currentYear.set(now.getFullYear());
    this.buildCalendar();
  }

  onDayClick(day: CalendarDay) {
    if (day.payments.length > 0) {
      this.selectedDayPayments.set(day.payments);
      this.showDayDetail.set(true);
    }
  }

  closeDayDetail() { this.showDayDetail.set(false); }

  // ===== HELPERS =====
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-AE', { style: 'decimal', minimumFractionDigits: 2 }).format(amount) + ' ' + this.currency;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'psr-status--paid';
      case 'OVERDUE': return 'psr-status--overdue';
      case 'DUE_TODAY': return 'psr-status--due-today';
      case 'UPCOMING': return 'psr-status--upcoming';
      default: return 'psr-status--pending';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PAID': return 'Paid';
      case 'OVERDUE': return 'Overdue';
      case 'DUE_TODAY': return 'Due Today';
      case 'UPCOMING': return 'Upcoming';
      default: return status;
    }
  }

  getInquiryName(p: PaymentRecord): string {
    if (p.inquiryId?.customerName) return p.inquiryId.customerName;
    if (p.inquiryId?.inquiryNo) return p.inquiryId.inquiryNo;
    return 'N/A';
  }

  getInquiryId(p: PaymentRecord): string {
    return p.inquiryId?._id || '';
  }

  getInquiryNo(p: PaymentRecord): string {
    return p.inquiryId?.inquiryNo || '';
  }

  getDueTodayPayments(): PaymentRecord[] {
    return this.schedule().filter(s => s.effectiveStatus === 'DUE_TODAY');
  }

  getOverduePayments(): PaymentRecord[] {
    return this.schedule().filter(s => s.effectiveStatus === 'OVERDUE');
  }

  getUpcomingPayments(): PaymentRecord[] {
    return this.schedule().filter(s => s.effectiveStatus === 'UPCOMING');
  }

  hasStatus(payments: PaymentRecord[], status: string): boolean {
    return payments.some(p => p.effectiveStatus === status);
  }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
}
