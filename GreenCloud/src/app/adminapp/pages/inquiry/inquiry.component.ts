import { Component } from '@angular/core';
import { AdminInquiryListComponent } from '../inquiries/inquiry-list.component';

@Component({
  selector: 'app-admin-inquiry',
  standalone: true,
  imports: [AdminInquiryListComponent],
  template: '<app-admin-inquiry-list title="Inquiries" />',
})
export class AdminInquiryComponent {}
