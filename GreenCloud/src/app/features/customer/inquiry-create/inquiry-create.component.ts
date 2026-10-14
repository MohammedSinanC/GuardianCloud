import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InquiryService } from '../../../core/services/inquiry.service';
import { ContentService } from '../../../core/services/content.service';
import { DEFAULT_URGENCY_TYPES } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-inquiry-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inquiry-create.component.html',
  styleUrl: './inquiry-create.component.css',
})
export class InquiryCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inquiryService = inject(InquiryService);
  private contentService = inject(ContentService);
  private router = inject(Router);

  submitting = signal(false);
  error = signal('');
  success = signal('');

  pestTypes = computed(() => this.contentService.pestTypes().map(p => ({ value: p.code, label: p.label })));
  serviceTypes = computed(() => this.contentService.serviceTypes());

  ngOnInit() {
    this.contentService.loadContent();
  }

  /** Urgency options come from the same "Urgency Types" master as the ERP side. */
  urgencyOptions = computed(() => {
    const master = this.contentService.urgencyTypes();
    return (master.length ? master : DEFAULT_URGENCY_TYPES).map(u => ({ value: u.code, label: u.label }));
  });

  form = this.fb.group({
    customerName: ['', Validators.required],
    contactPerson: ['', Validators.required],
    mobile: ['', [Validators.required, Validators.pattern(/^[\d\s\-\+\(\)]{7,20}$/)]],
    email: ['', [Validators.email]],
    serviceLocation: ['', Validators.required],
    building: [''],
    unit: [''],
    area: [''],
    pestTypes: [[] as string[]],
    problemDescription: ['', [Validators.required, Validators.minLength(10)]],
    preferredDate: [''],
    preferredTime: [''],
    urgency: [''],
    remarks: [''],
  });

  selectedPestTypes = signal<string[]>([]);

  togglePestType(type: string) {
    const current = this.selectedPestTypes();
    if (current.includes(type)) {
      this.selectedPestTypes.set(current.filter((t) => t !== type));
    } else {
      this.selectedPestTypes.set([...current, type]);
    }
  }

  isPestSelected(type: string): boolean {
    return this.selectedPestTypes().includes(type);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && control.touched);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    this.success.set('');

    try {
      const formValue = this.form.value;
      const payload = {
        customerName: formValue.customerName || '',
        contactPerson: formValue.contactPerson || '',
        mobile: formValue.mobile || '',
        email: formValue.email || '',
        serviceLocation: formValue.serviceLocation || '',
        building: formValue.building || '',
        unit: formValue.unit || '',
        area: formValue.area || '',
        pestTypes: this.selectedPestTypes(),
        problemDescription: formValue.problemDescription || '',
        preferredDate: formValue.preferredDate || undefined,
        preferredTime: formValue.preferredTime || '',
        urgency: formValue.urgency || '',
        remarks: formValue.remarks || '',
        workflowCode: 'PEST_CONTROL',
      };

      const response = await this.inquiryService.createInquiry(payload);
      if (response.success) {
        this.success.set(`Inquiry ${response.data.inquiryNo} created successfully!`);
        setTimeout(() => {
          this.router.navigate(['/adminapp/inquiries']);
        }, 2000);
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Failed to create inquiry');
    } finally {
      this.submitting.set(false);
    }
  }
}
