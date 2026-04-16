import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service.js';
import { HasPermissionDirective } from '../directives/has-permission.directive.js';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface DashboardStats {
  totalTickets: number;
  ticketsByStatus: { [key: string]: number };
  ticketsByPriority: { [key: string]: number };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    HasPermissionDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats = {
    totalTickets: 42,
    ticketsByStatus: {
      'to-do': 15,
      'in-progress': 18,
      'done': 9
    },
    ticketsByPriority: {
      'high': 8,
      'medium': 22,
      'low': 12
    }
  };

  selectedGroup: any = null;
  currentUser: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    console.log('👤 [Dashboard] Current user:', this.currentUser?.usuario);
    
    // Suscribirse a cambios de usuario
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUser = user;
          this.loadDashboardData();
          this.cdr.detectChanges();
        }
      });

    // Suscribirse a cambios de grupo
    this.permissionService.currentGroup$
      .pipe(takeUntil(this.destroy$))
      .subscribe(groupId => {
        if (groupId) {
          this.loadGroupStats(groupId);
        }
      });

    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los datos iniciales del dashboard
   */
  private loadDashboardData(): void {
    const availableGroups = this.getAvailableGroups();
    if (availableGroups.length > 0) {
      this.selectedGroup = availableGroups[0];
      this.permissionService.setCurrentGroup(availableGroups[0].id);
      this.loadGroupStats(availableGroups[0].id);
    }
  }

  /**
   * Carga estadísticas para un grupo específico
   */
  private loadGroupStats(groupId: string): void {
    // TODO: Llamar a API para obtener estadísticas reales
    // Por ahora usamos datos mockeados
    console.log('📊 [Dashboard] Loading stats for group:', groupId);
    
    // Simular datos variados por grupo
    const mockStats: { [key: string]: DashboardStats } = {
      'group-1': {
        totalTickets: 42,
        ticketsByStatus: { 'to-do': 15, 'in-progress': 18, 'done': 9 },
        ticketsByPriority: { 'high': 8, 'medium': 22, 'low': 12 }
      },
      'group-2': {
        totalTickets: 28,
        ticketsByStatus: { 'to-do': 8, 'in-progress': 12, 'done': 8 },
        ticketsByPriority: { 'high': 5, 'medium': 15, 'low': 8 }
      },
      'group-3': {
        totalTickets: 35,
        ticketsByStatus: { 'to-do': 12, 'in-progress': 16, 'done': 7 },
        ticketsByPriority: { 'high': 7, 'medium': 18, 'low': 10 }
      }
    };

    this.stats = mockStats[groupId] || {
      totalTickets: 0,
      ticketsByStatus: { 'to-do': 0, 'in-progress': 0, 'done': 0 },
      ticketsByPriority: { 'high': 0, 'medium': 0, 'low': 0 }
    };

    this.cdr.detectChanges();
  }

  /**
   * Maneja el cambio de grupo seleccionado
   */
  onGroupChange(event: any): void {
    const groupId = event.target.value;
    if (groupId) {
      const selectedGroup = this.getAvailableGroups().find(g => g.id === groupId);
      if (selectedGroup) {
        this.selectedGroup = selectedGroup;
        this.permissionService.setCurrentGroup(groupId);
        this.loadGroupStats(groupId);
      }
    }
  }

  /**
   * Obtiene la lista de grupos disponibles para selector
   * En producción, esto vendría de la API
   */
  getAvailableGroups(): any[] {
    return [
      { id: 'group-1', nombre: '🚀 Frontend Team' },
      { id: 'group-2', nombre: '⚙️ Backend Team' },
      { id: 'group-3', nombre: '🎨 Design Team' }
    ];
  }

  /**
   * Obtiene estadísticas por prioridad para la tabla
   */
  getPriorityStats(): any[] {
    return [
      { priority: 'Baja', count: this.stats.ticketsByPriority['low'] || 0 },
      { priority: 'Media', count: this.stats.ticketsByPriority['medium'] || 0 },
      { priority: 'Alta', count: this.stats.ticketsByPriority['high'] || 0 }
    ];
  }

  /**
   * Obtiene el nombre del usuario actual
   */
  getCurrentUserName(): string {
    return this.currentUser?.usuario || this.currentUser?.email || 'Usuario';
  }
}
