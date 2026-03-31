import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-practice-button',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule],
  templateUrl: './practice-button.component.html',
  styleUrls: ['./practice-button.component.css']
})
export class PracticeButtonComponent {
  constructor(private messageService: MessageService, private router: Router) {}

  goBack(): void {
    this.router.navigate(['/home']);
  }

  onPractice() {
    this.messageService.add({severity: 'success', summary: 'Práctica', detail: 'Has pulsado el botón de práctica'});
  }
}
