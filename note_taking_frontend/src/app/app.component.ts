import { Component } from '@angular/core';
import { LayoutComponent } from './components/layout/layout.component';

// PUBLIC_INTERFACE
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LayoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {}
