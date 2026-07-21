import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../services/search.service';
import { HttpClient } from '@angular/common/http';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

interface CustomerAddress {
  flatNo: string;
  areaName: string;
  landmark: string;
  city: string;
  state: string;
  postcode: string;
  phone: string;
  addressType: 'home' | 'office';
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  joined: string;
  role: 'Customer' | 'Admin';
  status: 'active' | 'blocked';
  totalOrders: number;
  totalSpend: number;
  addresses: CustomerAddress[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersComponent implements OnInit, OnDestroy {
  searchTerm = '';
  filterStatus = '';
  
  selectedCustomer: Customer | null = null;
  showDeleteConfirmId: number | null = null;
  showDeleteConfirmName = '';

  // Custom Status Toggle Confirm State
  statusConfirmCustomer: Customer | null = null;
  statusConfirmActionText = '';
  statusConfirmNewStatus: 'active' | 'blocked' = 'active';

  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];

  constructor(
    private cdr: ChangeDetectorRef, 
    private searchService: SearchService,
    private http: HttpClient
  ) {}



  ngOnInit() {
    this.loadUsers();
    this.searchService.searchQuery$.subscribe(query => {
      this.searchTerm = query;
      this.applyFilters();
    });
  }

  ngOnDestroy() {}


  loadUsers() {
    this.http.get<Customer[]>('http://localhost:3000/api/users').subscribe(users => {
      // Only keep Customer accounts, excluding all staff/admin roles entirely!
      this.customers = (users || []).filter(u => (u.role || '').toLowerCase() === 'customer');
      this.applyFilters();
    });
  }

  onLocalSearch() {
    this.searchService.setQuery(this.searchTerm);
    this.applyFilters();
  }

  applyFilters() {
    this.filteredCustomers = this.customers.filter(c => {
      const matchSearch = !this.searchTerm.trim() || 
        c.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.phone.includes(this.searchTerm);
      const matchStatus = !this.filterStatus || c.status === this.filterStatus;
      
      return matchSearch && matchStatus;
    });
    this.cdr.detectChanges();
  }

  viewDetails(customer: Customer) {
    this.selectedCustomer = customer;
  }

  closeDetails() {
    this.selectedCustomer = null;
  }

  toggleStatus(customer: Customer, event: Event) {
    event.stopPropagation();
    
    this.statusConfirmCustomer = customer;
    this.statusConfirmNewStatus = customer.status === 'active' ? 'blocked' : 'active';
    this.statusConfirmActionText = this.statusConfirmNewStatus === 'blocked' ? 'block / restrict' : 'activate';
  }

  cancelStatusToggle() {
    this.statusConfirmCustomer = null;
    this.statusConfirmActionText = '';
    this.cdr.detectChanges();
  }

  confirmStatusToggle() {
    if (this.statusConfirmCustomer) {
      this.http.put(`http://localhost:3000/api/users/${this.statusConfirmCustomer.id}`, {
        status: this.statusConfirmNewStatus
      }).subscribe(() => {
        if (this.statusConfirmCustomer) {
          this.statusConfirmCustomer.status = this.statusConfirmNewStatus;
        }
        this.cancelStatusToggle();
        this.applyFilters();
      });
    }
  }

  deleteCustomer(customer: Customer, event: Event) {
    event.stopPropagation();
    this.showDeleteConfirmId = customer.id;
    this.showDeleteConfirmName = customer.name;
  }

  cancelDelete() {
    this.showDeleteConfirmId = null;
    this.showDeleteConfirmName = '';
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (this.showDeleteConfirmId !== null) {
      this.http.delete(`http://localhost:3000/api/users/${this.showDeleteConfirmId}`).subscribe(() => {
        this.customers = this.customers.filter(c => c.id !== this.showDeleteConfirmId);
        if (this.selectedCustomer?.id === this.showDeleteConfirmId) {
          this.selectedCustomer = null;
        }
        this.cancelDelete();
        this.applyFilters();
      });
    }
  }
}
