import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ProductService, ProductItem } from '../../services/product.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

import { CategoryService } from '../../services/category.service';


export interface PriceRange {
  label: string;
  min: number;
  max: number;
}

const PRICE_RANGES: PriceRange[] = [
  { label: 'Under ₹1000',     min: 0,    max: 999 },
  { label: '₹1000 – ₹1500',   min: 1000, max: 1500 },
  { label: '₹1500 – ₹2000',   min: 1500, max: 2000 },
  { label: '₹2000 – ₹2500',   min: 2000, max: 2500 },
  { label: 'Above ₹2500',     min: 2501, max: Infinity },
];

@Component({
  selector: 'app-shop',
  imports: [RouterLink, FormsModule, NgTemplateOutlet, MatSelectModule, MatFormFieldModule, MatSnackBarModule],
  templateUrl: './shop.html',
  styleUrl: './shop.scss',
})
export class Shop implements OnInit {
  allProducts: ProductItem[] = [];

  // Filter state
  selectedCategory = 'All';
  selectedPriceRange: PriceRange | null = null;
  selectedSizes: string[] = [];
  selectedColors: string[] = [];
  sortBy = 'default';
  searchQuery = '';

  // Sidebar open state (mobile)
  sidebarOpen = false;

  categories: { key: string; label: string; icon: string; count: number }[] = [];


  readonly priceRanges = PRICE_RANGES;

  readonly topSizes   = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
  readonly bottomSizes = ['28', '30', '32', '34', '36', '38', '40', '42'];

  readonly colors = [
    { key: 'black', name: 'Black',  hex: '#111111' },
    { key: 'white', name: 'White',  hex: '#f0f0f0' },
    { key: 'blue',  name: 'Blue',   hex: '#1d3557' },
    { key: 'green', name: 'Green',  hex: '#2d6a4f' },
    { key: 'grey',  name: 'Grey',   hex: '#8d99ae' },
    { key: 'red',   name: 'Red',    hex: '#c1121f' },
    { key: 'khaki', name: 'Khaki',  hex: '#ddb892' },
  ];

  currentPage = 1;
  itemsPerPage = 12;

  constructor(
    private productService: ProductService,
    private wishlistService: WishlistService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private cartService: CartService,
    private route: ActivatedRoute,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = [
          { key: 'All', label: 'All', icon: '🛍️', count: 0 },
          ...cats.map(c => ({
            key: c.name,
            label: c.title || c.name,
            icon: c.icon || '🛍️',
            count: 0
          }))
        ];

        this.productService.getProducts().subscribe({
          next: (prods: any) => {
            this.allProducts = prods;
            console.log('[Shop Debug] Products loaded successfully:', prods.length, prods);
            
            // compute category counts
            this.categories.forEach(cat => {
              if (cat.key === 'All') {
                cat.count = this.allProducts.length;
              } else {
                cat.count = this.allProducts.filter(p => p.category && p.category.toLowerCase() === cat.key.toLowerCase()).length;
              }
            });
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('[Shop Debug] Failed to load products:', err);
            this.snackBar.open('❌ Failed to load products from server.', 'Dismiss', {
              duration: 5000,
              horizontalPosition: 'right',
              verticalPosition: 'bottom'
            });
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Failed to load categories in Shop:', err);
        // Fallback static categories
        this.categories = [
          { key: 'All',         label: 'All',          icon: '🛍️', count: 0 },
          { key: 'T-shirt',     label: 'T-Shirts',      icon: '👕', count: 0 },
          { key: 'Shirt',       label: 'Shirts',         icon: '👔', count: 0 },
          { key: 'Hoodie',      label: 'Hoodies',        icon: '🧥', count: 0 },
          { key: 'Jeans',       label: 'Jeans',          icon: '👖', count: 0 },
          { key: 'Pant',        label: 'Cargo Pants',    icon: '🏕️', count: 0 },
          { key: 'Cotton Pant', label: 'Trousers',       icon: '👔', count: 0 },
        ];

        this.productService.getProducts().subscribe({
          next: (prods: any) => {
            this.allProducts = prods;
            this.categories.forEach(cat => {
              if (cat.key === 'All') {
                cat.count = this.allProducts.length;
              } else {
                cat.count = this.allProducts.filter(p => p.category && p.category.toLowerCase() === cat.key.toLowerCase()).length;
              }
            });
            this.cdr.detectChanges();
          }
        });
      }
    });

    // Handle incoming category and search filter query parameters
    this.route.queryParams.subscribe(params => {
      const catParam = params['category'];
      if (catParam) {
        this.selectedCategory = catParam;
      } else {
        this.selectedCategory = 'All';
      }

      const searchParam = params['search'];
      if (searchParam) {
        this.searchQuery = searchParam;
      } else {
        this.searchQuery = '';
      }

      this.currentPage = 1;
      this.cdr.detectChanges();
    });
  }

