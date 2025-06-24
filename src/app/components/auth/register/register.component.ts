import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    ToastModule,
    ProgressSpinnerModule,
    DividerModule,
    RouterModule
  ],
  providers: [MessageService],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    this.authService.isAuthenticated().subscribe(authenticated => {
      if (authenticated) {
        this.router.navigate(['/']);
      }
    });
    
    // Track loading state
    this.authService.isLoading().subscribe(isLoading => {
      this.loading = isLoading;
    });
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  register(): void {
    if (this.registerForm.invalid) {
      // Check if it's due to password mismatch
      if (this.registerForm.hasError('passwordMismatch')) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Passwords do not match.'
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Please fill in all required fields.'
        });
      }
      return;
    }
    
    const { email, password } = this.registerForm.value;
    
    this.authService.signUp(email, password).subscribe({
      next: (data) => {
        if (data.session) {
          // User is automatically signed in
          this.messageService.add({
            severity: 'success',
            summary: 'Registration Successful',
            detail: 'Your account has been created and you\'re now signed in.'
          });
          this.router.navigate(['/']);
        } else {
          // Email confirmation might be required
          this.messageService.add({
            severity: 'info',
            summary: 'Registration Successful',
            detail: 'Please check your email to confirm your account.'
          });
          this.router.navigate(['/login']);
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Registration Failed',
          detail: error?.message || 'An error occurred during registration.'
        });
      }
    });
  }
}