import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { LogoutDialogComponent } from '../logout-dialog/logout-dialog';
import { CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, MatSnackBarModule, MatDialogModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  isCanvasActive = false;
  showMobilePages = false;

  // Auth states
  isLoggedIn = false;
  loggedInEmail = '';
  userName = '';

  // Mobile layout state variables
  mobileSearchQuery = '';
  activeCategory = 'All';
  categories: { key: string; label: string }[] = [{ key: 'All', label: 'All' }];

  private authStateSub!: Subscription;

  constructor(
    private cartService: CartService,
    private wishlistService: WishlistService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private categoryService: CategoryService
  ) { }

  ngOnInit() {
    // Sync auth status on initialization
    this.syncAuthStatus();

    // Listen for auth changes globally
    this.authStateSub = this.authService.authStatusChanged$.subscribe(() => {
      this.syncAuthStatus();
    });

    // Load categories dynamically
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = [
          { key: 'All', label: 'All' },
          ...cats.map(c => ({
            key: c.name,
            label: c.title || c.name
          }))
        ];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load categories in Header:', err);
        this.categories = [
          { key: 'All', label: 'All' },
          { key: 'T-shirt', label: 'T-Shirts' },
          { key: 'Shirt', label: 'Shirts' },
          { key: 'Hoodie', label: 'Hoodies' },
          { key: 'Jeans', label: 'Jeans' },
          { key: 'Pant', label: 'Cargo Pants' },
          { key: 'Cotton Pant', label: 'Trousers' }
        ];
        this.cdr.detectChanges();
      }
    });

    // Listen for active category and search params to keep mobile top bar in sync
    this.route.queryParams.subscribe(params => {
      this.activeCategory = params['category'] || 'All';
      this.mobileSearchQuery = params['search'] || '';
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.authStateSub) this.authStateSub.unsubscribe();
  }

  syncAuthStatus() {
    this.isLoggedIn = this.authService.isLoggedIn();
    const user = this.authService.getLoggedInUser();
    this.loggedInEmail = user ? user.email : '';
    this.userName = user ? user.name : '';
    this.cdr.detectChanges();
  }

  get cartCount(): number {
    return this.cartService.getCartCount();
  }

  get cartTotal(): number {
    return this.cartService.getCartTotal();
  }

  get wishlistCount(): number {
    return this.wishlistService.getWishlistCount();
  }

  toggleMobilePages(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showMobilePages = !this.showMobilePages;
    this.cdr.detectChanges();
  }

  logoutUser() {
    this.authService.logout();
    this.snackBar.open('Signed out successfully!', 'Dismiss', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
    this.cdr.detectChanges();
  }

  openLogoutDialog(): void {
    const dialogRef = this.dialog.open(LogoutDialogComponent, {
      width: '360px',
      panelClass: 'logout-confirm-dialog',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.logoutUser();
      }
    });
  }

  handleAccountClick() {
    if (this.isLoggedIn) {
      this.openLogoutDialog();
    } else {
      this.authService.triggerLoginModal('login');
      this.isCanvasActive = false;
    }
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good Morning👋';
    } else if (hour < 16) {
      return 'Good Afternoon👋';
    } else {
      return 'Good Evening👋';
    }
  }

  getUserInitial(): string {
    if (this.userName && this.userName.trim()) {
      return this.userName.trim().charAt(0).toUpperCase();
    }
    return 'G';
  }

  selectCategory(categoryName: string) {
    this.activeCategory = categoryName;
    this.router.navigate(['/shop'], { queryParams: { category: categoryName } });
  }

  onMobileSearch(query: string) {
    this.router.navigate(['/shop'], { queryParams: { search: query.trim() } });
  }
}

