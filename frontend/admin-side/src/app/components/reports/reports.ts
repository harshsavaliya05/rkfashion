import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ReportMetrics {
  totalSales: number;
  totalOrders: number;
  aov: number;
  totalCustomers: number;
}

interface MonthlySalesData {
  name: string;
  sales: number;
  orders: number;
}

interface PaymentModeData {
  name: string;
  percentage: number;
  orders: number;
  color: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class ReportsComponent implements OnInit {
  selectedTimeframe = 'year';
  metrics: ReportMetrics = {
    totalSales: 0,
    totalOrders: 0,
    aov: 0,
    totalCustomers: 0
  };

  monthlySales: MonthlySalesData[] = [];
  maxMonthlySales = 100000;
  paymentMethods: PaymentModeData[] = [];
  
  private allOrders: any[] = [];

  // Default mock dataset fallbacks
  yearlySales: MonthlySalesData[] = [
    { name: 'Jan 2026', sales: 42000, orders: 18 },
    { name: 'Feb 2026', sales: 38000, orders: 15 },
    { name: 'Mar 2026', sales: 51000, orders: 22 },
    { name: 'Apr 2026', sales: 62000, orders: 28 },
    { name: 'May 2026', sales: 78000, orders: 34 },
    { name: 'Jun 2026', sales: 84000, orders: 38 },
    { name: 'Jul 2026', sales: 95000, orders: 42 }
  ];

  monthlySalesFallback: MonthlySalesData[] = [
    { name: 'Week 1', sales: 24000, orders: 10 },
    { name: 'Week 2', sales: 21000, orders: 9 },
    { name: 'Week 3', sales: 26000, orders: 11 },
    { name: 'Week 4', sales: 24000, orders: 12 }
  ];

  allTimeSales: MonthlySalesData[] = [
    { name: 'Year 2024', sales: 480000, orders: 210 },
    { name: 'Year 2025', sales: 650000, orders: 290 },
    { name: 'Year 2026', sales: 450000, orders: 197 }
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // 1. Load users to count customers
    this.http.get<any[]>('http://localhost:3000/api/users').subscribe({
      next: (users) => {
        const list = Array.isArray(users) ? users : [];
        this.metrics.totalCustomers = list.filter(u => u?.role?.toLowerCase() !== 'admin').length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.metrics.totalCustomers = 5;
        this.cdr.detectChanges();
      }
    });

    // 2. Load orders to process metrics dynamically
    this.http.get<any[]>('http://localhost:3000/api/orders').subscribe({
      next: (orders) => {
        this.allOrders = Array.isArray(orders) ? orders : [];
        this.processOrders(this.allOrders);
        this.cdr.detectChanges();
      },
      error: () => {
        this.calculateMetrics(); // Fallback to static mock datasets
        this.cdr.detectChanges();
      }
    });
  }

  processOrders(orders: any[]) {
    if (!orders || orders.length === 0) {
      this.calculateMetrics();
      return;
    }

    const totalSales = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalOrders = orders.length;
    this.metrics.totalSales = totalSales;
    this.metrics.totalOrders = totalOrders;
    this.metrics.aov = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    const salesGroup: { [key: string]: { sales: number; orders: number } } = {};

    if (this.selectedTimeframe === 'month') {
      orders.forEach(o => {
        const day = this.parseDay(o.date);
        let key = 'Week 4';
        if (day <= 7) key = 'Week 1';
        else if (day <= 14) key = 'Week 2';
        else if (day <= 21) key = 'Week 3';
        
        if (!salesGroup[key]) salesGroup[key] = { sales: 0, orders: 0 };
        salesGroup[key].sales += o.total || 0;
        salesGroup[key].orders += 1;
      });

      this.monthlySales = ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(name => ({
        name,
        sales: salesGroup[name]?.sales || 0,
        orders: salesGroup[name]?.orders || 0
      }));
    } else if (this.selectedTimeframe === 'all') {
      orders.forEach(o => {
        const year = this.parseYear(o.date);
        const key = `Year ${year}`;
        if (!salesGroup[key]) salesGroup[key] = { sales: 0, orders: 0 };
        salesGroup[key].sales += o.total || 0;
        salesGroup[key].orders += 1;
      });
      const years = Object.keys(salesGroup).sort();
      this.monthlySales = years.map(name => ({
        name,
        sales: salesGroup[name].sales,
        orders: salesGroup[name].orders
      }));
    } else {
      orders.forEach(o => {
        const key = this.parseMonthYear(o.date);
        if (!salesGroup[key]) salesGroup[key] = { sales: 0, orders: 0 };
        salesGroup[key].sales += o.total || 0;
        salesGroup[key].orders += 1;
      });
      
      const months = Object.keys(salesGroup);
      this.monthlySales = months.map(name => ({
        name,
        sales: salesGroup[name].sales,
        orders: salesGroup[name].orders
      }));
    }

    const salesValues = this.monthlySales.map(m => m.sales);
    this.maxMonthlySales = Math.max(...salesValues, 10000);

    const methodCounts: { [key: string]: number } = {};
    orders.forEach(o => {
      const method = o.paymentMethod || 'Cash on Delivery (COD)';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });

    const colors = ['#10b981', '#a855f7', '#1a73e8', '#f59e0b', '#ec4899'];
    this.paymentMethods = Object.keys(methodCounts).map((name, index) => ({
      name,
      percentage: Math.round((methodCounts[name] / totalOrders) * 100),
      orders: methodCounts[name],
      color: colors[index % colors.length]
    }));
  }

  parseDay(dateStr: string): number {
    if (!dateStr) return 1;
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      const d = parseInt(parts[0]);
      if (!isNaN(d)) return d;
    }
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 1 : date.getDate();
  }