  // ---- Computed filtered + sorted products ----
  get filteredProducts(): ProductItem[] {
    let result = [...this.allProducts];
    console.log('[Shop Debug] Total products loaded:', this.allProducts.length, this.allProducts);
    console.log('[Shop Debug] Current category:', this.selectedCategory);

    // 1. Search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
      console.log('[Shop Debug] After Search filter:', result.length);
    }

    // 2. Category
    if (this.selectedCategory !== 'All') {
      result = result.filter(p => p.category && p.category.toLowerCase() === this.selectedCategory.toLowerCase());
      console.log('[Shop Debug] After Category filter:', result.length);
    }

    // 3. Price
    if (this.selectedPriceRange) {
      result = result.filter(p =>
        p.price >= this.selectedPriceRange!.min &&
        p.price <= this.selectedPriceRange!.max
      );
      console.log('[Shop Debug] After Price filter:', result.length);
    }

    // 4. Size
    if (this.selectedSizes.length > 0) {
      result = result.filter(p =>
        this.selectedSizes.some(sz => p.sizes.includes(sz))
      );
      console.log('[Shop Debug] After Size filter:', result.length);
    }

    // 5. Color
    if (this.selectedColors.length > 0) {
      result = result.filter(p =>
        p.colors.some(c => this.selectedColors.includes(c.class))
      );
      console.log('[Shop Debug] After Color filter:', result.length);
    }

    // 6. Sort
    switch (this.sortBy) {
      case 'price-asc':   result.sort((a, b) => a.price - b.price); break;
      case 'price-desc':  result.sort((a, b) => b.price - a.price); break;
      case 'rating':      result.sort((a, b) => b.rating - a.rating); break;
      case 'discount':    result.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0)); break;
    }

    // Cap page index if filters reduce the list size
    const maxPage = Math.ceil(result.length / this.itemsPerPage) || 1;
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }

    return result;
  }

  get paginatedProducts(): ProductItem[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProducts.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  getPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      window.scrollTo({ top: 220, behavior: 'smooth' });
    }
  }

  get activeFilterCount(): number {
    let n = 0;
    if (this.selectedCategory !== 'All') n++;
    if (this.selectedPriceRange) n++;
    n += this.selectedSizes.length + this.selectedColors.length;
    return n;
  }

  // ---- Filter actions ----
  setCategory(key: string) { 
    this.selectedCategory = key; 
    this.currentPage = 1; 
  }

  setPriceRange(r: PriceRange) {
    this.selectedPriceRange = this.selectedPriceRange === r ? null : r;
    this.currentPage = 1;
  }

  toggleSize(s: string) {
    const i = this.selectedSizes.indexOf(s);
    i > -1 ? this.selectedSizes.splice(i, 1) : this.selectedSizes.push(s);
    this.currentPage = 1;
  }
  isSizeSelected(s: string) { return this.selectedSizes.includes(s); }

  toggleColor(k: string) {
    const i = this.selectedColors.indexOf(k);
    i > -1 ? this.selectedColors.splice(i, 1) : this.selectedColors.push(k);
    this.currentPage = 1;
  }
  isColorSelected(k: string) { return this.selectedColors.includes(k); }

  getColorName(k: string) { return this.colors.find(c => c.key === k)?.name ?? k; }

  clearAllFilters() {
    this.selectedCategory = 'All';
    this.selectedPriceRange = null;
    this.selectedSizes = [];
    this.selectedColors = [];
    this.sortBy = 'default';
    this.searchQuery = '';
    this.currentPage = 1;
  }
  removeSize(s: string)  { 
    this.selectedSizes  = this.selectedSizes.filter(x => x !== s); 
    this.currentPage = 1;
  }
  removeColor(k: string) { 
    this.selectedColors = this.selectedColors.filter(x => x !== k); 
    this.currentPage = 1;
  }

  // star helper
  stars(r: number) { return Array.from({ length: 5 }, (_, i) => i < r); }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar()  { this.sidebarOpen = false; }

  isInWishlist(productId: number): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  toggleWishlist(product: ProductItem, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    
    // Auth Guard check!
    if (!this.authService.checkAuthAndTriggerModal('add items to wishlist')) {
      return;
    }

    this.wishlistService.toggleWishlist(product);
    const action = this.isInWishlist(product.id) ? 'added to' : 'removed from';
    this.snackBar.open(`${product.name} ${action} Wishlist!`, 'OK', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  getProductBrand(product: ProductItem): string {
    const brands = ['POLO RALPH LAUREN', 'HACKETT LONDON', 'FRED PERRY', 'TED BAKER', 'HUGO BOSS', 'ARMANI EXCHANGE'];
    return brands[product.id % brands.length];
  }

  addToCart(product: ProductItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // Default size and color
    const defaultSize = product.sizes[0] || 'M';
    const defaultColor = product.colors[0] || { name: 'Standard', class: 'black', hex: '#111111', image: product.image };

    this.cartService.addToCart(
      product,
      1,
      defaultSize,
      defaultColor.class,
      defaultColor.name,
      product.image
    );

    this.snackBar.open(`🛒 Added "${product.name}" to Cart!`, 'Dismiss', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
