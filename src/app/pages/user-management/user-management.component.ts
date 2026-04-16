import { Component, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { filter, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// Interfaz para organizar permisos por categoría
interface PermissionCategory {
  name: string;
  icon: string;
  color: string;
  permissions: PermissionItem[];
}

interface PermissionItem {
  nombre: string;
  descripcion: string;
  category?: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CheckboxModule,
    FormsModule,
    HttpClientModule,
    ToastModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
  providers: [MessageService]
})
export class UserManagementComponent implements OnInit, OnDestroy {
  users: any[] | null = null;
  displayDialog = false;
  selectedUser: any = null;
  editForm = {
    usuario: '',
    email: '',
    fullname: '',
    phone: '',
    address: ''
  };
  
  // NEW: Permisos dialog profesional
  permissionsDialog = false;
  selectedUserForPerms: any = null;
  selectedPermissions: string[] = [];
  permissionCategories: PermissionCategory[] = [];
  allAvailablePermissions: PermissionItem[] = [];
  
  private destroy$ = new Subject<void>();


  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private zone: NgZone,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const currentUser = this.auth.getUser();
    if (!currentUser || !currentUser.token) {
      this.auth.loadUser();
    }
    
    const userToUse = this.auth.getUser();
    if (userToUse && userToUse.token) {
      // Verificar que el usuario es administrador (tiene permiso user_delete)
      if (!this.auth.hasPermission('user_delete')) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No tienes permisos para acceder a esta sección' });
        this.router.navigateByUrl('/home');
        return;
      }
      this.loadUsers();
      this.loadPermissions();
    }
    
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user && user.token) {
          if (!this.auth.hasPermission('user_delete')) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No tienes permisos para acceder a esta sección' });
            this.router.navigateByUrl('/home');
            return;
          }
          this.loadUsers();
        } else {
          this.users = [];
        }
      });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e: any) => {
      if (e.urlAfterRedirects === '/user-management') {
        const u = this.auth.getUser();
        if (!u || !u.token) {
          this.auth.loadUser();
        } else {
          if (!this.auth.hasPermission('user_delete')) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No tienes permisos para acceder a esta sección' });
            this.router.navigateByUrl('/home');
            return;
          }
          this.loadUsers();
          this.loadPermissions();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigateByUrl('/home');
  }

  loadUsers(): void {
    const headers = this.auth.getAuthHeaders();
    this.http.get<any>('/api/users', { headers }).subscribe({
      next: (res: any) => {
        // Extraer datos de la nueva estructura {statusCode, intOpCode, data}
        const userData = res?.data || res;
        const arr = Array.isArray(userData) ? userData : [];
        this.zone.run(() => {
          this.users = arr;
          console.log('✓ [UserManagement] Users loaded:', arr.length, 'users');
          try { this.cdr.detectChanges(); } catch {}
        });
      },
      error: (err: any) => {
        console.error('Failed loading users:', err);
        this.zone.run(() => {
          this.users = [];
          try { this.cdr.detectChanges(); } catch {}
        });
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios' });
      }
    });
  }

  loadPermissions(): void {
    // Datos de permisos disponibles (NO hacer llamada HTTP)
    const perms = [
      { nombre: 'ticket_view', descripcion: 'Ver tickets' },
      { nombre: 'ticket_create', descripcion: 'Crear tickets' },
      { nombre: 'ticket_edit', descripcion: 'Editar tickets' },
      { nombre: 'ticket_move', descripcion: 'Mover tickets' },
      { nombre: 'ticket_delete', descripcion: 'Eliminar tickets' },
      { nombre: 'group_view', descripcion: 'Ver grupos' },
      { nombre: 'group_create', descripcion: 'Crear grupos' },
      { nombre: 'group_edit', descripcion: 'Editar grupos' },
      { nombre: 'group_delete', descripcion: 'Eliminar grupos' },
      { nombre: 'user_view', descripcion: 'Ver usuarios' },
      { nombre: 'user_edit', descripcion: 'Editar usuarios' },
      { nombre: 'user_delete', descripcion: 'Eliminar usuarios' },
      { nombre: 'user_manage', descripcion: 'Gestionar permisos' }
    ];
    
    this.zone.run(() => {
      this.allAvailablePermissions = perms;
      this.organizarPermisosPorCategoria(perms);
      try { this.cdr.detectChanges(); } catch {}
    });
  }

  /**
   * Organiza permisos en categorías para mejor UI
   */
  private organizarPermisosPorCategoria(perms: PermissionItem[]): void {
    const categorized: { [key: string]: PermissionItem[] } = {
      'Tickets': [],
      'Grupos': [],
      'Usuarios': [],
      'Admin': []
    };

    perms.forEach(p => {
      if (p.nombre.startsWith('ticket')) {
        categorized['Tickets'].push(p);
      } else if (p.nombre.startsWith('group')) {
        categorized['Grupos'].push(p);
      } else if (p.nombre.startsWith('user')) {
        categorized['Usuarios'].push(p);
      } else if (p.nombre === 'admin') {
        categorized['Admin'].push(p);
      }
    });

    this.permissionCategories = [
      {
        name: 'Tickets',
        icon: 'pi-file-edit',
        color: '#3b82f6',
        permissions: categorized['Tickets']
      },
      {
        name: 'Grupos',
        icon: 'pi-users',
        color: '#10b981',
        permissions: categorized['Grupos']
      },
      {
        name: 'Usuarios',
        icon: 'pi-users-alt',
        color: '#f59e0b',
        permissions: categorized['Usuarios']
      },
      {
        name: 'Admin',
        icon: 'pi-shield',
        color: '#ef4444',
        permissions: categorized['Admin']
      }
    ].filter(cat => cat.permissions.length > 0);
  }

  openEditDialog(user: any): void {
    this.selectedUser = { ...user };
    this.editForm = {
      usuario: user.usuario || '',
      email: user.email || '',
      fullname: user.fullname || '',
      phone: user.phone || '',
      address: user.address || ''
    };
    this.displayDialog = true;
  }

  saveUser(): void {
    if (!this.selectedUser) return;
    
    const updatedUser = { ...this.selectedUser, ...this.editForm };
    const headers = this.auth.getAuthHeaders();
    this.http.put<any>(`/api/users/${this.selectedUser.id}`, updatedUser, { headers }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario actualizado' });
        const me = this.auth.getUser();
        if (me && me.id === this.selectedUser.id) {
          this.http.get<any>(`/api/users/${me.id}`, { headers }).subscribe({
            next: (res: any) => {
              // Extraer datos de la nueva estructura {statusCode, intOpCode, data}
              const userData = res?.data || res;
              const updated = { ...me, ...userData };
              this.auth.saveUser(updated);
              this.closeDialog();
              this.loadUsers();
            },
            error: () => {
              this.closeDialog();
              this.loadUsers();
            }
          });
        } else {
          this.closeDialog();
          this.loadUsers();
        }
      },
      error: (err: any) => {
        console.error('Failed updating user:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el usuario' });
      }
    });
  }

  /**
   * Abre el modal de permisos y carga los permisos del usuario desde el servidor
   */
  /**
   * Abre el modal de permisos - SIN LLAMADAS HTTP
   */
  openPermissionsModal(user: any): void {
    this.selectedUserForPerms = user;
    
    if (!this.allAvailablePermissions || this.allAvailablePermissions.length === 0) {
      this.loadPermissions();
    }
    
    // Limpiar selección previa
    this.selectedPermissions = [];

    // Primero intentar obtener permisos desde el backend específico del usuario
    const headers = this.auth.getAuthHeaders();
    this.http.get<any>(`/api/users/${user.id}/permissions`, { headers }).subscribe({
      next: (res: any) => {
        const perms = res?.data || res;
        if (Array.isArray(perms)) {
          this.selectedPermissions = perms;
        } else {
          // Si la respuesta no es array, usar parsing robusto (fallback)
          this.parseAndSetPermissionsFromUserObject(user);
        }
        console.log('📋 [UserMgmt] Permisos cargados desde backend para usuario:', user.usuario, 'Total:', this.selectedPermissions.length, 'Permisos:', this.selectedPermissions);
        this.zone.run(() => {
          this.permissionsDialog = true;
          try { this.cdr.detectChanges(); } catch {}
        });
      },
      error: (err: any) => {
        console.warn('⚠️ [UserMgmt] No se pudieron obtener permisos desde backend, usando fallback local:', err?.status || err);
        // Fallback: intentar parsear campos disponibles en objeto user
        this.parseAndSetPermissionsFromUserObject(user);
        this.zone.run(() => {
          this.permissionsDialog = true;
          try { this.cdr.detectChanges(); } catch {}
        });
      }
    });
  }

  /** Extrae permisos del objeto `user` si el endpoint de permisos no responde */
  private parseAndSetPermissionsFromUserObject(user: any): void {
    let userPerms: any = null;
    if (user.permiso) userPerms = user.permiso;
    if (!userPerms && user.permisos) userPerms = user.permisos;
    if (!userPerms && user.permissions) userPerms = user.permissions;
    if (!userPerms && user.perms) userPerms = user.perms;
    if (!userPerms && user.roles) userPerms = user.roles;
    if (!userPerms && user.data && (user.data.permisos || user.data.permissions)) {
      userPerms = user.data.permisos || user.data.permissions;
    }
    if (!userPerms && user.perfil && (user.perfil.permisos || user.perfil.permissions)) {
      userPerms = user.perfil.permisos || user.perfil.permissions;
    }

    // Normalizar distintos formatos
    if (userPerms) {
      if (Array.isArray(userPerms)) {
        this.selectedPermissions = [...userPerms];
      } else if (typeof userPerms === 'object') {
        this.selectedPermissions = Object.keys(userPerms).filter(k => !!userPerms[k]);
      } else if (typeof userPerms === 'string') {
        const s = userPerms.trim();
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) this.selectedPermissions = parsed;
          else if (typeof parsed === 'object') this.selectedPermissions = Object.keys(parsed).filter(k => !!parsed[k]);
          else this.selectedPermissions = s.length === 0 ? [] : s.split(',').map((p: string) => p.trim()).filter((p: string) => p);
        } catch (e) {
          this.selectedPermissions = s.length === 0 ? [] : s.split(',').map((p: string) => p.trim()).filter((p: string) => p);
        }
      }
    } else {
      // Si no hay información, dejar vacío
      this.selectedPermissions = [];
    }
    console.log('📋 [UserMgmt] Permisos (fallback) para usuario:', user.usuario, 'Total:', this.selectedPermissions.length, this.selectedPermissions);
  }

  /**
   * NEW: Toggle checkbox de permiso
   */
  togglePermission(permissionName: string): void {
    const idx = this.selectedPermissions.indexOf(permissionName);
    if (idx === -1) {
      this.selectedPermissions.push(permissionName);
    } else {
      this.selectedPermissions.splice(idx, 1);
    }
  }

  /**
   * NEW: Verifica si un permiso está seleccionado
   */
  isPermissionSelected(permissionName: string): boolean {
    return this.selectedPermissions.includes(permissionName);
  }

  /**
   * NEW: Guarda los permisos del usuario
   */
  saveUserPermissions(): void {
    if (!this.selectedUserForPerms) return;

    const headers = this.auth.getAuthHeaders();
    const id = this.selectedUserForPerms.id;
    this.http.put<any>(`/api/users/${id}/permissions`, { permissions: this.selectedPermissions }, { headers }).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Permisos guardados' });
        // Si actualizamos al usuario actual, refrescar sesión local
        const me = this.auth.getUser();
        if (me && String(me.id) === String(id)) {
          const merged = { ...me, permisos: this.selectedPermissions, permissions: this.selectedPermissions };
          this.auth.saveUser(merged, true);
        }
        this.permissionsDialog = false;
        this.loadUsers();
      },
      error: (err: any) => {
        console.error('Failed saving permissions:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar permisos' });
      }
    });
  }

  deleteUser(user: any): void {
    if (confirm(`¿Está seguro de que desea eliminar al usuario ${user.usuario}?`)) {
      const headers = this.auth.getAuthHeaders();
      this.http.delete<any>(`/api/users/${user.id}`, { headers }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario eliminado' });
          this.loadUsers();
        },
        error: (err: any) => {
          console.error('Failed deleting user:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el usuario' });
        }
      });
    }
  }

  closeDialog(): void {
    this.displayDialog = false;
    this.selectedUser = null;
    this.editForm = {
      usuario: '',
      email: '',
      fullname: '',
      phone: '',
      address: ''
    };
  }

  closePermissionsModal(): void {
    this.permissionsDialog = false;
    this.selectedUserForPerms = null;
    this.selectedPermissions = [];
  }
}
