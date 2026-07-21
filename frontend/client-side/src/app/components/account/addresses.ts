import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, UserAddress } from '../../services/auth.service';

@Component({
  selector: 'app-my-addresses',
  standalone: true,
  imports: [FormsModule, CommonModule, MatSnackBarModule],
  templateUrl: './addresses.html',
  styleUrl: './addresses.scss'
})
export class MyAddresses implements OnInit {
  addresses: UserAddress[] = [];

  // Form states
  showForm = false;
  isEditing = false;
  editIndex = -1;

  // Form Fields
  firstName = '';
  lastName = '';
  flatNo = '';
  areaName = '';
  landmark = '';
  city = '';
  state = '';
  postcode = '';
  phone = '';
  addressType: 'home' | 'office' = 'home';
  isDefault = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadAddresses();
  }

  loadAddresses() {
    const user = this.authService.getLoggedInUser();
    this.addresses = user?.addresses || [];
    this.cdr.detectChanges();
  }

  openAddForm() {
    this.isEditing = false;
    this.editIndex = -1;
    this.resetForm();
    this.showForm = true;
  }

  openEditForm(addr: UserAddress, idx: number) {
    this.isEditing = true;
    this.editIndex = idx;
    this.firstName = addr.firstName;
    this.lastName = addr.lastName;
    this.flatNo = addr.flatNo;
    this.areaName = addr.areaName;
    this.landmark = addr.landmark || '';
    this.city = addr.city;
    this.state = addr.state;
    this.postcode = addr.postcode;
    this.phone = addr.phone;
    this.addressType = addr.addressType;
    this.isDefault = !!addr.isDefault;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.resetForm();
  }

  resetForm() {
    this.firstName = '';
    this.lastName = '';
    this.flatNo = '';
    this.areaName = '';
    this.landmark = '';
    this.city = '';
    this.state = '';
    this.postcode = '';
    this.phone = '';
    this.addressType = 'home';
    this.isDefault = false;
  }

  validatePostcode(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 6) {
      value = value.substring(0, 6);
    }
    this.postcode = value;
    input.value = value;

    if (value.length === 6) {
      this.autoFillLocation(value);
    }
  }

  validatePhone(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    this.phone = value;
    input.value = value;
  }

  autoFillLocation(pin: string) {
    const database: { [key: string]: { city: string, state: string } } = {
      '395007': { city: 'Surat', state: 'Gujarat' },
      '395003': { city: 'Surat', state: 'Gujarat' },
      '395001': { city: 'Surat', state: 'Gujarat' },
      '395009': { city: 'Surat', state: 'Gujarat' },
      '400001': { city: 'Mumbai', state: 'Maharashtra' },
      '400011': { city: 'Mumbai', state: 'Maharashtra' },
      '110001': { city: 'New Delhi', state: 'Delhi' },
      '560001': { city: 'Bengaluru', state: 'Karnataka' },
      '600001': { city: 'Chennai', state: 'Tamil Nadu' },
      '700001': { city: 'Kolkata', state: 'West Bengal' },
    };

    const match = database[pin];
    if (match) {
      this.city = match.city;
      this.state = match.state;
      this.snackBar.open(`Location auto-detected: ${match.city}, ${match.state}`, 'Dismiss', {
        duration: 2000
      });
    }
  }

  handleAddressSubmit(event: Event) {
    event.preventDefault();

    this.firstName = (this.firstName || '').trim();
    this.lastName = (this.lastName || '').trim();
    this.flatNo = (this.flatNo || '').trim();
    this.areaName = (this.areaName || '').trim();
    this.landmark = (this.landmark || '').trim();
    this.city = (this.city || '').trim();
    this.state = (this.state || '').trim();
    this.postcode = (this.postcode || '').trim();
    this.phone = (this.phone || '').trim();

    if (!this.firstName || !this.lastName || !this.flatNo || !this.areaName || !this.city || !this.state || !this.postcode || !this.phone) {
      this.snackBar.open('⚠️ Please fill in all required fields.', 'Dismiss', { duration: 3000 });
      return;
    }

    if (!/^[0-9]{6}$/.test(this.postcode)) {
      this.snackBar.open('❌ Please enter a valid 6-digit PIN code.', 'Dismiss', { duration: 3000 });
      return;
    }

    if (!/^[0-9]{10}$/.test(this.phone)) {
      this.snackBar.open('❌ Please enter a valid 10-digit phone number.', 'Dismiss', { duration: 3000 });
      return;
    }

    const newAddress: UserAddress = {
      firstName: this.firstName,
      lastName: this.lastName,
      flatNo: this.flatNo,
      areaName: this.areaName,
      landmark: this.landmark,
      city: this.city,
      state: this.state,
      postcode: this.postcode,
      phone: this.phone,
      addressType: this.addressType,
      isDefault: this.isDefault
    };

    this.authService.saveAddress(newAddress, this.editIndex).subscribe({
      next: () => {
        this.snackBar.open(this.isEditing ? '✅ Address updated successfully!' : '✅ Address added successfully!', 'Dismiss', { duration: 3000 });
        this.showForm = false;
        this.loadAddresses();
      },
      error: () => {
        this.snackBar.open('❌ Failed to save address.', 'Retry', { duration: 3000 });
      }
    });
  }

  deleteAddress(index: number, event: Event) {
    event.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to delete this address?');
    if (confirmed) {
      this.authService.deleteAddress(index).subscribe(() => {
        this.snackBar.open('🗑️ Address deleted successfully.', 'Dismiss', { duration: 3000 });
        this.loadAddresses();
      });
    }
  }

  makeDefault(index: number) {
    const address = this.addresses[index];
    if (address.isDefault) return;

    address.isDefault = true;
    this.authService.saveAddress(address, index).subscribe(() => {
      this.snackBar.open('⭐ Default address updated.', 'Dismiss', { duration: 2000 });
      this.loadAddresses();
    });
  }
}
