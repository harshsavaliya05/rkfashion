import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './order-success.html',
  styleUrl: './order-success.scss',
})
export class OrderSuccess implements OnInit {
  orderId = '';
  verificationStatus: 'verifying' | 'success' | 'failed' = 'verifying';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        if (params['id']) {
          this.orderId = params['id'];
        } else {
          this.orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        }

        if (params['payment'] === 'cashfree') {
          this.verifyCashfreePayment();
        } else {
          this.verificationStatus = 'success';
        }
        this.cdr.detectChanges();
      });
    });
  }

  verifyCashfreePayment() {
    this.verificationStatus = 'verifying';
    this.cdr.detectChanges();

    this.http.post('http://localhost:3000/api/orders/cashfree/verify', { orderId: this.orderId }).subscribe({
      next: (res: any) => {
        setTimeout(() => {
          if (res.status === 'PAID') {
            this.verificationStatus = 'success';
          } else {
            this.verificationStatus = 'failed';
            this.errorMessage = 'Transaction was not completed.';
          }
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        setTimeout(() => {
          console.error('Failed to verify payment status:', err);
          this.verificationStatus = 'failed';
          this.errorMessage = err.error?.error || 'Payment gateway verification timed out or rejected request.';
          this.cdr.detectChanges();
        });
      }
    });
  }
}
