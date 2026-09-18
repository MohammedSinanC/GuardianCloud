import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../../../core/services/http-client.service';

interface LocationItem {
  city: string;
  label?: string;
  area?: string;
  address?: string;
  phone?: string;
  workingHours?: string;
  isMainBranch?: boolean;
  mapUrl?: string;
}

const DEFAULT_LOCATIONS: LocationItem[] = [
  { city: 'Abu Dhabi', area: 'Al Musalla' },
  { city: 'Dubai', area: 'Al Quoz' },
  { city: 'Sharjah', area: 'Al Nahda' },
  { city: 'Ajman', area: 'Al Nuaimiya' },
  { city: 'Ras Al Khaimah', area: '' },
  { city: 'Fujairah', area: '' },
  { city: 'Umm Al Quwain', area: '' },
  { city: 'Al Ain', area: '' },
];

@Component({
  selector: 'app-location-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="master-page">
      <div class="master-header">
        <h2>Location Master</h2>
        <button class="btn-add" (click)="openAdd()">
          <span class="material-icons-outlined">add</span> Add Location
        </button>
      </div>

      @if (loading()) {
        <div class="skeleton-form"><div class="skeleton-row"><div class="skeleton-field"></div></div></div>
      }

      @if (!loading()) {
        <div class="table-wrap">
          <table class="tbl">
            <thead><tr><th>#</th><th>Location</th><th>Area</th><th>Actions</th></tr></thead>
            <tbody>
              @for (item of items(); track item.city; let i = $index) {
                <tr>
                  <td class="cell-muted">{{ i + 1 }}</td>
                  <td class="bold">{{ item.city }}</td>
                  <td>{{ item.area || '-' }}</td>
                  <td>
                    <button class="act-btn" (click)="openEdit(item)">
                      <span class="material-icons-outlined">edit</span>
                    </button>
                  </td>
                </tr>
              }
              @if (items().length === 0) {
                <tr><td colspan="4" class="empty">No locations configured</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (showDialog()) {
      <div class="dlg-overlay" (click)="closeDialog()">
        <div class="dlg" (click)="$event.stopPropagation()">
          <div class="dlg-header">
            <h3>{{ editingCity() ? 'Edit Location' : 'Add Location' }}</h3>
            <button class="dlg-close" (click)="closeDialog()">×</button>
          </div>
          <div class="dlg-body">
            <div class="fg">
              <label>City *</label>
              <input class="fi" [(ngModel)]="form.city" [disabled]="!!editingCity()" placeholder="e.g. Abu Dhabi" />
            </div>
            <div class="fg">
              <label>Area</label>
              <input class="fi" [(ngModel)]="form.area" placeholder="e.g. Al Musalla" />
            </div>
          </div>
          <div class="dlg-footer">
            <button class="btn-cancel" (click)="closeDialog()" [disabled]="saving()">Cancel</button>
            <button class="btn-save" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../shared-master.css'],
})
export class LocationMasterComponent implements OnInit {
  private http = inject(HttpClientService);

  loading = signal(true);
  saving = signal(false);
  showDialog = signal(false);
  editingCity = signal('');
  items = signal<LocationItem[]>([]);
  form: LocationItem = { city: '', area: '' };

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const response: any = await firstValueFrom(this.http.get('/content/locations'));
      const data = Array.isArray(response?.data?.data)
        ? response.data.data
        : (Array.isArray(response?.data) ? response.data : []);
      this.items.set(data.length ? data : DEFAULT_LOCATIONS);
    } catch {
      this.items.set(DEFAULT_LOCATIONS);
    } finally {
      this.loading.set(false);
    }
  }

  openAdd() {
    this.editingCity.set('');
    this.form = { city: '', area: '' };
    this.showDialog.set(true);
  }

  openEdit(item: LocationItem) {
    this.editingCity.set(item.city);
    this.form = { ...item };
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  async save() {
    const city = this.form.city.trim();
    if (!city) return;

    const existingCity = this.editingCity();
    if (!existingCity && this.items().some((item) => item.city.toLowerCase() === city.toLowerCase())) return;

    const updated = existingCity
      ? this.items().map((item) => item.city === existingCity ? { ...item, ...this.form, city } : item)
      : [...this.items(), { ...this.form, city }];

    this.saving.set(true);
    try {
      await firstValueFrom(this.http.put('/content/locations', { data: updated, section: 'locations' }));
      this.items.set(updated);
      this.closeDialog();
    } finally {
      this.saving.set(false);
    }
  }
}
