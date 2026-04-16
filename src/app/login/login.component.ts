import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

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
  logoClicks: number = 0;

  constructor(private fb: FormBuilder, private messageService: MessageService, private router: Router, private http: HttpClient, private authService: AuthService) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onLogoClic(): void {
    this.logoClicks++;
    if (this.logoClicks === 5) {
      this.messageService.add({
        severity: 'info',
        summary: '🎉 Easter Egg!',
        detail: 'Has descubierto el easter egg. ¡Eres increíble! 🚀'
      });
      this.logoClicks = 0; // Reset after showing
    }
  }

  async onSubmit() {
    const { username, password } = this.form.value;
    
    try {
      console.log('🔐 [LoginComponent] onSubmit - Starting login process for:', username);
      const result = await this.authService.loginDirect(username, password);
      
      console.log('🔐 [LoginComponent] Login result:', {
        success: result.success,
        user: result.user?.usuario,
        has_token: !!result.user?.token
      });
      
      if (result.success) {
        this.messageService.add({ severity: 'success', summary: 'Login', detail: 'Credenciales válidas' });
        
        // Wait longer to ensure localStorage is written AND BehaviorSubject is updated
        console.log('⏳ [LoginComponent] Waiting for session to be fully saved...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify user is actually saved
        const savedUser = this.authService.getUser();
        if (savedUser && savedUser.token) {
          console.log('✓ [LoginComponent] User confirmed saved:', savedUser.usuario, 'Token length:', savedUser.token.length);
          console.log('✓ [LoginComponent] Navigating to /home');
          this.router.navigate(['/home']);
        } else {
          console.error('❌ [LoginComponent] User not saved properly after login!');
          this.messageService.add({ severity: 'error', summary: 'Login', detail: 'Error al guardar sesión' });
        }
      } else {
        this.messageService.add({ severity: 'error', summary: 'Login', detail: result.error || 'Usuario o contraseña inválidos' });
      }
    } catch (error: any) {
      console.error('❌ [LoginComponent] Login error:', error);
      this.messageService.add({ severity: 'error', summary: 'Login', detail: 'Error en la conexión' });
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
