import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, MatSnackBarModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  currentYear = new Date().getFullYear();
  newsletterEmail = '';

  constructor(private snackBar: MatSnackBar) {}

  subscribeNewsletter() {
    if (this.newsletterEmail.trim()) {
      this.snackBar.open('✨ Thank you for subscribing to our newsletter!', 'Dismiss', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      this.newsletterEmail = '';
    }
  }
}
