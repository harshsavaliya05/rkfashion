import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { CampaignService, CampaignPayload } from '../../services/campaign.service';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  templateUrl: './campaigns.html',
  styleUrl: './campaigns.scss'
})
export class CampaignsComponent {
  subject = '';
  title = '';
  description = '';
  buttonText = 'Shop Collection';
  discountPercent: number | null = null;
  imageUrl = '';
  isSending = false;
  isUploading = false;
  uploadedFileName = '';
  uploadStatusText = 'No file chosen';

  constructor(
    private campaignService: CampaignService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const sizeKB = Math.round(file.size / 1024);
      this.uploadedFileName = file.name;
      this.uploadStatusText = `Uploading: ${file.name} (${sizeKB} KB)...`;
      this.isUploading = true;
      this.cdr.detectChanges();
      
      this.campaignService.uploadCampaignImage(file).subscribe({
        next: (res) => {
          this.isUploading = false;
          this.imageUrl = res.imageUrl;
          this.uploadStatusText = `${file.name} (${sizeKB} KB) - Uploaded ✅`;
          this.snackBar.open('📸 Image uploaded successfully!', 'Dismiss', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isUploading = false;
          this.uploadedFileName = '';
          this.uploadStatusText = 'Upload failed ❌';
          this.cdr.detectChanges();
          const errMsg = err.error?.error || 'Failed to upload image.';
          this.snackBar.open(`❌ Upload Error: ${errMsg}`, 'Dismiss', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  blastCampaign() {
    if (!this.subject.trim() || !this.title.trim() || !this.description.trim()) {
      this.snackBar.open('⚠️ Please fill in all required fields (Subject, Title, Description)', 'Dismiss', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      });
      return;
    }

    const payload: CampaignPayload = {
      subject: this.subject,
      title: this.title,
      description: this.description,
      buttonText: this.buttonText || undefined,
      discountPercent: this.discountPercent,
      imageUrl: this.imageUrl || undefined
    };

    this.isSending = true;

    this.campaignService.sendCampaign(payload).subscribe({
      next: (res) => {
        this.isSending = false;
        this.cdr.detectChanges();
        this.snackBar.open(`🎉 ${res.message || 'Campaign email blasted successfully!'}`, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        
        // Reset form
        this.subject = '';
        this.title = '';
        this.description = '';
        this.buttonText = 'Shop Collection';
        this.discountPercent = null;
        this.imageUrl = '';
        this.uploadedFileName = '';
        this.uploadStatusText = 'No file chosen';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSending = false;
        this.cdr.detectChanges();
        const errMsg = err.error?.error || 'Failed to send campaign emails.';
        this.snackBar.open(`❌ Error: ${errMsg}`, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
