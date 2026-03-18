import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'auth_user';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$: Observable<any> = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient, 
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {
    if (this.isBrowser()) {
      this.loadUser();
    }
  }

  private isBrowser(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && isPlatformBrowser(this.platformId);
    } catch {
      return false;
    }
  }

  saveUser(user: any): void {
    if (!user) {
      if (this.isBrowser()) {
        try { 
          window.localStorage.removeItem(this.STORAGE_KEY); 
        } catch (e) {
          console.error('Error removing user from storage:', e);
        }
      }
      this.ngZone.run(() => this.currentUserSubject.next(null));
      return;
    }

    // Store user data directly without encoding
    if (this.isBrowser()) {
      try { 
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user)); 
        console.log('✓ User saved to storage:', user.usuario, 'Token length:', user.token?.length || 0);
      } catch (e) {
        console.error('Error saving user to storage:', e);
      }
    }

    this.ngZone.run(() => {
      this.currentUserSubject.next(user);
    });
  }

  getUser(): any {
    const stored = this.currentUserSubject.value;
    return stored || null;
  }

  loadUser(): void {
    if (!this.isBrowser()) return;
    try {
      const stored = window.localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        if (user && user.usuario) {
          console.log('✓ User loaded from storage:', user.usuario, 'Token length:', user.token?.length || 0);
          this.ngZone.run(() => {
            this.currentUserSubject.next(user);
          });
          return;
        }
      }
    } catch (e) {
      console.error('Error loading user from storage:', e);
    }
    console.log('No user found in storage');
  }

  // Obtener JWT token
  getToken(): string | null {
    const stored = this.currentUserSubject.value;
    if (!stored) {
      console.warn('getToken: No user in BehaviorSubject');
      return null;
    }
    const token = stored.token || null;
    console.log('getToken: Token', token ? 'present (' + token.substring(0, 20) + '...)' : 'missing');
    return token;
  }

  // Obtener permisos del usuario
  getPermissions(): string[] {
    const stored = this.currentUserSubject.value;
    if (!stored) return [];
    return stored.permissions || [];
  }

  // Obtener permiso numérico (nuevo campo 'permiso')
  getPermiso(): number | null {
    const stored = this.currentUserSubject.value;
    if (!stored) return null;
    const p = stored.permiso ?? null;
    return typeof p === 'number' ? p : (p ? Number(p) : null);
  }

  // Verificar si usuario tiene permiso específico
  hasPermission(permission: string | string[]): boolean {
    const permissions = this.getPermissions();
    const perms = Array.isArray(permission) ? permission : [permission];
    return perms.some(perm => permissions.includes(perm));
  }

  // Verificar si el usuario es administrador
  isAdmin(): boolean {
    const stored = this.currentUserSubject.value;
    if (!stored) return false;
    return stored.is_admin === true || this.hasPermission('user_delete');
  }

  // Obtener headers con JWT para peticiones HTTP
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  logout(): void {
    if (this.isBrowser()) {
      try { 
        window.localStorage.removeItem(this.STORAGE_KEY); 
      } catch (e) {
        console.error('Error removing user:', e);
      }
    }
    this.ngZone.run(() => this.currentUserSubject.next(null));
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value && !!this.getToken();
  }
}