  parseYear(dateStr: string): number {
    if (!dateStr) return new Date().getFullYear();
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      const y = parseInt(parts[2]);
      if (!isNaN(y)) return y;
    }
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  }

  parseMonthYear(dateStr: string): string {
    if (!dateStr) return 'Jul 2026';
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      return `${parts[1]} ${parts[2]}`;
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    return 'Jul 2026';
  }

  calculateMetrics() {
    if (this.selectedTimeframe === 'month') {
      this.monthlySales = [...this.monthlySalesFallback];
    } else if (this.selectedTimeframe === 'all') {
      this.monthlySales = [...this.allTimeSales];
    } else {
      this.monthlySales = [...this.yearlySales];
    }

    const salesValues = this.monthlySales.map(m => m.sales);
    this.maxMonthlySales = Math.max(...salesValues, 10000);

    const totalSalesSum = this.monthlySales.reduce((acc, curr) => acc + curr.sales, 0);
    const totalOrdersSum = this.monthlySales.reduce((acc, curr) => acc + curr.orders, 0);
    const aovCalc = totalOrdersSum > 0 ? Math.round(totalSalesSum / totalOrdersSum) : 0;

    this.metrics.totalSales = totalSalesSum;
    this.metrics.totalOrders = totalOrdersSum;
    this.metrics.aov = aovCalc;

    this.paymentMethods = [
      { name: 'UPI (GPay / PhonePe)', percentage: 48, orders: Math.round(totalOrdersSum * 0.48), color: '#10b981' },
      { name: 'Cash on Delivery (COD)', percentage: 38, orders: Math.round(totalOrdersSum * 0.38), color: '#a855f7' },
      { name: 'Cards / NetBanking', percentage: 14, orders: Math.round(totalOrdersSum * 0.14), color: '#1a73e8' }
    ];
  }

  onTimeframeChange() {
    if (this.allOrders && this.allOrders.length > 0) {
      this.processOrders(this.allOrders);
    } else {
      this.calculateMetrics();
    }
    this.cdr.detectChanges();
  }

  exportReport() {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Timeframe/Month,Total Orders,Sales Revenue (INR),Avg Spend Per Order\n';

    this.monthlySales.forEach(row => {
      const avgSpend = row.orders > 0 ? (row.sales / row.orders).toFixed(0) : '0';
      csvContent += `"${row.name}",${row.orders},${row.sales},${avgSpend}\n`;
    });

    csvContent += `\n"TOTAL SUMMARY",${this.metrics.totalOrders},${this.metrics.totalSales},${this.metrics.aov}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Report_${this.selectedTimeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
