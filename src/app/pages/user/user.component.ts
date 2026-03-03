import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, CardModule, ToastModule],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  user: any = null;

  ngOnInit(): void {
    const stored = localStorage.getItem('registeredUser');
    if (stored) {
      try { this.user = JSON.parse(stored); } catch { this.user = null; }
    }
  }
}
