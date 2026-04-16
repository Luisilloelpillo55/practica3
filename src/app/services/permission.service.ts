import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Servicio centralizado para gestionar permisos por acción.
 * Permisos son expresados como strings: "tickets:add", "tickets:move", "groups:manage", etc.
 * 
 * Los permisos pueden variar por grupo.
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private currentPermissionsSubject = new BehaviorSubject<string[]>([]);
  public currentPermissions$: Observable<string[]> = this.currentPermissionsSubject.asObservable();
  
  private currentGroupSubject = new BehaviorSubject<string | null>(null);
  public currentGroup$: Observable<string | null> = this.currentGroupSubject.asObservable();
  
  private permissionsByGroupSubject = new BehaviorSubject<{ [groupId: string]: string[] }>({});
  public permissionsByGroup$: Observable<{ [groupId: string]: string[] }> = this.permissionsByGroupSubject.asObservable();

  constructor(private authService: AuthService) {
    // Escuchar cambios de usuario y recargar permisos
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadPermissionsFromUser(user);
      } else {
        this.currentPermissionsSubject.next([]);
        this.currentGroupSubject.next(null);
        this.permissionsByGroupSubject.next({});
      }
    });
  }

  /**
   * Verifica si el usuario actual tiene un permiso específico
   * @param permission string del permiso (ej: "tickets:add")
   * @returns boolean true si tiene el permiso
   */
  hasPermission(permission: string | string[]): boolean {
    const permissions = this.currentPermissionsSubject.value;
    const permsToCheck = Array.isArray(permission) ? permission : [permission];
    return permsToCheck.every(p => permissions.includes(p));
  }

  /**
   * Verifica si el usuario tiene CUALQUIERA de los permisos (OR lógico)
   */
  hasAnyPermission(permissions: string[]): boolean {
    const currentPerms = this.currentPermissionsSubject.value;
    return permissions.some(p => currentPerms.includes(p));
  }

  /**
   * Verifica si el usuario tiene TODOS los permisos (AND lógico)
   */
  hasAllPermissions(permissions: string[]): boolean {
    const currentPerms = this.currentPermissionsSubject.value;
    return permissions.every(p => currentPerms.includes(p));
  }

  /**
   * Obtiene el grupo actual seleccionado
   */
  getCurrentGroup(): string | null {
    return this.currentGroupSubject.value;
  }

  /**
   * Establece el grupo actual y carga permisos para ese grupo
   */
  setCurrentGroup(groupId: string): void {
    const permsByGroup = this.permissionsByGroupSubject.value;
    if (permsByGroup[groupId]) {
      this.currentGroupSubject.next(groupId);
      this.currentPermissionsSubject.next(permsByGroup[groupId]);
    }
  }

  /**
   * Recarga los permisos para un grupo específico
   * En producción, esto debería llamar a la API
   */
  refreshPermissionsForGroup(groupId: string): void {
    const permsByGroup = this.permissionsByGroupSubject.value;
    if (permsByGroup[groupId]) {
      this.currentGroupSubject.next(groupId);
      this.currentPermissionsSubject.next(permsByGroup[groupId]);
    }
  }

  /**
   * Carga los permisos iniciales desde el usuario autenticado
   * Los permisos vienen del login como un array global
   */
  private loadPermissionsFromUser(user: any): void {
    // Obtener permisos del usuario (devueltos del servidor en el login)
    const userPermissions = user.permissions || user.permisos || [];
    
    // Si el usuario tiene permisos por grupo, usarlos
    if (user.permissionsByGroup) {
      this.permissionsByGroupSubject.next(user.permissionsByGroup);
      // Seleccionar el primer grupo si existe
      const groupIds = Object.keys(user.permissionsByGroup);
      if (groupIds.length > 0) {
        this.currentGroupSubject.next(groupIds[0]);
        this.currentPermissionsSubject.next(user.permissionsByGroup[groupIds[0]]);
      } else {
        this.currentPermissionsSubject.next(userPermissions);
      }
    } else {
      // Si no tiene permisos por grupo, usar los permisos globales
      this.permissionsByGroupSubject.next({ 'default': userPermissions });
      this.currentGroupSubject.next(null);
      this.currentPermissionsSubject.next(userPermissions);
    }
  }

  /**
   * Obtiene todos los permisos disponibles para el usuario
   */
  getAllUserPermissions(): { [groupId: string]: string[] } {
    return this.permissionsByGroupSubject.value;
  }

  /**
   * Obtiene lista de grupos en los que el usuario tiene permisos
   */
  getAvailableGroups(): string[] {
    const permsByGroup = this.permissionsByGroupSubject.value;
    return Object.keys(permsByGroup).filter(groupId => groupId !== 'default');
  }

  /**
   * Obtiene los permisos actuales como observable
   */
  getCurrentPermissions(): string[] {
    return this.currentPermissionsSubject.value;
  }

  /** Normaliza permisos recibidos (aliases o formatos distintos) hacia los ids de la UI */
  normalizePermissions(perms: any[]): string[] {
    if (!Array.isArray(perms)) return [];
    const map: { [key: string]: string } = {
      'ticket_add': 'ticket_create',
      'tickets:add': 'ticket_create',
      'tickets:view': 'ticket_view',
      'tickets:edit': 'ticket_edit',
      'tickets:move': 'ticket_move',
      'tickets:delete': 'ticket_delete',
      'groups:view': 'group_view',
      'groups:create': 'group_create',
      'groups:edit': 'group_edit',
      'groups:delete': 'group_delete',
      'users:view': 'user_view',
      'users:edit': 'user_edit',
      'users:manage': 'user_manage',
      'users:delete': 'user_delete'
    };
    const out: string[] = [];
    for (let p of perms) {
      if (!p) continue;
      p = String(p).trim();
      const normalized = map[p] || p;
      if (normalized === 'ticket_add') continue;
      if (!out.includes(normalized)) out.push(normalized);
    }
    return out;
  }
}
