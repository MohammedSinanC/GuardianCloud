import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReceiptService, Receipt } from '../../services/receipt.service';
import { WorkflowTimelineComponent } from '../../../shared/components/workflow-timeline/workflow-timeline.component';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
@Component({selector:'app-receipt-view',standalone:true,imports:[CommonModule,RouterLink,FormsModule,WorkflowTimelineComponent,AdminSidebarComponent,AdminTopbarComponent],templateUrl:'./receipt-view.component.html',styleUrl:'../erp-shared.css'})
export class ReceiptViewComponent implements OnInit {private route=inject(ActivatedRoute);private service=inject(ReceiptService);receipt=signal<Receipt|null>(null);loading=signal(true);error=signal('');busy=signal(false);sidebarCollapsed=false;mobileMenuOpen=false;ngOnInit(){const id=this.route.snapshot.paramMap.get('id');if(id)this.load(id)}async load(id:string){try{this.receipt.set((await this.service.getById(id)).data)}catch(e:any){this.error.set(e?.error?.message||'Receipt not found')}finally{this.loading.set(false)}}async post(){const r=this.receipt();if(!r)return;this.busy.set(true);try{await this.service.post(r._id);await this.load(r._id)}catch(e:any){this.error.set(e?.error?.message||'Unable to post receipt')}finally{this.busy.set(false)}}toggleMobileMenu(){this.mobileMenuOpen=!this.mobileMenuOpen}closeMobileMenu(){this.mobileMenuOpen=false}}
