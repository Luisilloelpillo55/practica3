import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, ToastModule],
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.css']
})
export class GroupComponent {
  total = 5;

  constructor(private messageService: MessageService) {}

  advance() {
    this.total += 1;
    this.messageService.add({severity: 'info', summary: 'Grupo', detail: `Avanzado a ${this.total}`});
  }
}
