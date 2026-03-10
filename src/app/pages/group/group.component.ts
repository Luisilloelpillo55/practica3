import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
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

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule, ToastModule, CardModule, HttpClientModule, FormsModule],
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.css']
})
export class GroupComponent implements OnInit {
  groups: any[] = [];
  ticketsByGroup: Record<string, any[]> = {};
  users: any[] = [];
  dialogVisible = false;
  editing: any = null;

  constructor(private messageService: MessageService, private http: HttpClient, private authService: AuthService, private location: Location, private router: Router) {}

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
    this.load();
    this.loadUsers();
    this.loadTickets();
  }

  hasPermission(permission: string | string[]): boolean {
    return this.authService.hasPermission(permission);
  }

  load() {
    this.http.get('/api/groups', { headers: this.authService.getAuthHeaders() }).subscribe({ 
      next: (res: any) => this.groups = Array.isArray(res) ? res : [], 
      error: (e) => console.error(e) 
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
