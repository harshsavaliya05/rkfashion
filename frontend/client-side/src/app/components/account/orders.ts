import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, OrderDetail } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReviewService } from '../../services/review.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CancelOrderDialogComponent } from './cancel-dialog';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatDialogModule],
  templateUrl: './orders.html',
  styleUrl: './orders.scss'
})
export class MyOrders implements OnInit, OnDestroy {
  orders: OrderDetail[] = [];

  // Review Form State
  activeReviewItemKey: string | null = null;
  reviewRating: number = 0;
  reviewText: string = '';
  hoverRating: number = 0;
  isSubmittingReview: boolean = false;
  selectedReviewPhotos: File[] = [];
  reviewPhotoPreviews: string[] = [];
  private pollingInterval: any;



  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private reviewService: ReviewService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadOrders();
    // Auto-refresh orders every 10 seconds to show status updates immediately
    this.pollingInterval = setInterval(() => {
      this.loadOrders();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  loadOrders() {
    this.authService.getUserOrders().subscribe(orders => {
      this.orders = orders.sort((a, b) => {
        const idA = (a as any).id;
        const idB = (b as any).id;
        if (idA !== undefined && idB !== undefined) {
          return idB - idA;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      this.cdr.detectChanges(); // Refresh client view immediately on sync
    });
  }

  getStatusClass(status: string): string {
    if (!status) return '';
    switch (status.toLowerCase()) {
      case 'pending':
      case 'confirmed':
      case 'packed':
      case 'processing': 
        return 'status-processing';
      case 'shipped': 
        return 'status-shipped';
      case 'delivered': 
        return 'status-delivered';
      case 'cancelled':
      case 'returned': 
        return 'status-cancelled';
      default: 
        return '';
    }
  }

  // --- Review Methods ---
  openReviewForm(itemKey: string) {
    this.activeReviewItemKey = itemKey;
    this.reviewRating = 0;
    this.reviewText = '';
    this.hoverRating = 0;
    this.selectedReviewPhotos = [];
    this.reviewPhotoPreviews = [];
  }

  cancelReview() {
    this.activeReviewItemKey = null;
    this.selectedReviewPhotos = [];
    this.reviewPhotoPreviews = [];
  }

  setHover(n: number) { this.hoverRating = n; }
  clearHover() { this.hoverRating = 0; }
  setRating(n: number) { this.reviewRating = n; }

  onReviewPhotosSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    if (files.length > 5) {
      this.snackBar.open('⚠️ You can upload up to 5 photos only.', 'Dismiss', { duration: 4000 });
      return;
    }
    this.selectedReviewPhotos = files;
    
    // Generate previews
    this.reviewPhotoPreviews = [];
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.reviewPhotoPreviews.push(e.target.result);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  submitReview(order: OrderDetail, item: any) {
    if (!this.reviewRating || !this.reviewText.trim()) return;

    this.isSubmittingReview = true;
    this.cdr.detectChanges();

    const user = this.authService.getLoggedInUser();
    const name = user?.name || user?.email?.split('@')[0] || 'Anonymous';
    const email = user?.email || 'anonymous@example.com';

    const submit = (photoUrls: string[] = []) => {
      const newReviewPayload = {
        customer: name,
        email,
        productId: item.productId,
        productName: item.name,
        rating: this.reviewRating,
        text: this.reviewText.trim(),
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        photos: photoUrls
      };

      this.reviewService.submitReview(newReviewPayload).subscribe({
        next: () => {
          this.snackBar.open('🎉 Review submitted successfully!', 'Dismiss', { duration: 5000 });
          this.activeReviewItemKey = null;
          this.selectedReviewPhotos = [];
          this.reviewPhotoPreviews = [];
          this.isSubmittingReview = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          const errorMsg = err.error?.error || 'Failed to submit review.';
          this.snackBar.open('❌ ' + errorMsg, 'Dismiss', { duration: 5000 });
          this.isSubmittingReview = false;
          this.cdr.detectChanges();
        }
      });
    };

    if (this.selectedReviewPhotos.length > 0) {
      const formData = new FormData();
      this.selectedReviewPhotos.forEach(file => {
        formData.append('photos', file);
      });
      this.reviewService.uploadPhotos(formData).subscribe({
        next: (res) => {
          submit(res.urls);
        },
        error: (err) => {
          console.error('Failed to upload review photos:', err);
          this.snackBar.open('❌ Failed to upload photos. Submitting review without photos.', 'Dismiss', { duration: 5000 });
          submit([]);
        }
      });
    } else {
      submit([]);
    }
  }

  hasReturnOrExchangeRequest(order: any): boolean {
    return !!(order.returnRequests && order.returnRequests.length > 0);
  }

  isRequestRejected(order: any): boolean {
    if (!order.returnRequests || order.returnRequests.length === 0) return false;
    return order.returnRequests.some((r: any) => r.status === 'Rejected');
  }

  downloadInvoice(orderId: string) {
    const downloadUrl = `http://localhost:3000/api/orders/${orderId}/invoice`;
    window.open(downloadUrl, '_blank');
  }

  cancelOrder(orderId: string) {
    const dialogRef = this.dialog.open(CancelOrderDialogComponent, {
      width: '380px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.http.post(`http://localhost:3000/api/orders/${orderId}/cancel`, {}).subscribe({
          next: () => {
            this.snackBar.open('🎉 Order cancelled successfully!', 'Dismiss', { duration: 5000 });
            this.loadOrders();
          },
          error: (err: any) => {
            const errorMsg = err.error?.error || 'Failed to cancel order.';
            this.snackBar.open('❌ ' + errorMsg, 'Dismiss', { duration: 5000 });
          }
        });
      }
    });
  }
}
