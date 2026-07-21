import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SearchService } from '../../services/search.service';
import { ProductService } from '../../services/product.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent implements OnInit, OnDestroy {
  isSidebarMobileOpen = false;
  showLogoutConfirm = false;

  openSubmenus: { [key: string]: boolean } = {
    products: false
  };

  // Global Search Dropdown Properties
  filteredProducts: any[] = [];
  filteredOrders: any[] = [];
  filteredCustomers: any[] = [];
  showOverlay = false;
  hasResults = false;
  // Socket subscription cleanup
  private socketSubscription?: Subscription;

  // Notification Panel Properties
  showNotifications = false;
  notifications: any[] = [];
  desktopNotificationsEnabled = false; // toggle state

  get unreadNotificationsCount(): number {
    return this.notifications.filter(n => n.unread).length;
  }

  adminName: string = 'Admin';

  constructor(
    private router: Router,
    public searchService: SearchService,
    private productService: ProductService,
    private http: HttpClient,
    private authService: AuthService,
    private socketService: SocketService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    // Fetch logged in admin name
    if (typeof localStorage !== 'undefined') {
      const userStr = localStorage.getItem('adminUser');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          this.adminName = user.name || 'Admin';
        } catch(e) {}
      }
      // Restore notification toggle state
      this.desktopNotificationsEnabled = localStorage.getItem('desktopNotifEnabled') === 'true';
    }

    this.updateActiveSubmenu(this.router.url);

    // Request desktop notification permission on load
    this.requestNotificationPermission();

    // Listen for new orders via WebSocket (no polling!)
    this.socketSubscription = this.socketService.newOrder$.subscribe(order => {
      const customerName = order.shippingAddress
        ? (order.shippingAddress.firstName + ' ' + order.shippingAddress.lastName)
        : 'Customer';
      const orderTotal = order.total || 0;
      const timestamp = new Date();

      const newNotif = {
        id: Date.now(),
        title: 'New Order Received',
        text: `Order #${order.orderId} was placed by ${customerName} for ₹${orderTotal}.`,
        time: this.getTimeAgo(timestamp),
        timestamp,
        type: 'order',
        icon: 'fa-shopping-cart',
        link: '/orders',
        unread: true
      };

      this.notifications.unshift(newNotif);
      this.showDesktopNotification('🛒 New Order Placed!', `Order #${order.orderId} | ${customerName} | ₹${orderTotal}`, '/orders');
    });

    this.router.events.pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        this.updateActiveSubmenu(url);
        // Clear search when switching pages, unless it's a page that supports search
        if (!url.includes('/products') && !url.includes('/orders') && !url.includes('/drafts') && !url.includes('/users')) {
          this.searchService.setQuery('');
        }
      });

    this.searchService.searchQuery$.subscribe(query => {
      this.performSearch(query);
    });
  }

  updateActiveSubmenu(url: string) {
    Object.keys(this.openSubmenus).forEach(key => this.openSubmenus[key] = false);
    if (url.includes('/products') || url.includes('/drafts')) this.openSubmenus['products'] = true;
  }

  isSubmenuActive(menu: string): boolean {
    const url = this.router.url;
    if (menu === 'products' && (url.includes('/products') || url.includes('/drafts'))) return true;
    return false;
  }

  toggleSidebar() { this.isSidebarMobileOpen = !this.isSidebarMobileOpen; }

  toggleSubmenu(menu: string) {
    this.openSubmenus[menu] = !this.openSubmenus[menu];
    Object.keys(this.openSubmenus).forEach(key => { if (key !== menu) this.openSubmenus[key] = false; });
  }

  handleLogout() {
    this.showLogoutConfirm = true;
  }

  cancelLogout() {
    this.showLogoutConfirm = false;
  }

  confirmLogout() {
    this.showLogoutConfirm = false;
    this.authService.logout();
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    console.log('onSearch event in layout:', value);
    this.searchService.setQuery(value);
    this.showOverlay = true;
  }

  onSearchFocus() {
    this.showOverlay = true;
  }

  toggleNotifications(event: MouseEvent) {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showOverlay = false;
  }

  markAllAsRead(event: Event) {
    event.stopPropagation();
    this.notifications.forEach(n => n.unread = false);
  }

  handleNotificationClick(n: any) {
    n.unread = false;
    this.showNotifications = false;
    this.router.navigate([n.link]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-bar') && !target.closest('.search-results-overlay')) {
      this.showOverlay = false;
    }
    if (!target.closest('.header-icon-btn') && !target.closest('.notification-dropdown')) {
      this.showNotifications = false;
    }
  }

  performSearch(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) {
      this.filteredProducts = [];
      this.filteredOrders = [];
      this.filteredCustomers = [];
      this.hasResults = false;
      return;
    }

    // 1. Search Products
    this.productService.getProducts().subscribe(products => {
      this.filteredProducts = products.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.sku && p.sku.toLowerCase().includes(q)) || 
        (p.category && p.category.toLowerCase().includes(q))
      ).slice(0, 3);
      this.updateHasResults();
    });

    // 2. Search Orders
    this.http.get<any[]>('http://localhost:3000/api/orders').subscribe(ordersList => {
      this.filteredOrders = ordersList.filter(o => 
        (o.orderId && o.orderId.toLowerCase().includes(q)) || 
        (o.status && o.status.toLowerCase().includes(q)) ||
        (o.shippingAddress && (o.shippingAddress.firstName + ' ' + o.shippingAddress.lastName).toLowerCase().includes(q))
      ).slice(0, 3);
      this.updateHasResults();
    });

    // 3. Search Customers
    this.http.get<any[]>('http://localhost:3000/api/users').subscribe(customersList => {
      this.filteredCustomers = customersList.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.email && c.email.toLowerCase().includes(q)) || 
        (c.phone && c.phone.includes(q))
      ).slice(0, 3);
      this.updateHasResults();
    });
  }

  updateHasResults() {
    this.hasResults = this.filteredProducts.length > 0 || this.filteredOrders.length > 0 || this.filteredCustomers.length > 0;
  }

  goToProduct(p: any) {
    this.showOverlay = false;
    this.searchService.setQuery('');
    this.router.navigate(['/products/edit', p.id]);
  }

  goToOrder(o: any) {
    this.showOverlay = false;
    this.searchService.setQuery('');
    this.router.navigate(['/orders']);
  }

  goToCustomer(c: any) {
    this.showOverlay = false;
    this.searchService.setQuery('');
    this.router.navigate(['/users']);
  }

  ngOnDestroy() {
    this.socketSubscription?.unsubscribe();
  }

  requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission status:', permission);
        });
      }
    }
  }

  showDesktopNotification(title: string, body: string, link: string) {
    if (!this.desktopNotificationsEnabled) return; // User turned off alerts
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        this.createNotification(title, body, link);
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.createNotification(title, body, link);
          }
        });
      } else {
        console.warn('Desktop notifications are blocked by the browser.');
      }
    }
  }

  private createNotification(title: string, body: string, link: string) {
    try {
      const n = new Notification(title, {
        body: body,
        icon: 'favicon.ico'
      });
      n.onclick = () => {
        window.focus();
        this.router.navigate([link]);
        n.close();
      };
    } catch (err) {
      console.error('Notification error:', err);
    }
  }


  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds} sec ago`;
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${diffDays} day ago`;
  }

  toggleDesktopNotifications(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!('Notification' in window)) {
      this.snackBar.open('⚠️ Your browser does not support notifications.', 'Dismiss', { duration: 4000 });
      return;
    }

    if (this.desktopNotificationsEnabled) {
      // Turn OFF
      this.desktopNotificationsEnabled = false;
      localStorage.setItem('desktopNotifEnabled', 'false');
      return;
    }

    // Turn ON
    const perm = Notification.permission;

    if (perm === 'granted') {
      this.desktopNotificationsEnabled = true;
      localStorage.setItem('desktopNotifEnabled', 'true');
      return;
    }

    if (perm === 'denied') {
      this.snackBar.open('⚠️ Notifications are BLOCKED. Enable them in your browser settings and reload.', 'Dismiss', { duration: 6000 });
      return;
    }

    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        this.desktopNotificationsEnabled = true;
        localStorage.setItem('desktopNotifEnabled', 'true');
      } else {
        this.snackBar.open('❌ Permission denied. Browser settings se Allow karo.', 'Dismiss', { duration: 4000 });
      }
    });
  }
}

