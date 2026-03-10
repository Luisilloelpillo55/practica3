import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'auth_user';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
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

  private encode(data: any): string {
    try {
      const json = JSON.stringify(data);
      return btoa(json);
    } catch {
      return '';
    }
  }

  private decode(encoded: string): any {
    try {
      const json = atob(encoded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  saveUser(user: any): void {
    if (!user) {
      if (this.isBrowser()) {
        try { window.localStorage.removeItem(this.STORAGE_KEY); } catch {}
      }
      this.currentUserSubject.next(null);
      return;
    }
    const encoded = this.encode(user);
    if (this.isBrowser()) {
      try { window.localStorage.setItem(this.STORAGE_KEY, encoded); } catch {}
    }
    this.currentUserSubject.next(user);
  }

  getUser(): any {
    const stored = this.currentUserSubject.value;
    if (!stored) return null;
    // If server returns { user: {...}, token, permissions }, normalize to user object
    if (stored.user) {
      return { ...stored.user, token: stored.token, permissions: stored.permissions };
    }
    return stored;
  }

  loadUser(): void {
    if (!this.isBrowser()) return;
    try {
      const encoded = window.localStorage.getItem(this.STORAGE_KEY);
      if (encoded) {
        const user = this.decode(encoded);
        if (user) {
          this.currentUserSubject.next(user);
        }
      }
    } catch (e) {
      console.error('Error loading user from localStorage', e);
    }
  }

  // Obtener JWT token
  getToken(): string | null {
    const stored = this.currentUserSubject.value;
    if (!stored) return null;
    // token may be top-level or nested
    return stored.token || stored?.user?.token || null;
  }

  // Obtener permisos del usuario
  getPermissions(): string[] {
    const stored = this.currentUserSubject.value;
    if (!stored) return [];
    return stored.permissions || stored?.user?.permissions || [];
  }

  // Obtener permiso numérico (nuevo campo 'permiso')
  getPermiso(): number | null {
    const stored = this.currentUserSubject.value;
    if (!stored) return null;
    const p = stored.permiso ?? stored?.user?.permiso ?? null;
    return typeof p === 'number' ? p : (p ? Number(p) : null);
  }

  // Verificar si usuario tiene permiso específico
  hasPermission(permission: string | string[]): boolean {
    const permissions = this.getPermissions();
    const perms = Array.isArray(permission) ? permission : [permission];
    return perms.some(perm => permissions.includes(perm));
  }

  // Obtener headers con JWT para peticiones HTTP
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      return new HttpHeaders({ 'Content-Type': 'application/json' });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  logout(): void {
    if (this.isBrowser()) {
      try { window.localStorage.removeItem(this.STORAGE_KEY); } catch {}
    }
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value && !!this.getToken();
  }
}
