import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReceiptService, Receipt } from '../../services/receipt.service';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
@Component({selector:'app-receipt-list',standalone:true,imports:[CommonModule,RouterLink,FormsModule,AdminSidebarComponent,AdminTopbarComponent],templateUrl:'./receipt-list.component.html',styleUrl:'../erp-shared.css'})
export class ReceiptListComponent implements OnInit {private service=inject(ReceiptService);receipts=signal<Receipt[]>([]);loading=signal(true);status='';sidebarCollapsed=false;mobileMenuOpen=false;ngOnInit(){this.load()}async load(){this.loading.set(true);try{const r=await this.service.list({status:this.status,limit:50});this.receipts.set(r.data||[])}finally{this.loading.set(false)}}filter(){this.load()}toggleMobileMenu(){this.mobileMenuOpen=!this.mobileMenuOpen}closeMobileMenu(){this.mobileMenuOpen=false}}
