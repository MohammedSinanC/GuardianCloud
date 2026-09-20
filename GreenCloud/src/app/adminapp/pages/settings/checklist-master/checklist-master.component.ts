import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../../../core/services/http-client.service';
import { firstValueFrom } from 'rxjs';

interface ChecklistItem {
  code: string;
  name: string;
  controlType: 'TEXTBOX' | 'CHECKBOX';
}

@Component({
  selector: 'app-checklist-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="master-page">
      <div class="master-header">
        <h2>Checklist</h2>
        <button class="btn-add" (click)="openAdd()"><span class="material-icons-outlined">add</span> Add Checklist Item</button>
      </div>

      <div class="info-banner">
        <span class="material-icons-outlined">info</span>
        Checklist items define the points inspected during a site inspection. The control type decides whether the item is captured as a text box or a check box.
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
            <thead><tr><th>#</th><th>Code</th><th>Name</th><th>Control Type</th><th>Actions</th></tr></thead>
            <tbody>
              @for (item of items(); track item.code; let i = $index) {
                <tr>
                  <td class="cell-muted">{{ i + 1 }}</td>
                  <td class="bold">{{ item.code }}</td>
                  <td>{{ item.name }}</td>
                  <td>
                    <span class="control-badge" [class.control-badge--text]="item.controlType === 'TEXTBOX'">
                      <span class="material-icons-outlined">{{ item.controlType === 'TEXTBOX' ? 'text_fields' : 'check_box' }}</span>
                      {{ controlTypeLabel(item.controlType) }}
                    </span>
                  </td>
                  <td>
                    <button class="act-btn" (click)="openEdit(item, i)"><span class="material-icons-outlined">edit</span></button>
                    <button class="act-btn act-btn--danger" (click)="openDelete(item, i)"><span class="material-icons-outlined">delete</span></button>
                  </td>
                </tr>
              }
              @if (items().length === 0) {
                <tr><td colspan="5" class="empty">No checklist items configured</td></tr>
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
            <h3>{{ editIndex() >= 0 ? 'Edit' : 'Add' }} Checklist Item</h3>
            <button class="dlg-close" (click)="closeDialog()">×</button>
          </div>
          <div class="dlg-body">
            <div class="fg">
              <label>Code *</label>
              <input class="fi" [(ngModel)]="formData.code" placeholder="e.g. PEST_DROPPINGS" [disabled]="editIndex() >= 0" />
            </div>
            <div class="fg">
              <label>Name *</label>
              <input class="fi" [(ngModel)]="formData.name" placeholder="e.g. Signs of pest droppings" />
            </div>
            <div class="fg">
              <label>Control Type *</label>
              <select class="fi" [(ngModel)]="formData.controlType">
                <option value="TEXTBOX">Text Box</option>
                <option value="CHECKBOX">Check Box</option>
              </select>
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
            <h3>Delete Checklist Item</h3>
            <button class="dlg-close" (click)="closeDelete()">×</button>
          </div>
          <div class="dlg-body">
            <p>Are you sure you want to delete <strong>{{ deleteTarget()?.name }}</strong>? This cannot be undone.</p>
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
export class ChecklistMasterComponent implements OnInit {
  private http = inject(HttpClientService);

  loading = signal(true);
  saving = signal(false);
  items = signal<ChecklistItem[]>([]);
  error = signal('');
  success = signal('');

  showDialog = signal(false);
  showDelete = signal(false);
  editIndex = signal(-1);
  deleteTarget = signal<ChecklistItem | null>(null);
  formData: ChecklistItem = { code: '', name: '', controlType: 'TEXTBOX' };

  ngOnInit() { this.load(); }

  controlTypeLabel(type: string): string {
    return type === 'CHECKBOX' ? 'Check Box' : 'Text Box';
  }

  async load() {
    this.loading.set(true);
    try {
      const res: any = await firstValueFrom(this.http.get('/content/checklists'));
      if (res.success && Array.isArray(res.data?.data)) {
        this.items.set(res.data.data);
      } else if (res.success && Array.isArray(res.data)) {
        this.items.set(res.data);
      }
    } catch { this.items.set([]); }
    finally { this.loading.set(false); }
  }

  openAdd() {
    this.formData = { code: '', name: '', controlType: 'TEXTBOX' };
    this.editIndex.set(-1);
    this.showDialog.set(true);
  }

  openEdit(item: ChecklistItem, index: number) {
    this.formData = { code: item.code, name: item.name, controlType: item.controlType === 'CHECKBOX' ? 'CHECKBOX' : 'TEXTBOX' };
    this.editIndex.set(index);
    this.showDialog.set(true);
  }

  closeDialog() { this.showDialog.set(false); }

  async save() {
    if (!this.formData.code || !this.formData.name) {
      this.error.set('Code and Name are required');
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
          this.error.set('A checklist item with this code already exists');
          this.saving.set(false);
          return;
        }
        list.push({ ...this.formData });
      }
      await firstValueFrom(this.http.put('/content/checklists', { data: list, section: 'checklists' }));
      this.items.set(list);
      this.success.set(idx >= 0 ? 'Checklist item updated' : 'Checklist item added');
      this.showDialog.set(false);
      this.error.set('');
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to save');
    } finally { this.saving.set(false); }
  }

  openDelete(item: ChecklistItem, index: number) {
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
      await firstValueFrom(this.http.put('/content/checklists', { data: list, section: 'checklists' }));
      this.items.set(list);
      this.success.set('Checklist item deleted');
      this.showDelete.set(false);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to delete');
    } finally { this.saving.set(false); }
  }
}
