import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, PanelMenuModule, ButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();

  onLink() { this.close.emit(); }
  closeSidebar() { this.close.emit(); }

  items: MenuItem[] = [
    { label: 'Inicio', icon: 'pi pi-home', routerLink: ['/home'] },
    { label: 'Práctica: Botón', icon: 'pi pi-play', routerLink: ['/practice-button'] },
    { label: 'Registro', icon: 'pi pi-user-plus', routerLink: ['/register'] },
    { label: 'Login', icon: 'pi pi-sign-in', routerLink: ['/login'] }
  ];
}
