import { Component, inject, signal, ViewChild, ViewContainerRef, AfterViewInit, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSidebarComponent } from '../../components/sidebar/sidebar.component';
import { AdminTopbarComponent } from '../../components/topbar/topbar.component';
import { CompanyMasterComponent } from './company-master/company-master.component';
import { PestTypesMasterComponent } from './pest-types-master/pest-types-master.component';
import { ServiceTypesMasterComponent } from './service-types-master/service-types-master.component';
import { ContractTypesMasterComponent } from './contract-types-master/contract-types-master.component';
import { ServiceCategoryComponent } from './service-category/service-category.component';
import { UnitMasterComponent } from './unit-master/unit-master.component';
import { LocationMasterComponent } from './location-master/location-master.component';
import { PaymentTypeMasterComponent } from './payment-type-master/payment-type-master.component';
import { InspectionTypesMasterComponent } from './inspection-types-master/inspection-types-master.component';
interface SettingsItem {
  key: string;
  name: string;
  icon: string;
  component: Type<any>;
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule,
    AdminSidebarComponent,
    AdminTopbarComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class AdminSettingsComponent implements AfterViewInit {
  @ViewChild('contentContainer', { read: ViewContainerRef }) contentContainer!: ViewContainerRef;

  sidebarCollapsed = false;
  mobileMenuOpen = false;
  selectedItem = signal<string>('company-master');

  settingsItems: SettingsItem[] = [
    { key: 'company-master', name: 'Company Master', icon: 'business', component: CompanyMasterComponent },
    { key: 'pest-types', name: 'Pest Types', icon: 'bug_report', component: PestTypesMasterComponent },
    { key: 'inspection-types', name: 'Inspection Types', icon: 'fact_check', component: InspectionTypesMasterComponent },
    { key: 'service-types', name: 'Service Types', icon: 'home_repair_service', component: ServiceTypesMasterComponent },
    { key: 'contract-types', name: 'Contract Types', icon: 'description', component: ContractTypesMasterComponent },
    { key: 'service-category', name: 'Service Category', icon: 'category', component: ServiceCategoryComponent },
    { key: 'unit-master', name: 'Unit Master', icon: 'straighten', component: UnitMasterComponent },
    { key: 'location-master', name: 'Location Master', icon: 'location_on', component: LocationMasterComponent },
    { key: 'payment-type', name: 'Payment Types', icon: 'payment', component: PaymentTypeMasterComponent },
  ];

  ngAfterViewInit() {
    this.loadComponent(this.selectedItem());
  }

  selectItem(key: string) {
    this.selectedItem.set(key);
    this.loadComponent(key);
  }

  loadComponent(key: string) {
    if (!this.contentContainer) return;
    this.contentContainer.clear();

    const item = this.settingsItems.find(i => i.key === key);
    if (item) {
      this.contentContainer.createComponent(item.component);
    }
  }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
}
