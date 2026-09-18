import { Component } from '@angular/core';
import { AdminLeadListComponent } from '../leads/lead-list.component';

@Component({
  selector: 'app-admin-leads',
  standalone: true,
  imports: [AdminLeadListComponent],
  template: '<app-admin-lead-list />',
})
export class AdminLeadsComponent {}
