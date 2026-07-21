import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, CommonModule, MatSnackBarModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss'
})
export class VerifyEmail implements OnInit {
  token = '';
  verificationStatus: 'pending' | 'success' | 'error' = 'pending';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      
      if (!this.token) {
        this.verificationStatus = 'error';
        this.errorMessage = 'Verification token is missing. Please make sure the link is correct.';
        this.snackBar.open('❌ Verification token is missing.', 'Dismiss', { duration: 5000 });
        this.cdr.detectChanges();
        return;
      }

      this.verifyAccount();
      this.cdr.detectChanges();
    });
  }

  verifyAccount() {
    this.authService.verifyRegister(this.token).subscribe({
      next: (res) => {
        this.verificationStatus = 'success';
        this.snackBar.open('🎉 Email verified successfully! Redirecting to login page...', 'Dismiss', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 4000);
      },
      error: (err) => {
        this.verificationStatus = 'error';
        this.errorMessage = err.error?.error || 'Email verification failed. The link may have expired or is invalid.';
        this.snackBar.open('❌ Email verification failed.', 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        this.cdr.detectChanges();
      }
    });
  }
}
