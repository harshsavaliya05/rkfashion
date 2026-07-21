import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    FormsModule, 
    CommonModule, 
    MatSnackBarModule, 
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss'
})
export class EditProfile implements OnInit {
  nameInput = '';
  phoneInput = '';
  genderInput = '';
  dobInput: any = null; // Will store JavaScript Date or null for material datepicker

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    const user = this.authService.getLoggedInUser();
    if (user) {
      this.nameInput = user.name || '';
      this.phoneInput = user.phone || '';
      this.genderInput = user.gender || '';
      
      // Parse string YYYY-MM-DD to Date object for mat-datepicker
      if (user.dob) {
        const parts = user.dob.split('-');
        if (parts.length === 3) {
          // Use UTC/Local constructor safely
          this.dobInput = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        } else {
          this.dobInput = null;
        }
      } else {
        this.dobInput = null;
      }
    }
  }

  validatePhone(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    this.phoneInput = value;
    input.value = value;
  }

  handleProfileSave(event: Event) {
    event.preventDefault();

    if (!this.nameInput.trim()) {
      this.snackBar.open('⚠️ Full Name is required!', 'OK', { duration: 3000 });
      return;
    }

    // Phone validation (if specified): must be exactly 10 digits
    if (this.phoneInput && !/^[0-9]{10}$/.test(this.phoneInput)) {
      this.snackBar.open('❌ Phone number must be exactly 10 digits!', 'Dismiss', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }

    let dobStr = '';
    if (this.dobInput) {
      try {
        const d = new Date(this.dobInput);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          dobStr = `${year}-${month}-${day}`;
        }
      } catch (e) {
        dobStr = '';
      }
    }

    this.authService.updateProfile({
      name: this.nameInput.trim(),
      phone: this.phoneInput.trim(),
      gender: this.genderInput,
      dob: dobStr
    }).subscribe({
      next: () => {
        this.snackBar.open('✅ Profile updated successfully!', 'Dismiss', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        this.router.navigate(['/account']);
      },
      error: () => {
        this.snackBar.open('❌ Failed to update profile!', 'Retry', { duration: 3000 });
      }
    });
  }
}

