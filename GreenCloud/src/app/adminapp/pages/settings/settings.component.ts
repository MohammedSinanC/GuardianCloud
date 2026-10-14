import { Component, inject, Injector, Provider, signal, ViewChild, ViewContainerRef, AfterViewInit, Type } from '@angular/core';
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
import { MASTER_LIST_CONFIG, MasterListComponent, MasterListConfig } from './shared-master-list/master-list.component';
import { DEFAULT_URGENCY_TYPES } from '../../../core/constants/app.constants';
import { ChecklistMasterComponent } from './checklist-master/checklist-master.component';
interface SettingsItem {
  key: string;
  name: string;
  icon: string;
  component: Type<any>;
  /** Extra providers for config-driven components such as the shared master list. */
  providers?: Provider[];
}

/** Config-driven `code` + `label` masters, all served by MasterListComponent. */
function masterList(config: MasterListConfig & { icon: string }): SettingsItem {
  return {
    key: config.contentKey,
    name: config.title,
    icon: config.icon,
    component: MasterListComponent,
    providers: [{ provide: MASTER_LIST_CONFIG, useValue: config }],
  };
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

  private injector = inject(Injector);

  sidebarCollapsed = false;
  mobileMenuOpen = false;
  selectedItem = signal<string>('company-master');

  settingsItems: SettingsItem[] = [
    { key: 'company-master', name: 'Company Master', icon: 'business', component: CompanyMasterComponent },
    { key: 'pest-types', name: 'Pest Types', icon: 'bug_report', component: PestTypesMasterComponent },
    { key: 'inspection-types', name: 'Inspection Types', icon: 'fact_check', component: InspectionTypesMasterComponent },
    { key: 'checklists', name: 'Checklist', icon: 'checklist', component: ChecklistMasterComponent },
    { key: 'service-types', name: 'Service Types', icon: 'home_repair_service', component: ServiceTypesMasterComponent },
    { key: 'contract-types', name: 'Contract Types', icon: 'description', component: ContractTypesMasterComponent },
    masterList({
      contentKey: 'urgencyTypes',
      title: 'Urgency Types',
      icon: 'priority_high',
      itemNoun: 'urgency type',
      info: 'Offered as the "Urgency" option in the inquiry Service Details card and in the customer portal request form.',
      defaults: DEFAULT_URGENCY_TYPES,
      defaultsNotice: 'Showing the built-in defaults. Saving a change stores this list as your own.',
    }),
    masterList({
      contentKey: 'propertyTypes',
      title: 'Property Types',
      icon: 'apartment',
      itemNoun: 'property type',
      info: 'Offered as the "Type of Property" option in the inquiry Customer Information card.',
    }),
    masterList({
      contentKey: 'populationLevels',
      title: 'Population Levels',
      icon: 'groups',
      itemNoun: 'population level',
      info: 'Offered as the "Estimated Population Level" option in the inquiry Customer Information card.',
    }),
    masterList({
      contentKey: 'entryPoints',
      title: 'Entry Points',
      icon: 'sensor_door',
      itemNoun: 'entry point',
      info: 'Offered as the "Possible Entry Point" option in the inquiry Customer Information card.',
    }),
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
    if (!item) return;

    const injector = item.providers?.length
      ? Injector.create({ providers: item.providers, parent: this.injector })
      : undefined;
    this.contentContainer.createComponent(item.component, { injector });
  }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu() { this.mobileMenuOpen = false; }
}
