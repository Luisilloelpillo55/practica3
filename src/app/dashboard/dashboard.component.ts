import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AuthService } from '../services/auth.service.js';
import { PermissionService } from '../services/permission.service.js';
import { TicketService } from '../services/ticket.service.js';
import { GroupService } from '../services/group.service.js';
import { HasPermissionDirective } from '../directives/has-permission.directive.js';

interface DashboardStats {
  totalTickets: number;
  ticketsByStatus: { [key: string]: number };
  ticketsByPriority: { [key: string]: number };
  userGroups: any[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TableModule,
    HasPermissionDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    totalTickets: 0,
    ticketsByStatus: {},
    ticketsByPriority: {},
    userGroups: []
  };

  selectedGroup: any = null;
  
  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private ticketService: TicketService,
    private groupService: GroupService
  ) {}

  ngOnInit(): void {
    this.loadGroupsAndStats();
  }

  /**
   * Carga los grupos disponibles y estadísticas
   */
  loadGroupsAndStats(): void {
    // Obtener grupos disponibles para el usuario
    const availableGroups = this.permissionService.getAvailableGroups();
    
    if (availableGroups.length > 0) {
      this.loadStatsForGroup(availableGroups[0]);
    }
  }

  /**
   * Carga estadísticas para un grupo específico
   */
  loadStatsForGroup(groupId: string): void {
    // TODO: Llamar a servicio para obtener estadísticas
    // this.ticketService.getStatsByGroup(groupId).subscribe(stats => {
    //   this.stats = stats;
    // });

    // Datos mockados para demostración
    this.stats = {
      totalTickets: 24,
      ticketsByStatus: {
        'to-do': 8,
        'in-progress': 10,
        'done': 6
      },
      ticketsByPriority: {
        'low': 5,
        'medium': 12,
        'high': 7
      },
      userGroups: []
    };
  }

  /**
   * Maneja el cambio de grupo seleccionado
   */
  onGroupChange(event: any): void {
    const groupId = event.target.value;
    if (groupId) {
      this.permissionService.setCurrentGroup(groupId);
      this.loadStatsForGroup(groupId);
    }
  }

  /**
   * Obtiene la lista de grupos disponibles para selector
   */
  getAvailableGroups(): any[] {
    // TODO: Mapear grupos con IDs a objetos con label y value
    return [
      { id: 'group-1', nombre: 'Frontend Team' },
      { id: 'group-2', nombre: 'Backend Team' },
      { id: 'group-3', nombre: 'Design Team' }
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
}
