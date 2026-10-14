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
  // ── Start Work dialog: work-start evidence images ──
  showStart=signal(false);
  startEvidence: { fileName: string; data: string }[] = [];
  startEvidencePreviews: string[] = [];
  // ── Complete dialog: work-completion evidence images ──
  completeEvidence: { fileName: string; data: string }[] = [];
  completeEvidencePreviews: string[] = [];
  // ── Assign work dialog ──
  showAssign=signal(false);
  assignForm={assignedTeam:'',assignedTechnician:'',scheduledDate:'',scheduledTime:'',workDescription:'',requiredMaterials:''};
  // ── Inline edit of the work order's own fields ──
  editing=signal(false);
  editForm={serviceType:'',serviceLocation:'',assignedTeam:'',assignedTechnician:'',scheduledDate:'',scheduledTime:'',workDescription:'',requiredMaterials:'',remarks:''};
  ngOnInit(){const id=this.route.snapshot.paramMap.get('id');if(id)this.load(id)}
  async load(id:string){try{const data=(await this.service.getById(id)).data;this.order.set(data);this.editing.set(false)}catch(e:any){this.error.set(e?.error?.message||'Work order not found')}finally{this.loading.set(false)}}
  canAssign(){const o=this.order();return !!o&&!['WORK_STARTED','WORK_COMPLETED','CANCELLED','REJECTED'].includes(o.status)}
  /** All WO fields editable until the work has started. */
  canEdit(){const o=this.order();return !!o&&!['WORK_STARTED','WORK_COMPLETED','CANCELLED','REJECTED'].includes(o.status)}
  startEdit(){const o=this.order();if(!o)return;this.editForm={serviceType:o.serviceType||'',serviceLocation:o.serviceLocation||'',assignedTeam:o.assignedTeam||'',assignedTechnician:o.assignedTechnician||'',scheduledDate:o.scheduledDate?o.scheduledDate.substring(0,10):'',scheduledTime:o.scheduledTime||'',workDescription:o.workDescription||'',requiredMaterials:o.requiredMaterials||'',remarks:o.remarks||''};this.editing.set(true)}
  cancelEdit(){this.editing.set(false)}
  async saveEdit(){const o=this.order();if(!o)return;this.busy.set(true);try{await this.service.update(o._id,{serviceType:this.editForm.serviceType,serviceLocation:this.editForm.serviceLocation,assignedTeam:this.editForm.assignedTeam,assignedTechnician:this.editForm.assignedTechnician,scheduledDate:this.editForm.scheduledDate||null,scheduledTime:this.editForm.scheduledTime,workDescription:this.editForm.workDescription,requiredMaterials:this.editForm.requiredMaterials,remarks:this.editForm.remarks});this.editing.set(false);await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to update the work order')}finally{this.busy.set(false)}}
  openAssign(){const o=this.order();if(!o)return;this.assignForm={assignedTeam:o.assignedTeam||'',assignedTechnician:o.assignedTechnician||'',scheduledDate:o.scheduledDate?o.scheduledDate.substring(0,10):'',scheduledTime:o.scheduledTime||'',workDescription:o.workDescription||'',requiredMaterials:o.requiredMaterials||''};this.showAssign.set(true)}
  closeAssign(){if(!this.busy())this.showAssign.set(false)}
  async saveAssign(){const o=this.order();if(!o)return;this.busy.set(true);try{await this.service.assign(o._id,{...this.assignForm,scheduledDate:this.assignForm.scheduledDate||null});this.showAssign.set(false);await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to assign the work')}finally{this.busy.set(false)}}

  // ── Start Work dialog with evidence upload ──
  openStart(){this.startEvidence=[];this.startEvidencePreviews=[];this.showStart.set(true)}
  closeStart(){if(!this.busy())this.showStart.set(false)}
  /** Convert chosen images to base64 data URLs for preview and storage. */
  onStartFilesChosen(event:Event){const input=event.target as HTMLInputElement;const files=Array.from(input?.files||[]);const images=files.filter(f=>f.type.startsWith('image/'));if(!images.length){input.value='';return}const remaining=10-this.startEvidence.length;images.slice(0,remaining).forEach(file=>{const reader=new FileReader();reader.onload=()=>{const data=String(reader.result);this.startEvidence.push({fileName:file.name,data});this.startEvidencePreviews=[...this.startEvidencePreviews,data]};reader.readAsDataURL(file)});input.value=''}
  removeStartEvidence(index:number){this.startEvidence.splice(index,1);this.startEvidencePreviews.splice(index,1)}
  async confirmStart(){const o=this.order();if(!o||this.busy())return;this.busy.set(true);try{await this.service.startWithEvidence(o._id,this.startEvidence);this.showStart.set(false);this.startEvidence=[];this.startEvidencePreviews=[];await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to start the work')}finally{this.busy.set(false)}}

  // ── Complete Work dialog with evidence upload ──
  openComplete(){this.completionNotes='';this.materialsUsed='';this.customerConfirmation='';this.completeEvidence=[];this.completeEvidencePreviews=[];this.showComplete.set(true)}
  onCompleteFilesChosen(event:Event){const input=event.target as HTMLInputElement;const files=Array.from(input?.files||[]);const images=files.filter(f=>f.type.startsWith('image/'));if(!images.length){input.value='';return}const remaining=10-this.completeEvidence.length;images.slice(0,remaining).forEach(file=>{const reader=new FileReader();reader.onload=()=>{const data=String(reader.result);this.completeEvidence.push({fileName:file.name,data});this.completeEvidencePreviews=[...this.completeEvidencePreviews,data]};reader.readAsDataURL(file)});input.value=''}
  removeCompleteEvidence(index:number){this.completeEvidence.splice(index,1);this.completeEvidencePreviews.splice(index,1)}
  async approve(){const o=this.order();if(!o)return;this.busy.set(true);try{await this.service.approve(o._id);await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to approve')}finally{this.busy.set(false)}}
  async start(){const o=this.order();if(!o)return;this.busy.set(true);try{await this.service.start(o._id);await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to start work')}finally{this.busy.set(false)}}
  async complete(){const o=this.order();if(!o||!this.completionNotes.trim())return;this.busy.set(true);try{await this.service.complete(o._id,{completionNotes:this.completionNotes,materialsUsed:this.materialsUsed,customerConfirmation:this.customerConfirmation,workCompletionEvidence:this.completeEvidence});this.showComplete.set(false);this.completeEvidence=[];this.completeEvidencePreviews=[];await this.load(o._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to complete work')}finally{this.busy.set(false)}}
  editFormValid(){const f=this.editForm;return !!(f.serviceType.trim()&&f.serviceLocation.trim()&&f.assignedTechnician.trim()&&!!f.scheduledDate&&f.scheduledTime.trim()&&f.workDescription.trim())}
  /** Required-field gate for the Assign Work dialog (technician, schedule, description). */
  assignFormValid(){const f=this.assignForm;return !!(f.assignedTechnician.trim()&&!!f.scheduledDate&&f.scheduledTime.trim()&&f.workDescription.trim())}
  orderServiceType(o:WorkOrder){return (o as any).quotationId?.serviceType||(o as any).inquiryId?.serviceType||''}
  orderLocation(o:WorkOrder){return (o as any).quotationId?.serviceLocation||(o as any).inquiryId?.serviceLocation||(o as any).inquiryId?.location||''}
  toggleMobileMenu(){this.mobileMenuOpen=!this.mobileMenuOpen}closeMobileMenu(){this.mobileMenuOpen=false}}
