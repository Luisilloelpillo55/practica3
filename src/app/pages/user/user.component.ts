import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, CardModule, ToastModule, HttpClientModule, RouterLink, DialogModule, InputTextModule, ButtonModule, FormsModule],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit, OnDestroy {
  user: any = null;
  private sub: Subscription | null = null;
  editDialog: boolean = false;
  editingUser: any = null;

  constructor(private authService: AuthService, private http: HttpClient, private location: Location) {}

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    // Ensure auth service has loaded any stored user
    try { this.authService.loadUser(); } catch {}
    // React to changes in the current user (works if login happens elsewhere)
    this.sub = this.authService.currentUser$.subscribe((val) => {
      const current = this.normalizeUser(val);
      if (current && current.id) {
        this.fetchProfile(current.id, current);
      } else if (current) {
        this.user = current;
      } else {
        this.user = null;
      }
    });

    // Also try snapshot in case subject already has value
    const snap = this.authService.getUser();
    if (snap && snap.id) {
      this.fetchProfile(snap.id, snap);
    } else if (snap) {
      this.user = snap;
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  openEdit(): void {
    if (!this.user) return;
    // clone so changes are local until saved
    this.editingUser = { ...this.user };
    // prevent editing id/permiso
    delete this.editingUser.id;
    delete this.editingUser.permiso;
    this.editDialog = true;
  }

  saveEdit(): void {
    if (!this.editingUser) return;
    const id = this.user?.id;
    if (!id) {
      this.editDialog = false;
      return;
    }
    // send update to server
    const headers = this.authService.getAuthHeaders();
    this.http.put(`/api/users/${id}`, this.editingUser, { headers }).subscribe({ next: (res: any) => {
      this.user = res;
      // update stored user snapshot if it matches
      try { this.authService.saveUser(res); } catch {}
      this.editDialog = false;
    }, error: () => {
      // fallback: just update locally
      this.user = { ...this.user, ...this.editingUser };
      this.editDialog = false;
    } });
  }

  private normalizeUser(stored: any): any {
    if (!stored) return null;
    if (stored.user) return { ...stored.user, token: stored.token, permissions: stored.permissions };
    return stored;
  }

  private fetchProfile(id: any, fallback: any) {
    const headers = this.authService.getAuthHeaders();
    this.http.get(`/api/users/${id}`, { headers }).subscribe({ next: (res: any) => this.user = res, error: () => this.user = fallback });
  }
}
