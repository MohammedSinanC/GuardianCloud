import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkOrderService, WorkOrder } from '../../services/work-order.service';
import { WorkflowTimelineComponent } from '../../../shared/components/workflow-timeline/workflow-timeline.component';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
@Component({selector:'app-work-order-view',standalone:true,imports:[CommonModule,RouterLink,FormsModule,WorkflowTimelineComponent,AdminSidebarComponent,AdminTopbarComponent],templateUrl:'./work-order-view.component.html',styleUrl:'../erp-shared.css'})
export class WorkOrderViewComponent implements OnInit {private route=inject(ActivatedRoute);private service=inject(WorkOrderService);order=signal<WorkOrder|null>(null);loading=signal(true);error=signal('');busy=signal(false);showComplete=signal(false);completionNotes='';materialsUsed='';customerConfirmation='';sidebarCollapsed=false;mobileMenuOpen=false;
  // ── Assign work dialog ──
  showAssign=signal(false);
  assignForm={assignedTeam:'',assignedTechnician:'',scheduledDate:'',scheduledTime:'',workDescription:'',requiredMaterials:''};
  // ── Inline edit of the work order's own fields ──
  editing=signal(false);
  editForm={serviceType:'',serviceLocation:'',assignedTeam:'',assignedTechnician:'',scheduledDate:'',scheduledTime:'',workDescription:'',requiredMaterials:'',remarks:''};
  ngOnInit(){const id=this.route.snapshot.paramMap.get('id');if(id)this.load(id)}
  async load(id:string){try{const data=(await this.service.getById(id)).data;this.order.set(data);this.editing.set(data.status==='DRAFT')}catch(e:any){this.error.set(e?.error?.message||'Work order not found')}finally{this.loading.set(false)}}
  canAssign(){const o=this.order();return !!o&&!['WORK_STARTED','WORK_COMPLETED','CANCELLED','REJECTED'].includes(o.status)}
  /** All WO fields editable until the work has started. */
  canEdit(){const o=this.order();return !!o&&!['WORK_STARTED','WORK_COMPLETED','CANCELLED','REJECTED'].includes(o.status)}
  startEdit(){const o=this.order();if(!o)return;this.editForm={serviceType:o.serviceType||'',serviceLocation:o.serviceLocation||'',assignedTeam:o.assignedTeam||'',assignedTechnician:o.assignedTechnician||'',scheduledDate:o.scheduledDate?o.scheduledDate.substring(0,10):'',scheduledTime:o.scheduledTime||'',workDescription:o.workDescription||'',requiredMaterials:o.requiredMaterials||'',remarks:o.remarks||''};this.editing.set(true)}
  cancelEdit(){if(this.order()?.status!=='DRAFT')this.editing.set(false)}
  async saveEdit(){const o=this.order();if(!o)return;this.busy.set(true);try{await this.service.update(o._id,{serviceType:this.editForm.serviceType,serviceLocation:this.editForm.serviceLocation,assignedTeam:this.editForm.assignedTeam,assignedTechnician:this.editForm.assignedTechnician,scheduledDate:this.editForm.scheduledDate||null,scheduledTime:this.editForm.scheduledTime,workDescription:this.editForm.workDescription,requiredMaterials:this.editForm.requiredMaterials,remarks:this.editForm.remarks});this.editing.set(false);await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to update the work order')}finally{this.busy.set(false)}}
  openAssign(){const o=this.order();if(!o)return;this.assignForm={assignedTeam:o.assignedTeam||'',assignedTechnician:o.assignedTechnician||'',scheduledDate:o.scheduledDate?o.scheduledDate.substring(0,10):'',scheduledTime:o.scheduledTime||'',workDescription:o.workDescription||'',requiredMaterials:o.requiredMaterials||''};this.showAssign.set(true)}
  closeAssign(){if(!this.busy())this.showAssign.set(false)}
  async saveAssign(){const o=this.order();if(!o)return;this.busy.set(true);try{await this.service.assign(o._id,{...this.assignForm,scheduledDate:this.assignForm.scheduledDate||null});this.showAssign.set(false);await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to assign the work')}finally{this.busy.set(false)}}
  async approve(){const o=this.order();if(!o)return;this.busy.set(true);try{await this.service.approve(o._id);await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to approve')}finally{this.busy.set(false)}}
  async start(){const o=this.order();if(!o)return;this.busy.set(true);try{await this.service.start(o._id);await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to start work')}finally{this.busy.set(false)}}
  async complete(){const o=this.order();if(!o||!this.completionNotes.trim())return;this.busy.set(true);try{await this.service.complete(o._id,{completionNotes:this.completionNotes,materialsUsed:this.materialsUsed,customerConfirmation:this.customerConfirmation});this.showComplete.set(false);await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to complete work')}finally{this.busy.set(false)}}
  orderServiceType(o:WorkOrder){return (o as any).quotationId?.serviceType||(o as any).inquiryId?.serviceType||''}
  orderLocation(o:WorkOrder){return (o as any).quotationId?.serviceLocation||(o as any).inquiryId?.serviceLocation||(o as any).inquiryId?.location||''}
  toggleMobileMenu(){this.mobileMenuOpen=!this.mobileMenuOpen}closeMobileMenu(){this.mobileMenuOpen=false}}
