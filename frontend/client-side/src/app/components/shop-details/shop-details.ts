import { Component, OnInit, AfterViewInit, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ProductService, ProductItem, ProductColor } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { RecentlyViewedService } from '../../services/recently-viewed.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

declare var $: any;

import { ReviewService, ReviewItem as DbReviewItem } from '../../services/review.service';

export interface ReviewItem {
  id?: number;
  name: string;
  date: string;
  rating: number;
  text: string;
  helpful: number;
  helpfulByUsers?: string[];
  photos?: string[];
}

@Component({
  selector: 'app-shop-details',
  imports: [RouterLink, MatExpansionModule, MatSnackBarModule, CommonModule, FormsModule],
  templateUrl: './shop-details.html',
  styleUrl: './shop-details.scss',
})
export class ShopDetails implements OnInit, AfterViewInit {
  product: ProductItem | undefined;
  quantity = 1;
  selectedSize = '';
  activeImage = '';
  showSizeGuide = false;
  openAccordion: string = 'highlights';
  sizeError = '';

  showReviewPhotoModal = false;
  activeReviewPhotoUrl = '';

  // --- Review Section ---
  reviews: ReviewItem[] = [
    { id: 1, name: 'Rahul Sharma', date: 'June 12, 2025', rating: 5, text: 'Absolutely love this product! Premium quality fabric and perfect fit. Highly recommend to everyone.', helpful: 14 },
    { id: 2, name: 'Anjali Verma', date: 'June 8, 2025', rating: 4, text: 'Really good quality. The color is exactly as shown in pictures. Only minor issue is the delivery took slightly longer.', helpful: 9 },
    { id: 3, name: 'Mohit Patel', date: 'June 3, 2025', rating: 3, text: 'Decent product for the price. Material is comfortable but sizing runs a bit large. Order one size smaller.', helpful: 5 },
  ];

  // Size chart data — tops (XS/S/M/L/XL...)
  topsSizeChart = [
    { size: 'XS',  chest: '34"',  waist: '28"',  shoulder: '16"', length: '27"' },
    { size: 'S',   chest: '36"',  waist: '30"',  shoulder: '17"', length: '28"' },
    { size: 'M',   chest: '38"',  waist: '32"',  shoulder: '17.5"', length: '28.5"' },
    { size: 'L',   chest: '40"',  waist: '34"',  shoulder: '18"', length: '29"' },
    { size: 'XL',  chest: '42"',  waist: '36"',  shoulder: '18.5"', length: '29.5"' },
    { size: '2XL', chest: '44"',  waist: '38"',  shoulder: '19"', length: '30"' },
    { size: '3XL', chest: '46"',  waist: '40"',  shoulder: '19.5"', length: '30.5"' },
    { size: '4XL', chest: '48"',  waist: '42"',  shoulder: '20"', length: '31"' },
    { size: '5XL', chest: '50"',  waist: '44"',  shoulder: '20.5"', length: '31.5"' },
    { size: '6XL', chest: '52"',  waist: '46"',  shoulder: '21"', length: '32"' },
  ];

