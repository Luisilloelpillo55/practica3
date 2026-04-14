import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, NavigationStart } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { PageLoaderComponent } from '../../components/page-loader/page-loader.component';
import { ButtonModule } from 'primeng/button';
import { filter } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, PageLoaderComponent, ButtonModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit {
  showSidebar = false;
  isHome = false;

  constructor(private router: Router, private loadingService: LoadingService) {
    this.isHome = router.url === '/home' || router.url.startsWith('/home');
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url = e.urlAfterRedirects || e.url;
      this.isHome = url === '/home' || url.startsWith('/home');
      if (!this.isHome) this.showSidebar = false;
    });
  }

  ngOnInit(): void {
    // Show loader on navigation start
    this.router.events
      .pipe(filter(e => e instanceof NavigationStart))
      .subscribe(() => {
        this.loadingService.show();
      });

    // Hide loader on navigation end
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        // Delay hiding to ensure page render is complete
        setTimeout(() => this.loadingService.hide(), 300);
      });
  }

  toggleSidebar() { this.showSidebar = !this.showSidebar; }
  closeSidebar() { this.showSidebar = false; }
}
