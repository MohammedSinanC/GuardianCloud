import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../../core/services/http-client.service';
import { ContentService } from '../../../core/services/content.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SiteInspectionService, SiteInspection } from '../../services/site-inspection.service';
import { WorkflowTimelineComponent } from '../../../shared/components/workflow-timeline/workflow-timeline.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-site-inspection-view',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, WorkflowTimelineComponent, StatusBadgeComponent, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './site-inspection-view.component.html',
  // Reuse the shared ERP sheet plus the inquiry-detail design language so this
  // page matches the Inquiry Detail layout (details-grid / detail-card / info-grid).
  styleUrls: ['../erp-shared.css', '../inquiry-detail/inquiry-detail.component.css', './site-inspection-view.component.css'],
})
export class SiteInspectionViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(SiteInspectionService);
  private httpClient = inject(HttpClientService);
  private contentService = inject(ContentService);
  private confirmService = inject(ConfirmService);
  inspection = signal<SiteInspection | null>(null);
  users = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  saving = signal(false);
  isEditing = signal(false);
  showReject = signal(false);
  rejectionReason = '';
  sidebarCollapsed = false;
  mobileMenuOpen = false;

  // Editable only while the workflow still allows changes (mirrors backend `update`)
  readonly editableStatuses = ['DRAFT', 'REJECTED', 'PENDING_APPROVAL'];

  /** Inspection Type dropdown source — Inspection Types master data */
  readonly inspectionTypeOptions = computed(() => this.contentService.inspectionTypes());

  /** Checklist master rows source — Checklist master data */
  readonly checklistMaster = computed(() => this.contentService.checklists());

  /** Dropdown options incl. the stored inspection type if it no longer matches a master entry */
  readonly inspectionTypeSelectOptions = computed(() => {
    const list = [...this.inspectionTypeOptions()];
    const current = this.inspection()?.inspectionType;
    if (current && !list.some((t) => t.code === current || t.label === current)) {
      list.push({ code: current, label: current });
    }
    return list;
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
    this.loadUsers();
    this.contentService.loadContent();
  }

  /** Inspector dropdown source — all users from User Master */
  async loadUsers() {
    try {
      const res: any = await firstValueFrom(this.httpClient.get('/users', { limit: 1000 }));
      if (res.success) {
        const list = [...(res.data || [])].sort((a: any, b: any) => this.userLabel(a).localeCompare(this.userLabel(b)));
        this.users.set(list);
      }
    } catch {
      this.users.set([]);
    }
  }

  userLabel(user: any): string {
    return user?.name || user?.username || '';
  }

  /** Dropdown options incl. the stored inspector if it no longer matches a user */
  inspectorOptions = computed(() => {
    const list = [...this.users()];
    const current = this.inspection()?.inspector;
    if (current && !list.some((u) => this.userLabel(u) === current)) {
      list.push({ _id: '__current__', name: current, username: '' });
    }
    return list;
  });

  // ── Inspector typeahead (searchable dropdown) ──
  inspectorSearch = signal('');
  showInspectorList = signal(false);

  filteredInspectors = computed(() => {
    const term = this.inspectorSearch().trim().toLowerCase();
    const options = this.inspectorOptions();
    if (!term) return options;
    return options.filter((u) => this.userLabel(u).toLowerCase().includes(term));
  });

  openInspectorList() {
    // Show all options on open; typing narrows via filteredInspectors
    this.inspectorSearch.set('');
    this.showInspectorList.set(true);
  }

  closeInspectorList() {
    // Delay so option clicks win over the blur that closes the list
    setTimeout(() => this.showInspectorList.set(false), 150);
  }

  selectInspector(user: any) {
    this.updateField('inspector', this.userLabel(user));
    this.inspectorSearch.set('');
    this.showInspectorList.set(false);
  }

  inspectorDisplayValue(): string {
    return this.inspection()?.inspector || '';
  }

  async load(id: string) {
    try {
      const response = await this.service.getById(id);
      this.inspection.set(response.data);
      this.isEditing.set(this.editableStatuses.includes(response.data.status));
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Inspection not found');
    } finally {
      this.loading.set(false);
    }
  }

  updateField(field: keyof SiteInspection, value: any) {
    const current = this.inspection();
    if (!current) return;
    this.inspection.set({ ...current, [field]: value });
  }

  // ── Checklist (from Checklist master, Settings → Master Data) ──
  /** Codes removed this session — keeps "Add Checklist" from resurrecting deleted rows */
  removedChecklistCodes = signal<Set<string>>(new Set());

  /** Current checklist rows (source of truth lives on the inspection document) */
  readonly checklistRows = computed(() => this.inspection()?.checklistItems || []);

  /** "Add Checklist" button — generates one row per master item with the right control type.
   *  Re-clicking merges: existing answers are kept, new master items appended, removed codes excluded. */
  generateChecklist() {
    const master = this.checklistMaster();
    if (!master.length) {
      this.error.set('No checklist items found in master data. Add items in Settings → Master Data → Checklist first.');
      return;
    }
    this.error.set('');
    const current = this.inspection();
    if (!current) return;
    const existing = current.checklistItems || [];
    const removed = this.removedChecklistCodes();
    const byCode = new Map(existing.map((row) => [row.code, row]));
    const masterCodes = new Set(master.map((m) => m.code));
    const rows: SiteInspection['checklistItems'] = master
      .filter((m) => !removed.has(m.code))
      .map((m) => byCode.get(m.code) ?? ({
        code: m.code,
        name: m.name,
        controlType: (m.controlType === 'CHECKBOX' ? 'CHECKBOX' : 'TEXTBOX') as 'CHECKBOX' | 'TEXTBOX',
        value: m.controlType === 'CHECKBOX' ? false : '',
        remarks: '',
      }));
    // Keep saved rows that no longer exist in master (unless removed this session)
    for (const row of existing) {
      if (!masterCodes.has(row.code) && !removed.has(row.code)) rows.push(row);
    }
    this.inspection.set({ ...current, checklistItems: rows });
  }

  /** Remove a checklist row from the inspection */
  removeChecklistRow(index: number) {
    const current = this.inspection();
    if (!current) return;
    const rows = [...(current.checklistItems || [])];
    const removedRow = rows[index];
    if (!removedRow) return;
    rows.splice(index, 1);
    const removed = new Set(this.removedChecklistCodes());
    removed.add(removedRow.code);
    this.removedChecklistCodes.set(removed);
    this.inspection.set({ ...current, checklistItems: rows });
  }

  updateChecklistValue(index: number, value: any) {
    const current = this.inspection();
    if (!current) return;
    const rows = [...(current.checklistItems || [])];
    if (!rows[index]) return;
    rows[index] = { ...rows[index], value };
    this.inspection.set({ ...current, checklistItems: rows });
  }

  updateChecklistRemarks(index: number, remarks: string) {
    const current = this.inspection();
    if (!current) return;
    const rows = [...(current.checklistItems || [])];
    if (!rows[index]) return;
    rows[index] = { ...rows[index], remarks };
    this.inspection.set({ ...current, checklistItems: rows });
  }

  // ── Site image upload: converted to base64 and persisted in MongoDB ──
  // Stored in the existing attachments array as { fileName, fileUrl (base64 data URL), fileType, uploadedAt }
  readonly maxImageBytes = 5 * 1024 * 1024;

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    const current = this.inspection();
    if (!files.length || !current) return;

    const accepted: any[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        this.error.set('Only image files can be uploaded.');
        continue;
      }
      if (file.size > this.maxImageBytes) {
        this.error.set(`"${file.name}" exceeds the 5MB image size limit.`);
        continue;
      }
      accepted.push({
        fileName: file.name,
        fileUrl: await this.readFileAsBase64(file),
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
      });
    }
    if (accepted.length) {
      this.updateField('attachments', [...(current.attachments || []), ...accepted]);
    }
  }

  /** Delete an attachment: confirm → persist immediately to the backend */
  async removeImage(index: number) {
    const current = this.inspection();
    if (!current) return;
    const image = (current.attachments || [])[index];
    if (!image) return;
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Attachment',
      message: `Delete "${image.fileName || 'this image'}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;
    const remaining = (current.attachments || []).filter((_, i) => i !== index);
    this.saving.set(true);
    try {
      // Persist right away so the file is gone without needing Save
      await this.service.update(current._id, { attachments: remaining });
      this.updateField('attachments', remaining);
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Unable to delete the attachment');
    } finally {
      this.saving.set(false);
    }
  }

  inputDate(value: string | null | undefined): string {
    return value ? value.substring(0, 10) : '';
  }

  formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleDateString('en-GB') : '-';
  }

  async saveDraft() {
    const item = this.inspection();
    if (!item) return;
    this.saving.set(true);
    try {
      await this.service.update(item._id, {
        inspectionDate: item.inspectionDate,
        checklistItems: item.checklistItems || [],
        location: item.location,
        inspector: item.inspector,
        inspectionType: item.inspectionType,
        findings: item.findings,
        pestType: item.pestType,
        affectedArea: item.affectedArea,
        severity: item.severity,
        recommendations: item.recommendations,
        requiredTreatment: item.requiredTreatment,
        estimatedWork: item.estimatedWork,
        remarks: item.remarks,
        attachments: item.attachments || [],
      });
      await this.load(item._id);
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Unable to save inspection');
    } finally {
      this.saving.set(false);
    }
  }

  async submit() {
    const item = this.inspection();
    if (!item) return;
    this.saving.set(true);
    try {
      // Persist the draft (incl. checklist answers) before moving the workflow forward
      await this.service.update(item._id, {
        inspectionDate: item.inspectionDate,
        location: item.location,
        inspector: item.inspector,
        inspectionType: item.inspectionType,
        findings: item.findings,
        pestType: item.pestType,
        affectedArea: item.affectedArea,
        checklistItems: item.checklistItems || [],
        severity: item.severity,
        recommendations: item.recommendations,
        requiredTreatment: item.requiredTreatment,
        estimatedWork: item.estimatedWork,
        remarks: item.remarks,
        attachments: item.attachments || [],
      });
      await this.service.submit(item._id);
      await this.load(item._id);
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Unable to submit');
    } finally {
      this.saving.set(false);
    }
  }

  async approve() {
    const item = this.inspection();
    if (!item) return;
    this.saving.set(true);
    try {
      await this.service.approve(item._id);
      await this.load(item._id);
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Unable to approve');
    } finally {
      this.saving.set(false);
    }
  }

  async reject() {
    const item = this.inspection();
    if (!item || !this.rejectionReason.trim()) return;
    this.saving.set(true);
    try {
      await this.service.reject(item._id, this.rejectionReason.trim());
      this.showReject.set(false);
      await this.load(item._id);
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Unable to reject');
    } finally {
      this.saving.set(false);
    }
  }

  closeRejectDialog() {
    if (!this.saving()) this.showReject.set(false);
  }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
}
