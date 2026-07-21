import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { BannerService, Banner } from '../../services/banner.service';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-banners',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  templateUrl: './banners.html',
  styleUrl: './banners.scss'
})
export class BannersComponent implements OnInit, OnDestroy {
  banners: Banner[] = [];

  // Upload state
  isUploading = false;
  uploadStatusText = 'No file chosen';

  // Media type: 'photo' | 'video' — mutually exclusive
  mediaType: 'photo' | 'video' = 'photo';

  showForm = false;
  editingBanner: Banner | null = null;

  // Custom Delete Confirm State
  showDeleteConfirmId: number | null = null;
  showDeleteConfirmTitle = '';

  constructor(
    private bannerService: BannerService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  getSafeVideoUrl(url: string | undefined): SafeResourceUrl | string {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  form = {
    title: '',
    subtitleTag: '',
    description: '',
    seasonLabel: '',
    btnText: '',
    link: '',
    imageUrl: '',
    videoUrl: ''
  };

  defaultBanners = [
    {
      title: 'SHIRTS & TEES',
      subtitleTag: 'EXCLUSIVELY FOR MEN',
      description: 'Discover our premium collection of cotton linen shirts and everyday solid t-shirts. Designed for effortless luxury.',
      seasonLabel: 'LATEST COLLECTION 2026',
      btnText: 'SHOP COLLECTION',
      link: '/shop',
      imageUrl: 'assets/img/hero/hero-1.jpg',
      active: true
    },
    {
      title: 'JEANS & CARGOS',
      subtitleTag: 'PREMIUM STYLES',
      description: 'Find your perfect fit. Handcrafted vintage-washed denims and relaxed utility cargos made for everyday movement.',
      seasonLabel: 'NEW SEASON ARRIVALS',
      btnText: 'SHOP PANTS & JEANS',
      link: '/shop',
      imageUrl: 'assets/img/hero/hero-2.jpg',
      active: true
    },
    {
      title: 'PREMIUM HOODIES',
      subtitleTag: 'SEASONAL FAVOURITES',
      description: 'Stay warm in high-density combed cotton hoodies and cozy neutral-colored sweatshirts designed for supreme comfort.',
      seasonLabel: 'LIMITED DROPS ONLY',
      btnText: 'EXPLORE HOODIES',
      link: '/shop',
      imageUrl: 'assets/img/hero/hero-3.jpg',
      active: true
    }
  ];

  // Called when user selects a file — handles both photo and video based on mediaType
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const sizeKB = Math.round(file.size / 1024);
    this.uploadStatusText = `Uploading: ${file.name} (${sizeKB} KB)...`;
    this.isUploading = true;
    this.cdr.detectChanges();

    if (this.mediaType === 'photo') {
      // Image upload via campaigns endpoint
      const formData = new FormData();
      formData.append('image', file);

      this.http.post<{ imageUrl: string }>('http://localhost:3000/api/campaigns/upload', formData).subscribe({
        next: (res) => {
          this.isUploading = false;
          this.form.imageUrl = res.imageUrl;
          this.form.videoUrl = '';
          this.uploadStatusText = `${file.name} (${sizeKB} KB) - Uploaded ✅`;
          this.cdr.detectChanges();
          this.snackBar.open('📸 Photo uploaded successfully!', 'Dismiss', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        },
        error: (err) => {
          this.isUploading = false;
          this.uploadStatusText = 'Upload failed ❌';
          this.cdr.detectChanges();
          const errMsg = err.error?.error || 'Failed to upload photo.';
          this.snackBar.open(`❌ Upload Error: ${errMsg}`, 'Dismiss', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      // Video upload via categories endpoint (supports image + video, uses 'media' field)
      const formData = new FormData();
      formData.append('media', file);

      this.http.post<{ videoUrl: string; imageUrl: string }>('http://localhost:3000/api/categories/upload', formData).subscribe({
        next: (res) => {
          this.isUploading = false;
          this.form.videoUrl = res.videoUrl;
          this.form.imageUrl = '';
          this.uploadStatusText = `${file.name} (${sizeKB} KB) - Uploaded ✅`;
          this.cdr.detectChanges();
          this.snackBar.open('🎬 Video uploaded successfully!', 'Dismiss', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        },
        error: (err) => {
          this.isUploading = false;
          this.uploadStatusText = 'Upload failed ❌';
          this.cdr.detectChanges();
          const errMsg = err.error?.error || 'Failed to upload video.';
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

  // When media type changes, reset upload status & clear the other media field
  onMediaTypeChange() {
    this.uploadStatusText = 'No file chosen';
    if (this.mediaType === 'photo') {
      this.form.videoUrl = '';
    } else {
      this.form.imageUrl = '';
    }
    this.cdr.detectChanges();
  }

  ngOnInit() {
    this.loadBanners();
  }

  ngOnDestroy() {}

  loadBanners() {
    this.bannerService.getBanners().subscribe(banners => {
      this.banners = banners || [];
      this.cdr.detectChanges();
    });
  }

  openAddForm() {
    this.editingBanner = null;
    this.mediaType = 'photo';
    this.uploadStatusText = 'No file chosen';
    this.form = {
      title: '',
      subtitleTag: '',
      description: '',
      seasonLabel: '',
      btnText: '',
      link: '',
      imageUrl: '',
      videoUrl: ''
    };
    this.showForm = true;
  }

  editBanner(banner: Banner) {
    this.editingBanner = banner;
    // Determine media type from existing data
    this.mediaType = banner.videoUrl ? 'video' : 'photo';
    this.uploadStatusText = (banner.videoUrl || banner.imageUrl) ? 'Media Uploaded' : 'No file chosen';
    this.form = {
      title: banner.title,
      subtitleTag: banner.subtitleTag,
      description: banner.description,
      seasonLabel: banner.seasonLabel,
      btnText: banner.btnText,
      link: banner.link,
      imageUrl: banner.imageUrl,
      videoUrl: banner.videoUrl || ''
    };
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveBanner() {
    const f = this.form;
    const title = f.title ? f.title.trim() : '';
    const subtitleTag = f.subtitleTag ? f.subtitleTag.trim() : '';
    const description = f.description ? f.description.trim() : '';
    const seasonLabel = f.seasonLabel ? f.seasonLabel.trim() : '';
    const btnText = f.btnText ? f.btnText.trim() : '';
    const link = f.link ? f.link.trim() : '';
    const imageUrl = f.imageUrl ? f.imageUrl.trim() : '';
    const videoUrl = f.videoUrl ? f.videoUrl.trim() : '';

    // Basic required text fields
    if (!title || !subtitleTag || !description || !seasonLabel || !btnText || !link) {
      this.snackBar.open('⚠️ Please fill out all required text fields.', 'Dismiss', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }

    // At least one media required
    if (!imageUrl && !videoUrl) {
      this.snackBar.open('⚠️ Please upload a Photo or Video for the banner.', 'Dismiss', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }

    const payload: any = {
      title,
      subtitleTag,
      description,
      seasonLabel,
      btnText,
      link,
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || null,
      active: this.editingBanner ? this.editingBanner.active : true
    };

    if (this.editingBanner) {
      payload.id = this.editingBanner.id;
    }

    this.bannerService.saveBanner(payload).subscribe({
      next: () => {
        this.snackBar.open(
          this.editingBanner ? '✅ Banner updated successfully!' : '✅ Banner saved successfully!',
          'Dismiss',
          { duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom' }
        );
        this.loadBanners();
        this.cancelForm();
      },
      error: (err) => {
        const errMsg = err?.error?.error || err?.message || 'Something went wrong.';
        this.snackBar.open(`❌ Failed to save banner: ${errMsg}`, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  deleteBanner(banner: Banner) {
    this.showDeleteConfirmId = banner.id;
    this.showDeleteConfirmTitle = banner.title;
  }

  cancelDelete() {
    this.showDeleteConfirmId = null;
    this.showDeleteConfirmTitle = '';
  }

  confirmDelete() {
    if (this.showDeleteConfirmId !== null) {
      this.bannerService.deleteBanner(this.showDeleteConfirmId).subscribe(() => {
        this.snackBar.open('🗑️ Banner deleted successfully!', 'Dismiss', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        this.loadBanners();
        this.cancelDelete();
      });
    }
  }

  toggleStatus(banner: Banner) {
    // Toggle active status locally first (optimistic update)
    banner.active = !banner.active;
    this.cdr.detectChanges();

    this.bannerService.saveBanner(banner).subscribe({
      next: () => {
        this.snackBar.open(`🎉 Banner status updated to ${banner.active ? 'ACTIVE' : 'INACTIVE'}`, 'Dismiss', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: (err) => {
        // Rollback state if API fails
        banner.active = !banner.active;
        this.cdr.detectChanges();
        const errMsg = err?.error?.error || err?.message || 'Failed to update status.';
        this.snackBar.open(`❌ Failed to update status: ${errMsg}`, 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  cancelForm() {
    this.showForm = false;
    this.editingBanner = null;
    this.mediaType = 'photo';
    this.uploadStatusText = 'No file chosen';
    this.form = {
      title: '',
      subtitleTag: '',
      description: '',
      seasonLabel: '',
      btnText: '',
      link: '',
      imageUrl: '',
      videoUrl: ''
    };
  }
}
