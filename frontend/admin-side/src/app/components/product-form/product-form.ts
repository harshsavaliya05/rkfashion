import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { HttpClient } from '@angular/common/http';
import { CategoryService } from '../../services/category.service';


import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';

interface ColorVariant {
  name: string;
  hex: string;
  class: string;
  mainImage: string;
  images: string[];
  sizes: string[]; // Active sizes specifically for this color variant
}

interface ProductVariant {
  colorName: string;
  colorHex: string;
  size: string;
  basePrice: number;
  discountPercent: number;
  stock: number;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductFormComponent implements OnInit {
  isEditMode = false;
  productId: string | null = null;

  // Form Fields
  name = '';
  category = '';
  basePrice: number | null = null;
  discountPercent: number | null = null;
  sku = '';
  description = '';
  highlights = '';
  label = '';
  rating = 5;
  offers = '';

  // Active variants state
  colors: ColorVariant[] = [];
  variants: ProductVariant[] = []; // The flat combination list
  defaultColorName = '';
  previewColorIdx = 0;

  // Temporary Inputs
  newColorName = '';
  newColorHex = '#111111';

  // Available Category Options
  categories: { value: string; label: string }[] = [];


  // standard size templates
  availableSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '28', '30', '32', '34', '36', '38', '40'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.productId;

    this.loadCategoriesAndProduct();
  }

