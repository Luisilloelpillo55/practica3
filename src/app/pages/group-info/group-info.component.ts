import { Component, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { filter, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-group-info',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TableModule, HttpClientModule],
  templateUrl: './group-info.component.html',
  styleUrls: ['./group-info.component.css']
})
export class GroupInfoComponent implements OnInit, OnDestroy {
  groups: any[] = [];
  selectedGroup: any = null;
  tickets: any[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const currentUser = this.auth.getUser();
    if (!currentUser || !currentUser.token) {
      this.auth.loadUser();
    }
    
    const userToUse = this.auth.getUser();
    if (userToUse && userToUse.token) {
      this.loadGroupInfo();
    }
    
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user && user.token) {
          this.loadGroupInfo();
        } else {
          this.clearInfo();
        }
      });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e: any) => {
      if (e.urlAfterRedirects === '/group-info') {
        const u = this.auth.getUser();
        if (!u || !u.token) {
          this.auth.loadUser();
        } else {
          this.loadGroupInfo();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private clearInfo(): void {
    this.groups = [];
    this.selectedGroup = null;
    this.tickets = [];
  }

  private loadGroupInfo(): void {
    Promise.resolve().then(() => {
      this.loadGroups();
    });
  }

  private loadGroups(): void {
    const headers = this.auth.getAuthHeaders();
    this.http.get<any>('/api/groups', { headers }).subscribe({
      next: (res: any) => {
        // Extraer datos de la nueva estructura {statusCode, intOpCode, data}
        const groupData = res?.data || res;
        Promise.resolve().then(() => {
          this.groups = Array.isArray(groupData) ? groupData : [];
          try { this.cdr.detectChanges(); } catch {}
        });
      },
      error: (err: any) => {
        console.error('Error loading groups:', err);
        this.clearInfo();
      }
    });
  }

  onGroupSelect(event: any): void {
    const groupId = event.target.value;
    if (!groupId) {
      this.selectedGroup = null;
      this.tickets = [];
      return;
    }
    
    const selected = this.groups.find(g => g.id === parseInt(groupId, 10));
    if (selected) {
      this.selectedGroup = selected;
      this.loadGroupTickets(selected.id);
    }
  }

  private loadGroupTickets(groupId: any): void {
    const headers = this.auth.getAuthHeaders();
    this.http.get<any>(`/api/groups/${groupId}/tickets`, { headers }).subscribe({
      next: (res: any) => {
        // Extraer datos de la nueva estructura {statusCode, intOpCode, data}
        const ticketData = res?.data || res;
        Promise.resolve().then(() => {
          this.tickets = Array.isArray(ticketData) ? ticketData : [];
          try { this.cdr.detectChanges(); } catch {}
        });
      },
      error: (err: any) => {
        console.error('Error loading group tickets:', err);
        this.tickets = [];
      }
    });
  }

  goBack(): void {
    this.router.navigateByUrl('/home');
  }
}
