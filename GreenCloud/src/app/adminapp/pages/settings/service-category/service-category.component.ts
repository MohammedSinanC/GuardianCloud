import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const CATEGORIES = [
  { code: 'RESIDENTIAL', label: 'Residential', description: 'Home and apartment services' },
  { code: 'COMMERCIAL', label: 'Commercial', description: 'Office and business services' },
  { code: 'INDUSTRIAL', label: 'Industrial', description: 'Factory and warehouse services' },
  { code: 'GOVERNMENT', label: 'Government', description: 'Government facility services' },
  { code: 'HOSPITALITY', label: 'Hospitality', description: 'Hotel and restaurant services' },
];

@Component({
  selector: 'app-service-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="master-page">
      <div class="master-header">
        <h2>Service Categories</h2>
        <button class="btn-add" (click)="openDialog()"><span class="material-icons-outlined">add</span> Add Category</button>
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
          <div class="dlg-header"><h3>Edit Category</h3><button class="dlg-close" (click)="closeDialog()">×</button></div>
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
export class ServiceCategoryComponent {
  items = signal([...CATEGORIES]);
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
    if (item) this.items.update(list => list.map(i => i.code === item.code ? { ...i, label: this.editLabel, description: this.editDesc } : i));
    this.closeDialog();
  }
}
