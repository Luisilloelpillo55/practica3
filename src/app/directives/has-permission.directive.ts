import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { PermissionService } from '../services/permission.service.js';
import { Subscription } from 'rxjs';

/**
 * Directiva Angular para controlar la renderización de elementos basada en permisos.
 * 
 * Uso:
 * <button *appHasPermission="'tickets:add'">
 *   Agregar Ticket
 * </button>
 * 
 * Con múltiples permisos (toda deben tener):
 * <button *appHasPermission="['tickets:add', 'tickets:edit']">
 *   Agregar y editar
 * </button>
 * 
 * Con lógica OR:
 * <button *appHasPermission="permissions; mode: 'any'">
 *   ...
 * </button>
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  @Input() appHasPermission: string | string[] = [];
  @Input() appHasPermissionMode: 'all' | 'any' = 'all'; // 'all' = AND, 'any' = OR

  private permissionSubscription: Subscription | null = null;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    // Escuchar cambios de permisos
    this.permissionSubscription = this.permissionService.currentPermissions$.subscribe(() => {
      this.updateView();
    });

    // Renderizar inicialmente
    this.updateView();
  }

  ngOnDestroy(): void {
    this.permissionSubscription?.unsubscribe();
  }

  private updateView(): void {
    if (this.hasPermission()) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  private hasPermission(): boolean {
    const permissions = Array.isArray(this.appHasPermission) 
      ? this.appHasPermission 
      : [this.appHasPermission];

    if (this.appHasPermissionMode === 'any') {
      return this.permissionService.hasAnyPermission(permissions);
    } else {
      return this.permissionService.hasAllPermissions(permissions);
    }
  }
}
