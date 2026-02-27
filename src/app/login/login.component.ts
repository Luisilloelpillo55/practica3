import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

const HARD_CODED = { username: 'alumno', password: 'P@ssw0rd!23' };

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, ToastModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  form: any;

  constructor(private fb: FormBuilder, private messageService: MessageService, private router: Router) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    const { username, password } = this.form.value;
    const stored = localStorage.getItem('registeredUser');
    if (stored) {
      try {
        const obj = JSON.parse(stored);
        if (username === obj.usuario && password === obj.password) {
          this.messageService.add({severity:'success', summary:'Login', detail:'Credenciales válidas'});
          this.router.navigate(['/home']);
          return;
        }
      } catch {}
    }

    if (username === HARD_CODED.username && password === HARD_CODED.password) {
      this.messageService.add({severity:'success', summary:'Login', detail:'Credenciales válidas'});
      this.router.navigate(['/home']);
    } else {
      this.messageService.add({severity:'error', summary:'Login', detail:'Usuario o contraseña inválidos'});
    }
  }
}
