import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    FormsModule, 
    CommonModule, 
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss'
})
export class ChangePassword implements OnInit {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  hideCurrent = true;
  hideNew = true;
  hideConfirm = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  handleChangePasswordSubmit(event: Event) {
    event.preventDefault();

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.snackBar.open('⚠️ Please fill in all password fields.', 'Dismiss', { duration: 3000 });
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.snackBar.open('❌ New passwords do not match! Please check again.', 'Dismiss', { duration: 3500 });
      return;
    }

    if (this.newPassword.length < 6) {
      this.snackBar.open('❌ New password must be at least 6 characters long.', 'Dismiss', { duration: 3500 });
      return;
    }

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.snackBar.open('✅ Password changed successfully!', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/account']);
      },
      error: () => {
        this.snackBar.open('❌ Current Password you entered is incorrect!', 'Retry', { duration: 4000 });
      }
    });
  }
}
