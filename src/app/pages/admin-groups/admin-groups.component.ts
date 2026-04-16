import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { GroupService } from '../../services/group.service.js';
import { AuthService } from '../../services/auth.service';
import { takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-admin-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, ToastModule, ConfirmDialogModule],
  templateUrl: './admin-groups.component.html',
  styleUrls: ['./admin-groups.component.css'],
  providers: [MessageService, ConfirmationService]
})
export class AdminGroupsComponent implements OnInit, OnDestroy {
  groups: any[] = [];
  showDialog = false;
  isEditing = false;
  selectedGroup: any = null;
  groupForm: any;

  private destroy$ = new Subject<void>();

  constructor(
    private groupService: GroupService,
    public auth: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.groupForm = this.fb.group({
      nombre: ['', Validators.required],
      nivel: ['', Validators.required],
      descripcion: [''],
      integrantes: ['']
    });
  }

  ngOnInit(): void {
    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGroups(): void {
    this.groupService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          let groups: any[] = [];
          if (Array.isArray(res)) {
            groups = res;
          } else if (res && Array.isArray(res.data)) {
            groups = res.data;
          } else if (res && Array.isArray(res.groups)) {
            groups = res.groups;
          }
          this.groups = groups;
          console.log('Groups loaded:', groups);
        },
        error: (err: any) => {
          console.error('Error loading groups:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' });
        }
      });
  }

  openNewGroupDialog(): void {
    if (!this.auth.hasPermission('group_create')) {
      this.messageService.add({ severity: 'error', summary: 'Permiso', detail: 'No tienes permiso para crear grupos' });
      return;
    }
    this.isEditing = false;
    this.selectedGroup = null;
    this.groupForm.reset();
    this.showDialog = true;
  }

  editGroup(group: any): void {
    if (!this.auth.hasPermission('group_edit')) {
      this.messageService.add({ severity: 'error', summary: 'Permiso', detail: 'No tienes permiso para editar grupos' });
      return;
    }
    this.isEditing = true;
    this.selectedGroup = group;
    this.groupForm.patchValue({
      nombre: group.nombre,
      nivel: group.nivel,
      descripcion: group.descripcion,
      integrantes: group.integrantes
    });
    this.showDialog = true;
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Validación', detail: 'Completa los campos requeridos' });
      return;
    }

    const payload = this.groupForm.value;
    if (this.isEditing && this.selectedGroup) {
      this.groupService.update(this.selectedGroup.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo actualizado' });
            this.loadGroups();
            this.showDialog = false;
          },
          error: (err: any) => {
            console.error('Error updating group:', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar grupo' });
          }
        });
    } else {
      this.groupService.create(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo creado' });
            this.loadGroups();
            this.showDialog = false;
          },
          error: (err: any) => {
            console.error('Error creating group:', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al crear grupo' });
          }
        });
    }
  }

  deleteGroup(group: any): void {
    if (!this.auth.hasPermission('group_delete')) {
      this.messageService.add({ severity: 'error', summary: 'Permiso', detail: 'No tienes permiso para eliminar grupos' });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el grupo "${group.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.groupService.delete(group.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Grupo eliminado' });
              this.loadGroups();
            },
            error: (err: any) => {
              console.error('Error deleting group:', err);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar grupo' });
            }
          });
      }
    });
  }

  closeDialog(): void {
    this.showDialog = false;
    this.groupForm.reset();
  }
}
