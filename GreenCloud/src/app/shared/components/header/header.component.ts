import { Component, inject, signal, HostListener, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ContentService } from '../../../core/services/content.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private contentService = inject(ContentService);
  private platformId = inject(PLATFORM_ID);

  navigation = this.contentService.navigation;
  company = this.contentService.company;

  isScrolled = signal(false);
  isMobileMenuOpen = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isScrolled.set(window.scrollY > 50);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  getWhatsAppLink(): string {
    const phone = this.company()?.whatsapp?.replace(/[^0-9]/g, '') ?? '';
    return 'https://wa.me/' + phone;
  }
}
