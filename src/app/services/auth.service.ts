import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupabaseService } from './supabase.service.js';
import { ApiHttpService } from './api-http.service.js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'auth_user';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$: Observable<any> = this.currentUserSubject.asObservable();
  private storageAvailable: boolean = false;

  constructor(
    private http: HttpClient, 
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private supabase: SupabaseService,
    private apiHttp: ApiHttpService
  ) {
    if (this.isBrowser()) {
      // Test if localStorage is actually writable
      this.storageAvailable = this.testStorageAvailability();
      if (!this.storageAvailable) {
        console.warn('⚠️ [AuthService] localStorage is not available (Private Browsing?). Session will not persist on refresh.');
      }
      
      // Try to load user immediately
      this.loadUser();
      
      // Also set up a second attempt after a small delay to ensure DOM is ready
      setTimeout(() => {
        if (!this.currentUserSubject.value) {
          console.log('⏱️  [AuthService] Second loadUser attempt after DOM ready');
          this.loadUser();
        }
      }, 100);

      // Set up aggressive recovery for HMR (Vite Hot Module Replacement)
      // Check every 500ms for the first 3 seconds if BehaviorSubject is empty but localStorage has data
      let attempts = 0;
      const hmrRecoveryInterval = setInterval(() => {
        if (attempts >= 6) {
          clearInterval(hmrRecoveryInterval);
          return;
        }
        if (!this.currentUserSubject.value && this.isBrowser()) {
          const stored = this.getFromStorage();
          if (stored) {
            console.log('🔄 [AuthService] HMR Recovery - Detected storage data, loading user...');
            this.loadUser();
          }
        }
        attempts++;
      }, 500);

      // Listen for storage changes from other tabs/windows
      window.addEventListener('storage', (event) => {
        if (event.key === this.STORAGE_KEY) {
          console.log('🔔 [AuthService] Storage event detected from other tab/window');
          if (event.newValue) {
            try {
              const user = JSON.parse(event.newValue);
              this.ngZone.run(() => this.currentUserSubject.next(user));
              console.log('✓ [AuthService] Synced user from other tab:', user.usuario);
            } catch (e) {
              console.error('❌ [AuthService] Error parsing storage event:', e);
            }
          } else {
            console.log('🔔 [AuthService] User cleared in other tab');
            this.ngZone.run(() => this.currentUserSubject.next(null));
          }
        }
      });
    }
  }

  private testStorageAvailability(): boolean {
    try {
      const testKey = '__STORAGE_TEST__';
      window.localStorage.setItem(testKey, 'test');
      const testValue = window.localStorage.getItem(testKey);
      window.localStorage.removeItem(testKey);
      const available = testValue === 'test';
      console.log(`✓ [AuthService] Storage availability test: ${available ? 'PASS' : 'FAIL'}`);
      return available;
    } catch (e) {
      console.warn('⚠️ [AuthService] Storage test failed:', e);
      return false;
    }
  }

  private isBrowser(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && isPlatformBrowser(this.platformId);
    } catch {
      return false;
    }
  }

  private getFromStorage(): any {
    if (!this.isBrowser()) return null;
    try {
      const data = window.localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('❌ [AuthService] getFromStorage error:', e);
      return null;
    }
  }

  private saveToStorage(data: any): boolean {
    if (!this.isBrowser() || !this.storageAvailable) return false;
    try {
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      const verify = window.localStorage.getItem(this.STORAGE_KEY);
      if (!verify) {
        console.error('❌ [AuthService] Storage write verification failed');
        return false;
      }
      console.log('💾 [AuthService] Data saved to localStorage successfully');
      return true;
    } catch (e) {
      console.error('❌ [AuthService] saveToStorage error:', e);
      return false;
    }
  }

  private removeFromStorage(): boolean {
    if (!this.isBrowser()) return false;
    try {
      window.localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (e) {
      console.error('❌ [AuthService] removeFromStorage error:', e);
      return false;
    }
  }

  saveUser(user: any): void {
    if (!user) {
      console.warn('🔴 [AuthService] saveUser called with null/undefined - clearing session');
      this.removeFromStorage();
      this.ngZone.run(() => this.currentUserSubject.next(null));
      return;
    }

    // Validate required fields before saving
    if (!user.id || !user.usuario || !user.token) {
      console.error('❌ [AuthService] saveUser - Missing required fields:', {
        has_id: !!user.id,
        has_usuario: !!user.usuario,
        has_token: !!user.token
      });
      return;
    }

    // Try to save to storage
    const saved = this.saveToStorage(user);
    
    // Always update BehaviorSubject regardless of storage success
    this.ngZone.run(() => {
      this.currentUserSubject.next(user);
      console.log('✓ [AuthService] BehaviorSubject emitted user:', user.usuario, '(Storage saved:', saved, ')');
    });
  }

  getUser(): any {
    const stored = this.currentUserSubject.value;
    if (stored) {
      return stored;
    }
    
    // Fallback: try to load from storage
    const fromStorage = this.getFromStorage();
    if (fromStorage && fromStorage.usuario) {
      console.log('📂 [AuthService] getUser() - Recovered from storage:', fromStorage.usuario);
      this.ngZone.run(() => this.currentUserSubject.next(fromStorage));
      return fromStorage;
    }
    
    return null;
  }

  loadUser(): void {
    if (!this.isBrowser()) return;
    
    const stored = this.getFromStorage();
    if (stored) {
      // Validate required fields
      if (stored && stored.usuario && stored.id && stored.token) {
        console.log('✓ [AuthService] User loaded from storage:', stored.usuario, 'Token length:', stored.token?.length || 0);
        this.ngZone.run(() => {
          this.currentUserSubject.next(stored);
          console.log('✓ [AuthService] BehaviorSubject updated with user:', stored.usuario);
        });
        return;
      } else {
        console.warn('⚠️ [AuthService] loadUser() - Stored data missing required fields:', {
          has_usuario: !!stored?.usuario,
          has_id: !!stored?.id,
          has_token: !!stored?.token
        });
      }
    } else {
      console.log('ℹ️ [AuthService] No user found in storage');
    }
  }

  // Obtener JWT token
  getToken(): string | null {
    const stored = this.currentUserSubject.value;
    
    if (!stored) {
      console.log('⚠️ [AuthService] getToken() - BehaviorSubject is empty, trying localStorage');
      // Try to load from localStorage as fallback
      if (this.isBrowser()) {
        try {
          const raw = window.localStorage.getItem(this.STORAGE_KEY);
          if (raw) {
            const u = JSON.parse(raw);
            console.log('📂 [AuthService] getToken() - Found in localStorage:', {
              usuario: u?.usuario,
              has_token: !!u?.token,
              token_length: u?.token?.length
            });
            if (u && u.token) {
              // also populate BehaviorSubject for future calls
              this.ngZone.run(() => this.currentUserSubject.next(u));
              console.log('✓ [AuthService] getToken() - Loaded user from localStorage and updated BehaviorSubject');
              return u.token;
            }
          }
        } catch (e) {
          console.error('❌ [AuthService] getToken() - Error reading from localStorage:', e);
        }
      }
      console.warn('❌ [AuthService] getToken() - No user in BehaviorSubject or localStorage');
      return null;
    }
    
    const token = stored.token || null;
    console.log('✓ [AuthService] getToken() - Token from BehaviorSubject:', token ? 'present (' + token.substring(0, 20) + '...)' : 'missing');
    return token;
  }

  // Obtener permisos del usuario
  getPermissions(): string[] {
    const stored = this.currentUserSubject.value;
    // If there's no stored user, try to recover from localStorage (only in browser)
    if (!stored) {
      if (this.isBrowser()) {
        try {
          const raw = window.localStorage.getItem(this.STORAGE_KEY);
          if (raw) {
            const u = JSON.parse(raw);
            if (u) {
              // populate BehaviorSubject for future calls
              this.ngZone.run(() => this.currentUserSubject.next(u));
              let perms: any = u.permissions ?? [];
              if (typeof perms === 'string') {
                try { perms = JSON.parse(perms); } catch { perms = perms.split(',').map((s: string) => s.trim()).filter(Boolean); }
              }
              return Array.isArray(perms) ? perms : [];
            }
          }
        } catch (e) {
          console.error('getPermissions: error reading from storage', e);
        }
      }
      // No user available (SSR or not logged) -> return empty array
      return [];
    }

    // Normalize stored.permissions into an array safely
    let perms: any = stored.permissions ?? [];
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch { perms = perms.split(',').map((s: string) => s.trim()).filter(Boolean); }
    }
    return Array.isArray(perms) ? perms : [];
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
    // If user has numeric admin permiso, treat as full access
    const permiso = this.getPermiso();
    if (permiso === 2) return true;

    const permissions = this.getPermissions() || [];
    const perms = Array.isArray(permission) ? permission : [permission];
    return perms.some(perm => permissions.includes(perm));
  }

  // Verificar si el usuario es administrador
  isAdmin(): boolean {
    const stored = this.currentUserSubject.value;
    if (!stored) return false;
    if (stored.is_admin === true) return true;
    // numeric permiso flag (2 == admin)
    const permiso = this.getPermiso();
    if (permiso === 2) return true;
    return this.hasPermission('user_delete');
  }

  // Obtener headers con JWT para peticiones HTTP
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      console.log('📤 [AuthService] getAuthHeaders() - Adding Authorization header with token:', token.substring(0, 30) + '...');
      return headers.set('Authorization', `Bearer ${token}`);
    }
    console.warn('⚠️ [AuthService] getAuthHeaders() - No token available, returning headers without Authorization');
    return headers;
  }

  logout(): void {
    console.log('🚪 [AuthService] logout() called');
    this.removeFromStorage();
    this.ngZone.run(() => {
      this.currentUserSubject.next(null);
      console.log('✓ [AuthService] BehaviorSubject cleared');
    });
  }

  /**
   * Recover session - useful for HMR and state recovery
   */
  async recoverSession(): Promise<boolean> {
    console.log('🔄 [AuthService] recoverSession() - Attempting to recover session...');
    return new Promise((resolve) => {
      if (!this.isBrowser()) {
        resolve(false);
        return;
      }

      // Try immediate load
      this.loadUser();
      
      // If still no user, try after a delay
      setTimeout(() => {
        if (!this.currentUserSubject.value) {
          console.log('⏱️  [AuthService] recoverSession - Retrying loadUser()');
          this.loadUser();
        }
        
        const hasUser = !!this.currentUserSubject.value;
        console.log('recoverSession result:', hasUser ? 'SUCCESS' : 'FAILED');
        resolve(hasUser);
      }, 150);
    });
  }

  isLoggedIn(): boolean {
    const user = this.getUser();
    const token = this.getToken();
    
    console.log('🔍 [AuthService] isLoggedIn() check:', {
      user_exists: !!user,
      user_id: user?.id || null,
      token_exists: !!token,
      result: !!(user && token)
    });
    
    return !!user && !!token;
  }

  /**
   * Registrar usuario usando Supabase
   */
  async registerWithSupabase(email: string, password: string, username: string) {
    try {
      const result = await this.supabase.signUp(email, password, username);
      if (result.success) {
        console.log('Registration successful');
        return { success: true, message: 'Registro exitoso. Revisa tu email para confirmar.' };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Error en registro' };
    }
  }

  /**
   * Login usando Supabase
   */
  async loginWithSupabase(email: string, password: string) {
    try {
      const result = await this.supabase.signIn(email, password);
      if (result.success && result.user) {
        // Guardar usuario con permisos
        const userData = {
          id: result.user.id,
          usuario: result.user.email || result.user.usuario,
          email: result.user.email,
          token: result.token,
          permissionsByGroup: result.user.permissionsByGroup || {},
          defaultGroupId: result.user.defaultGroupId,
          is_admin: false
        };
        this.saveUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Error en login' };
    }
  }

  /**
   * Logout usando Supabase
   */
  async logoutWithSupabase() {
    try {
      await this.supabase.signOut();
      this.logout();
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      this.logout();
      return { success: true }; // Logout localmente de todas formas
    }
  }

  /**
   * Login directo vía API Gateway (sin Supabase)
   * Ideal para testing o cuando Supabase está limitado
   */
  async loginDirect(username: string, password: string) {
    try {
      console.log('🔐 [AuthService] Attempting login for user:', username);
      
      const response: any = await this.apiHttp.loginUser(username, password).toPromise();
      
      console.log('📡 [AuthService] Response received from backend:', {
        id: response?.id,
        usuario: response?.usuario,
        email: response?.email,
        has_token: !!response?.token,
        token_length: response?.token?.length,
        permissions: response?.permissions,
        is_admin: response?.is_admin,
        fullname: response?.fullname
      });
      
      if (response && response.id && response.token) {
        const userData = {
          id: response.id,
          usuario: response.usuario || username,
          email: response.email,
          fullname: response.fullname || '',
          address: response.address || '',
          phone: response.phone || '',
          token: response.token, // JWT real del backend
          permissions: response.permissions || [], // Array de permisos
          permissionsByGroup: {},
          is_admin: response.is_admin || false
        };
        
        console.log('💾 [AuthService] Saving user to storage and BehaviorSubject:', userData.usuario);
        this.saveUser(userData);
        
        // After saveUser completes, verify it's actually been saved
        const immediateCheck = this.getUser();
        console.log('✓ [AuthService] Immediate verification after saveUser:', {
          user_saved: !!immediateCheck,
          usuario: immediateCheck?.usuario,
          has_token: !!immediateCheck?.token
        });
        
        console.log('✓ [AuthService] Direct login successful:', username, 'Permisos:', userData.permissions);
        console.log('✓ [AuthService] Current user in BehaviorSubject:', this.currentUserSubject.value?.usuario);
        
        return { success: true, user: userData };
      }
      
      console.error('❌ [AuthService] Invalid response from backend:', response);
      return { success: false, error: 'Usuario no encontrado o sin token' };
    } catch (error: any) {
      console.error('❌ [AuthService] Direct login error:', error);
      return { success: false, error: error.error?.error || error.message || 'Error en login' };
    }
  }

  /**
   * Register directo vía API Gateway (sin Supabase)
   */
  async registerDirect(data: any) {
    try {
      const response: any = await this.apiHttp.registerUser(data).toPromise();
      
      if (response && response.id) {
        console.log('✓ Direct registration successful:', data.usuario);
        return { success: true, user: response };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      console.error('Direct register error:', error);
      return { success: false, error: error.error?.error || error.message || 'Error en registro' };
    }
  }
}