  loadCategoriesAndProduct() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats.map(c => ({
          value: c.name,
          label: c.title || c.name
        }));
        if (this.isEditMode) {
          this.loadProductData();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load categories, using fallback options', err);
        this.categories = [
          { value: 'Shirt', label: 'Shirt' },
          { value: 'Pant', label: 'Cargo Pants' },
          { value: 'Cotton Pant', label: 'Trousers' },
          { value: 'Jeans', label: 'Jeans' },
          { value: 'Hoodie', label: 'Hoodie' },
          { value: 'T-shirt', label: 'T-Shirt' }
        ];
        if (this.isEditMode) {
          this.loadProductData();
        }
        this.cdr.detectChanges();
      }
    });
  }

  loadProductData() {
    const id = Number(this.productId);
    this.productService.getProductById(id).subscribe({
      next: (prod) => {
        if (prod) {
          this.name = prod.name;
          const matchedCat = this.categories.find(c => c.value.toLowerCase() === prod.category.toLowerCase());
          this.category = matchedCat ? matchedCat.value : prod.category;
          this.basePrice = prod.originalPrice || prod.price;
          this.discountPercent = prod.discountPercent || null;
          this.sku = prod.sku;
          this.description = prod.description;
          this.highlights = prod.highlights ? (Array.isArray(prod.highlights) ? prod.highlights.join('\n') : prod.highlights) : '';
          this.label = prod.label || '';
          this.rating = prod.rating || 5;
          this.offers = prod.offers ? (Array.isArray(prod.offers) ? prod.offers.join('\n') : prod.offers) : '';
          
          this.colors = (prod.colors || []).map(c => {
            const otherImgs = c.images ? c.images.filter(img => img !== c.image) : [];
            return {
              name: c.name,
              hex: c.hex,
              class: c.class,
              mainImage: c.image,
              images: otherImgs,
              sizes: c.sizes || prod.sizes || []
            };
          });

          this.defaultColorName = this.colors[0]?.name || '';
          this.variants = prod.variants || [];
        } else {
          this.loadMockData();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadMockData();
        this.cdr.detectChanges();
      }
    });
  }

  loadMockData() {
    // Mock edit loading data fallback
    this.name = 'Premium Cotton Solid Shirt';
    this.category = 'shirt';
    this.basePrice = 1999;
    this.discountPercent = 25;
    this.sku = 'RK-PCS-001';
    this.description = 'Sophisticated men solid casual shirt crafted from 100% premium cotton.';
    this.highlights = "Premium quality fabric — soft, breathable & durable\nRegular fit — comfortable for all-day wear\nSuitable for casual & semi-formal occasions";
    this.label = 'Sale';
    this.rating = 5;
    this.offers = "Buy 2 Shirts, Get 10% Off\nBuy 3 Shirts, Get 15% Off\nFree Delivery on orders above ₹999";
    
    this.colors = [
      { name: 'Navy Blue', hex: '#20315f', class: 'blue', mainImage: '/img/product/product-9.jpg', images: [], sizes: ['M', 'L'] },
      { name: 'Pure White', hex: '#ffffff', class: 'white', mainImage: '/img/product/product-2.jpg', images: [], sizes: ['M', 'L'] }
    ];

    this.defaultColorName = 'Navy Blue';
    
    this.variants = [
      { colorName: 'Navy Blue', colorHex: '#20315f', size: 'M', basePrice: 1999, discountPercent: 25, stock: 20 },
      { colorName: 'Navy Blue', colorHex: '#20315f', size: 'L', basePrice: 1999, discountPercent: 25, stock: 15 },
      { colorName: 'Pure White', colorHex: '#ffffff', size: 'M', basePrice: 1999, discountPercent: 25, stock: 10 },
      { colorName: 'Pure White', colorHex: '#ffffff', size: 'L', basePrice: 1999, discountPercent: 25, stock: 12 }
    ];
  }

  // Calculate generic discount price
  get calculatedDiscountPrice(): number {
    if (this.basePrice !== null && this.discountPercent !== null) {
      const discount = (this.basePrice * this.discountPercent) / 100;
      return Math.round(this.basePrice - discount);
    }
    return this.basePrice || 0;
  }

  // Variant row calculated selling price
  getVariantSellingPrice(v: ProductVariant): number {
    if (v.basePrice && v.discountPercent !== null) {
      const discount = (v.basePrice * v.discountPercent) / 100;
      return Math.round(v.basePrice - discount);
    }
    return v.basePrice || 0;
  }

  // Live preview helpers
  get activePreviewColor(): ColorVariant | null {
    if (this.colors && this.colors.length > 0) {
      if (this.previewColorIdx >= this.colors.length) {
        this.previewColorIdx = 0;
      }
      return this.colors[this.previewColorIdx];
    }
    return null;
  }

  getPreviewPrice(): { price: number; original: number; discount: number } {
    const activeColor = this.activePreviewColor;
    if (activeColor && this.variants.length > 0) {
      // Find first variant for this color to get its custom price
      const match = this.variants.find(v => v.colorName === activeColor.name);
      if (match) {
        return {
          price: this.getVariantSellingPrice(match),
          original: match.basePrice,
          discount: match.discountPercent
        };
      }
    }
    return {
      price: this.calculatedDiscountPrice || this.basePrice || 0,
      original: this.basePrice || 0,
      discount: this.discountPercent || 0
    };
  }

  isFormValid(): boolean {
    const basicValid = !!(
      this.name && this.name.trim() &&
      this.category &&
      this.basePrice && this.basePrice > 0 &&
      this.sku && this.sku.trim() &&
      this.description && this.description.trim() &&
      this.rating
    );
    if (!basicValid) return false;
    if (this.colors.length === 0 || !this.defaultColorName) return false;

    // Check if each added color has its default main image
    const colorsHaveImages = this.colors.every(c => c.mainImage && c.mainImage.trim());
    if (!colorsHaveImages) return false;

    if (this.variants.length === 0) return false;

    return true;
  }

  colorsHaveImages(): boolean {
    if (this.colors.length === 0) return false;
    return this.colors.every(c => c.mainImage && c.mainImage.trim());
  }



  // Regenerate combination matrix based on per-color size selection
  syncVariants() {
    const newVariants: ProductVariant[] = [];
    
    this.colors.forEach(col => {
      if (col.sizes) {
        col.sizes.forEach(sz => {
          const existing = this.variants.find(v => v.colorName === col.name && v.size === sz);
          if (existing) {
            existing.colorHex = col.hex;
            newVariants.push(existing);
          } else {
            newVariants.push({
              colorName: col.name,
              colorHex: col.hex,
              size: sz,
              basePrice: this.basePrice || 0,
              discountPercent: this.discountPercent || 0,
              stock: 10
            });
          }
        });
      }
    });

    this.variants = newVariants;
  }

  applyMainPriceToAll() {
    this.variants.forEach(v => {
      v.basePrice = this.basePrice || 0;
      v.discountPercent = this.discountPercent || 0;
    });
  }

  // Colors Management
  addColor() {
    if (!this.newColorName) return;
    
    const nameLower = this.newColorName.toLowerCase();
    let cssClass = 'black';
    if (nameLower.includes('blue')) cssClass = 'blue';
    else if (nameLower.includes('green')) cssClass = 'green';
    else if (nameLower.includes('red')) cssClass = 'red';
    else if (nameLower.includes('white')) cssClass = 'white';
    else if (nameLower.includes('grey') || nameLower.includes('gray')) cssClass = 'grey';
    else if (nameLower.includes('sand') || nameLower.includes('khaki') || nameLower.includes('beige')) cssClass = 'beige';

    this.colors.push({
      name: this.newColorName,
      hex: this.newColorHex,
      class: cssClass,
      mainImage: '',
      images: [],
      sizes: [] // starts with no sizes enabled
    });

    if (!this.defaultColorName) {
      this.defaultColorName = this.newColorName;
    }

    this.newColorName = '';
    this.newColorHex = '#111111';
    
    this.syncVariants();
  }

  removeColor(index: number) {
    this.colors.splice(index, 1);
    // If the removed color was default, reassign default
    if (this.colors.length > 0 && !this.colors.some(c => c.name === this.defaultColorName)) {
      this.defaultColorName = this.colors[0].name;
    } else if (this.colors.length === 0) {
      this.defaultColorName = '';
    }
    this.syncVariants();
  }

  // Sizes Management (Linked per color variant)
  toggleColorSizeActive(colorIdx: number, size: string) {
    const col = this.colors[colorIdx];
    if (!col.sizes) {
      col.sizes = [];
    }
    const idx = col.sizes.indexOf(size);
    if (idx > -1) {
      col.sizes.splice(idx, 1);
    } else {
      col.sizes.push(size);
    }
    this.syncVariants();
  }

  isColorSizeActive(colorIdx: number, size: string): boolean {
    const col = this.colors[colorIdx];
    return col.sizes ? col.sizes.includes(size) : false;
  }

  // Add dummy images for demo
  triggerDemoImage(type: 'colorMain' | 'colorGallery', colorIdx: number) {
    const demoImgs = [
      '/img/product/product-1.jpg',
      '/img/product/product-2.jpg',
      '/img/product/product-3.jpg',
      '/img/product/product-4.jpg',
      '/img/product/product-6.jpg',
      '/img/product/product-7.jpg',
      '/img/product/product-8.jpg'
    ];
    const randImg = demoImgs[Math.floor(Math.random() * demoImgs.length)];

    if (type === 'colorMain') {
      this.colors[colorIdx].mainImage = randImg;
    } else if (type === 'colorGallery') {
      this.colors[colorIdx].images.push(randImg);
    }
  }

  uploadProductImage(event: any, type: 'colorMain' | 'colorGallery', colorIdx: number) {
    const file: File = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);

      this.http.post<{ imageUrl: string }>('http://localhost:3000/api/campaigns/upload', formData).subscribe({
        next: (res) => {
          if (type === 'colorMain') {
            this.colors[colorIdx].mainImage = res.imageUrl;
          } else if (type === 'colorGallery') {
            this.colors[colorIdx].images = [...this.colors[colorIdx].images, res.imageUrl];
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to upload product image:', err);
        }
      });
    }
  }

  removeColorImage(colorIdx: number, imgIdx: number) {
    this.colors[colorIdx].images.splice(imgIdx, 1);
  }

  saveProduct(status: 'published' | 'draft') {
    // Variable product mappings
    const allSizesSet = new Set<string>();
    this.colors.forEach(c => {
      if (c.sizes) {
        c.sizes.forEach(sz => allSizesSet.add(sz));
      }
    });
    
    const finalColors = this.colors.map(c => ({
      name: c.name,
      class: c.class,
      hex: c.hex,
      image: c.mainImage || '/img/product/product-1.jpg',
      images: [c.mainImage, ...c.images].filter(Boolean),
      sizes: c.sizes
    }));
    
    const finalSizes = Array.from(allSizesSet);

    // Determine default images from the selected default color variant
    let finalMainImage = '/img/product/product-1.jpg';
    let finalGalleryImages: string[] = [];

    const defaultCol = this.colors.find(c => c.name === this.defaultColorName) || this.colors[0];
    if (defaultCol) {
      finalMainImage = defaultCol.mainImage || '/img/product/product-1.jpg';
      finalGalleryImages = defaultCol.images || [];
    }

    const productPayload = {
      name: this.name,
      category: this.category,
      price: this.calculatedDiscountPrice || this.basePrice || 0,
      originalPrice: this.basePrice || 0,
      discountPercent: this.discountPercent || 0,
      sku: this.sku,
      description: this.description,
      highlights: this.highlights.split('\n').map(h => h.trim()).filter(Boolean),
      label: this.label || undefined,
      rating: Number(this.rating) || 5,
      offers: this.offers.split('\n').map(o => o.trim()).filter(Boolean),
      image: finalMainImage,
      images: [finalMainImage, ...finalGalleryImages].filter(Boolean),
      colors: finalColors,
      sizes: finalSizes,
      variants: this.variants,
      status: status
    };

    if (this.isEditMode) {
      this.productService.updateProduct(Number(this.productId), productPayload).subscribe(() => {
        this.navigateAfterSave(status);
      });
    } else {
      this.productService.addProduct(productPayload).subscribe(() => {
        this.navigateAfterSave(status);
      });
    }
  }

  navigateAfterSave(status: string) {
    if (status === 'published') {
      this.router.navigate(['/products']);
    } else {
      this.router.navigate(['/drafts']);
    }
  }
}
