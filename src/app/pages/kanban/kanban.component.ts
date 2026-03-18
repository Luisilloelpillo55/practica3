import { Component, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { HttpClientModule } from '@angular/common/http';
import { DragDropModule, CdkDragDrop, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { TicketService } from '../../services/ticket.service.js';
import { AuthService } from '../../services/auth.service.js';
import { filter, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, DialogModule, TableModule, TooltipModule, HttpClientModule, ToastModule, DragDropModule],
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.css'],
  providers: [MessageService]
})
export class KanbanComponent implements OnInit, OnDestroy {
  backlog: any[] = [];
  progress: any[] = [];
  done: any[] = [];
  cancelled: any[] = [];
  
  showHistoryDialog = false;
  selectedForHistory: any = null;
  historyTickets: any[] = [];
  
  private destroy$ = new Subject<void>();
  canMove = false;
  // datos para la zona de eliminación (evita inference a `never[]` en template)
  deleteListData: any[] = [];

  constructor(
    private ticketSrv: TicketService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const currentUser = this.auth.getUser();
    if (!currentUser || !currentUser.token) {
      this.auth.loadUser();
    }
    
    const userToUse = this.auth.getUser();
    if (userToUse && userToUse.token) {
      this.loadAll();
    }
    // permiso para mover tickets
    this.canMove = this.auth.hasPermission('ticket_move') || this.auth.isAdmin();
    
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user && user.token) {
          this.loadAll();
          this.canMove = this.auth.hasPermission('ticket_move') || this.auth.isAdmin();
        } else {
          this.clearKanban();
        }
      });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e: any) => {
      if (e.urlAfterRedirects === '/kanban') {
        const u = this.auth.getUser();
        if (!u || !u.token) {
          this.auth.loadUser();
        } else {
          this.loadAll();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private clearKanban(): void {
    this.backlog = [];
    this.progress = [];
    this.done = [];
    this.cancelled = [];
  }

  private loadAll(): void {
    Promise.resolve().then(() => {
      this.loadTickets();
    });
  }

  private loadTickets(): void {
    this.ticketSrv.getAll().subscribe({
      next: (res: any) => {
        Promise.resolve().then(() => {
          let tickets: any[] = [];
          if (Array.isArray(res)) {
            tickets = res;
          } else if (res && Array.isArray(res.data)) {
            tickets = res.data;
          } else if (res && Array.isArray(res.tickets)) {
            tickets = res.tickets;
          } else if (res && Array.isArray(res.rows)) {
            tickets = res.rows;
          } else if (res && typeof res === 'object') {
            // try to find the first array property
            for (const key of Object.keys(res)) {
              if (Array.isArray((res as any)[key])) { tickets = (res as any)[key]; break; }
            }
          }
          console.debug('Kanban: tickets loaded count=', tickets.length, 'sample=', tickets.slice(0,3));
          this.distribute(tickets || []);
          try { this.cdr.detectChanges(); } catch {}
        });
      },
      error: (err: any) => {
        console.error('Error loading tickets:', err);
        // no borrar inmediatamente para facilitar depuración; mostrar mensaje al usuario
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las tareas' });
      }
    });
  }

  private distribute(tickets: any[]): void {
    this.clearKanban();
    for (const t of tickets) {
      const estado = (t.estado || 'No iniciado').toLowerCase();
      if (estado.includes('progres')) {
        this.progress.push(t);
      } else if (estado.includes('finaliz')) {
        this.done.push(t);
      } else if (estado.includes('cancel')) {
        this.cancelled.push(t);
      } else {
        this.backlog.push(t);
      }
    }
  }

  moveToColumn(item: any, targetColumn: string): void {
    const estado = this.statusLabel(targetColumn);
    const updatePayload = { ...item, estado };
    
    this.ticketSrv.update(item.id, updatePayload).subscribe({
      next: () => {
        console.log('Ticket updated:', item.id, 'new estado:', estado);
        item.estado = estado;
        this.distribute([...this.backlog, ...this.progress, ...this.done, ...this.cancelled]);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket movido' });
      },
      error: (err: any) => {
        console.error('Error updating ticket:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo mover el ticket' });
      }
    });
  }

  drop(event: CdkDragDrop<any[]>): void {
    if (!this.canMove) {
      this.messageService.add({ severity: 'error', summary: 'Permiso', detail: 'No tienes permiso para mover tareas' });
      return;
    }
    // Determinar la columna destino basado en el ID del contenedor
    const containerId = event.container.id;
    let targetColumn = '';
    
    switch (containerId) {
      case 'backlog-list': targetColumn = 'backlog'; break;
      case 'progress-list': targetColumn = 'progress'; break;
      case 'done-list': targetColumn = 'done'; break;
      case 'cancelled-list': targetColumn = 'cancelled'; break;
    }
    
    if (!targetColumn) return;
    
    // Si el item se movió a una columna diferente, actualizar visualmente y persistir
    if (event.previousContainer !== event.container) {
      // actualizar arrays para reflejar el movimiento inmediatamente
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      const item = event.item.data;
      // persistir el nuevo estado en backend
      this.moveToColumn(item, targetColumn);
    }
  }

  // Drop en zona de eliminación
  deleteDrop(event: CdkDragDrop<any[]>): void {
    // require permiso de eliminación específico
    if (!(this.auth.hasPermission('ticket_delete') || this.auth.isAdmin())) {
      this.messageService.add({ severity: 'error', summary: 'Permiso', detail: 'No tienes permiso para eliminar tareas' });
      return;
    }
    if (event.previousContainer !== event.container) {
      const item = event.item.data;
      // quitar visualmente desde la lista origen
      try { event.previousContainer.data.splice(event.previousIndex, 1); } catch {}
      this.ticketSrv.delete(item.id).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Ticket eliminado' });
          this.loadAll();
        },
        error: (err: any) => {
          console.error('Error deleting ticket:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el ticket' });
        }
      });
    }
  }

  viewHistory(ticket: any): void {
    this.selectedForHistory = ticket;
    this.historyTickets = [
      { estado_anterior: 'N/A', estado_nuevo: 'No iniciado', changed_at: ticket.created_at }
    ];
    this.showHistoryDialog = true;
  }

  closeHistoryDialog(): void {
    this.showHistoryDialog = false;
    this.selectedForHistory = null;
    this.historyTickets = [];
  }

  private statusLabel(list: string): string {
    switch (list) {
      case 'backlog': return 'No iniciado';
      case 'progress': return 'En progreso';
      case 'done': return 'Finalizado';
      case 'cancelled': return 'Cancelado';
      default: return '';
    }
  }

  goBack(): void {
    try {
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        window.history.back();
      } else {
        this.router.navigateByUrl('/');
      }
    } catch (e) {
      this.router.navigateByUrl('/');
    }
  }
}
