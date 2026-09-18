import { Component, inject, input, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ContactService } from '../../../core/services/contact.service';
import { ContentService } from '../../../core/services/content.service';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  contactService = inject(ContactService);
  contentService = inject(ContentService);

  showSuccess = input<boolean>(false);

  contact = this.contentService.contact;
  submitting = this.contactService.submitting;
  submitted = this.contactService.submitted;
  error = this.contactService.error;

  pestTypes = computed(() => this.contentService.pestTypes());
  serviceTypes = computed(() => this.contentService.serviceTypes());
  contractTypes = computed(() => this.contentService.contractTypes());

  ngOnInit() {
    this.contentService.loadContent();
  }

  contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [
      '',
      [Validators.required, Validators.pattern(/^[\+]?[0-9\s\-\(\)]{8,}$/)],
    ],
    email: ['', [Validators.required, Validators.email]],
    pestType: ['', Validators.required],
    service: ['', Validators.required],
    contract: ['', Validators.required],
    location: ['', Validators.required],
    preferredDate: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  isFieldInvalid(field: string): boolean {
    const control = this.contactForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  async onSubmit(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const success = await this.contactService.submitForm(
      this.contactForm.value,
    );
    if (success) {
      this.contactForm.reset();
    }
  }
}
