import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule, ToastModule, CardModule, HttpClientModule, FormsModule],
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.css']
})
export class GroupComponent implements OnInit, OnDestroy {
  groups: any[] = [];
  ticketsByGroup: Record<string, any[]> = {};
  users: any[] = [];
  // Tickets UI state
  ticketsDialog: boolean = false;
  selectedTickets: any[] = [];
  ticketDetailDialog: boolean = false;
  selectedTicket: any = null;
  dialogVisible = false;
  editing: any = null;
  // ticket creation
  ticketDialog: boolean = false;
  newTicket: any = { group_id: null, titulo: '', descripcion: '', estado: 'abierto' };
  private sub: Subscription | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private messageService: MessageService,
    private http: HttpClient,
    private authService: AuthService,
    private location: Location,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  goBack(): void {
    try {
      // If there is browser history, go back, otherwise navigate to home
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        this.location.back();
      } else {
        this.router.navigateByUrl('/');
      }
    } catch (e) {
      this.router.navigateByUrl('/');
    }
  }

  // helper for templates – global Array is not visible under strict templates
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  ngOnInit(): void {
    // Ensure user is loaded from storage immediately
    const currentUser = this.authService.getUser();
    console.log('Component init - Current user:', currentUser?.usuario ? 'loaded' : 'not loaded');
    
    if (!currentUser || !currentUser.token) {
      console.log('No current user or token, loading from storage...');
      this.authService.loadUser();
    }
    
    // Load data with current user
    const userToUse = this.authService.getUser();
    console.log('Loading data for user:', userToUse?.usuario, 'Token:', userToUse?.token ? 'YES' : 'NO');
    
    if (userToUse && userToUse.token) {
      this.loadAll();
    }
    
    // Listen for future auth changes
    this.sub = this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        console.log('Auth changed:', user?.usuario ? 'logged in' : 'logged out', 'Token:', user?.token ? 'YES' : 'NO');
        if (user && user.token) {
          this.loadAll();
        } else {
          this.groups = [];
          this.ticketsByGroup = {};
          this.users = [];
        }
      });

    // watch router navigations to reload if returning to this page
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((ev: any) => {
      if (ev instanceof NavigationEnd) {
        const url = ev.urlAfterRedirects || ev.url || '';
        if (url.includes('/group')) {
          console.log('router nav to', url, '-> calling loadAll');
          const u = this.authService.getUser();
          if (!u || !u.token) {
            this.authService.loadUser();
          } else {
            this.loadAll();
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.sub?.unsubscribe();
  }

  private loadAll(): void {
    // defer to next tick to avoid change detection conflicts
    Promise.resolve().then(() => {
      this.load();
      this.loadUsers();
      this.loadTickets();
    });
  }

  hasPermission(permission: string | string[]): boolean {
    return this.authService.hasPermission(permission);
  }

  load() {
    const headers = this.authService.getAuthHeaders();
    const auth = headers.get('Authorization');
    console.log('Loading groups with token:', auth ? auth.substr(0,20) + '...' : 'missing', headers);
    
    this.http.get<any[]>('/api/groups', { headers }).subscribe({ 
      next: (res: any) => {
        console.log('Groups loaded successfully:', res ? res.length : 0);
        // assign in next microtask to avoid ExpressionChangedAfterItHasBeenChecked
        Promise.resolve().then(() => {
          this.groups = Array.isArray(res) ? res : [];
          // update view if needed
          try { this.cdr.detectChanges(); } catch {}
        });
      }, 
      error: (e) => {
        console.error('Error loading groups:', e);
        this.groups = [];
      }
    });
  }

  loadTickets() {
    this.http.get('/api/tickets', { headers: this.authService.getAuthHeaders() }).subscribe({ next: (res: any) => {
      const arr = Array.isArray(res) ? res : [];
      const map: Record<string, any[]> = {};
      for (const t of arr) {
        const gid = t.group_id != null ? String(t.group_id) : 'unknown';
        (map[gid] = map[gid] || []).push(t);
      }
      this.ticketsByGroup = map;
    }, error: () => { this.ticketsByGroup = {}; } });
  }

  openTickets(g: any) {
    if (!g || !g.id) return;
    const arr = this.ticketsByGroup[String(g.id)] || [];
    this.selectedTickets = Array.isArray(arr) ? arr : [];
    this.ticketsDialog = true;
  }

  openTicketDetail(t: any) {
    if (!t) return;
    this.selectedTicket = t;
    this.ticketDetailDialog = true;
  }

  closeTicketDetail() {
    this.selectedTicket = null;
    this.ticketDetailDialog = false;
  }

  loadUsers() {
    this.http.get('/api/users', { headers: this.authService.getAuthHeaders() }).subscribe({ 
      next: (res: any) => this.users = Array.isArray(res) ? res : [], 
      error: () => {} 
    });
  }

  getAuthorName(row: any): string {
    if (!row) return '';
    const id = row.autor;
    if (!this.users || !Array.isArray(this.users)) return id || '';
    const found = this.users.find((u: any) => u && u.id === id);
    return (found && (found.usuario || found.email)) || id || '';
  }

  openNew(): void {
    this.editing = { nivel: '', autor: null, nombre: '', integrantes: [], descripcion: '' };
    this.dialogVisible = true;
  }

  // Nuevo ticket
  openNewTicket(): void {
    this.newTicket = { group_id: (this.groups && this.groups[0]) ? this.groups[0].id : null, titulo: '', descripcion: '', estado: 'abierto' };
    this.ticketDialog = true;
  }

  saveTicket(): void {
    if (!this.newTicket || !this.newTicket.titulo || !this.newTicket.group_id) return;
    const payload = { ...this.newTicket };
    const headers = this.authService.getAuthHeaders();
    this.http.post('/api/tickets', payload, { headers }).subscribe({ next: (res: any) => {
      this.messageService.add({ severity: 'success', summary: 'Ticket', detail: 'Creado' });
      this.ticketDialog = false;
      this.loadTickets();
      this.load();
    }, error: (e: any) => {
      this.messageService.add({ severity: 'error', summary: 'Ticket', detail: 'Error: ' + (e?.error?.error || 'permiso denegado') });
    } });
  }

  edit(g: any): void {
    this.editing = { ...g };
    this.dialogVisible = true;
  }

  save(): void {
    if (!this.editing) return;
    let integrantesArr: any[] = [];
    if (Array.isArray(this.editing.integrantes)) {
      integrantesArr = this.editing.integrantes;
    } else if (typeof this.editing.integrantes === 'string') {
      integrantesArr = this.editing.integrantes.split(',').map((s: any) => s.trim()).filter(Boolean);
    }
    const payload = { ...this.editing, integrantes: integrantesArr };
    const headers = this.authService.getAuthHeaders();
    
    if (payload.id) {
      this.http.put(`/api/groups/${payload.id}`, payload, { headers }).subscribe({ 
        next: () => { 
          this.messageService.add({ severity: 'success', summary: 'Grupo', detail: 'Actualizado' }); 
          this.dialogVisible = false; 
          this.load(); 
        }, 
        error: (e: any) => { 
          this.messageService.add({ severity: 'error', summary: 'Grupo', detail: 'Error: ' + (e?.error?.error || 'permiso denegado') }); 
        } 
      });
    } else {
      this.http.post('/api/groups', payload, { headers }).subscribe({ 
        next: () => { 
          this.messageService.add({ severity: 'success', summary: 'Grupo', detail: 'Creado' }); 
          this.dialogVisible = false; 
          this.load(); 
        }, 
        error: (e: any) => this.messageService.add({ severity: 'error', summary: 'Grupo', detail: 'Error: ' + (e?.error?.error || 'permiso denegado') }) 
      });
    }
  }

  remove(g: any): void {
    if (!g?.id) return;
    const headers = this.authService.getAuthHeaders();
    this.http.delete(`/api/groups/${g.id}`, { headers }).subscribe({ 
      next: () => { 
        this.messageService.add({ severity: 'success', summary: 'Grupo', detail: 'Eliminado' }); 
        this.load(); 
      }, 
      error: (e: any) => this.messageService.add({ severity: 'error', summary: 'Grupo', detail: 'Error: ' + (e?.error?.error || 'permiso denegado') }) 
    });
  }
}
