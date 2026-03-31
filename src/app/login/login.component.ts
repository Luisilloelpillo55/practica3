import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service.js';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, ToastModule, HttpClientModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  form: any;
  showPassword: boolean = false;

  constructor(private fb: FormBuilder, private messageService: MessageService, private router: Router, private http: HttpClient, private authService: AuthService) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    const { username, password } = this.form.value;
    this.http.post('/api/users/login', { username, password }).subscribe({
      next: (user: any) => {
        console.log('Login successful. User:', user.usuario, 'Token:', user.token ? 'present' : 'missing');
        this.messageService.add({severity:'success', summary:'Login', detail:'Credenciales válidas'});
        // Save user BEFORE navigation to ensure it's available immediately
        this.authService.saveUser(user);
        // Small delay to ensure BehaviorSubject has emitted
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 100);
      },
      error: (err) => {
        console.error('Login failed:', err);
        this.messageService.add({severity:'error', summary:'Login', detail: err?.error?.error || 'Usuario o contraseña inválidos'});
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
