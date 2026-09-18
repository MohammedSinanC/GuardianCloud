import { Component, inject, OnInit } from '@angular/core';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { LocationCardComponent } from '../../shared/components/location-card/location-card.component';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [LocationCardComponent, SectionHeadingComponent],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.scss',
})
export class BranchesComponent implements OnInit {
  private contentService = inject(ContentService);
  private seoService = inject(SeoService);

  locations = this.contentService.locations;
  company = this.contentService.company;

  ngOnInit(): void {
    this.seoService.setPageMeta('branches');
  }
}
