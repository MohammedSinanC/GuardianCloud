import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../../../core/services/http-client.service';
import { firstValueFrom } from 'rxjs';

interface PaymentType {
  _id: string;
  name: string;
  code: string;
  frequency: string;
  interval: number;
  gracePeriodDays: number;
  isActive: boolean;
}

@Component({
  selector: 'app-payment-type-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="master-page">
      <div class="master-header">
        <h2>Payment Types</h2>
        <button class="btn-add" (click)="openAdd()"><span class="material-icons-outlined">add</span> Add Payment Type</button>
      </div>

      <div class="info-banner">
        <span class="material-icons-outlined">info</span>
        Payment types define how customers can pay — Monthly, Half Yearly, One Time, etc. These are used in quotations and payment schedules.
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
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Code</th>
                <th>Frequency</th>
                <th>Interval</th>
                <th>Grace Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item._id; let i = $index) {
                <tr>
                  <td class="cell-muted">{{ i + 1 }}</td>
                  <td class="bold">{{ item.name }}</td>
                  <td><code>{{ item.code }}</code></td>
                  <td>
                    <span class="freq-badge" [class]="'freq--' + item.frequency.toLowerCase()">{{ item.frequency }}</span>
                  </td>
                  <td>{{ item.interval > 0 ? item.interval : '-' }}</td>
                  <td>{{ item.gracePeriodDays > 0 ? item.gracePeriodDays + ' days' : '-' }}</td>
                  <td>
                    @if (item.isActive) {
                      <span class="badge badge--green">Active</span>
                    } @else {
                      <span class="badge badge--red">Inactive</span>
                    }
                  </td>
                  <td>
                    <button class="act-btn" (click)="openEdit(item, i)"><span class="material-icons-outlined">edit</span></button>
                    <button class="act-btn act-btn--danger" (click)="openDelete(item, i)"><span class="material-icons-outlined">delete</span></button>
                  </td>
                </tr>
              }
              @if (items().length === 0) {
                <tr><td colspan="8" class="empty">No payment types configured</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Add/Edit Dialog -->
    @if (showDialog()) {
      <div class="dlg-overlay" (click)="closeDialog()">
        <div class="dlg dlg--wide" (click)="$event.stopPropagation()">
          <div class="dlg-header">
            <h3>{{ editIndex() >= 0 ? 'Edit' : 'Add' }} Payment Type</h3>
            <button class="dlg-close" (click)="closeDialog()">×</button>
          </div>
          <div class="dlg-body">
            <div class="form-grid-2">
              <div class="fg">
                <label>Name *</label>
                <input class="fi" [(ngModel)]="formData.name" placeholder="e.g. Monthly" />
              </div>
              <div class="fg">
                <label>Code *</label>
                <input class="fi" [(ngModel)]="formData.code" placeholder="e.g. MONTHLY" [disabled]="editIndex() >= 0" style="text-transform:uppercase;" />
              </div>
            </div>
            <div class="form-grid-2">
              <div class="fg">
                <label>Frequency *</label>
                <select class="fi" [(ngModel)]="formData.frequency">
                  <option value="">Select frequency</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half Yearly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="ONE_TIME">One Time</option>
                </select>
              </div>
              <div class="fg">
                <label>Interval (months)</label>
                <input type="number" class="fi" [(ngModel)]="formData.interval" min="0" max="60" placeholder="e.g. 1 for monthly" />
                <span class="fg-hint">Number of months between payments. 0 for one-time.</span>
              </div>
            </div>
            <div class="form-grid-2">
              <div class="fg">
                <label>Grace Period (Days)</label>
                <input type="number" class="fi" [(ngModel)]="formData.gracePeriodDays" min="0" max="365" placeholder="e.g. 30" />
                <span class="fg-hint">Days after invoice date before payment is due.</span>
              </div>
              <div class="fg">
                <label>Status</label>
                <select class="fi" [(ngModel)]="formData.isActive">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
              </div>
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
            <h3>Delete Payment Type</h3>
            <button class="dlg-close" (click)="closeDelete()">×</button>
          </div>
          <div class="dlg-body">
            <p>Are you sure you want to delete <strong>{{ deleteTarget()?.name }}</strong>? Existing quotations using this type will not be affected.</p>
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
  styles: [`
    .cell-muted { color: #94a3b8; }
    .dlg--wide { width: 580px; }
    .dlg--sm { width: 400px; }
    .act-btn--danger:hover { background: #fef2f2; border-color: #dc2626; color: #dc2626; }
    .skeleton-form { padding: 0; }
    .skeleton-row { display: flex; gap: 16px; }
    .skeleton-field {
      flex: 1; height: 200px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%; border-radius: 10px; animation: shimmer 1.5s infinite;
    }
    .banner {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-radius: 8px; font-size: 13px; margin-bottom: 16px;
    }
    .banner--success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .banner--error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .banner .material-icons-outlined { font-size: 18px; }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 4px;
    }
    .fg-hint {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
      display: block;
    }
    code {
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #475569;
    }
    .freq-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .freq--monthly { background: #dbeafe; color: #1d4ed8; }
    .freq--quarterly { background: #fef3c7; color: #92400e; }
    .freq--half_yearly { background: #e0e7ff; color: #4338ca; }
    .freq--yearly { background: #d1fae5; color: #065f46; }
    .freq--one_time { background: #fce7f3; color: #9d174d; }
  `],
})
export class PaymentTypeMasterComponent implements OnInit {
  private http = inject(HttpClientService);

  loading = signal(true);
  saving = signal(false);
  items = signal<PaymentType[]>([]);
  error = signal('');
  success = signal('');

  showDialog = signal(false);
  showDelete = signal(false);
  editIndex = signal(-1);
  deleteTarget = signal<PaymentType | null>(null);
  formData: any = {
    name: '',
    code: '',
    frequency: '',
    interval: 1,
    gracePeriodDays: 0,
    isActive: true,
  };

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const res: any = await firstValueFrom(this.http.get('/payment-types'));
      if (res.success) {
        this.items.set(res.data || []);
      }
    } catch { this.items.set([]); }
    finally { this.loading.set(false); }
  }

  openAdd() {
    this.formData = { name: '', code: '', frequency: '', interval: 1, gracePeriodDays: 0, isActive: true };
    this.editIndex.set(-1);
    this.showDialog.set(true);
  }

  openEdit(item: PaymentType, index: number) {
    this.formData = {
      name: item.name,
      code: item.code,
      frequency: item.frequency,
      interval: item.interval,
      gracePeriodDays: item.gracePeriodDays,
      isActive: item.isActive,
    };
    this.editIndex.set(index);
    this.showDialog.set(true);
  }

  closeDialog() { this.showDialog.set(false); }

  async save() {
    if (!this.formData.name || !this.formData.code || !this.formData.frequency) {
      this.error.set('Name, Code, and Frequency are required');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const data = {
        ...this.formData,
        code: this.formData.code.toUpperCase(),
      };
      const idx = this.editIndex();
      if (idx >= 0) {
        const item = this.items()[idx];
        await firstValueFrom(this.http.put(`/payment-types/${item._id}`, data));
        this.success.set('Payment type updated');
      } else {
        await firstValueFrom(this.http.post('/payment-types', data));
        this.success.set('Payment type added');
      }
      this.showDialog.set(false);
      await this.load();
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to save');
    } finally { this.saving.set(false); }
  }

  openDelete(item: PaymentType, index: number) {
    this.deleteTarget.set(item);
    this.editIndex.set(index);
    this.showDelete.set(true);
  }

  closeDelete() { this.showDelete.set(false); this.deleteTarget.set(null); }

  async confirmDelete() {
    this.saving.set(true);
    try {
      const item = this.items()[this.editIndex()];
      await firstValueFrom(this.http.delete(`/payment-types/${item._id}`));
      this.success.set('Payment type deleted');
      this.showDelete.set(false);
      await this.load();
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to delete');
    } finally { this.saving.set(false); }
  }
}
