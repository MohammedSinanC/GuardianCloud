import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const SERVICE_TYPES = [
  { code: 'PEST_CONTROL', label: 'Pest Control', description: 'Pest control and extermination services' },
  { code: 'CLEANING', label: 'Cleaning Service', description: 'General and deep cleaning services' },
  { code: 'SANITIZATION', label: 'Sanitization', description: 'Sanitization and disinfection services' },
  { code: 'WASTE_MANAGEMENT', label: 'Waste Management', description: 'Waste collection and disposal' },
  { code: 'LANDSCAPING', label: 'Landscaping', description: 'Garden and landscape maintenance' },
];

@Component({
  selector: 'app-service-type',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="master-page">
      <div class="master-header">
        <h2>Service Types</h2>
        <button class="btn-add" (click)="openDialog()"><span class="material-icons-outlined">add</span> Add Service Type</button>
      </div>
      <div class="info-banner">
        <span class="material-icons-outlined">info</span>
        Service types define the categories of services offered by the company.
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>#</th><th>Code</th><th>Label</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            @for (item of items(); track item.code; let i = $index) {
              <tr>
                <td class="cell-muted">{{ i + 1 }}</td>
                <td class="bold">{{ item.code }}</td>
                <td>{{ item.label }}</td>
                <td class="cell-muted">{{ item.description }}</td>
                <td><button class="act-btn" (click)="openDialog(item)"><span class="material-icons-outlined">edit</span></button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
    @if (showDialog()) {
      <div class="dlg-overlay" (click)="closeDialog()">
        <div class="dlg" (click)="$event.stopPropagation()">
          <div class="dlg-header"><h3>Edit Service Type</h3><button class="dlg-close" (click)="closeDialog()">×</button></div>
          <div class="dlg-body">
            <div class="fg"><label>Code</label><input class="fi" [value]="editItem()?.code" disabled /></div>
            <div class="fg"><label>Label *</label><input class="fi" [(ngModel)]="editLabel" /></div>
            <div class="fg"><label>Description</label><textarea class="fi" [(ngModel)]="editDesc" rows="2"></textarea></div>
          </div>
          <div class="dlg-footer">
            <button class="btn-cancel" (click)="closeDialog()">Cancel</button>
            <button class="btn-save" (click)="save()">Save</button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../shared-master.css'],
})
export class ServiceTypeComponent {
  items = signal([...SERVICE_TYPES]);
  showDialog = signal(false);
  editItem = signal<any>(null);
  editLabel = '';
  editDesc = '';

  openDialog(item?: any) {
    if (item) { this.editItem.set(item); this.editLabel = item.label; this.editDesc = item.description || ''; }
    this.showDialog.set(true);
  }
  closeDialog() { this.showDialog.set(false); }
  save() {
    const item = this.editItem();
    if (item) {
      this.items.update(list => list.map(i => i.code === item.code ? { ...i, label: this.editLabel, description: this.editDesc } : i));
    }
    this.closeDialog();
  }
}
