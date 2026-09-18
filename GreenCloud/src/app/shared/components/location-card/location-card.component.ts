import { Component, input } from '@angular/core';
import { Location } from '../../../core/models/website-content.model';

@Component({
  selector: 'app-location-card',
  standalone: true,
  templateUrl: './location-card.component.html',
  styleUrl: './location-card.component.scss',
})
export class LocationCardComponent {
  location = input.required<Location>();
}
