import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.scss'
})
export class OrderTracking implements OnInit {
  orderId = '';
  order: any = null;
  isLoading = true;

  // Standard Order Milestones
  standardStatuses = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['orderId'] || '';
      if (!this.orderId) {
        this.snackBar.open('❌ Missing Order ID to track.', 'Dismiss', { duration: 4000 });
        this.router.navigate(['/account/orders']);
        return;
      }
      this.loadOrderDetails();
    });
  }

  loadOrderDetails() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.http.get<any[]>('http://localhost:3000/api/orders').subscribe({
      next: (orders) => {
        const found = orders.find(o => o.orderId === this.orderId);
        if (!found) {
          this.snackBar.open('❌ Order not found.', 'Dismiss', { duration: 4000 });
          this.router.navigate(['/account/orders']);
          return;
        }

        this.order = found;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching tracking info:', err);
        this.snackBar.open('❌ Failed to load tracking details.', 'Dismiss', { duration: 4000 });
        this.router.navigate(['/account/orders']);
      }
    });
  }

  // Helper to check if a standard milestone was reached
  isMilestoneReached(statusName: string): boolean {
    if (!this.order || !this.order.statusHistory) return false;
    return this.order.statusHistory.some(
      (h: any) => h.status.toLowerCase() === statusName.toLowerCase()
    );
  }

  // Get the timestamp of when a milestone was reached
  getMilestoneDate(statusName: string): string {
    if (!this.order || !this.order.statusHistory) return '';
    const match = this.order.statusHistory.find(
      (h: any) => h.status.toLowerCase() === statusName.toLowerCase()
    );
    if (!match) return '';
    return new Date(match.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get active step index for styling connection lines
  getActiveStepIndex(): number {
    if (!this.order) return -1;
    const current = this.order.status.toLowerCase();
    
    if (current === 'cancelled') return -2; // special cancelled case

    let maxIdx = -1;
    this.standardStatuses.forEach((st, idx) => {
      if (this.isMilestoneReached(st)) {
        maxIdx = idx;
      }
    });
    return maxIdx;
  }

  // Helper to identify return/exchange request details
  getReturnRequest() {
    if (this.order && this.order.returnRequests && this.order.returnRequests.length > 0) {
      return this.order.returnRequests[0];
    }
    return null;
  }

  getReturnMilestoneDate(milestone: string): string {
    const req = this.getReturnRequest();
    if (!req || !this.order) return '';
    
    if (milestone === 'Submitted') {
      return new Date(req.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (!this.order.statusHistory) return '';
    
    let targetStatus = milestone;
    if (milestone === 'Approved') {
      targetStatus = req.type === 'Return' ? 'Return Approved' : 'Exchange Approved';
    }
    
    const match = this.order.statusHistory.find(
      (h: any) => h.status.toLowerCase() === targetStatus.toLowerCase()
    );
    if (!match) return '';
    
    return new Date(match.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isReturnMilestoneReached(milestone: string): boolean {
    const req = this.getReturnRequest();
    if (!req) return false;
    
    const current = req.status.toLowerCase();
    
    if (milestone === 'Submitted') return true;
    if (milestone === 'Approved') return req.status !== 'Pending' && req.status !== 'Rejected';
    
    if (milestone === 'Courier Pickup') {
      return ['courier pickup', 'inspection', 'refund processed', 'replacement dispatched'].includes(current);
    }
    if (milestone === 'Inspection') {
      return ['inspection', 'refund processed', 'replacement dispatched'].includes(current);
    }
    if (milestone === 'Refund Processed') {
      return current === 'refund processed';
    }
    if (milestone === 'Replacement Dispatched') {
      return current === 'replacement dispatched';
    }
    return false;
  }

  isReturnMilestoneActive(milestone: string): boolean {
    const req = this.getReturnRequest();
    if (!req) return false;
    const current = req.status.toLowerCase();
    
    if (milestone === 'Approved') return req.status === 'approved';
    if (milestone === 'Courier Pickup') return current === 'courier pickup';
    if (milestone === 'Inspection') return current === 'inspection';
    if (milestone === 'Refund Processed') return current === 'refund processed';
    if (milestone === 'Replacement Dispatched') return current === 'replacement dispatched';
    return false;
  }
}
