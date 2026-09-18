import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { ContentService } from './core/services/content.service';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { WhatsappButtonComponent } from './shared/components/whatsapp-button/whatsapp-button.component';
import { LoadingComponent } from './shared/components/loading/loading.component';
import { ToasterComponent } from './core/components/toaster/toaster.component';
import { ConfirmDialogComponent } from './core/components/confirm-dialog/confirm-dialog.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    WhatsappButtonComponent,
    LoadingComponent,
    ToasterComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private contentService = inject(ContentService);
  private router = inject(Router);

  isLoaded = signal(false);
  isAdminRoute = signal(false);

  async ngOnInit(): Promise<void> {
    await this.contentService.loadContent();
    this.isLoaded.set(true);

    // Listen for route changes and check if admin route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isAdminRoute.set(event.url.startsWith('/adminapp'));
      });

    // Check initial URL
    this.isAdminRoute.set(this.router.url.startsWith('/adminapp'));
  }
}
