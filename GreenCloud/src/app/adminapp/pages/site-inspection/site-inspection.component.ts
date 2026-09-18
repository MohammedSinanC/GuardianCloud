import { Component } from '@angular/core';
import { AdminInquiryListComponent } from '../inquiries/inquiry-list.component';

@Component({
  selector: 'app-admin-site-inspection',
  standalone: true,
  imports: [AdminInquiryListComponent],
  template: '<app-admin-inquiry-list title="Site Inspections" fixedStages="INSPECTION_REQUIRED,INSPECTION_SCHEDULED,INSPECTION_COMPLETED,INSPECTION_FAILED" />',
})
export class AdminSiteInspectionComponent {}
