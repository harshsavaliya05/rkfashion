import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, MatSnackBarModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword implements OnInit {
  token = '';
  newPasswordInput = '';
  confirmPasswordInput = '';
  resetSuccess = false;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Read the query parameter 'token'
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.snackBar.open('❌ Invalid reset password request. Token is missing.', 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        this.router.navigate(['/login']);
      }
    });
  }

  handleResetPasswordSubmit(event: Event) {
    event.preventDefault();

    if (!this.newPasswordInput || !this.confirmPasswordInput) {
      this.snackBar.open('⚠️ Please fill out all fields.', 'OK', { duration: 3000 });
      return;
    }

    if (this.newPasswordInput !== this.confirmPasswordInput) {
      this.snackBar.open('❌ Passwords do not match! Please check and try again.', 'Retry', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.resetPassword(this.token, this.newPasswordInput).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.resetSuccess = true;
        this.snackBar.open('🎉 Password has been reset successfully! Please login with your new password.', 'Login', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        const errMsg = err.error?.error || 'Password reset failed. The token may have expired.';
        this.snackBar.open(`❌ ${errMsg}`, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }
}
