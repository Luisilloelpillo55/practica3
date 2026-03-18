import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ButtonModule, HttpClientModule, FormsModule],
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

  constructor(public authService: AuthService, private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  private loadGroups(): void {
    const headers = this.authService.getAuthHeaders();
    this.http.get<any[]>('/api/groups', { headers }).subscribe({
      next: (res: any) => {
        this.groups = Array.isArray(res) ? res : [];
        this.filterMyGroups();
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
    this.cdr.detectChanges();
  }

  selectGroup(g: any): void {
    this.selectedGroup = g;
    this.loadGroupTickets(g.id);
  }

  private loadGroupTickets(groupId: any): void {
    const headers = this.authService.getAuthHeaders();
    this.http.get<any[]>(`/api/groups/${groupId}/tickets`, { headers }).subscribe({
      next: (res: any) => { this.tickets = Array.isArray(res) ? res : []; this.cdr.detectChanges(); },
      error: (err) => { console.error('Error loading group tickets:', err); this.tickets = []; }
    });
  }

  // helpers
  formatStateLabel(s: string): string { return s || 'No iniciado'; }
  hasPermission(permission: string | string[]): boolean { return this.authService.hasPermission(permission); }
  navigate(path: string): void { this.router.navigateByUrl(path); }
}
