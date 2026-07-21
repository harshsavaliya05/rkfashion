import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, MatSnackBarModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  activeTab: 'login' | 'register' = 'login';

  // Login inputs
  loginEmailInput = '';
  loginPasswordInput = '';

  // Register inputs
  registerNameInput = '';
  registerEmailInput = '';
  registerPasswordInput = '';
  registerConfirmPasswordInput = '';

  // OTP Verification inputs & flags
  loginOtpSent = false;
  loginOtpInput = '';
  registerLinkSent = false;

  // Forgot Password inputs & flags
  forgotPasswordMode = false;
  forgotEmailInput = '';
  forgotSent = false;

  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // If already logged in, redirect to home page
    if (this.authService.isLoggedIn()) {
      window.location.href = '/';
      return;
    }

    // Check path URL
    if (this.router.url.includes('/register')) {
      this.activeTab = 'register';
    } else {
      this.activeTab = 'login';
    }
    this.cdr.detectChanges();
  }

  setTab(tab: 'login' | 'register') {
    this.activeTab = tab;
    this.forgotPasswordMode = false; // Reset forgot mode on tab switch
    this.registerLinkSent = false; // Reset register link sent state on tab switch
    // Navigate to the correct path URL dynamically
    this.router.navigate([`/${tab}`]);
  }

  toggleForgotPasswordMode(mode: boolean) {
    this.forgotPasswordMode = mode;
    this.forgotSent = false;
    this.forgotEmailInput = '';
  }

  // 1. Submit email/password for Login
  handleLoginSubmit(event: Event) {
    event.preventDefault();

    if (!this.loginEmailInput || !this.loginPasswordInput) {
      this.snackBar.open('⚠️ Please enter both email and password.', 'OK', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.login({
      email: this.loginEmailInput,
      password: this.loginPasswordInput
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.status === 'OTP_SENT') {
          this.loginOtpSent = true;
          this.cdr.detectChanges(); // Force View Update!
          this.snackBar.open('🔐 Verification OTP sent to your email. Please verify.', 'Dismiss', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        const errMsg = err.error?.error || 'Invalid Email or Password!';
        this.snackBar.open(`❌ ${errMsg}`, 'Dismiss', {
          duration: 4500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  // 2. Submit Login OTP Verification
  handleVerifyLoginSubmit(event: Event) {
    event.preventDefault();

    if (!this.loginOtpInput) {
      this.snackBar.open('⚠️ Please enter the 6-digit OTP code.', 'OK', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.verifyLogin(this.loginEmailInput, this.loginOtpInput).subscribe({
      next: (res) => {
        this.isLoading = false;
        const user = res.user;
        this.snackBar.open(`✅ Welcome back, ${user.name}! Signed in successfully.`, 'Dismiss', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        this.loginOtpSent = false;
        this.loginOtpInput = '';
        window.location.href = '/';
      },
      error: (err) => {
        this.isLoading = false;
        const errMsg = err.error?.error || 'Invalid OTP code! Please try again.';
        this.snackBar.open(`❌ ${errMsg}`, 'Dismiss', {
          duration: 4500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  // 3. Submit Registration details to send Verification Link
  handleRegisterSubmit(event: Event) {
    event.preventDefault();

    if (!this.registerNameInput || !this.registerEmailInput || !this.registerPasswordInput || !this.registerConfirmPasswordInput) {
      this.snackBar.open('⚠️ Please fill out all fields.', 'OK', { duration: 3000 });
      return;
    }

    if (this.registerPasswordInput !== this.registerConfirmPasswordInput) {
      this.snackBar.open('❌ Passwords do not match! Please check and try again.', 'Retry', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }

    const newUser = {
      name: this.registerNameInput,
      email: this.registerEmailInput,
      password: this.registerPasswordInput,
      phone: ''
    };

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.register(newUser).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.status === 'LINK_SENT') {
          this.registerLinkSent = true;
          this.cdr.detectChanges(); // Force View Update!
          this.snackBar.open('📧 Verification link sent to your email. Please verify to complete signup.', 'Dismiss', {
            duration: 6000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        const errMsg = err.error?.error || 'Registration failed. Email might already be taken.';
        this.snackBar.open(`❌ ${errMsg}`, 'Dismiss', {
          duration: 4500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  // 5. Submit Forgot Password Request
  handleForgotPasswordSubmit(event: Event) {
    event.preventDefault();

    if (!this.forgotEmailInput) {
      this.snackBar.open('⚠️ Please enter your email address.', 'OK', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.forgotPassword(this.forgotEmailInput).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.forgotSent = true;
        this.cdr.detectChanges(); // Force View Update!
        this.snackBar.open('📧 Reset password link sent to your email. Please check your inbox.', 'Dismiss', {
          duration: 6000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: (err) => {
        this.isLoading = false;
        const errMsg = err.error?.error || 'Failed to request reset password link. Make sure your email is registered.';
        this.snackBar.open(`❌ ${errMsg}`, 'Dismiss', {
          duration: 4500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }
}

