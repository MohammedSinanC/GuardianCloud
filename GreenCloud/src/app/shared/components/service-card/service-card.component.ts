import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Service } from '../../../core/models/website-content.model';

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './service-card.component.html',
  styleUrl: './service-card.component.scss',
})
export class ServiceCardComponent {
  service = input.required<Service>();
  featured = input<boolean>(false);
}
