import { Component, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { DragDropModule, CdkDragDrop, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { TicketService } from '../../services/ticket.service.js';
import { AuthService } from '../../services/auth.service';
import { filter, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, DialogModule, TableModule, TooltipModule, HttpClientModule, ToastModule, DragDropModule, InputTextModule],
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.css'],
  // use app-level MessageService (provided in app.config)
})
export class KanbanComponent implements OnInit, OnDestroy {
  // Kanban columns
  backlog: any[] = [];
  progress: any[] = [];
  done: any[] = [];
  cancelled: any[] = [];
  
  // List view
  allTickets: any[] = [];
  viewMode: 'kanban' | 'list' = 'kanban';
  
  showHistoryDialog = false;
  selectedForHistory: any = null;
  historyTickets: any[] = [];
  
  private destroy$ = new Subject<void>();
  canMove = false;
  canAdd = false;
  canDelete = false;
  permissionChecked = false;
  canShow = false;
  // datos para la zona de eliminación (evita inference a `never[]` en template)
  deleteListData: any[] = [];

  constructor(
    private ticketSrv: TicketService,
    public auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // ensure auth BehaviorSubject is populated (APP_INITIALIZER should handle most cases)
    const maybe = this.auth.getUser();
    if (!maybe || !maybe.token) this.auth.loadUser();

    // start with unknown permission state; wait for currentUser$ emission to decide
    this.permissionChecked = false;
    this.canShow = false;
    this.canMove = this.canAdd = this.canDelete = false;

    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.permissionChecked = true;
        if (user && user.token && (this.auth.hasPermission('ticket_view') || this.auth.isAdmin())) {
          this.canShow = true;
          this.canMove = (this.auth.hasPermission('ticket_move') && this.auth.hasPermission('ticket_view')) || this.auth.isAdmin();
          this.canAdd = (this.auth.hasPermission('ticket_create') && this.auth.hasPermission('ticket_view')) || this.auth.isAdmin();
          this.canDelete = (this.auth.hasPermission('ticket_delete') && this.auth.hasPermission('ticket_view')) || this.auth.isAdmin();
          this.loadAll();
        } else {
          this.canShow = false;
          this.clearKanban();
          this.canMove = this.canAdd = this.canDelete = false;
        }
        try { this.cdr.detectChanges(); } catch {}
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
          // Only load tickets if the current user has view permissions
          if (this.auth.hasPermission('ticket_view') || this.auth.isAdmin()) {
            this.loadAll();
          } else {
            this.clearKanban();
          }
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
    this.allTickets = [];
    try { this.cdr.detectChanges(); } catch {}
  }

  private loadAll(): void {
    Promise.resolve().then(() => {
      this.loadTickets();
    });
  }

