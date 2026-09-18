import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  label = input.required<string>();
  route = input<string>();
  href = input<string>();
  variant = input<'primary' | 'secondary' | 'white' | 'dark'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  icon = input<string>();
  iconPosition = input<'left' | 'right'>('right');
  external = input<boolean>(false);
  target = input<string>();
}
