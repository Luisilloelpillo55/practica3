import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-practice-button',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './practice-button.component.html',
  styleUrls: ['./practice-button.component.css']
})
export class PracticeButtonComponent {
  onClick() {
    alert('Botón pulsado — funciona correctamente.');
  }
}
