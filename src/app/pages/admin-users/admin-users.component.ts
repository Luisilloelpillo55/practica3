import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { UserService } from '../../services/user.service.js';
import { AuthService } from '../../services/auth.service.js';
import { takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, ToastModule, CheckboxModule, ConfirmDialogModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css'],
  providers: [MessageService, ConfirmationService]
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  users: any[] = [];
  showPermissionsDialog = false;
  selectedUser: any = null;
  availablePermissions: string[] = [
    'ticket_add', 'ticket_move', 'ticket_delete', 'ticket_view',
    'group_create', 'group_edit', 'group_delete',
    'user_manage', 'user_delete',
    'admin'
  ];
  selectedPermissions: { [key: string]: boolean } = {};

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    public auth: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.userService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          let users: any[] = [];
          if (Array.isArray(res)) {
            users = res;
          } else if (res && Array.isArray(res.data)) {
            users = res.data;
          } else if (res && Array.isArray(res.users)) {
            users = res.users;
          }
          this.users = users;
          console.log('Users loaded:', users);
        },
        error: (err: any) => {
          console.error('Error loading users:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios' });
        }
      });
  }

  editPermissions(user: any): void {
    if (!this.auth.hasPermission('user_manage')) {
      this.messageService.add({ severity: 'error', summary: 'Permiso', detail: 'No tienes permiso para gestionar permisos' });
      return;
    }

    this.selectedUser = user;
    this.selectedPermissions = {};
    
    // Cargar permisos actuales del usuario
    this.userService.getUserPermissions(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (permissions: any) => {
          let userPerms: string[] = [];
          if (Array.isArray(permissions)) {
            userPerms = permissions;
          } else if (permissions && Array.isArray(permissions.data)) {
            userPerms = permissions.data;
          }
          
          this.availablePermissions.forEach(perm => {
            this.selectedPermissions[perm] = userPerms.includes(perm);
          });
          this.showPermissionsDialog = true;
        },
        error: () => {
          // Si no hay permisos guardados, inicializar como vacío
          this.availablePermissions.forEach(perm => {
            this.selectedPermissions[perm] = false;
          });
          this.showPermissionsDialog = true;
        }
      });
  }

  savePermissions(): void {
    const perms = Object.keys(this.selectedPermissions).filter(p => this.selectedPermissions[p]);
    
    this.userService.setUserPermissions(this.selectedUser.id, perms)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Permisos actualizados' });
          this.loadUsers();
          this.showPermissionsDialog = false;
        },
        error: (err: any) => {
          console.error('Error updating permissions:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar permisos' });
        }
      });
  }

  deleteUser(user: any): void {
    if (!this.auth.hasPermission('user_delete')) {
      this.messageService.add({ severity: 'error', summary: 'Permiso', detail: 'No tienes permiso para eliminar usuarios' });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el usuario "${user.usuario}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.userService.delete(user.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario eliminado' });
              this.loadUsers();
            },
            error: (err: any) => {
              console.error('Error deleting user:', err);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar usuario' });
            }
          });
      }
    });
  }

  closeDialog(): void {
    this.showPermissionsDialog = false;
    this.selectedUser = null;
    this.selectedPermissions = {};
  }

  getPermissionLabel(perm: string): string {
    const labels: { [key: string]: string } = {
      'ticket_add': 'Crear tickets',
      'ticket_move': 'Mover tickets',
      'ticket_delete': 'Eliminar tickets',
      'ticket_view': 'Ver tickets',
      'group_create': 'Crear grupos',
      'group_edit': 'Editar grupos',
      'group_delete': 'Eliminar grupos',
      'user_manage': 'Gestionar usuarios',
      'user_delete': 'Eliminar usuarios',
      'admin': 'Acceso administrativo'
    };
    return labels[perm] || perm;
  }
}
