import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  pestType: string;
  service: string;
  contract: string;
  location: string;
  preferredDate: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private httpClient = inject(HttpClientService);
  private platformId = inject(PLATFORM_ID);

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);

  async submitForm(data: ContactFormData): Promise<boolean> {
    this.submitting.set(true);
    this.error.set(null);

    try {
      // Public website submissions enter the ERP as leads awaiting approval.
      const payload = {
        companyName: data.name,
        contactPerson: data.name,
        mobile: data.phone,
        email: data.email,
        address: data.location,
        location: data.location,
        source: 'WEBSITE',
        serviceRequired: data.service,
        pestTypes: data.pestType ? [data.pestType] : [],
        contract: data.contract,
        preferredDate: data.preferredDate || undefined,
        preferredTime: '',
        description: data.message,
        notes: `Contract: ${data.contract}`,
      };

      await firstValueFrom(
        this.httpClient.post<{ success: boolean; message: string }>('/leads/public', payload)
      );

      this.submitted.set(true);
      return true;
    } catch (err) {
      this.error.set(
        'Failed to submit form. Please try again or contact us directly.',
      );
      return false;
    } finally {
      this.submitting.set(false);
    }
  }

  /** Open WhatsApp with pre-filled message */
  openWhatsApp(phone: string, message?: string): void {
    const text =
      message ?? 'Hello, I would like to inquire about your services.';
    const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
    if (isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank');
    }
  }

  /** Reset form state */
  reset(): void {
    this.submitted.set(false);
    this.error.set(null);
  }
}
