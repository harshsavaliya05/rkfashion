import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule, MatSnackBarModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register implements OnInit {
  nameInput = '';
  emailInput = '';
  passwordInput = '';
  confirmPasswordInput = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // If already logged in, redirect to home page
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  handleRegisterSubmit(event: Event) {
    event.preventDefault();

    if (!this.nameInput || !this.emailInput || !this.passwordInput || !this.confirmPasswordInput) {
      this.snackBar.open('⚠️ Please fill out all fields.', 'OK', { duration: 3000 });
      return;
    }

    // Verify password matching
    if (this.passwordInput !== this.confirmPasswordInput) {
      this.snackBar.open('❌ Passwords do not match! Please check and try again.', 'Retry', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }

    const payload = {
      name: this.nameInput,
      email: this.emailInput,
      password: this.passwordInput
    };

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('🎉 Account registered successfully! Please log in with your credentials.', 'Login', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Registration failed:', err);
        const errMsg = err.error?.error || 'Registration failed. Email might already be taken.';
        this.snackBar.open(`❌ ${errMsg}`, 'Retry', {
          duration: 4500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }
}
