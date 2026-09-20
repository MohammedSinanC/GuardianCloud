import { Component, inject, OnInit } from '@angular/core';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { StatisticCardComponent } from '../../shared/components/statistic-card/statistic-card.component';
import {
  RevealDirective,
  ParallaxDirective,
} from '../../shared/motion';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [SectionHeadingComponent, StatisticCardComponent, RevealDirective, ParallaxDirective],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent implements OnInit {
  private contentService = inject(ContentService);
  private seoService = inject(SeoService);

  about = this.contentService.about;
  statistics = this.contentService.statistics;
  whyChooseUs = this.contentService.whyChooseUs;
  company = this.contentService.company;

  ngOnInit(): void {
    this.seoService.setPageMeta('about');
  }
}
