import { Component, OnInit, signal, inject, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
import { WorkflowDataService } from './workflow.service';
import { HttpClientService } from '../../../core/services/http-client.service';
import { WorkflowStage, WorkflowAction } from './models/workflow.model';

interface NodePos {
  stageCode: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  bg: string;
  border: string;
  shape: string;
  phase: string;
  phaseLabel: string;
  phaseColor: string;
  phaseBg: string;
}

interface Arrow {
  x1: number; y1: number;
  x2: number; y2: number;
  midX: number; midY: number;
  label: string;
  color: string;
  dashed: boolean;
}

interface PhaseBand {
  key: string;
  label: string;
  color: string;
  bg: string;
  x: number; y: number;
  w: number; h: number;
}

@Component({
  selector: 'app-workflow',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './workflow.component.html',
  styleUrls: ['./workflow.component.css'],
})
export class WorkflowComponent implements OnInit, AfterViewInit {
  private workflowService = inject(WorkflowDataService);
  private httpClient = inject(HttpClientService);

  sidebarCollapsed = false;
  mobileMenuOpen = false;
  loading = signal(true);

  // Data
  allStages = signal<WorkflowStage[]>([]);

  // Calculated layout
  nodePositions = signal<NodePos[]>([]);
  arrows = signal<Arrow[]>([]);
  phaseBands = signal<PhaseBand[]>([]);
  canvasW = 100;
  canvasH = 100;

  // Inquiry
  currentInquiryId = signal('');
  currentStageCode = signal('');
  currentActions = signal<WorkflowAction[]>([]);

  // Dialog
  showDialog = signal(false);
  dialogMode = signal<'add' | 'edit'>('add');
  dialogType = signal<'stage' | 'action'>('stage');
  formStageCode = '';
  formStageName = '';
  formStageType: 'normal' | 'terminal' | 'reject' | 'hold' = 'normal';
  formIsInitial = false;
  formIsFinal = false;
  formDescription = '';
  editingStageId = '';
  formActionStageCode = '';
  formActionCode = '';
  formActionName = '';
  formNextStageCode = '';
  formRejectStageCode = '';
  formButtonColor = 'primary';
  formRequiresComment = false;
  formMailRequired = false;
  formMailRecipients = '';
  editingActionId = '';

  showDeleteConfirm = signal(false);
  deleteTarget = signal<{ type: 'stage' | 'action'; id: string; name: string } | null>(null);
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'success';

  // Zoom/pan
  zoom = 1;
  panX = 0;
  panY = 0;
  private dragging = false;
  private dragX = 0;
  private dragY = 0;
  private panSX = 0;
  private panSY = 0;

  // Layout constants
  private readonly NW = 170;
  private readonly NH = 60;
  private readonly GX = 120;
  private readonly GY = 90;
  private readonly OX = 80;
  private readonly OY = 60;
  private readonly CHIPOFFSET = 28;

  // Grid: [row, col] per stage
  private grid: Record<string, [number, number, string]> = {
    CREATED:              [0, 0, 'collect'],
    SUBMITTED:            [1, 0, 'collect'],
    UNDER_REVIEW:         [0, 1, 'review'],
    INSPECTION_REQUIRED:  [1, 1, 'review'],
    INSPECTION_SCHEDULED: [2, 1, 'review'],
    INSPECTION_COMPLETED: [3, 1, 'review'],
    INSPECTION_FAILED:    [4, 1, 'review'],
    QUOTATION_PREPARED:   [0, 2, 'deliver'],
    QUOTATION_SENT:       [1, 2, 'deliver'],
    QUOTATION_APPROVED:   [2, 2, 'deliver'],
    QUOTATION_REJECTED:   [3, 2, 'deliver'],
    SERVICE_SCHEDULED:    [0, 3, 'deliver'],
    TECHNICIAN_ASSIGNED:  [1, 3, 'deliver'],
    SERVICE_IN_PROGRESS:  [2, 3, 'deliver'],
    SERVICE_COMPLETED:    [3, 3, 'deliver'],
    INVOICE_GENERATED:    [4, 3, 'deliver'],
    PAYMENT_PENDING:      [5, 3, 'deliver'],
    COMPLETED:            [0, 4, 'archive'],
    CANCELLED:            [1, 4, 'archive'],
    REJECTED:             [2, 4, 'archive'],
  };

  private colors: Record<string, [string, string, string, string]> = {
    CREATED:              ['#64748b', '#f8fafc', '#cbd5e1', 'rounded'],
    SUBMITTED:            ['#3b82f6', '#eff6ff', '#93c5fd', 'rounded'],
    UNDER_REVIEW:         ['#7c3aed', '#f5f3ff', '#c4b5fd', 'rounded'],
    INSPECTION_REQUIRED:  ['#f59e0b', '#fffbeb', '#fcd34d', 'rounded'],
    INSPECTION_SCHEDULED: ['#f97316', '#fff7ed', '#fdba74', 'rounded'],
    INSPECTION_COMPLETED: ['#10b981', '#ecfdf5', '#6ee7b7', 'rounded'],
    INSPECTION_FAILED:    ['#ef4444', '#fef2f2', '#fca5a5', 'oval'],
    QUOTATION_PREPARED:   ['#0891b2', '#ecfeff', '#67e8f9', 'rounded'],
    QUOTATION_SENT:       ['#0ea5e9', '#f0f9ff', '#7dd3fc', 'rounded'],
    QUOTATION_APPROVED:   ['#16a34a', '#f0fdf4', '#86efac', 'rounded'],
    QUOTATION_REJECTED:   ['#dc2626', '#fef2f2', '#fca5a5', 'oval'],
    SERVICE_SCHEDULED:    ['#6366f1', '#eef2ff', '#a5b4fc', 'rounded'],
    TECHNICIAN_ASSIGNED:  ['#8b5cf6', '#faf5ff', '#c4b5fd', 'rounded'],
    SERVICE_IN_PROGRESS:  ['#f43f5e', '#fff1f2', '#fda4af', 'rounded'],
    SERVICE_COMPLETED:    ['#22c55e', '#f0fdf4', '#86efac', 'rounded'],
    INVOICE_GENERATED:    ['#0d9488', '#f0fdfa', '#5eead4', 'rounded'],
    PAYMENT_PENDING:      ['#eab308', '#fefce8', '#fde047', 'rounded'],
    COMPLETED:            ['#16a34a', '#f0fdf4', '#86efac', 'circle'],
    CANCELLED:            ['#94a3b8', '#f8fafc', '#cbd5e1', 'circle'],
    REJECTED:             ['#dc2626', '#fef2f2', '#fca5a5', 'circle'],
  };

  private phaseInfo: Record<string, { label: string; color: string; bg: string }> = {
    collect: { label: 'Phase 1 — Collect', color: '#e53935', bg: '#ffebee' },
    review:  { label: 'Phase 2 — Manage / Review', color: '#7b1fa2', bg: '#f3e5f5' },
    deliver: { label: 'Phase 3 — Deliver', color: '#2e7d32', bg: '#e8f5e9' },
    archive: { label: 'Phase 4 — Store / Archive', color: '#1565c0', bg: '#e3f2fd' },
  };

  ngOnInit() { this.loadWorkflow(); }
  ngAfterViewInit() {}

  async loadWorkflow() {
    this.loading.set(true);
    try {
      const res: any = await this.workflowService.getConfig().toPromise();
      if (res?.success) {
        this.allStages.set(res.data.stages);
        this.calculateLayout();
      }
    } catch {
      this.showToast('Failed to load workflow', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  // ===== LAYOUT CALCULATION =====
  private calculateLayout() {
    const stages = this.allStages();
    const nodes: NodePos[] = [];
    let maxX = 0, maxY = 0;

    // Group by phase for bands
    const phaseGroups: Record<string, NodePos[]> = {};

    for (const stage of stages) {
      const g = this.grid[stage.stageCode];
      if (!g) continue;
      const [row, col, phase] = g;
      const c = this.colors[stage.stageCode] || ['#64748b', '#f8fafc', '#e2e8f0', 'rounded'];
      const isCircle = stage.isFinal && stage.stageType !== 'reject';
      const w = isCircle ? 100 : this.NW;
      const h = isCircle ? 100 : this.NH;
      const x = this.OX + col * (this.NW + this.GX) + (isCircle ? (this.NW - 100) / 2 : 0);
      const y = this.OY + row * (this.NH + this.GY);
      const pi = this.phaseInfo[phase];

      const node: NodePos = {
        stageCode: stage.stageCode,
        x, y, w, h,
        color: c[0], bg: c[1], border: c[2], shape: c[3],
        phase, phaseLabel: pi?.label || phase,
        phaseColor: pi?.color || '#64748b', phaseBg: pi?.bg || '#f1f5f9',
      };

      nodes.push(node);
      if (!phaseGroups[phase]) phaseGroups[phase] = [];
      phaseGroups[phase].push(node);

      if (x + w > maxX) maxX = x + w;
      if (y + h + this.CHIPOFFSET + 20 > maxY) maxY = y + h + this.CHIPOFFSET + 20;
    }

    this.nodePositions.set(nodes);
    this.canvasW = maxX + 100;
    this.canvasH = maxY + 100;

    // Calculate arrows
    this.calculateArrows(stages, nodes);

    // Calculate phase bands
    this.calculatePhaseBands(phaseGroups);
  }

  private calculateArrows(stages: WorkflowStage[], nodes: NodePos[]) {
    const nodeMap = new Map(nodes.map(n => [n.stageCode, n]));
    const arrows: Arrow[] = [];
    const seen = new Set<string>();

    for (const stage of stages) {
      const from = nodeMap.get(stage.stageCode);
      if (!from) continue;

      for (const action of stage.actions || []) {
        // Main arrow
        if (action.nextStageCode && action.nextStageCode !== stage.stageCode) {
          const key = `${stage.stageCode}->${action.nextStageCode}`;
          if (!seen.has(key)) {
            seen.add(key);
            const to = nodeMap.get(action.nextStageCode);
            if (to) {
              const isReject = ['REJECTED', 'CANCELLED', 'QUOTATION_REJECTED', 'INSPECTION_FAILED'].includes(action.nextStageCode);
              arrows.push(this.makeArrow(from, to, action.actionName, isReject));
            }
          }
        }
      }
    }

    this.arrows.set(arrows);
  }

  private makeArrow(from: NodePos, to: NodePos, label: string, dashed: boolean): Arrow {
    const fromCX = from.x + from.w / 2;
    const toCX = to.x + to.w / 2;

    let x1: number, y1: number, x2: number, y2: number;

    // Determine connection direction
    if (Math.abs(from.y - to.y) > 10) {
      // Vertical connection (top-bottom)
      x1 = fromCX;
      y1 = from.y + from.h + this.CHIPOFFSET;
      x2 = toCX;
      y2 = to.y;
    } else {
      // Horizontal connection (left-right)
      x1 = from.x + from.w;
      y1 = from.y + from.h / 2;
      x2 = to.x;
      y2 = to.y + to.h / 2;
    }

    return {
      x1, y1, x2, y2,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2 - 6,
      label,
      color: dashed ? '#dc2626' : '#94a3b8',
      dashed,
    };
  }

  private calculatePhaseBands(groups: Record<string, NodePos[]>) {
    const bands: PhaseBand[] = [];
    const PAD = 20;

    for (const [phase, nodes] of Object.entries(groups)) {
      if (nodes.length === 0) continue;
      const pi = this.phaseInfo[phase];
      let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
      for (const n of nodes) {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + n.w > maxX) maxX = n.x + n.w;
        if (n.y + n.h + this.CHIPOFFSET + 10 > maxY) maxY = n.y + n.h + this.CHIPOFFSET + 10;
      }
      bands.push({
        key: phase,
        label: pi?.label || phase,
        color: pi?.color || '#64748b',
        bg: pi?.bg || '#f1f5f9',
        x: minX - PAD,
        y: minY - PAD - 20,
        w: maxX - minX + PAD * 2,
        h: maxY - minY + PAD * 2 + 20,
      });
    }

    this.phaseBands.set(bands);
  }

  // ===== HELPERS =====
  isCurrent(code: string): boolean { return this.currentStageCode() === code; }

  isPassed(code: string): boolean {
    if (!this.currentStageCode()) return false;
    const codes = this.allStages().map(s => s.stageCode);
    const ci = codes.indexOf(this.currentStageCode());
    const i = codes.indexOf(code);
    return ci > -1 && i > -1 && i < ci;
  }

  getNodeTag(stage: WorkflowStage): string {
    if (stage.isInitial) return 'START';
    if (stage.isFinal && stage.stageType === 'terminal') return 'END';
    if (stage.stageType === 'reject') return 'REJECT';
    return '';
  }

  getNodeTagClass(stage: WorkflowStage): string {
    if (stage.isInitial) return 'tag-start';
    if (stage.isFinal && stage.stageType === 'terminal') return 'tag-end';
    if (stage.stageType === 'reject') return 'tag-reject';
    return '';
  }

  getActionColor(color: string): string {
    const c: Record<string, string> = {
      primary: '#0d9488', success: '#16a34a', danger: '#dc2626',
      warning: '#d97706', info: '#2563eb', secondary: '#6b7280'
    };
    return c[color] || c['primary'];
  }

  // ===== ZOOM/PAN =====
  get transform(): string {
    return `scale(${this.zoom}) translate(${this.panX}px, ${this.panY}px)`;
  }

  onCanvasMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.er-node')) return;
    this.dragging = true;
    this.dragX = e.clientX;
    this.dragY = e.clientY;
    this.panSX = this.panX;
    this.panSY = this.panY;
    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocMouseMove(e: MouseEvent) {
    if (!this.dragging) return;
    this.panX = this.panSX + (e.clientX - this.dragX);
    this.panY = this.panSY + (e.clientY - this.dragY);
  }

  @HostListener('document:mouseup')
  onDocMouseUp() { this.dragging = false; }

  onCanvasWheel(e: WheelEvent) {
    e.preventDefault();
    const d = e.deltaY > 0 ? -0.05 : 0.05;
    this.zoom = Math.min(Math.max(this.zoom + d, 0.25), 2);
  }

  zoomIn() { this.zoom = Math.min(this.zoom + 0.1, 2); }
  zoomOut() { this.zoom = Math.max(this.zoom - 0.1, 0.25); }
  zoomReset() { this.zoom = 1; this.panX = 0; this.panY = 0; }

  // ===== DIALOG =====
  openAddStageDialog() {
    this.dialogMode.set('add'); this.dialogType.set('stage');
    this.formStageCode = ''; this.formStageName = ''; this.formStageType = 'normal';
    this.formIsInitial = false; this.formIsFinal = false; this.formDescription = '';
    this.editingStageId = ''; this.showDialog.set(true);
  }

  openEditStageDialog(stage: WorkflowStage) {
    this.dialogMode.set('edit'); this.dialogType.set('stage');
    this.formStageCode = stage.stageCode; this.formStageName = stage.stageName;
    this.formStageType = stage.stageType; this.formIsInitial = stage.isInitial;
    this.formIsFinal = stage.isFinal; this.formDescription = stage.description || '';
    this.editingStageId = stage._id || ''; this.showDialog.set(true);
  }

  openAddActionDialog(stageCode: string) {
    this.dialogMode.set('add'); this.dialogType.set('action');
    this.formActionStageCode = stageCode; this.formActionCode = ''; this.formActionName = '';
    this.formNextStageCode = ''; this.formRejectStageCode = ''; this.formButtonColor = 'primary';
    this.formRequiresComment = false; this.formMailRequired = false; this.formMailRecipients = '';
    this.editingActionId = ''; this.showDialog.set(true);
  }

  closeDialog() { this.showDialog.set(false); }

  async saveStage() {
    const data: any = {
      stageCode: this.formStageCode.toUpperCase().replace(/\s+/g, '_'),
      stageName: this.formStageName, stageType: this.formStageType,
      isInitial: this.formIsInitial, isFinal: this.formIsFinal, description: this.formDescription,
    };
    try {
      if (this.dialogMode() === 'edit') {
        await this.workflowService.updateStage(this.editingStageId, data).toPromise();
      } else {
        await this.workflowService.createStage(data).toPromise();
      }
      this.showToast(this.dialogMode() === 'edit' ? 'Stage updated' : 'Stage created', 'success');
      this.closeDialog(); await this.loadWorkflow();
    } catch (e: any) { this.showToast(e?.error?.message || 'Failed', 'error'); }
  }

  async saveAction() {
    const data: any = {
      stageCode: this.formActionStageCode,
      actionCode: this.formActionCode.toUpperCase().replace(/\s+/g, '_'),
      actionName: this.formActionName,
      nextStageCode: this.formNextStageCode || null,
      rejectStageCode: this.formRejectStageCode || null,
      buttonColor: this.formButtonColor, requiresComment: this.formRequiresComment,
      mailRequired: this.formMailRequired, mailRecipients: this.formMailRecipients,
    };
    try {
      if (this.dialogMode() === 'edit') {
        await this.workflowService.updateAction(this.editingActionId, data).toPromise();
      } else {
        await this.workflowService.createAction(data).toPromise();
      }
      this.showToast(this.dialogMode() === 'edit' ? 'Action updated' : 'Action created', 'success');
      this.closeDialog(); await this.loadWorkflow();
    } catch (e: any) { this.showToast(e?.error?.message || 'Failed', 'error'); }
  }

  confirmDelete(type: 'stage' | 'action', id: string, name: string) {
    this.deleteTarget.set({ type, id, name }); this.showDeleteConfirm.set(true);
  }

  async executeDelete() {
    const t = this.deleteTarget(); if (!t) return;
    try {
      if (t.type === 'stage') await this.workflowService.deleteStage(t.id).toPromise();
      else await this.workflowService.deleteAction(t.id).toPromise();
      this.showToast(`${t.type} deleted`, 'success');
      this.showDeleteConfirm.set(false); this.deleteTarget.set(null);
      await this.loadWorkflow();
    } catch (e: any) { this.showToast(e?.error?.message || 'Failed', 'error'); }
  }

  cancelDelete() { this.showDeleteConfirm.set(false); this.deleteTarget.set(null); }

  async loadInquiry(id: string) {
    if (!id.trim()) return;
    try {
      const res: any = await this.httpClient.get(`/workflow/INQUIRY/${id}/actions`).toPromise();
      if (res?.success) {
        this.currentStageCode.set(res.data.currentStage.code);
        this.currentActions.set(res.data.actions);
        this.showToast(`Stage: ${res.data.currentStage.name}`, 'success');
      }
    } catch {
      this.showToast('Inquiry not found', 'error');
      this.currentStageCode.set(''); this.currentActions.set([]);
    }
  }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }

  showToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    this.toastMessage = msg; this.toastType = type;
    setTimeout(() => this.toastMessage = '', 4000);
  }
}
