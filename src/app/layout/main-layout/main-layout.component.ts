import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { ButtonModule } from 'primeng/button';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, ButtonModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent {
  showSidebar = false;
  isHome = false;

  constructor(private router: Router) {
    this.isHome = router.url === '/home' || router.url.startsWith('/home');
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url = e.urlAfterRedirects || e.url;
      this.isHome = url === '/home' || url.startsWith('/home');
      if (!this.isHome) this.showSidebar = false;
    });
  }

  toggleSidebar() { this.showSidebar = !this.showSidebar; }
  closeSidebar() { this.showSidebar = false; }
}
