import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

interface GeneralSettings {
  storeName: string;
  supportPhone: string;
  supportEmail: string;
  currency: string;
  address: string;
}

interface PaymentSettings {
  codActive: boolean;
  razorpayActive: boolean;
  razorpayKeyId: string;
  razorpaySecretKey?: string;
  razorpayMode: 'test' | 'live';
  cashfreeActive?: boolean;
  cashfreeAppId?: string;
  cashfreeSecretKey?: string;
  cashfreeMode?: 'test' | 'live';
}

interface ShippingSettings {
  flatRate: number;
  freeThreshold: number;
  estMetro: string;
  estNonMetro: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class SettingsComponent implements OnInit {
  activeTab: 'general' | 'payments' | 'shipping' = 'payments';

  // General Settings variables
  generalSettings: GeneralSettings = {
    storeName: 'RK Fashion',
    supportPhone: '+91 9824429153',
    supportEmail: 'support@rkfashion.com',
    currency: 'INR',
    address: 'B-304, Regent Square, Vesu Main Road, Surat, Gujarat - 395007'
  };

  // Payment Settings variables
  paymentSettings: PaymentSettings = {
    codActive: true,
    razorpayActive: false,
    razorpayKeyId: '',
    razorpaySecretKey: '',
    razorpayMode: 'test',
    cashfreeActive: false,
    cashfreeAppId: '',
    cashfreeSecretKey: '',
    cashfreeMode: 'test'
  };

  // Shipping Settings variables
  shippingSettings: ShippingSettings = {
    flatRate: 99,
    freeThreshold: 1999,
    estMetro: '2 to 4 Working Days',
    estNonMetro: '5 to 7 Working Days'
  };

  constructor(
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  setTab(tab: 'general' | 'payments' | 'shipping') {
    this.activeTab = tab;
  }

  loadSettings() {
    this.settingsService.getSettings('general').subscribe({
      next: (val) => {
        if (val) {
          this.generalSettings = { ...this.generalSettings, ...val };
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.settingsService.saveSettings('general', this.generalSettings).subscribe();
      }
    });

    this.settingsService.getSettings('payments').subscribe({
      next: (val) => {
        if (val) {
          this.paymentSettings = { ...this.paymentSettings, ...val };
          // Coerce booleans to ensure UI checkbox switches bind correctly
          this.paymentSettings.codActive = !!this.paymentSettings.codActive;
          this.paymentSettings.razorpayActive = !!this.paymentSettings.razorpayActive;
          this.paymentSettings.cashfreeActive = !!this.paymentSettings.cashfreeActive;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.settingsService.saveSettings('payments', this.paymentSettings).subscribe();
      }
    });

    this.settingsService.getSettings('shipping').subscribe({
      next: (val) => {
        if (val) {
          this.shippingSettings = { ...this.shippingSettings, ...val };
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.settingsService.saveSettings('shipping', this.shippingSettings).subscribe();
      }
    });
  }

  saveSettings() {
    const { upiActive, upiId, ...cleanPaymentSettings } = this.paymentSettings as any;

    this.settingsService.saveSettings('general', this.generalSettings).subscribe(() => {
      this.settingsService.saveSettings('payments', cleanPaymentSettings).subscribe(() => {
        this.settingsService.saveSettings('shipping', this.shippingSettings).subscribe(() => {
          this.snackBar.open('Settings updated successfully!', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        });
      });
    });
  }
}
