import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../../../core/services/http-client.service';
import { firstValueFrom } from 'rxjs';

const PEST_TYPES = [
  'COCKROACH', 'BED_BUG', 'ANT', 'MOSQUITO', 'RODENT', 'TERMITE', 'FLY', 'OTHER'
];

@Component({
  selector: 'app-pest-type',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="master-page">
      <div class="master-header">
        <h2>Pest Types</h2>
        <button class="btn-add" (click)="openDialog()"><span class="material-icons-outlined">add</span> Add Pest Type</button>
      </div>

      <div class="info-banner">
        <span class="material-icons-outlined">info</span>
        Pest types are used in inquiries and service requests for pest control classification.
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>#</th><th>Pest Type</th><th>Label</th><th>Actions</th></tr></thead>
          <tbody>
            @for (item of items(); track item.code; let i = $index) {
              <tr>
                <td class="cell-muted">{{ i + 1 }}</td>
                <td class="bold">{{ item.code }}</td>
                <td>{{ item.label }}</td>
                <td>
                  <button class="act-btn" (click)="openDialog(item)"><span class="material-icons-outlined">edit</span></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (showDialog()) {
      <div class="dlg-overlay" (click)="closeDialog()">
        <div class="dlg" (click)="$event.stopPropagation()">
          <div class="dlg-header">
            <h3>Edit Pest Type</h3>
            <button class="dlg-close" (click)="closeDialog()">×</button>
          </div>
          <div class="dlg-body">
            <div class="fg"><label>Code</label><input class="fi" [value]="editItem()?.code" disabled /></div>
            <div class="fg"><label>Label *</label><input class="fi" [(ngModel)]="editLabel" placeholder="e.g. Cockroach" /></div>
          </div>
          <div class="dlg-footer">
            <button class="btn-cancel" (click)="closeDialog()">Cancel</button>
            <button class="btn-save" (click)="saveLabel()">Save</button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../shared-master.css'],
})
export class PestTypeComponent {
  items = signal(PEST_TYPES.map(c => ({ code: c, label: c.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) })));
  showDialog = signal(false);
  editItem = signal<{ code: string; label: string } | null>(null);
  editLabel = '';

  openDialog(item?: { code: string; label: string }) {
    if (item) { this.editItem.set(item); this.editLabel = item.label; }
    this.showDialog.set(true);
  }
  closeDialog() { this.showDialog.set(false); }
  saveLabel() {
    const item = this.editItem();
    if (item && this.editLabel) {
      this.items.update(list => list.map(i => i.code === item.code ? { ...i, label: this.editLabel } : i));
    }
    this.closeDialog();
  }
}
