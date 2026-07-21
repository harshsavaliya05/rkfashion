import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-order-return-exchange',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-return-exchange.html',
  styleUrl: './order-return-exchange.scss'
})
export class OrderReturnExchange implements OnInit {
  orderId = '';
  requestType: 'Return' | 'Exchange' = 'Return';
  order: any = null;
  selectedItems: { [itemKey: string]: boolean } = {};
  selectedItemSizes: { [itemKey: string]: string } = {}; // Exchange target sizes
  returnReason = "Size doesn't fit (Too small)";
  refundMethod = 'Original Payment Mode';
  refundDetails = '';
  upiId = '';
  bankAccNo = '';
  bankIfsc = '';
  bankHolderName = '';
  comments = '';
  isSubmitting = false;
  isLoading = true;

  // Read-only Details Mode variables
  hasExistingRequest = false;
  existingRequest: any = null;

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
      const typeParam = params['type'] || 'Return';
      this.requestType = (typeParam.toLowerCase() === 'exchange') ? 'Exchange' : 'Return';
      
      if (!this.orderId) {
        this.snackBar.open('❌ Invalid Order ID parameter.', 'Dismiss', { duration: 4000 });
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

        // Validate status: Return/Exchange can only be done on Delivered orders
        if (found.status.toLowerCase() !== 'delivered') {
          this.snackBar.open('⚠️ Returns/Exchanges are only allowed for delivered orders.', 'Dismiss', { duration: 5000 });
          this.router.navigate(['/account/orders']);
          return;
        }

        // If a request already exists, load it in read-only details mode
        if (found.returnRequests && found.returnRequests.length > 0) {
          this.hasExistingRequest = true;
          this.existingRequest = found.returnRequests[0];
          this.requestType = this.existingRequest.type as any;
          this.order = found;
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        this.order = found;
        
        // Check payment method of the order to configure default refund type
        if (found.paymentMethod.toLowerCase().includes('cash on delivery') || found.paymentMethod.toLowerCase().includes('cod')) {
          this.refundMethod = 'UPI ID Transfer';
        } else {
          this.refundMethod = 'Original Payment Mode';
        }
        
        // Default select all items and configure original sizes
        if (found.items && Array.isArray(found.items)) {
          found.items.forEach((item: any) => {
            this.selectedItems[item.key] = true;
            this.selectedItemSizes[item.key] = item.size;
          });
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching order details:', err);
        this.snackBar.open('❌ Failed to load order details.', 'Dismiss', { duration: 4000 });
        this.router.navigate(['/account/orders']);
      }
    });
  }

  toggleItemSelection(itemKey: string) {
    this.selectedItems[itemKey] = !this.selectedItems[itemKey];
    this.cdr.detectChanges();
  }

  submitRequest() {
    if (!this.order) return;

    const checkedItems = this.order.items.filter((item: any) => this.selectedItems[item.key]);
    if (checkedItems.length === 0) {
      this.snackBar.open('⚠️ Please select at least one item to proceed.', 'Dismiss', { duration: 3000 });
      return;
    }

    let finalRefundDetails = this.refundDetails;
    
    if (this.requestType === 'Return') {
      if (this.refundMethod === 'UPI ID Transfer') {
        if (!this.upiId || !this.upiId.trim() || !this.upiId.includes('@')) {
          this.snackBar.open('⚠️ Please enter a valid UPI ID (e.g. mobileNumber@ybl / name@upi).', 'Dismiss', { duration: 4000 });
          return;
        }
        finalRefundDetails = `UPI ID: ${this.upiId.trim()}`;
      } else if (this.refundMethod === 'Bank Account Transfer') {
        if (!this.bankHolderName.trim() || !this.bankAccNo.trim() || !this.bankIfsc.trim()) {
          this.snackBar.open('⚠️ Please enter all Bank Account details (Name, A/C No, IFSC Code).', 'Dismiss', { duration: 4000 });
          return;
        }
        finalRefundDetails = `Holder: ${this.bankHolderName.trim()}\nA/C No: ${this.bankAccNo.trim()}\nIFSC Code: ${this.bankIfsc.trim()}`;
      } else {
        finalRefundDetails = 'Refund to Original Payment Mode (Automatic Online Refund via Cashfree)';
      }
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const mappedItems = checkedItems.map((item: any) => ({
      productId: item.productId,
      name: item.name,
      size: item.size,
      colorName: item.colorName,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
      newSize: this.requestType === 'Exchange' ? this.selectedItemSizes[item.key] : undefined
    }));

    const payload = {
      orderId: this.order.orderId,
      userEmail: this.order.userEmail,
      type: this.requestType,
      items: mappedItems,
      reason: this.returnReason,
      newSize: this.requestType === 'Exchange' ? Object.values(this.selectedItemSizes)[0] : undefined,
      refundMethod: this.requestType === 'Return' ? this.refundMethod : undefined,
      refundDetails: this.requestType === 'Return' ? finalRefundDetails : undefined,
      comments: this.comments.trim() || undefined
    };

    this.http.post('http://localhost:3000/api/orders/return-exchange', payload).subscribe({
      next: () => {
        this.snackBar.open(`🎉 ${this.requestType} request submitted successfully!`, 'Dismiss', { duration: 5000 });
        this.isSubmitting = false;
        this.router.navigate(['/account/orders']);
      },
      error: (err) => {
        console.error('Request failed:', err);
        const errMsg = err.error?.error || `Failed to submit ${this.requestType.toLowerCase()} request.`;
        this.snackBar.open(`❌ ${errMsg}`, 'Dismiss', { duration: 4000 });
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  isReturnMilestoneReached(milestone: string): boolean {
    if (!this.existingRequest || !this.order) return false;
    
    const current = this.existingRequest.status.toLowerCase();
    
    if (milestone === 'Submitted') return true;
    if (milestone === 'Approved') return current !== 'pending' && current !== 'rejected';
    
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
    if (!this.existingRequest || !this.order) return false;
    const current = this.existingRequest.status.toLowerCase();
    
    if (milestone === 'Approved') return current === 'approved';
    if (milestone === 'Courier Pickup') return current === 'courier pickup';
    if (milestone === 'Inspection') return current === 'inspection';
    if (milestone === 'Refund Processed') return current === 'refund processed';
    if (milestone === 'Replacement Dispatched') return current === 'replacement dispatched';
    return false;
  }

  getReturnMilestoneDate(milestone: string): string {
    if (!this.existingRequest || !this.order) return '';
    
    if (milestone === 'Submitted') {
      return new Date(this.existingRequest.createdAt).toLocaleDateString('en-IN', {
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
      targetStatus = this.existingRequest.type === 'Return' ? 'Return Approved' : 'Exchange Approved';
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

  isOnlinePayment(): boolean {
    if (!this.order) return false;
    const method = this.order.paymentMethod.toLowerCase();
    return !method.includes('cash on delivery') && !method.includes('cod');
  }

  getRefundTransactionId(): string | null {
    if (!this.existingRequest || !this.existingRequest.comments) return null;
    const comments = this.existingRequest.comments;
    
    const match = comments.match(/Refund ID:\s*([^\s\.\,\;]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    if (comments.includes('Simulated')) {
      return 'ref_simulated_test_mode';
    }
    
    return null;
  }
}
