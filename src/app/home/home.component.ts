import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { KanbanComponent } from '../pages/kanban/kanban.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ButtonModule, HttpClientModule, FormsModule, CardModule, TableModule, DialogModule, InputTextModule, ToastModule, KanbanComponent],
  providers: [MessageService],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  groups: any[] = [];
  myGroups: any[] = [];
  tickets: any[] = [];
  selectedGroup: any = null;
  groupFilter = '';
  ticketStateFilter = '';

  // ticket UI
  ticketDialog: boolean = false;
  newTicket: any = { group_id: null, titulo: '', descripcion: '', estado: 'abierto' };
  ticketDetailDialog: boolean = false;
  selectedTicket: any = null;
  private pendingQueryGroup: any = null;
  private pendingQueryTicket: any = null;

  constructor(public authService: AuthService, private router: Router, private route: ActivatedRoute, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // capture query params (possible navigation from Group component)
    this.route.queryParams.subscribe(params => {
      this.pendingQueryGroup = params['group'] || null;
      this.pendingQueryTicket = params['ticket'] || null;
    });

    this.loadGroups();
  }

  private loadGroups(): void {
    const headers = this.authService.getAuthHeaders();
    this.http.get<any[]>('/api/groups', { headers }).subscribe({
      next: (res: any) => {
        this.groups = Array.isArray(res) ? res : [];
        this.filterMyGroups();
        // if navigation requested a group, select it now
        if (this.pendingQueryGroup) {
          const g = this.groups.find(x => String(x.id) === String(this.pendingQueryGroup));
          if (g) this.selectGroup(g);
          this.pendingQueryGroup = null;
        }
      },
      error: (err) => { console.error('Error loading groups on home:', err); this.groups = []; }
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
    if (!this.hasPermission('ticket_view')) { this.tickets = []; return; }
    const headers = this.authService.getAuthHeaders();
    this.http.get<any[]>(`/api/groups/${groupId}/tickets`, { headers }).subscribe({
      next: (res: any) => {
        this.tickets = Array.isArray(res) ? res : [];
        this.cdr.detectChanges();
        // if a ticket was requested in query params, open it
        if (this.pendingQueryTicket) {
          const t = this.tickets.find((x: any) => String(x.id) === String(this.pendingQueryTicket));
          if (t) { this.openTicketDetail(t); }
          this.pendingQueryTicket = null;
        }
      },
      error: (err) => { console.error('Error loading group tickets:', err); this.tickets = []; }
    });
  }

  // Tickets: create & detail
  openNewTicket(): void {
    this.newTicket = { group_id: this.selectedGroup ? this.selectedGroup.id : null, titulo: '', descripcion: '', estado: 'abierto' };
    this.ticketDialog = true;
  }

  saveTicket(): void {
    if (!this.hasPermission('ticket_create') || !this.newTicket || !this.newTicket.titulo || !this.newTicket.group_id) return;
    const headers = this.authService.getAuthHeaders();
    this.http.post('/api/tickets', this.newTicket, { headers }).subscribe({ next: () => {
      this.ticketDialog = false;
      // reload
      if (this.selectedGroup && String(this.selectedGroup.id) === String(this.newTicket.group_id)) {
        this.loadGroupTickets(this.selectedGroup.id);
      }
    }, error: (e) => { console.error('Error creating ticket:', e); } });
  }

  openTicketDetail(t: any): void {
    if (!t) return;
    this.selectedTicket = t;
    this.ticketDetailDialog = true;
  }

  closeTicketDetail(): void { this.selectedTicket = null; this.ticketDetailDialog = false; }

  // helpers
  formatStateLabel(s: string): string { return s || 'No iniciado'; }
  hasPermission(permission: string | string[]): boolean { return this.authService.hasPermission(permission); }
  navigate(path: string): void { this.router.navigateByUrl(path); }
}
