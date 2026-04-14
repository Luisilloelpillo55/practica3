import { Component, OnInit, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiHttpService } from '../services/api-http.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { KanbanComponent } from '../pages/kanban/kanban.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { pageEnterAnimation, cardAnimation, listItemAnimation } from '../animations/page-animations';
import { API_ENDPOINTS } from '../config/api.config';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ButtonModule, HttpClientModule, FormsModule, CardModule, TableModule, DialogModule, InputTextModule, ToastModule, KanbanComponent],
  providers: [MessageService],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  animations: [pageEnterAnimation, cardAnimation, listItemAnimation]
})
export class HomeComponent implements OnInit, OnDestroy {
  groups: any[] = [];
  myGroups: any[] = [];
  tickets: any[] = [];
  selectedGroup: any = null;
  groupFilter = '';
  ticketStateFilter = '';

  // ticket UI
  ticketDialog: boolean = false;
  newTicket: any = { group_id: null, titulo: '', descripcion: '', estado: 'abierto', priority: 'moderada' };
  ticketDetailDialog: boolean = false;
  selectedTicket: any = null;
  private pendingQueryGroup: any = null;
  private pendingQueryTicket: any = null;
  // Controls whether the dashboard (groups/tickets/kanban) is shown
  dashboardVisible: boolean = true;
  private destroy$ = new Subject<void>();
  
  // Scroll reveal for header
  headerHidden: boolean = false;
  private lastScrollTop: number = 0;

  constructor(public authService: AuthService, private apiHttpService: ApiHttpService, private router: Router, private route: ActivatedRoute, private http: HttpClient, private cdr: ChangeDetectorRef, private messageService: MessageService) {}

  // Expose logged-in state for templates
  get loggedIn(): boolean {
    try { return this.authService.isLoggedIn(); } catch { return false; }
  }

  toggleDashboard(): void {
    this.dashboardVisible = !this.dashboardVisible;
  }

