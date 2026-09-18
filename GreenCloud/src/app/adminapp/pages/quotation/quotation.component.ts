import { Component } from '@angular/core';
import { AdminInquiryListComponent } from '../inquiries/inquiry-list.component';

@Component({
  selector: 'app-admin-quotation',
  standalone: true,
  imports: [AdminInquiryListComponent],
  template: '<app-admin-inquiry-list title="Quotations" fixedStages="QUOTATION_PREPARED,QUOTATION_SENT,QUOTATION_REJECTED,QUOTATION_APPROVED" />',
})
export class AdminQuotationComponent {}
