import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuotationService } from '../../services/quotation.service';
import { WorkflowTimelineComponent } from '../../../shared/components/workflow-timeline/workflow-timeline.component';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
@Component({selector:'app-quotation-view',standalone:true,imports:[CommonModule,RouterLink,FormsModule,WorkflowTimelineComponent,AdminSidebarComponent,AdminTopbarComponent],templateUrl:'./quotation-view.component.html',styleUrl:'../erp-shared.css'})
export class QuotationViewComponent implements OnInit { private route=inject(ActivatedRoute);private service=inject(QuotationService);quotation=signal<any>(null);loading=signal(true);error=signal('');busy=signal(false);downloadingPdf=signal(false);showReject=signal(false);reason='';sidebarCollapsed=false;mobileMenuOpen=false;
  // ── Quotation items editor (before submit) ──
  itemRows=signal<any[]>([]);
  ngOnInit(){const id=this.route.snapshot.paramMap.get('id');if(id)this.load(id)}async load(id:string){try{const q=(await this.service.getById(id)).data;this.quotation.set(q);this.itemRows.set((q.items||[]).map((i:any)=>({...i})))}catch(e:any){this.error.set(e?.error?.message||'Quotation not found')}finally{this.loading.set(false)}}
  canEditItems(){const q=this.quotation();return !!q&&['DRAFT','REJECTED'].includes(q.status)}
  addItemRow(){this.itemRows.update(rows=>[...rows,{description:'',quantity:1,unitPrice:0,totalPrice:0}])}
  removeItemRow(index:number){this.itemRows.update(rows=>rows.filter((_,i)=>i!==index))}
  updateItemRow(index:number,field:string,value:any){this.itemRows.update(rows=>{if(!rows[index])return rows;const next=[...rows];const row={...next[index],[field]:field==='quantity'||field==='unitPrice'?(Number(value)||0):value};row.totalPrice=(Number(row.quantity)||0)*(Number(row.unitPrice)||0);next[index]=row;return next})}
  itemTotals(){const rows=this.itemRows();const subtotal=rows.reduce((s,r)=>s+((Number(r.quantity)||0)*(Number(r.unitPrice)||0)),0);const q=this.quotation();const rate=Number(q?.taxRate??5)||0;const tax=subtotal*(rate/100);return {subtotal,tax,total:subtotal+tax}}
  async saveItems(){const q=this.quotation();if(!q)return;this.busy.set(true);this.error.set('');try{await this.service.update(q._id,{items:this.itemRows()});await this.load(q._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to save quotation items')}finally{this.busy.set(false)}}
  async submit(){const q=this.quotation();if(!q)return;if(!(q.items||[]).length){this.error.set('Add at least one quotation item before submitting.');return}this.busy.set(true);try{await this.service.update(q._id,{items:this.itemRows()});await this.service.submit(q._id);await this.load(q._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to submit')}finally{this.busy.set(false)}}async approve(){const q=this.quotation();if(!q)return;this.busy.set(true);try{await this.service.approve(q._id);await this.load(q._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to approve')}finally{this.busy.set(false)}}
  async downloadPdf(){const q=this.quotation();if(!q||this.downloadingPdf())return;this.downloadingPdf.set(true);this.error.set('');try{await this.service.downloadPdf(q._id,q.quotationNo)}catch(e:any){this.error.set(e?.message||'Unable to download the quotation PDF')}finally{this.downloadingPdf.set(false)}}async reject(){const q=this.quotation();if(!q||!this.reason.trim())return;this.busy.set(true);try{await this.service.reject(q._id,this.reason.trim());this.showReject.set(false);await this.load(q._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to reject')}finally{this.busy.set(false)}}toggleMobileMenu(){this.mobileMenuOpen=!this.mobileMenuOpen}closeMobileMenu(){this.mobileMenuOpen=false}}
