import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../services/search.service';
import { HttpClient } from '@angular/common/http';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

interface OrderItem {
  name: string;
  colorName: string;
  colorHex?: string;
  size: string;
  price: number;
  quantity: number;
  image?: string;
  sku?: string;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  flatNo: string;
  areaName: string;
  landmark: string;
  city: string;
  state: string;
  postcode: string;
  phone: string;
  addressType: 'home' | 'office';
}

interface OrderDetail {
  orderId: string;
  userEmail: string;
  date: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  returnRequests?: any[];
}

import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: OrderDetail[] = [];
  filteredOrders: OrderDetail[] = [];
  filterStatus: string = '';
  searchTerm = '';
  statusOptions = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
  returnTrackerOptions = ['Approved', 'Courier Pickup', 'Inspection', 'Refund Processed'];
  exchangeTrackerOptions = ['Approved', 'Courier Pickup', 'Inspection', 'Replacement Dispatched'];
  selectedOrder: OrderDetail | null = null;
  isRefreshing = false;
  private socketSub?: Subscription;



  // Return & Exchange Requests State
  currentTab: 'orders' | 'returns' | 'exchanges' | 'cancellations' = 'orders';
  cancelledOrders: OrderDetail[] = [];
  returnRequests: any[] = [];
  pendingReturnsCount = 0;
  pendingExchangesCount = 0;

  // Custom Confirm Dialog States
  showApproveConfirmReq: any | null = null;
  showRejectConfirmReq: any | null = null;
  rejectionReasonText = '';

  defaultOrders: OrderDetail[] = [
    {
      orderId: 'RK-592813',
      userEmail: 'john.doe@gmail.com',
      date: '06 July 2026 at 10:15 AM',
      subtotal: 1499.00,
      discount: 0,
      total: 1499.00,
      paymentMethod: 'UPI (Google Pay)',
      status: 'Pending',
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        flatNo: 'Flat 402, Block A',
        areaName: 'Gaur City 2',
        landmark: 'Near Temple',
        city: 'Greater Noida',
        state: 'Uttar Pradesh',
        postcode: '201318',
        phone: '9876543210',
        addressType: 'home'
      },
      items: [
        {
          name: 'Premium Cotton Solid Shirt',
          colorName: 'Navy Blue',
          colorHex: '#20315f',
          size: 'M',
          price: 1499.00,
          quantity: 1,
          image: '/img/product/product-9.jpg',
          sku: 'RK-PCS-001'
        }
      ]
    },
    {
      orderId: 'RK-739281',
      userEmail: 'jane.smith@yahoo.com',
      date: '05 July 2026 at 06:45 PM',
      subtotal: 3998.00,
      discount: 500,
      total: 3498.00,
      paymentMethod: 'Cash on Delivery (COD)',
      status: 'Shipped',
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Smith',
        flatNo: 'House No 12, Lane 2',
        areaName: 'Vasant Kunj',
        landmark: 'Opposite Park',
        city: 'New Delhi',
        state: 'Delhi',
        postcode: '110070',
        phone: '9999888877',
        addressType: 'office'
      },
      items: [
        {
          name: 'Slim Fit Stretch Denim Jeans',
          colorName: 'Dark Blue Denim',
          colorHex: '#1d3557',
          size: '32',
          price: 1999.00,
          quantity: 2,
          image: '/img/product/product-2.jpg',
          sku: 'RK-SFD-002'
        }
      ]
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private searchService: SearchService,
    private http: HttpClient,
    private socketService: SocketService,
    private snackBar: MatSnackBar
  ) { }



  ngOnInit() {
    console.log('OrdersComponent ngOnInit called');
    this.route.queryParams.subscribe(params => {
      this.filterStatus = params['status'] || '';
      this.loadOrders();
      this.loadReturnRequests();
    });

    this.searchService.searchQuery$.subscribe(query => {
      this.searchTerm = query;
      this.applyFilter();
    });

    // Listen for real-time order events via WebSocket
    this.socketSub = this.socketService.newOrder$.subscribe(newOrder => {
      if (newOrder.status === 'Processing') newOrder.status = 'Pending';
      this.zone.run(() => {
        this.orders.unshift(newOrder);
        this.applyFilter();
      });
    });

    this.socketService.orderStatusUpdated$.subscribe(updated => {
      this.zone.run(() => {
        const idx = this.orders.findIndex(o => o.orderId === updated.orderId);
        if (idx !== -1) {
          this.orders[idx] = updated;
          this.applyFilter();
        }
        this.loadReturnRequests();
      });
    });

    this.socketService.orderDeleted$.subscribe(({ orderId }) => {
      this.zone.run(() => {
        this.orders = this.orders.filter(o => o.orderId !== orderId);
        this.applyFilter();
      });
    });
  }

  ngOnDestroy() {
    this.socketSub?.unsubscribe();
  }


  loadOrders() {
    this.http.get<OrderDetail[]>('http://localhost:3000/api/orders').subscribe(orders => {
      this.orders = orders;

      // Map legacy 'Processing' status to 'Pending' for compatibility
      let modified = false;
      this.orders.forEach(o => {
        if (o.status === 'Processing') {
          o.status = 'Pending';
          modified = true;
        }
      });

      this.applyFilter();
    });
  }

  loadReturnRequests() {
    this.http.get<any[]>('http://localhost:3000/api/orders/return-exchange/list').subscribe({
      next: (requests) => {
        this.returnRequests = requests;
        this.pendingReturnsCount = requests.filter(r => r.status === 'Pending' && r.type === 'Return').length;
        this.pendingExchangesCount = requests.filter(r => r.status === 'Pending' && r.type === 'Exchange').length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading return/exchange requests:', err)
    });
  }

  // --- Custom Confirm Dialog Trigger Actions ---
  triggerApproveDialog(req: any) {
    this.showApproveConfirmReq = req;
    this.cdr.detectChanges();
  }

  cancelApproveDialog() {
    this.showApproveConfirmReq = null;
    this.cdr.detectChanges();
  }

  confirmApproveRequest() {
    if (!this.showApproveConfirmReq) return;
    const req = this.showApproveConfirmReq;
    this.http.put(`http://localhost:3000/api/orders/return-exchange/${req.requestId}/approve`, {}).subscribe({
      next: () => {
        this.showApproveConfirmReq = null;
        this.loadReturnRequests();
        this.loadOrders();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to approve request:', err)
    });
  }

  triggerRejectDialog(req: any) {
    this.showRejectConfirmReq = req;
    this.rejectionReasonText = '';
    this.cdr.detectChanges();
  }

  cancelRejectDialog() {
    this.showRejectConfirmReq = null;
    this.rejectionReasonText = '';
    this.cdr.detectChanges();
  }

  confirmRejectRequest() {
    if (!this.showRejectConfirmReq) return;
    const req = this.showRejectConfirmReq;
    const payload = { reason: this.rejectionReasonText.trim() || undefined };
    this.http.put(`http://localhost:3000/api/orders/return-exchange/${req.requestId}/reject`, payload).subscribe({
      next: () => {
        this.showRejectConfirmReq = null;
        this.rejectionReasonText = '';
        this.loadReturnRequests();
        this.loadOrders();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to reject request:', err)
    });
  }

  applyFilter() {
    this.filteredOrders = this.orders.filter(o => {
      // Exclude orders that have return or exchange requests from Active Orders list
      const hasReturnReq = o.returnRequests && o.returnRequests.length > 0;
      if (hasReturnReq) return false;

      // Exclude cancelled orders from Active Orders list
      if (o.status.toLowerCase() === 'cancelled') return false;

      const matchStatus = !this.filterStatus || o.status.toLowerCase() === this.filterStatus.toLowerCase();
      const matchSearch = !this.searchTerm.trim() ||
        o.orderId.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (o.shippingAddress?.firstName + ' ' + o.shippingAddress?.lastName).toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchStatus && matchSearch;
    });

    this.cancelledOrders = this.orders.filter(o => {
      const isCancelled = o.status.toLowerCase() === 'cancelled';
      if (!isCancelled) return false;

      const matchSearch = !this.searchTerm.trim() ||
        o.orderId.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (o.shippingAddress?.firstName + ' ' + o.shippingAddress?.lastName).toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchSearch;
    });

    this.cdr.detectChanges();
  }


  updateOrderStatus(orderId: string, newStatus: string) {
    this.http.put(`http://localhost:3000/api/orders/${orderId}/status`, { status: newStatus }).subscribe(() => {
      const idx = this.orders.findIndex(o => o.orderId === orderId);
      if (idx !== -1) {
        this.orders[idx].status = newStatus;
        this.applyFilter();
      }
    });
  }

  updateReturnTrackerStatus(req: any, newStatus: string) {
    this.http.put(`http://localhost:3000/api/orders/return-exchange/${req.requestId}/tracker-status`, { status: newStatus }).subscribe({
      next: () => {
        this.snackBar.open(`🎉 Status updated to "${newStatus}" successfully.`, 'Dismiss', { duration: 3000 });
        this.loadReturnRequests();
        this.loadOrders();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to update return tracker status:', err);
        const errMsg = err.error?.error || 'Failed to update return tracker status.';
        this.snackBar.open(`❌ ${errMsg}`, 'Dismiss', { duration: 5000 });
        // Force reload to reset dropdown select value back to database value
        this.loadReturnRequests();
        this.cdr.detectChanges();
      }
    });
  }

  getReturnOnlyRequests() {
    return this.returnRequests.filter(r => r.type === 'Return');
  }

  getExchangeOnlyRequests() {
    return this.returnRequests.filter(r => r.type === 'Exchange');
  }

  viewOrder(order: OrderDetail) {
    this.selectedOrder = order;
  }

  refreshOrders() {
    this.isRefreshing = true;
    this.loadOrders();
    this.cdr.detectChanges();

    // Explicitly run timeout inside Angular zone
    this.zone.run(() => {
      setTimeout(() => {
        this.isRefreshing = false;
        this.cdr.detectChanges();
      }, 600);
    });
  }
}