  private loadTickets(): void {
    // Final guard: do not load if the current session user does not have view permission
    const user = this.auth.getUser();
    const rawPerms = this.auth.getPermiso();
    const hasView = (this.auth.hasPermission('ticket_view') || this.auth.hasPermission('tickets:view') || this.auth.isAdmin());
    if (!user || !user.token || !hasView) {
      console.warn('⛔ [Kanban] Aborting loadTickets: no ticket_view permission for current session', { userId: user?.id, rawPerms });
      this.clearKanban();
      return;
    }

    this.ticketSrv.getAll().subscribe({
      next: (res: any) => {
        // Schedule DOM-updating work to the next macrotask to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
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
            for (const key of Object.keys(res)) {
              if (Array.isArray((res as any)[key])) { tickets = (res as any)[key]; break; }
            }
          }
          console.debug('Kanban: tickets loaded count=', tickets.length, 'sample=', tickets.slice(0,3));

          // Filter tickets so user only sees tickets they own or that belong to groups
          // where they are author/member.
          const me = this.auth.getUser();
          const uid = me?.id || me?.userId || me?.id_usuario || null;
          if (!uid) {
            // no user in session, do not show tickets
            this.clearKanban();
            return;
          }

          const headers = (typeof this.auth.getAuthHeaders === 'function') ? this.auth.getAuthHeaders() : undefined;

          // Fetch user's groups to determine membership
          try {
            this.http.get<any>('/api/groups', { headers }).subscribe({
              next: (gres: any) => {
                const groupData = gres?.data || gres || [];
                const myGroupIds = new Set<string>();
                try {
                  const arr = Array.isArray(groupData) ? groupData : [];
                  for (const g of arr) {
                    try {
                      const ints = g.integrantes ? (typeof g.integrantes === 'string' ? JSON.parse(g.integrantes) : g.integrantes) : [];
                      if (String(g.autor) === String(uid) || (Array.isArray(ints) && ints.includes(uid))) {
                        myGroupIds.add(String(g.id));
                      }
                    } catch (e) { if (String(g.autor) === String(uid)) myGroupIds.add(String(g.id)); }
                  }
                } catch (e) { /* ignore */ }

                const filtered = (tickets || []).filter((t: any) => {
                  const owner = t.created_by || t.autor || t.owner || t.user_id || t.usuario;
                  const groupId = t.group_id || t.groupId || t.grupo_id || t.group;
                  const isOwner = owner && String(owner) === String(uid);
                  const inGroup = groupId && myGroupIds.has(String(groupId));
                  return !!(isOwner || inGroup);
                });

                this.distribute(filtered || []);
                try { this.cdr.detectChanges(); } catch {}
              },
              error: (e: any) => {
                // fallback: only allow tickets where user is owner
                const filtered = (tickets || []).filter((t: any) => {
                  const owner = t.created_by || t.autor || t.owner || t.user_id || t.usuario;
                  return owner && String(owner) === String(uid);
                });
                this.distribute(filtered || []);
                try { this.cdr.detectChanges(); } catch {}
              }
            });
          } catch (err) {
            const filtered = (tickets || []).filter((t: any) => {
              const owner = t.created_by || t.autor || t.owner || t.user_id || t.usuario;
              return owner && String(owner) === String(uid);
            });
            this.distribute(filtered || []);
            try { this.cdr.detectChanges(); } catch {}
          }
        }, 0);
      },
      error: (err: any) => {
        console.error('Error loading tickets:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las tareas' });
      }
    });
  }

  private distribute(tickets: any[]): void {
    this.clearKanban();
    this.allTickets = [...tickets]; // Store all tickets for list view
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
        const detail = (err?.error?.error) || err?.message || 'No se pudo mover el ticket';
        if (err?.status === 403 || (err?.error && typeof err.error === 'object' && err.error.error && String(err.error.error).toLowerCase().includes('permiso'))) {
          this.messageService.add({ severity: 'error', summary: 'Permiso denegado', detail });
          this.clearKanban();
          this.canMove = this.canAdd = this.canDelete = false;
          return;
        }
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
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
    
    // Si el item se movió a una columna diferente, persistir primero y aplicar cambio en UI solo si backend acepta
    if (event.previousContainer !== event.container) {
      const item = event.item.data;
      const nuevoEstado = this.statusLabel(targetColumn);
      const payload = { ...item, estado: nuevoEstado };

      // Enviar petición al backend primero
      this.ticketSrv.update(item.id, payload).subscribe({
        next: (resp: any) => {
          try {
            transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
          } catch (e) { /* ignore transfer errors */ }
          item.estado = nuevoEstado;
          this.distribute([...this.backlog, ...this.progress, ...this.done, ...this.cancelled]);
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket movido' });
        },
        error: (err: any) => {
          console.error('Error updating ticket:', err);
          const detail = (err?.error?.error) || err?.message || 'No se pudo mover el ticket';
          if (err?.status === 403 || (err?.error && typeof err.error === 'object' && err.error.error && String(err.error.error).toLowerCase().includes('permiso'))) {
            this.messageService.add({ severity: 'error', summary: 'Permiso denegado', detail });
            this.clearKanban();
            this.canMove = this.canAdd = this.canDelete = false;
            return;
          }
          this.messageService.add({ severity: 'error', summary: 'Error', detail });
        }
      });
    }
  }

  // Drop en zona de eliminación
  deleteDrop(event: any): void {
    if (!(this.auth.hasPermission('ticket_delete') || this.auth.isAdmin())) {
      this.messageService.add({ severity: 'error', summary: 'Permiso', detail: 'No tienes permiso para eliminar tareas' });
      return;
    }
    if (event.previousContainer !== event.container) {
      const item = event.item.data;
      try { event.previousContainer.data.splice(event.previousIndex, 1); } catch {}
      
      this.ticketSrv.delete(item.id).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Ticket eliminado' });
          this.loadAll();
        },
        error: (err: any) => {
          console.error('Error deleting ticket:', err);
          const detail = (err?.error?.error) || err?.message || 'No se pudo eliminar el ticket';
          if (err?.status === 403 || (err?.error && typeof err.error === 'object' && err.error.error && String(err.error.error).toLowerCase().includes('permiso'))) {
            this.messageService.add({ severity: 'error', summary: 'Permiso denegado', detail });
            this.clearKanban();
            this.canMove = this.canAdd = this.canDelete = false;
            return;
          }
          this.messageService.add({ severity: 'error', summary: 'Error', detail });
        }
      });
    }
  }

  viewHistory(ticket: any): void {
    this.selectedForHistory = ticket;
    this.historyTickets = [];
    this.showHistoryDialog = true;

    // Solicitar historial al backend; si falla, mostrar un registro por defecto
    this.ticketSrv.getHistory(ticket.id).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res) ? res : (res?.data || []);
        if (!rows || rows.length === 0) {
          this.historyTickets = [{ estado_anterior: 'N/A', estado_nuevo: ticket.estado || 'No iniciado', changed_at: ticket.created_at }];
        } else {
          this.historyTickets = rows;
        }
        try { this.cdr.detectChanges(); } catch {}
      },
      error: (err: any) => {
        console.warn('⚠️ [Kanban] No se pudo cargar el historial:', err);
        this.historyTickets = [{ estado_anterior: 'N/A', estado_nuevo: ticket.estado || 'No iniciado', changed_at: ticket.created_at }];
        try { this.cdr.detectChanges(); } catch {}
      }
    });
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

  toggleViewMode(mode: 'kanban' | 'list'): void {
    this.viewMode = mode;
  }

  hideKanban(): void {
    this.canShow = false;
    try { this.cdr.detectChanges(); } catch {}
  }

  onGlobalFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    const searchValue = input?.value?.toLowerCase() || '';
    if (!searchValue) {
      this.allTickets = [...this.backlog, ...this.progress, ...this.done, ...this.cancelled];
    } else {
      const all = [...this.backlog, ...this.progress, ...this.done, ...this.cancelled];
      this.allTickets = all.filter(t =>
        (t.titulo?.toLowerCase().includes(searchValue)) ||
        (t.descripcion?.toLowerCase().includes(searchValue)) ||
        (t.estado?.toLowerCase().includes(searchValue))
      );
    }
  }

  goBack(): void {
    this.router.navigateByUrl('/home');
  }
}
