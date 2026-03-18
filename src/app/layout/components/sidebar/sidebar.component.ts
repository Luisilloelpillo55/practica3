import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../../services/auth.service.js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, PanelMenuModule, ButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();
  private sub: Subscription | null = null;
  items: MenuItem[] = [];

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.buildItems();
    this.sub = this.auth.currentUser$.subscribe(() => this.buildItems());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onLink() { this.close.emit(); }
  closeSidebar() { this.close.emit(); }

  private buildItems() {
    const permiso = this.auth.getPermiso();
    const user = this.auth.getUser();
    const logged = !!user;
    const isAdmin = this.auth.isAdmin();
    const items: MenuItem[] = [
      { label: 'Inicio', icon: 'pi pi-home', routerLink: ['/home'] },
      { label: 'Práctica: Botón', icon: 'pi pi-play', routerLink: ['/practice-button'] }
    ];

    // Show group-related links when user has explicit 'group_view' permission
    if (this.auth.hasPermission('group_view')) {
      items.push({ label: 'Grupos', icon: 'pi pi-users', routerLink: ['/group'] });
      items.push({ label: 'Info grupo', icon: 'pi pi-info-circle', routerLink: ['/group-info'] });
    }

    // Show kanban when user can view tickets
    if (this.auth.hasPermission('ticket_view')) {
      items.push({ label: 'Kanban', icon: 'pi pi-th-large', routerLink: ['/kanban'] });
    }

    // Show 'Gestión de Usuarios' if admin or has 'user_view' permission
    if (isAdmin || this.auth.hasPermission('user_view')) {
      items.push({ label: 'Gestión de Usuarios', icon: 'pi pi-users', routerLink: ['/user-management'] });
    }

    // User-only items
    if (logged) {
      items.push({ label: 'Usuario', icon: 'pi pi-user', routerLink: ['/user'] });
      items.push({ label: 'Logout', icon: 'pi pi-sign-out', command: () => { this.auth.logout(); window.location.reload(); } });
    } else {
      items.push({ label: 'Registro', icon: 'pi pi-user-plus', routerLink: ['/register'] });
      items.push({ label: 'Login', icon: 'pi pi-sign-in', routerLink: ['/login'] });
    }

    this.items = items;
  }
}
