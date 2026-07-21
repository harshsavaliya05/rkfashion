import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-cancel-order-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="cancel-dialog-wrapper">
      <div class="cancel-dialog-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      <h2 mat-dialog-title>Cancel Order</h2>
      <mat-dialog-content>
        <p>Are you sure you want to cancel this order? This action cannot be undone and your reserved stock will be released.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="onCancel()" class="cancel-btn">No, Keep Order</button>
        <button mat-flat-button (click)="onConfirm()" class="confirm-btn">Yes, Cancel Order</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .cancel-dialog-wrapper {
      padding: 8px 8px 4px;
      text-align: center;
      min-width: 320px;
      background-color: #ffffff;
    }

    .cancel-dialog-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 12px;
    }

    .cancel-dialog-icon svg {
      width: 48px;
      height: 48px;
      color: #dc3545;
      stroke: #dc3545;
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
      font-size: 14.5px;
      color: #555;
      margin: 0;
      text-align: center;
      line-height: 1.4;
    }

    mat-dialog-actions {
      display: flex;
      gap: 10px;
      justify-content: center !important;
      padding: 20px 0 4px;
    }

    .cancel-btn {
      font-family: 'Nunito Sans', sans-serif;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.5px;
      border-color: #ddd !important;
      color: #555 !important;
      border-radius: 4px !important;
      padding: 0 20px !important;
      height: 40px !important;
      transition: all 0.2s ease;
    }

    .cancel-btn:hover {
      border-color: #111111 !important;
      color: #111111 !important;
    }

    .confirm-btn {
      font-family: 'Nunito Sans', sans-serif;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.5px;
      background-color: #dc3545 !important;
      color: #fff !important;
      border-radius: 4px !important;
      padding: 0 20px !important;
      height: 40px !important;
      transition: all 0.2s ease;
    }

    .confirm-btn:hover {
      background-color: #c82333 !important;
    }
  `]
})
export class CancelOrderDialogComponent {
  constructor(private dialogRef: MatDialogRef<CancelOrderDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
