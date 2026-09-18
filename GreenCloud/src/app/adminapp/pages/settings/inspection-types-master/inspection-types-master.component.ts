import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../../../core/services/http-client.service';
import { firstValueFrom } from 'rxjs';

interface InspectionTypeItem {
  code: string;
  label: string;
}

@Component({
  selector: 'app-inspection-types-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="master-page">
      <div class="master-header">
        <h2>Inspection Types</h2>
        <button class="btn-add" (click)="openAdd()"><span class="material-icons-outlined">add</span> Add Inspection Type</button>
      </div>

      <div class="info-banner">
        <span class="material-icons-outlined">info</span>
        Inspection types are used in site inspections to classify the type of inspection performed.
      </div>

      @if (success()) {
        <div class="banner banner--success"><span class="material-icons-outlined">check_circle</span> {{ success() }}</div>
      }
      @if (error()) {
        <div class="banner banner--error"><span class="material-icons-outlined">error_outline</span> {{ error() }}</div>
      }

      @if (loading()) {
        <div class="skeleton-form"><div class="skeleton-row"><div class="skeleton-field"></div></div></div>
      }

      @if (!loading()) {
        <div class="table-wrap">
          <table class="tbl">
            <thead><tr><th>#</th><th>Code</th><th>Label</th><th>Actions</th></tr></thead>
            <tbody>
              @for (item of items(); track item.code; let i = $index) {
                <tr>
                  <td class="cell-muted">{{ i + 1 }}</td>
                  <td class="bold">{{ item.code }}</td>
                  <td>{{ item.label }}</td>
                  <td>
                    <button class="act-btn" (click)="openEdit(item, i)"><span class="material-icons-outlined">edit</span></button>
                    <button class="act-btn act-btn--danger" (click)="openDelete(item, i)"><span class="material-icons-outlined">delete</span></button>
                  </td>
                </tr>
              }
              @if (items().length === 0) {
                <tr><td colspan="4" class="empty">No inspection types configured</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Add/Edit Dialog -->
    @if (showDialog()) {
      <div class="dlg-overlay" (click)="closeDialog()">
        <div class="dlg" (click)="$event.stopPropagation()">
          <div class="dlg-header">
            <h3>{{ editIndex() >= 0 ? 'Edit' : 'Add' }} Inspection Type</h3>
            <button class="dlg-close" (click)="closeDialog()">×</button>
          </div>
          <div class="dlg-body">
            <div class="fg">
              <label>Code *</label>
              <input class="fi" [(ngModel)]="formData.code" placeholder="e.g. GENERAL" [disabled]="editIndex() >= 0" />
            </div>
            <div class="fg">
              <label>Label *</label>
              <input class="fi" [(ngModel)]="formData.label" placeholder="e.g. General Pest Inspection" />
            </div>
          </div>
          <div class="dlg-footer">
            <button class="btn-cancel" (click)="closeDialog()">Cancel</button>
            <button class="btn-save" (click)="save()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> Saving... } @else { Save }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Dialog -->
    @if (showDelete()) {
      <div class="dlg-overlay" (click)="closeDelete()">
        <div class="dlg dlg--sm" (click)="$event.stopPropagation()">
          <div class="dlg-header">
            <h3>Delete Inspection Type</h3>
            <button class="dlg-close" (click)="closeDelete()">×</button>
          </div>
          <div class="dlg-body">
            <p>Are you sure you want to delete <strong>{{ deleteTarget()?.label }}</strong>? This cannot be undone.</p>
          </div>
          <div class="dlg-footer">
            <button class="btn-cancel" (click)="closeDelete()">Cancel</button>
            <button class="btn-save" style="background:#dc2626;" (click)="confirmDelete()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> Deleting... } @else { Delete }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../shared-master.css'],
})
export class InspectionTypesMasterComponent implements OnInit {
  private http = inject(HttpClientService);

  loading = signal(true);
  saving = signal(false);
  items = signal<InspectionTypeItem[]>([]);
  error = signal('');
  success = signal('');

  showDialog = signal(false);
  showDelete = signal(false);
  editIndex = signal(-1);
  deleteTarget = signal<InspectionTypeItem | null>(null);
  formData = { code: '', label: '' };

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const res: any = await firstValueFrom(this.http.get('/content/inspectionTypes'));
      if (res.success && Array.isArray(res.data?.data)) {
        this.items.set(res.data.data);
      } else if (res.success && Array.isArray(res.data)) {
        this.items.set(res.data);
      }
    } catch { this.items.set([]); }
    finally { this.loading.set(false); }
  }

  openAdd() {
    this.formData = { code: '', label: '' };
    this.editIndex.set(-1);
    this.showDialog.set(true);
  }

  openEdit(item: InspectionTypeItem, index: number) {
    this.formData = { code: item.code, label: item.label };
    this.editIndex.set(index);
    this.showDialog.set(true);
  }

  closeDialog() { this.showDialog.set(false); }

  async save() {
    if (!this.formData.code || !this.formData.label) {
      this.error.set('Code and Label are required');
      return;
    }
    this.saving.set(true);
    try {
      const list = [...this.items()];
      const idx = this.editIndex();
      if (idx >= 0) {
        list[idx] = { ...this.formData };
      } else {
        if (list.some(i => i.code === this.formData.code)) {
          this.error.set('An inspection type with this code already exists');
          this.saving.set(false);
          return;
        }
        list.push({ ...this.formData });
      }
      await firstValueFrom(this.http.put('/content/inspectionTypes', { data: list, section: 'inspectionTypes' }));
      this.items.set(list);
      this.success.set(idx >= 0 ? 'Inspection type updated' : 'Inspection type added');
      this.showDialog.set(false);
      this.error.set('');
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to save');
    } finally { this.saving.set(false); }
  }

  openDelete(item: InspectionTypeItem, index: number) {
    this.deleteTarget.set(item);
    this.editIndex.set(index);
    this.showDelete.set(true);
  }

  closeDelete() { this.showDelete.set(false); this.deleteTarget.set(null); }

  async confirmDelete() {
    this.saving.set(true);
    try {
      const idx = this.editIndex();
      const list = this.items().filter((_: any, i: number) => i !== idx);
      await firstValueFrom(this.http.put('/content/inspectionTypes', { data: list, section: 'inspectionTypes' }));
      this.items.set(list);
      this.success.set('Inspection type deleted');
      this.showDelete.set(false);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to delete');
    } finally { this.saving.set(false); }
  }
}
