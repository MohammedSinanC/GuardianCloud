import { Component, inject, InjectionToken, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../../../core/services/http-client.service';

export interface MasterListItem {
  code: string;
  label: string;
}

/** Everything that makes one simple master different from the next. */
export interface MasterListConfig {
  /** Content-store section holding this master (e.g. `propertyTypes`). */
  contentKey: string;
  /** Page heading, e.g. "Property Types". */
  title: string;
  /** Explains where this master is used. */
  info: string;
  /** Singular noun used in messages, e.g. "property type". */
  itemNoun: string;
  /** Button text; falls back to "Add <singular title>". */
  addLabel?: string;
  /**
   * Options shown while the master has never been saved. Saving any change
   * stores this list as the customer's own.
   */
  defaults?: MasterListItem[];
  /** Notice shown while the built-in defaults are in use. */
  defaultsNotice?: string;
}

export const MASTER_LIST_CONFIG = new InjectionToken<MasterListConfig>('MASTER_LIST_CONFIG');

/**
 * A config-driven `code` + `label` master list.
 *
 * Every simple master (Property Types, Population Levels, Entry Points, …) is
 * the same page with different words, so it lives here once and Settings
 * supplies the config through injection. Only masters with extra behaviour
 * (extra columns, custom rules) need a component of their own.
 */
@Component({
  selector: 'app-master-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-list.component.html',
  styleUrls: ['../shared-master.css'],
})
export class MasterListComponent implements OnInit {
  private http = inject(HttpClientService);
  readonly config = inject(MASTER_LIST_CONFIG);

  loading = signal(true);
  saving = signal(false);
  usingDefaults = signal(false);
  items = signal<MasterListItem[]>([]);
  error = signal('');
  success = signal('');

  showDialog = signal(false);
  showDelete = signal(false);
  editIndex = signal(-1);
  deleteTarget = signal<MasterListItem | null>(null);
  formData = { code: '', label: '' };

  /** "Property Types" → "Property Type", used in headings and messages. */
  readonly singular = this.config.title.replace(/s$/, '');
  readonly addLabel = this.config.addLabel || `Add ${this.singular}`;
  readonly defaults = this.config.defaults ?? [];

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const res: any = await firstValueFrom(this.http.get(`/content/${this.config.contentKey}`));
      let list: MasterListItem[] = [];
      if (res.success && Array.isArray(res.data?.data)) {
        list = res.data.data;
      } else if (res.success && Array.isArray(res.data)) {
        list = res.data;
      }
      this.usingDefaults.set(list.length === 0 && this.defaults.length > 0);
      this.items.set(list.length ? list : this.defaults.map((item) => ({ ...item })));
    } catch {
      this.usingDefaults.set(this.defaults.length > 0);
      this.items.set(this.defaults.map((item) => ({ ...item })));
    } finally { this.loading.set(false); }
  }

  openAdd() {
    this.formData = { code: '', label: '' };
    this.editIndex.set(-1);
    this.showDialog.set(true);
  }

  openEdit(item: MasterListItem, index: number) {
    this.formData = { code: item.code, label: item.label };
    this.editIndex.set(index);
    this.showDialog.set(true);
  }

  closeDialog() { this.showDialog.set(false); }

  async save() {
    const code = (this.formData.code || '').trim().toUpperCase().replace(/\s+/g, '_');
    const label = (this.formData.label || '').trim();
    if (!code || !label) {
      this.error.set('Code and Label are required');
      return;
    }
    this.saving.set(true);
    try {
      const list = [...this.items()];
      const idx = this.editIndex();
      if (idx >= 0) {
        list[idx] = { code, label };
      } else {
        if (list.some((item) => item.code === code)) {
          this.error.set(`A ${this.config.itemNoun} with this code already exists`);
          this.saving.set(false);
          return;
        }
        list.push({ code, label });
      }
      await this.persist(list);
      this.items.set(list);
      this.usingDefaults.set(false);
      this.success.set(`${this.singular} ${idx >= 0 ? 'updated' : 'added'}`);
      this.showDialog.set(false);
      this.error.set('');
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to save');
    } finally { this.saving.set(false); }
  }

  openDelete(item: MasterListItem, index: number) {
    this.deleteTarget.set(item);
    this.editIndex.set(index);
    this.showDelete.set(true);
  }

  closeDelete() { this.showDelete.set(false); this.deleteTarget.set(null); }

  async confirmDelete() {
    this.saving.set(true);
    try {
      const idx = this.editIndex();
      const list = this.items().filter((_: MasterListItem, i: number) => i !== idx);
      await this.persist(list);
      this.items.set(list);
      this.usingDefaults.set(false);
      this.success.set(`${this.singular} deleted`);
      this.showDelete.set(false);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to delete');
    } finally { this.saving.set(false); }
  }

  private persist(list: MasterListItem[]) {
    return firstValueFrom(
      this.http.put(`/content/${this.config.contentKey}`, { data: list, section: this.config.contentKey }),
    );
  }
}
