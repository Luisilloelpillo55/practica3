import { Component, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject, OnDestroy } from '@angular/core';
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
import { HttpClientModule } from '@angular/common/http';
import { filter, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import { UserService } from '../../services/user.service.js';
import { AuthService } from '../../services/auth.service.js';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

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
  users: any[] = [];
  displayDialog = false;
  selectedUser: any = null;
  editForm = {
    usuario: '',
    email: '',
    fullname: '',
    phone: '',
    address: ''
  };
  // permissions
  availablePermissions: any[] = [];
  selectedPermissions: string[] = [];
  // permisos dialog dedicado
  showPermsDialog = false;
  selectedUserForPerms: any = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private userSrv: UserService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private messageService: MessageService
  ) {}

  onTogglePermission(name: string, checked: boolean): void {
    if (!this.selectedPermissions) this.selectedPermissions = [];
    const idx = this.selectedPermissions.indexOf(name);
    if (checked && idx === -1) this.selectedPermissions.push(name);
    if (!checked && idx !== -1) this.selectedPermissions.splice(idx, 1);
  }

  // Permisos dialog handlers
  openPermsDialog(user: any): void {
    this.selectedUserForPerms = user;
    this.showPermsDialog = true;
    // asegurar permisos disponibles
    if (!this.availablePermissions || this.availablePermissions.length === 0) {
      this.loadAvailablePermissions();
    }
    // cargar permisos del usuario
    this.userSrv.getUserPermissions(user.id).subscribe({
      next: (perms: any) => { this.selectedPermissions = Array.isArray(perms) ? perms : []; },
      error: (err: any) => { console.error('Failed loading user permissions:', err); this.selectedPermissions = []; }
    });
  }

  savePermissions(): void {
    if (!this.selectedUserForPerms) return;
    this.userSrv.setUserPermissions(this.selectedUserForPerms.id, this.selectedPermissions || []).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Permisos actualizados' });
        // si actualizaste tus propios permisos, refrescar sesión
        const me = this.auth.getUser();
        if (me && me.id === this.selectedUserForPerms.id) {
          this.userSrv.getById(me.id).subscribe({ next: (u) => { const updated = { ...me, ...u }; if (this.selectedPermissions) updated.permissions = this.selectedPermissions; this.auth.saveUser(updated); this.showPermsDialog = false; this.loadUsers(); }, error: () => { this.showPermsDialog = false; this.loadUsers(); } });
        } else {
          this.showPermsDialog = false;
          this.loadUsers();
        }
      },
      error: (err: any) => {
        console.error('Failed saving permissions:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron guardar permisos' });
      }
    });
  }

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
    }
    
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user && user.token) {
          // Verificar permisos al cambiar usuario
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
          // Verificar permisos antes de cargar usuarios
            if (!this.auth.hasPermission('user_delete')) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No tienes permisos para acceder a esta sección' });
            this.router.navigateByUrl('/home');
            return;
          }
          this.loadUsers();
          this.loadAvailablePermissions();
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
    Promise.resolve().then(() => {
      this.userSrv.getAll().subscribe({
        next: (res: any) => {
          Promise.resolve().then(() => {
            this.users = Array.isArray(res) ? res : [];
            try { this.cdr.detectChanges(); } catch {}
          });
        },
        error: (err: any) => {
          console.error('Failed loading users:', err);
          this.users = [];
        }
      });
    });
  }

  loadAvailablePermissions(): void {
    this.userSrv.getAllPermissions().subscribe({
      next: (res: any) => { this.availablePermissions = Array.isArray(res) ? res : []; },
      error: (err: any) => { console.error('Failed loading permissions:', err); this.availablePermissions = []; }
    });
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
    // load user's permissions
    this.userSrv.getUserPermissions(user.id).subscribe({
      next: (perms: any) => { this.selectedPermissions = Array.isArray(perms) ? perms : []; },
      error: (err: any) => { console.error('Failed loading user permissions:', err); this.selectedPermissions = []; }
    });
  }

  saveUser(): void {
    if (!this.selectedUser) return;
    
    const updatedUser = { ...this.selectedUser, ...this.editForm };
    this.userSrv.update(this.selectedUser.id, updatedUser).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario actualizado' });
        // update permissions as well
        this.userSrv.setUserPermissions(this.selectedUser.id, this.selectedPermissions || []).subscribe({
          next: () => {
            // if admin edited their own account, refresh stored permissions
            const me = this.auth.getUser();
            if (me && me.id === this.selectedUser.id) {
              // fetch updated user from backend and replace stored user
              this.userSrv.getById(me.id).subscribe({ next: (u) => { const updated = { ...me, ...u }; if (this.selectedPermissions) updated.permissions = this.selectedPermissions; this.auth.saveUser(updated); this.closeDialog(); this.loadUsers(); }, error: () => { this.closeDialog(); this.loadUsers(); } });
            } else {
              this.closeDialog();
              this.loadUsers();
            }
          },
          error: (e: any) => {
            console.error('Failed saving permissions:', e);
            this.closeDialog();
            this.loadUsers();
          }
        });
      },
      error: (err: any) => {
        console.error('Failed updating user:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el usuario' });
      }
    });
  }

  deleteUser(user: any): void {
    if (confirm(`¿Está seguro de que desea eliminar al usuario ${user.usuario}?`)) {
      this.userSrv.delete(user.id).subscribe({
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
}
