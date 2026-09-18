import { Component, inject, OnInit } from '@angular/core';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { ContactFormComponent } from '../../shared/components/contact-form/contact-form.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ContactFormComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent implements OnInit {
  private contentService = inject(ContentService);
  private seoService = inject(SeoService);

  contact = this.contentService.contact;
  company = this.contentService.company;
  locations = this.contentService.locations;

  ngOnInit(): void {
    this.seoService.setPageMeta('contact');
    console.log(this.contentService.contact);
  }

  getWhatsAppLink(): string {
    const phone = this.company()?.whatsapp?.replace(/[^0-9]/g, '') ?? '';
    return 'https://wa.me/' + phone;
  }
}
