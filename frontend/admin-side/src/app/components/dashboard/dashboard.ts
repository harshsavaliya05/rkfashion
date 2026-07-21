import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService, ProductItem } from '../../services/product.service';
import { HttpClient } from '@angular/common/http';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

interface DashboardStat {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend: string;
  isPositive: boolean;
  subText: string;
}

interface ChartDataPoint {
  label: string;
  value: number;
  x: number;
  y: number;
}

interface DashboardProductItem extends ProductItem {
  stock: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStat[] = [];
  salesData: ChartDataPoint[] = [];
  svgPath: string = '';
  svgAreaPath: string = '';
  weeklySales: any[] = [];

  // Collapsible list variables
  selectedDetailType: 'active' | 'lowStock' | null = null;
  activeProductsList: DashboardProductItem[] = [];
  lowStockProductsList: DashboardProductItem[] = [];

  constructor(private productService: ProductService, private http: HttpClient, private cdr: ChangeDetectorRef, private socketService: SocketService) {}

  private socketSub?: Subscription;

  ngOnInit() {
    this.loadDashboardData();
    // Refresh dashboard stats in real-time when a new order arrives
    this.socketSub = this.socketService.newOrder$.subscribe(() => {
      this.loadDashboardData();
    });
  }

  ngOnDestroy() {
    this.socketSub?.unsubscribe();
  }
  loadDashboardDataSilently() {
    this.http.get<any[]>('http://localhost:3000/api/orders').subscribe({
      next: (ordersList) => {
        const list = Array.isArray(ordersList) ? ordersList : [];
        this.productService.getProducts().subscribe({
          next: (allProducts) => {
            const products = Array.isArray(allProducts) ? allProducts : [];
            const totalRevenue = list.reduce((acc: number, curr: any) => acc + (Number(curr?.total) || 0), 0) || 0;
            const ordersCount = list.length;
            const publishedProducts = products.filter(p => p?.status === 'published');
            const activeCount = publishedProducts.length;

            const currentRevenueText = this.stats[0]?.value || '';
            const newRevenueText = `₹${totalRevenue.toLocaleString()}`;
            const currentOrdersCount = this.stats[1]?.value || 0;
            const currentActiveProductsCount = this.stats[2]?.value || 0;

            const hasChanges = currentRevenueText !== newRevenueText ||
              currentOrdersCount !== ordersCount ||
              currentActiveProductsCount !== activeCount;

            if (hasChanges) {
              this.loadDashboardData();
            }
            this.cdr.detectChanges();
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  loadDashboardData() {
    this.http.get<any[]>('http://localhost:3000/api/orders').subscribe({
      next: (ordersList) => {
        const list = Array.isArray(ordersList) ? ordersList : [];
        this.productService.getProducts().subscribe({
          next: (allProducts) => {
            const products = Array.isArray(allProducts) ? allProducts : [];
            const totalRevenue = list.reduce((acc: number, curr: any) => acc + (Number(curr?.total) || 0), 0) || 0;
            const ordersCount = list.length;

            const publishedProducts = products.filter(p => p?.status === 'published');

            this.activeProductsList = publishedProducts.map(p => {
              let stock = 0;
              if (p?.variants && Array.isArray(p.variants) && p.variants.length > 0) {
                stock = p.variants.reduce((acc, curr) => acc + (Number(curr?.stock) || 0), 0);
              } else {
                const mockStocks: { [key: number]: number } = { 1: 45, 2: 12, 3: 150, 4: 90 };
                stock = mockStocks[p?.id] || 0;
              }
              return { ...p, stock };
            });

            this.lowStockProductsList = this.activeProductsList.filter(p => p.stock <= 15);

            this.stats = [
              { title: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: 'money', color: '#10b981', trend: '+12.5%', isPositive: true, subText: 'Compared to last month' },
              { title: 'Total Orders', value: ordersCount, icon: 'shopping-bag', color: '#1a73e8', trend: '+8.2%', isPositive: true, subText: 'Compared to last week' },
              { title: 'Active Products', value: this.activeProductsList.length, icon: 'tag', color: '#a855f7', trend: 'Live', isPositive: true, subText: 'Total active SKUs' },
              { title: 'Low Stock Alerts', value: this.lowStockProductsList.length, icon: 'exclamation-circle', color: '#ea580c', trend: this.lowStockProductsList.length > 0 ? 'Attention' : 'Secure', isPositive: this.lowStockProductsList.length === 0, subText: 'Items need reorder' }
            ];
            console.log("DASHBOARD STATS SET:", this.stats.length);

            this.generateSalesChart(list);
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.log("PRODUCTS ERROR:", err);
            this.setFallbackStats();
            this.generateSalesChart(list);
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.log("ORDERS ERROR:", err);
        this.setFallbackStats();
        this.generateSalesChart([]);
        this.cdr.detectChanges();
      }
    });
  }

  setFallbackStats() {
    this.stats = [
      { title: 'Total Revenue', value: '₹0', icon: 'money', color: '#10b981', trend: '0%', isPositive: true, subText: 'Server disconnected' },
      { title: 'Total Orders', value: 0, icon: 'shopping-bag', color: '#1a73e8', trend: '0%', isPositive: true, subText: 'Server disconnected' },
      { title: 'Active Products', value: 0, icon: 'tag', color: '#a855f7', trend: 'Live', isPositive: true, subText: 'Server disconnected' },
      { title: 'Low Stock Alerts', value: 0, icon: 'exclamation-circle', color: '#ea580c', trend: 'Secure', isPositive: true, subText: 'Server disconnected' }
    ];
  }

  toggleDetailPanel(type: 'active' | 'lowStock' | null) {
    this.selectedDetailType = this.selectedDetailType === type ? null : type;
  }

  generateSalesChart(ordersList: any[]) {
    // 1. Group by day of week for weeklySales chart (Mon-Sun)
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekSalesMap: { [key: string]: number } = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    
    ordersList.forEach(o => {
      if (!o || !o.date) return;
      const dateStr = (typeof o.date === 'string' ? o.date : String(o.date)).replace(' at ', ' ');
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const dayIndex = (date.getDay() + 6) % 7; // Convert Sun=0 to index 6, Mon=0 to index 0
        const dayName = weekDays[dayIndex];
        weekSalesMap[dayName] += Number(o.total) || 0;
      }
    });

    const maxWeekSales = Math.max(...Object.values(weekSalesMap), 1000);
    this.weeklySales = weekDays.map((day, index) => {
      const sales = weekSalesMap[day];
      const height = Math.round((sales / maxWeekSales) * 110) + 15; // Scale height dynamically
      const colors = ['#3b82f6', '#3b82f6', '#3b82f6', '#10b981', '#10b981', '#f59e0b', '#f59e0b'];
      return {
        day,
        sales,
        height,
        x: 25 + index * 40,
        color: colors[index]
      };
    });

    // 2. Group by month for the line chart (Jan-Jul)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthSalesMap: { [key: string]: number } = {};
    months.forEach(m => monthSalesMap[m] = 0);

    ordersList.forEach(o => {
      if (!o || !o.date) return;
      const dateStr = (typeof o.date === 'string' ? o.date : String(o.date)).replace(' at ', ' ');
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const monthName = months[date.getMonth()];
        monthSalesMap[monthName] += Number(o.total) || 0;
      }
    });

    const displayMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const rawValues = displayMonths.map(m => monthSalesMap[m]);

    const width = 600;
    const height = 180;
    const padding = 30;
    
    const maxVal = Math.max(...rawValues, 1000) * 1.1;
    const minVal = 0;
    
    this.salesData = rawValues.map((val, index) => {
      const x = padding + (index * (width - 2 * padding)) / (rawValues.length - 1);
      const y = height - padding - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);
      return { label: displayMonths[index], value: val, x, y };
    });

    if (this.salesData.length > 0) {
      let path = `M ${this.salesData[0].x} ${this.salesData[0].y}`;
      for (let i = 1; i < this.salesData.length; i++) {
        path += ` L ${this.salesData[i].x} ${this.salesData[i].y}`;
      }
      this.svgPath = path;
      this.svgAreaPath = `${path} L ${this.salesData[this.salesData.length - 1].x} ${height - padding} L ${this.salesData[0].x} ${height - padding} Z`;
    }
  }
}