  // Size chart data — bottoms (28/30/32...)
  bottomsSizeChart = [
    { size: '28', waist: '28"', hip: '36"', inseam: '30"', thigh: '21"' },
    { size: '30', waist: '30"', hip: '38"', inseam: '30"', thigh: '22"' },
    { size: '32', waist: '32"', hip: '40"', inseam: '31"', thigh: '23"' },
    { size: '34', waist: '34"', hip: '42"', inseam: '31"', thigh: '24"' },
    { size: '36', waist: '36"', hip: '44"', inseam: '32"', thigh: '25"' },
    { size: '38', waist: '38"', hip: '46"', inseam: '32"', thigh: '26"' },
    { size: '40', waist: '40"', hip: '48"', inseam: '32"', thigh: '27"' },
    { size: '42', waist: '42"', hip: '50"', inseam: '33"', thigh: '28"' },
  ];

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private router: Router,
    private snackBar: MatSnackBar,
    private wishlistService: WishlistService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private authService: AuthService,
    private reviewService: ReviewService,
    private recentlyViewedService: RecentlyViewedService
  ) {}

  allProducts: ProductItem[] = [];
  relatedProductsList: ProductItem[] = [];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.zone.run(() => {
        const idStr = params.get('id');
        if (idStr) {
          const id = +idStr;
          this.productService.getProductById(id).subscribe(prod => {
            this.product = prod;
            if (prod) {
              this.recentlyViewedService.addProduct(prod.id);
            }
            
            // Load reviews from PostgreSQL
            this.reviewService.getProductReviews(id).subscribe(reviews => {
              this.reviews = reviews.map((r: any) => ({
                id: r.id,
                name: r.customer,
                date: r.date,
                rating: r.rating,
                text: r.text,
                helpful: r.helpful,
                helpfulByUsers: r.helpfulByUsers,
                photos: r.photos || []
              }));
            });

            // Reset selections & errors when moving to a new product
            this.quantity = 1;
            this.selectedSize = '';
            this.sizeError = '';
            
            // Auto-select first color only, do not auto-select size
            if (this.product) {
              this.activeImage = this.product.image;
              if (this.product.colors && this.product.colors.length > 0) {
                this.selectedColorName = this.product.colors[0].name;
              }
              
              // Load all products to calculate related products
              this.productService.getProducts().subscribe(prods => {
                this.allProducts = prods;
                this.calculateRelatedProducts();
              });
            }

            // Force change detection immediately on route param change
            this.cdr.detectChanges();

            // Scroll page to top to make sure user sees the new product details
            if (typeof window !== 'undefined') {
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'instant' });
                document.documentElement.scrollTo({ top: 0, behavior: 'instant' });
                document.body.scrollTo({ top: 0, behavior: 'instant' });
                
                // Direct property setter fallback for high browser compatibility
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                
                // Second change detection pass to ensure DOM size change is captured
                this.cdr.detectChanges();
              }, 50);
            }
          });
        }
      });
    });
  }

  get currentPrice() {
    if (!this.product) {
      return { price: 0, originalPrice: 0, discount: 0 };
    }

    let price = this.product.price;
    let originalPrice = this.product.originalPrice || 0;
    let discount = this.product.discountPercent || 0;

    if (this.selectedSize && this.product.variants && this.product.variants.length > 0) {
      const variant = this.product.variants.find((v: any) => v.size === this.selectedSize);
      if (variant) {
        const base = variant.basePrice;
        const disc = variant.discountPercent || 0;
        price = base * (1 - disc / 100);
        originalPrice = base;
        discount = disc;
      }
    }

    return { price, originalPrice, discount };
  }

  get averageRating(): number {
    if (!this.reviews || this.reviews.length === 0) {
      return 0;
    }
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / this.reviews.length) * 10) / 10;
  }

  /** Whether product uses numeric waist sizes (bottoms) vs alpha sizes (tops) */
  get isBottoms(): boolean {
    if (!this.product || !this.product.sizes.length) return false;
    return !isNaN(Number(this.product.sizes[0]));
  }

  openSizeGuide() {
    this.showSizeGuide = true;
    document.body.style.overflow = 'hidden';
  }

  closeSizeGuide() {
    this.showSizeGuide = false;
    document.body.style.overflow = '';
  }

  toggleAccordion(tab: string) {
    this.openAccordion = this.openAccordion === tab ? '' : tab;
  }

  /** Close modal on Escape key */
  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.showSizeGuide) this.closeSizeGuide();
  }

  selectSize(size: string) {
    this.selectedSize = size;
    this.sizeError = '';
  }

  selectedColorName: string = '';

  selectColor(color: ProductColor) {
    this.selectedColorName = color.name;
    this.activeImage = color.image;
  }

  getSelectedColorName(): string {
    return this.selectedColorName;
  }

  get activeColorImages(): string[] {
    if (!this.product || !this.selectedColorName) {
      return this.product?.images || [];
    }
    const color = this.product.colors.find(c => c.name === this.selectedColorName);
    if (color && color.images && color.images.length > 0) {
      return color.images;
    }
    if (color && color.image) {
      return [color.image];
    }
    return this.product.images || [];
  }

  selectImage(img: string) {
    this.activeImage = img;
  }

  incrementQuantity() {
    this.quantity++;
  }

  decrementQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart() {
    if (!this.product) return;
    if (!this.selectedSize) {
      this.sizeError = 'Please choose a size before adding to cart.';
      return;
    }
    const availableStock = this.getVariantStock();
    if (availableStock <= 0) {
      this.snackBar.open('⚠️ This size/color variant is currently out of stock.', 'Dismiss', { duration: 4000 });
      return;
    }
    if (this.quantity > availableStock) {
      this.snackBar.open(`⚠️ Only ${availableStock} items available in stock.`, 'Dismiss', { duration: 4000 });
      return;
    }
    // Auth Guard check!
    if (!this.authService.checkAuthAndTriggerModal('add items to cart')) {
      return;
    }
    this.cartService.addToCart(
      this.product,
      this.quantity,
      this.selectedSize,
      this.selectedColorName, // Pass color name as class since we removed class
      this.getSelectedColorName(),
      this.activeImage
    );
    this.router.navigate(['/cart']);
  }

  addToWishlist() {
    if (!this.product) return;
    this.snackBar.open(`"${this.product.name}" added to your wishlist!`, 'Dismiss', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  buyNow() {
    if (!this.product) return;
    if (!this.selectedSize) {
      this.sizeError = 'Please choose a size before buying.';
      return;
    }
    const availableStock = this.getVariantStock();
    if (availableStock <= 0) {
      this.snackBar.open('⚠️ This size/color variant is currently out of stock.', 'Dismiss', { duration: 4000 });
      return;
    }
    if (this.quantity > availableStock) {
      this.snackBar.open(`⚠️ Only ${availableStock} items available in stock.`, 'Dismiss', { duration: 4000 });
      return;
    }
    // Auth Guard check!
    if (!this.authService.checkAuthAndTriggerModal('buy items directly')) {
      return;
    }
    const tempItem = {
      key: `${this.product.id}-${this.selectedSize}-${this.selectedColorName}`,
      productId: this.product.id,
      name: this.product.name,
      price: this.currentPrice.price,
      quantity: this.quantity,
      image: this.activeImage || this.product.image,
      size: this.selectedSize,
      colorName: this.getSelectedColorName(),
      colorClass: this.selectedColorName,
      sku: this.product.sku
    };
    this.cartService.setBuyNowItem(tempItem);
    this.cartService.setAppliedCoupon(null); // Clear any cart coupon when doing direct Buy Now checkout
    this.router.navigate(['/checkout']);
  }

  isInWishlist(): boolean {
    if (!this.product) return false;
    return this.wishlistService.isInWishlist(this.product.id);
  }

  toggleWishlist() {
    if (this.product) {
      // Auth Guard check!
      if (!this.authService.checkAuthAndTriggerModal('add items to wishlist')) {
        return;
      }
      this.wishlistService.toggleWishlist(this.product);
      const action = this.isInWishlist() ? 'added to' : 'removed from';
      this.snackBar.open(`${this.product.name} ${action} Wishlist!`, 'OK', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom'
      });
    }
  }

  calculateRelatedProducts() {
    if (!this.product) return;
    
    // Get recently viewed product IDs
    const recentlyViewedIds = this.recentlyViewedService.getRecentlyViewedProductIds();
    
    // Filter out the current product ID being viewed
    const filteredIds = recentlyViewedIds.filter(id => id !== this.product?.id);
    
    // Map to actual products in chronological order of viewing, sliced to max 4 items
    const related = filteredIds
      .map(id => this.allProducts.find(p => p.id === id))
      .filter(p => p !== undefined)
      .slice(0, 4) as ProductItem[];
      
    this.relatedProductsList = related;
    this.cdr.detectChanges();
  }

  get relatedProducts(): ProductItem[] {
    return this.relatedProductsList;
  }

  // Related products wishlist actions
  toggleRelatedWishlist(item: ProductItem, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    // Auth Guard check!
    if (!this.authService.checkAuthAndTriggerModal('add items to wishlist')) {
      return;
    }
    this.wishlistService.toggleWishlist(item);
    const action = this.isInWishlistId(item.id) ? 'added to' : 'removed from';
    this.snackBar.open(`${item.name} ${action} Wishlist!`, 'OK', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  isInWishlistId(productId: number): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  stars(r: number) {
    return Array.from({ length: 5 }, (_, i) => i < r);
  }

  getProductBrand(product: ProductItem): string {
    const brands = ['POLO RALPH LAUREN', 'HACKETT LONDON', 'FRED PERRY', 'TED BAKER', 'HUGO BOSS', 'ARMANI EXCHANGE'];
    return brands[product.id % brands.length];
  }

  addRelatedToCart(product: ProductItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // Auth Guard check!
    if (!this.authService.checkAuthAndTriggerModal('add items to cart')) {
      return;
    }

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

  shareProduct(platform: string) {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const text = `Check out this amazing product: "${this.product?.name}" on RK Fashion for only ₹${this.product?.price}!`;
    let shareLink = '';

    if (platform === 'facebook') {
      shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    } else if (platform === 'twitter') {
      shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    } else if (platform === 'whatsapp') {
      shareLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}%20${encodeURIComponent(url)}`;
    } else if (platform === 'instagram') {
      this.snackBar.open('📸 Check out our Instagram profile at @rk_fashion.surat!', 'Dismiss', { duration: 3000 });
      window.open('https://www.instagram.com/rk_fashion.surat?igsh=MW1oOWtkdzFqeXFyMA==', '_blank');
      return;
    }

    if (shareLink) {
      window.open(shareLink, '_blank');
    }
  }

  getImg(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return path.startsWith('/') ? path : '/' + path;
  }

  // ─── Review Helpers ───────────────────────────────────────────
  get avgRating(): number {
    if (!this.reviews.length) return 0;
    return +(this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length).toFixed(1);
  }

  countByStar(n: number): number {
    return this.reviews.filter(r => r.rating === n).length;
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }


  isReviewMarkedHelpful(review: ReviewItem): boolean {
    const user = this.authService.getLoggedInUser();
    if (!user || !user.email) return false;
    return review.helpfulByUsers ? review.helpfulByUsers.includes(user.email) : false;
  }

  markHelpful(review: ReviewItem) {
    if (review.id === undefined || this.isReviewMarkedHelpful(review)) return;
    
    const user = this.authService.getLoggedInUser();
    if (!user) {
      this.snackBar.open('⚠️ Please login to mark reviews as helpful.', 'Dismiss', { duration: 3000 });
      return;
    }

    // Optimistic UI update
    review.helpful++;
    if (!review.helpfulByUsers) review.helpfulByUsers = [];
    review.helpfulByUsers.push(user.email);

    this.reviewService.markHelpful(review.id, user.email).subscribe({
      error: () => {
        // Revert optimistic update on error
        review.helpful--;
        review.helpfulByUsers = review.helpfulByUsers?.filter((e: string) => e !== user.email);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────

  ngAfterViewInit() {
    if (typeof $ !== 'undefined') {
      $('.set-bg').each(function (this: any) {
        const bg = $(this).data('setbg');
        if (bg) {
          $(this).css('background-image', 'url(' + bg + ')');
        }
      });
    }
  }

  getVariantStock(): number {
    if (!this.product || !this.selectedSize) return 999;
    
    const variants = this.product.variants as any[];
    if (Array.isArray(variants)) {
      let variant = variants.find(v => 
        v.size === this.selectedSize && 
        (v.colorName || '').toLowerCase() === (this.selectedColorName || '').toLowerCase()
      );
      if (!variant) {
        variant = variants.find(v => v.size === this.selectedSize);
      }
      if (variant) {
        return Number(variant.stock) ?? 0;
      }
    }
    return 999;
  }

  openReviewPhotoModal(url: string) {
    this.activeReviewPhotoUrl = url;
    this.showReviewPhotoModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeReviewPhotoModal() {
    this.showReviewPhotoModal = false;
    this.activeReviewPhotoUrl = '';
    document.body.style.overflow = '';
  }
}
