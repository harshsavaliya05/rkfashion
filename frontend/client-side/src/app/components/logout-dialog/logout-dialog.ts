import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-logout-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="logout-dialog-wrapper">
      <div class="logout-dialog-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </div>
      <h2 mat-dialog-title>Sign Out</h2>
      <mat-dialog-content>
        <p>Are you sure you want to sign out?</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="onCancel()" class="cancel-btn">Cancel</button>
        <button mat-flat-button (click)="onConfirm()" class="confirm-btn">Sign Out</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .logout-dialog-wrapper {
      padding: 8px 8px 4px;
      text-align: center;
      min-width: 300px;
      background-color: #ffffff;
    }

    .logout-dialog-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 12px;
    }

    .logout-dialog-icon svg {
      width: 48px;
      height: 48px;
      color: var(--primary-color);
      stroke: var(--primary-color);
    }

    h2[mat-dialog-title] {
      font-family: 'Nunito Sans', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #111111;
      margin: 0 0 4px;
      text-align: center;
    }

    mat-dialog-content p {
      font-family: 'Nunito Sans', sans-serif;
      font-size: 15px;
      color: #555;
      margin: 0;
      text-align: center;
    }

    mat-dialog-actions {
      display: flex;
      gap: 10px;
      justify-content: center !important;
      padding: 16px 0 4px;
    }

    .cancel-btn {
      font-family: 'Nunito Sans', sans-serif;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.5px;
      border-color: #ddd !important;
      color: #555 !important;
      border-radius: 4px !important;
      padding: 0 24px !important;
      height: 40px !important;
      transition: all 0.2s ease;
    }

    .cancel-btn:hover {
      border-color: #1e0a3c !important;
      color: #1e0a3c !important;
    }

    .confirm-btn {
      font-family: 'Nunito Sans', sans-serif;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.5px;
      background-color: var(--primary-color) !important;
      color: #fff !important;
      border-radius: 4px !important;
      padding: 0 24px !important;
      height: 40px !important;
      transition: all 0.2s ease;
    }

    .confirm-btn:hover {
      background-color: #1e0a3c !important;
    }
  `]
})
export class LogoutDialogComponent {
  constructor(private dialogRef: MatDialogRef<LogoutDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