  ngOnInit(): void {
    // capture query params (possible navigation from Group component)
    this.route.queryParams.subscribe(params => {
      this.pendingQueryGroup = params['group'] || null;
      this.pendingQueryTicket = params['ticket'] || null;
    });

    // Subscribe to user changes to reactively update when login occurs
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        console.log('👤 [HomeComponent] currentUser$ emitted:', {
          usuario: user?.usuario || null,
          id: user?.id || null,
          has_token: !!user?.token,
          permissions: user?.permissions?.length || 0
        });
        // When user logs in/out, reload groups and refresh change detection
        this.loadGroups();
        this.cdr.detectChanges();
      });

    console.log('🎯 [HomeComponent] ngOnInit - Initial loadGroups() call');
    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Scroll reveal animation for header
  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event): void {
    const scrollTop = window.scrollY;
    
    // Show header when scrolling down, hide when scrolling up
    if (scrollTop > this.lastScrollTop) {
      // Scrolling down - hide header
      this.headerHidden = true;
    } else {
      // Scrolling up - show header
      this.headerHidden = false;
    }
    this.lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  }

  private loadGroups(): void {
    const headers = this.authService.getAuthHeaders();
    const user = this.authService.getUser();
    
    console.log('📊 [HomeComponent] loadGroups() - Current user:', user?.usuario || 'null');
    console.log('📊 [HomeComponent] loadGroups() - Has token:', !!this.authService.getToken());
    console.log('📊 [HomeComponent] loadGroups() - Will use proxy to reach http://localhost:3000/api/groups');
    
    this.http.get<any[]>('/api/groups', { headers }).subscribe({
      next: (res: any) => {
        console.log('✓ [HomeComponent] Groups loaded successfully:', res?.length || 0, 'groups');
        this.groups = Array.isArray(res) ? res : [];
        this.filterMyGroups();
        // if navigation requested a group, select it now
        if (this.pendingQueryGroup) {
          const g = this.groups.find(x => String(x.id) === String(this.pendingQueryGroup));
          if (g) this.selectGroup(g);
          this.pendingQueryGroup = null;
        }
      },
      error: (err) => { 
        console.error('❌ [HomeComponent] Error loading groups:', err); 
        this.groups = []; 
      }
    });
  }

  filterMyGroups(): void {
    const me = this.authService.getUser();
    if (!me) { this.myGroups = []; return; }
    const uid = me.id;
    this.myGroups = this.groups.filter(g => {
      try {
        const ints = g.integrantes ? (typeof g.integrantes === 'string' ? JSON.parse(g.integrantes) : g.integrantes) : [];
        return (g.autor === uid) || (Array.isArray(ints) && ints.includes(uid));
      } catch { return g.autor === uid; }
    }).filter(g => !this.groupFilter || g.nombre.toLowerCase().includes(this.groupFilter.toLowerCase()));
    // if the currently selected group is no longer in the filtered list, clear selection
    if (this.selectedGroup && !this.myGroups.find(x => String(x.id) === String(this.selectedGroup.id))) {
      this.selectedGroup = null;
      this.tickets = [];
    }

    // Auto-select the first available group (unless a query param requested a specific group)
    if (!this.selectedGroup && this.myGroups.length > 0 && !this.pendingQueryGroup) {
      const first = this.myGroups[0];
      setTimeout(() => {
        try { this.selectGroup(first); } catch (e) { console.error('Auto-select group error', e); }
      }, 0);
    }

    // Schedule a safe change-detection after the current cycle to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0);
  }

  selectGroup(g: any): void {
    this.selectedGroup = g;
    this.loadGroupTickets(g.id);
  }

  private loadGroupTickets(groupId: any): void {
    if (!this.hasPermission('ticket_view')) { 
      console.warn('⛔ No permission: ticket_view');
      this.tickets = []; 
      return; 
    }
    const headers = this.authService.getAuthHeaders();
    const ticketUrl = `${API_ENDPOINTS.GROUPS}/${groupId}/tickets`;
    console.log('🎫 Loading tickets for group:', groupId, 'URL:', ticketUrl, 'has token:', headers.has('Authorization'));
    
    this.http.get<any[]>(ticketUrl, { headers }).subscribe({
      next: (res: any) => {
        console.log('✅ Tickets loaded successfully:', {
          response: res,
          type: typeof res,
          isArray: Array.isArray(res),
          count: Array.isArray(res) ? res.length : 'N/A'
        });
        this.tickets = Array.isArray(res) ? res : [];
        this.cdr.detectChanges();
        // if a ticket was requested in query params, open it
        if (this.pendingQueryTicket) {
          const t = this.tickets.find((x: any) => String(x.id) === String(this.pendingQueryTicket));
          if (t) { this.openTicketDetail(t); }
          this.pendingQueryTicket = null;
        }
      },
      error: (err) => { 
        console.error('❌ ERROR loading group tickets:', {
          status: err.status,
          statusText: err.statusText,
          error: err.error,
          fullResponse: err
        });
        this.tickets = []; 
      }
    });
  }

  // Tickets: create & detail
  openNewTicket(): void {
    this.newTicket = { group_id: this.selectedGroup ? this.selectedGroup.id : null, titulo: '', descripcion: '', estado: 'abierto', priority: 'moderada' };
    this.ticketDialog = true;
  }

  saveTicket(): void {
    if (!this.hasPermission('ticket_create') || !this.newTicket || !this.newTicket.titulo || !this.newTicket.group_id) return;
    
    const headers = this.authService.getAuthHeaders();
    const currentUser = this.authService.getUser();
    
    // IMPORTANTE: El backend requiere created_by y group_id
    const payload = {
      group_id: this.newTicket.group_id,
      titulo: this.newTicket.titulo,
      descripcion: this.newTicket.descripcion || '',
      estado: this.newTicket.estado || 'abierto',
      created_by: currentUser?.id || currentUser?.userId || 1
    };
    
    console.log('🎫 [HomeComponent] Creating ticket:', {
      group_id: payload.group_id,
      titulo: payload.titulo,
      created_by: payload.created_by,
      hasAuth: headers.has('Authorization')
    });
    
    this.http.post('/api/tickets', payload, { headers }).subscribe({ 
      next: (res: any) => {
        console.log('✅ Ticket creado - Response status 200-299:', {
          response: res,
          type: typeof res,
          isArray: Array.isArray(res),
          keys: typeof res === 'object' ? Object.keys(res) : 'N/A'
        });
        this.ticketDialog = false;
        // reload
        if (this.selectedGroup && String(this.selectedGroup.id) === String(this.newTicket.group_id)) {
          console.log('🔄 Loading tickets for group:', this.selectedGroup.id);
          this.loadGroupTickets(this.selectedGroup.id);
        }
      }, 
      error: (e: any) => {
        console.error('❌ ERROR CREATING TICKET:', {
          status: e.status,
          statusText: e.statusText,
          error: e.error?.error || e.message,
          fullError: e.error,
          fullResponse: e
        });
      } 
    });
  }

  openTicketDetail(t: any): void {
    if (!t) return;
    this.selectedTicket = t;
    this.ticketDetailDialog = true;
  }

  closeTicketDetail(): void { this.selectedTicket = null; this.ticketDetailDialog = false; }

  editTicket(ticket: any): void {
    if (!ticket) return;
    // Initialize edit form with ticket data
    this.newTicket = { ...ticket };
    this.ticketDialog = true;
  }

  deleteTicket(ticket: any): void {
    if (!ticket) return;
    if (confirm(`¿Está seguro que desea eliminar el ticket: ${ticket.titulo}?`)) {
      this.apiHttpService.deleteTicket(ticket.id).subscribe({
        next: (res: any) => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket eliminado correctamente' });
          this.loadGroupTickets(this.selectedGroup.id);
        },
        error: (e: any) => {
          console.error('❌ ERROR DELETING TICKET:', e);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el ticket' });
        }
      });
    }
  }

  // helpers
  formatStateLabel(s: string): string { return s || 'No iniciado'; }
  hasPermission(permission: string | string[]): boolean { return this.authService.hasPermission(permission); }
  navigate(path: string): void { this.router.navigateByUrl(path); }
}
