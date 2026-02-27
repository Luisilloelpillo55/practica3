import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

function passwordValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value || '';
  const special = /[!@#$%^&*()_+\-=[]{};':"\\|,.<>\/?]/;
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
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, ToastModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  form: any;

  constructor(private fb: FormBuilder, private messageService: MessageService, private router: Router) {
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

  onSubmit() {
    if (this.form.valid) {
      const payload = {
        usuario: this.form.value.usuario,
        email: this.form.value.email,
        password: this.form.value.pwGroup.password,
        fullname: this.form.value.fullname,
        address: this.form.value.address,
        dob: this.form.value.dob,
        phone: this.form.value.phone
      };
      // guardar usuario en localStorage (práctica)
      localStorage.setItem('registeredUser', JSON.stringify(payload));
      this.messageService.add({severity:'success', summary:'Registro', detail:'Registro exitoso'});
      // limpiar formulario y navegar a login para probar acceso
      this.form.reset();
      this.router.navigate(['/login']);
    } else {
      this.messageService.add({severity:'error', summary:'Registro', detail:'Complete correctamente el formulario'});
    }
  }
}
