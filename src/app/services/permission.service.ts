import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service.js';

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

  constructor(private authService: AuthService) {
    // Escuchar cambios de usuario y recargar permisos
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadPermissionsFromUser(user);
      } else {
        this.currentPermissionsSubject.next([]);
        this.currentGroupSubject.next(null);
      }
    });
  }

  /**
   * Verifica si el usuario actual tiene un permiso específico
   * @param permission string del permiso (ej: "tickets:add")
   * @returns boolean true si tiene el permiso
   */
  hasPermission(permission: string): boolean {
    const permissions = this.currentPermissionsSubject.value;
    return permissions.includes(permission);
  }

  /**
   * Verifica si el usuario tiene múltiples permisos (AND lógico)
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * Verifica si el usuario tiene cualquiera de los permisos (OR lógico)
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
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
    this.currentGroupSubject.next(groupId);
    this.refreshPermissionsForGroup(groupId);
  }

  /**
   * Recarga los permisos para un grupo específico
   * En producción, esto debería llamar a la API
   */
  refreshPermissionsForGroup(groupId: string): void {
    const user = this.authService.getUser();
    if (user && user.permissionsByGroup && user.permissionsByGroup[groupId]) {
      this.currentPermissionsSubject.next(user.permissionsByGroup[groupId]);
    } else {
      this.currentPermissionsSubject.next([]);
    }
  }

  /**
   * Carga los permisos iniciales desde el usuario autenticado
   * Los permisos vienen en el modelo de usuario como:
   * {
   *   usuario: "...",
   *   token: "...",
   *   permissionsByGroup: {
   *     "group-123": ["tickets:add", "tickets:move", ...],
   *     "group-456": ["tickets:add", ...]
   *   },
   *   defaultGroupId: "group-123"
   * }
   */
  private loadPermissionsFromUser(user: any): void {
    if (user.defaultGroupId && user.permissionsByGroup && user.permissionsByGroup[user.defaultGroupId]) {
      this.currentGroupSubject.next(user.defaultGroupId);
      this.currentPermissionsSubject.next(user.permissionsByGroup[user.defaultGroupId]);
    } else {
      this.currentGroupSubject.next(null);
      this.currentPermissionsSubject.next([]);
    }
  }

  /**
   * Obtiene todos los permisos disponibles para el usuario
   */
  getAllUserPermissions(): { [groupId: string]: string[] } {
    const user = this.authService.getUser();
    return user?.permissionsByGroup || {};
  }

  /**
   * Obtiene lista de grupos en los que el usuario tiene permisos
   */
  getAvailableGroups(): string[] {
    const user = this.authService.getUser();
    return user?.permissionsByGroup ? Object.keys(user.permissionsByGroup) : [];
  }
}
