import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { HttpClient } from '@angular/common/http';

interface AdminProfile {
  name: string;
  username: string;
  email: string;
  phone: string;
  joined: string;
  lastLogin: string;
  role?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  showToast = false;
  toastMessage = '';
  toastIcon = 'fa-check-circle';
  toastColor = '#10b981';

  profile: AdminProfile = {
    name: 'Harsh Savaliya',
    username: 'harshsavaliya125',
    email: 'harshsavaliya125@gmail.com',
    phone: '+91 9824429153',
    joined: '11 July 2026',
    lastLogin: 'Just now',
    role: 'ADMINISTRATOR'
  };

  // New admin registration form state
  newAdminForm = {
    name: '',
    role: 'Employee',
    email: '',
    password: ''
  };

  showAdminPassword = false;

  // Directory of all active admins/staff
  adminsList: any[] = [];

  constructor(
    private settingsService: SettingsService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProfile();
    this.loadAdmins();
  }

  get isSuperAdmin(): boolean {
    return this.profile.email === 'harshsavaliya125@gmail.com' || this.profile.role === 'ADMINISTRATOR';
  }

  loadProfile() {
    // Load currently logged-in user from local storage
    if (typeof localStorage !== 'undefined') {
      const userStr = localStorage.getItem('adminUser');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          this.profile.name = user.name || this.profile.name;
          this.profile.email = user.email || this.profile.email;
          this.profile.username = user.email ? user.email.split('@')[0] : this.profile.username;
          if (user.joined) this.profile.joined = user.joined;
          if (user.role) this.profile.role = user.role;
        } catch (e) {
          console.error('Error parsing adminUser from localStorage', e);
        }
      }
    }

    this.settingsService.getSettings('admin_profile').subscribe({
      next: (stored) => {
        if (stored) {
          // Merge settings like phone, but prioritize local user info for identity
          this.profile.phone = stored.phone || this.profile.phone;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        // Seed default on first run
        this.settingsService.saveSettings('admin_profile', this.profile).subscribe({
          next: () => this.cdr.detectChanges()
        });
      }
    });
  }

  loadAdmins() {
    this.http.get<any[]>('http://localhost:3000/api/admins').subscribe({
      next: (admins) => {
        this.adminsList = admins || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load admins list:', err);
      }
    });
  }

  triggerToast(message: string, isSuccess = true) {
    this.toastMessage = message;
    this.toastIcon = isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle';
    this.toastColor = isSuccess ? '#10b981' : '#e53637';
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  createAdmin() {
    if (!this.isSuperAdmin) {
      this.triggerToast('Only Super Admin can create new administrators.', false);
      return;
    }

    const { name, email, password } = this.newAdminForm;
    if (!name.trim() || !email.trim() || !password.trim()) {
      this.triggerToast('Please fill out all fields.', false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.triggerToast('Please enter a valid email.', false);
      return;
    }

    if (password.length < 6) {
      this.triggerToast('Password must be at least 6 chars.', false);
      return;
    }

    const payload = {
      name,
      email,
      password,
      role: this.newAdminForm.role
    };

    this.http.post('http://localhost:3000/api/auth/admin-register', payload).subscribe({
      next: () => {
        this.triggerToast(`${this.newAdminForm.role} created: ${email}`);
        this.newAdminForm = {
          name: '',
          role: 'Employee',
          email: '',
          password: ''
        };
        this.loadAdmins(); // Refresh directory table
      },
      error: (err) => {
        console.error('Failed to create admin:', err);
        const errorText = err.error?.error || 'Failed to register admin. Email might be in use.';
        this.triggerToast(errorText, false);
      }
    });
  }

  showDeleteConfirm = false;
  adminToDelete: { id: number, email: string } | null = null;

  deleteAdmin(adminId: number, adminEmail: string) {
    if (!this.isSuperAdmin) {
      this.triggerToast('Only Super Admin can delete administrators.', false);
      return;
    }

    if (adminEmail === 'harshsavaliya125@gmail.com') {
      this.triggerToast('Cannot delete system master administrator.', false);
      return;
    }

    this.adminToDelete = { id: adminId, email: adminEmail };
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.adminToDelete = null;
  }

  confirmDelete() {
    if (!this.adminToDelete) return;
    
    this.http.delete(`http://localhost:3000/api/admins/${this.adminToDelete.id}`).subscribe({
      next: () => {
        this.triggerToast('Account deleted successfully!');
        this.loadAdmins(); // Reload directory
        this.cancelDelete();
      },
      error: (err) => {
        console.error('Failed to delete account:', err);
        this.triggerToast('Failed to delete account.', false);
        this.cancelDelete();
      }
    });
  }
}
