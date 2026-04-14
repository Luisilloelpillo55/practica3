import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service.js';

function passwordValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value || '';
  // require at least 10 chars and at least one non-alphanumeric (special) character
  const special = /[^A-Za-z0-9]/;
  if (val.length < 10) return { minlen: true };
  if (!special.test(val)) return { nospecial: true };
  return null;
}

function matchPassword(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { nomatch: true } : null;
}

function adultValidator(control: AbstractControl): ValidationErrors | null {
  const dob = control.value;
  if (!dob) return { required: true };
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18 ? null : { underage: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, ToastModule, HttpClientModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  form: any;

  constructor(private fb: FormBuilder, private messageService: MessageService, private router: Router, private http: HttpClient, private authService: AuthService) {
    this.form = this.fb.group({
      usuario: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      pwGroup: this.fb.group({
        password: ['', passwordValidator],
        confirmPassword: ['', Validators.required]
      }, { validators: matchPassword }),
      fullname: ['', Validators.required],
      address: ['', Validators.required],
      dob: ['', adultValidator],
      phone: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(10)]]
    });
  }

  get pw() { return this.form.get('pwGroup.password'); }

  showPassword = false;
  showConfirmPassword = false;

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  async onSubmit() {
    if (this.form.valid) {
      const { usuario, email, fullname, address, dob, phone } = this.form.value;
      const password = this.form.value.pwGroup.password;

      try {
        // Use direct registration via API Gateway (avoids Supabase Auth rate limits)
        const result = await this.authService.registerDirect({ 
          usuario, 
          email, 
          password, 
          fullname, 
          address, 
          dob, 
          phone 
        });
        
        if (result.success) {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Registro', 
            detail: 'Registro exitoso. Redirigiendo al login...'
          });
          this.form.reset();
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        } else {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Registro', 
            detail: result.error || 'Error al registrar'
          });
        }
      } catch (error: any) {
        console.error('Register error:', error);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Registro', 
          detail: error.message || 'Error al registrar. Intenta de nuevo.'
        });
      }
    } else {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Registro', 
        detail: 'Complete correctamente el formulario'
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
