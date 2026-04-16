import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiHttpService } from './api-http.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'auth_user';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private api: ApiHttpService) {}

  /** Sincrónicamente intenta cargar usuario desde storage y establece el BehaviorSubject */
  loadUser(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(this.STORAGE_KEY) || window.sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        this.currentUserSubject.next(user);
        return;
      }
    } catch (e) {
      console.error('[AuthService] loadUser error', e);
    }
    this.currentUserSubject.next(null);
  }

  /** Comprueba si hay sesión activa */
  isLoggedIn(): boolean {
    return !!this.getTokenSync();
  }

  /** Devuelve token (síncrono) */
  getToken(): string | null {
    return this.getTokenSync();
  }

  /** Devuelve permisos crudos del usuario (legacy `permiso` o `permissions`) */
  getPermiso(): any {
    const u = this.getUser();
    return u?.permiso || u?.permisos || u?.permissions || [];
  }

  /** Comprueba si el usuario tiene un permiso (o todos) */
  hasPermission(permission: string | string[]): boolean {
    const perms = Array.isArray(permission) ? permission : [permission];
    const userPerms: string[] = this.getUser()?.permissions || this.getUser()?.permisos || this.getUser()?.permiso || [];
    return perms.every(p => userPerms.includes(p));
  }

  /** Comprueba si el usuario es admin (flag o permiso admin) */
  isAdmin(): boolean {
    const user = this.getUser();
    if (!user) return false;
    if (user.is_admin || user.admin) return true;
    const userPerms: string[] = user.permissions || user.permisos || [];
    return userPerms.includes('admin');
  }

  /** Logout limpio */
  logout(): void {
    this.clearSession();
  }

  /** Devuelve el usuario actualmente en memoria (sincrónico) */
  getUser(): any {
    return this.currentUserSubject.value;
  }

  /** Guarda el usuario en BehaviorSubject y en storage (local y session) */
  saveUser(user: any, remember: boolean = true): boolean {
    try {
      if (typeof window !== 'undefined') {
        const str = JSON.stringify(user);
        // Siempre guardar en sessionStorage para la sesión actual
        window.sessionStorage.setItem(this.STORAGE_KEY, str);
        // Si quiere "recordarme", guardar en localStorage también
        if (remember) window.localStorage.setItem(this.STORAGE_KEY, str);
      }
      this.currentUserSubject.next(user);
      return true;
    } catch (e) {
      console.error('[AuthService] saveUser error', e);
      return false;
    }
  }

  /** Limpia la sesión (storage + subject) */
  clearSession(): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(this.STORAGE_KEY);
        window.sessionStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (e) {
      console.error('[AuthService] clearSession error', e);
    }
    this.currentUserSubject.next(null);
  }

  /** Recupera sesión desde localStorage/sessionStorage. Usado por APP_INITIALIZER */
  async recoverSession(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      console.log('�[AuthService] recoverSession() - Attempting to recover session from localStorage...');
      const stored = window.localStorage.getItem(this.STORAGE_KEY) || window.sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        if (user && (user.token || user.accessToken)) {
          this.currentUserSubject.next(user);
          return true;
        }
      }
    } catch (e) {
      console.error('[AuthService] recoverSession error', e);
    }
    return false;
  }

  /** Obtiene el token de la sesión (intenta BehaviorSubject y luego storage) */
  private getTokenSync(): string | null {
    const user = this.currentUserSubject.value;
    if (user && (user.token || user.accessToken)) return user.token || user.accessToken;
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(this.STORAGE_KEY) || window.sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.token || parsed.accessToken)) {
          // Repoblar BehaviorSubject para futuras lecturas
          this.currentUserSubject.next(parsed);
          return parsed.token || parsed.accessToken;
        }
      }
    } catch (e) {
      console.error('[AuthService] getTokenSync error', e);
    }
    return null;
  }

  /** Devuelve HttpHeaders con Authorization si existe token */
  getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
    const token = this.getTokenSync();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  /** Login directo utilizado por LoginComponent. Llama a ApiHttpService.loginUser */
  async loginDirect(username: string, password: string, remember: boolean = true): Promise<any> {
    try {
      const resp: any = await firstValueFrom(this.api.loginUser(username, password));
      const data = resp?.data || resp;
      if (data && (data.token || data.accessToken)) {
        this.saveUser(data, remember);
        return { success: true, user: data };
      }
      return { success: false, error: resp?.error || 'No token received' };
    } catch (e: any) {
      console.error('[AuthService] loginDirect error', e?.message || e);
      return { success: false, error: e?.message || e };
    }
  }

  /** Registro directo (envía datos a API) */
  async registerDirect(payload: any): Promise<any> {
    try {
      const resp: any = await firstValueFrom(this.api.registerUser(payload));
      const data = resp?.data || resp;
      return { success: true, data };
    } catch (e: any) {
      console.error('[AuthService] registerDirect error', e?.message || e);
      return { success: false, error: e?.message || e };
    }
  }
}
