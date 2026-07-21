import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ProductService, ProductItem } from '../../services/product.service';
import { SearchService } from '../../services/search.service';
import { CategoryService } from '../../services/category.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';


@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class ProductsComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['image', 'name', 'price', 'category', 'stock', 'actions'];
  products: ProductItem[] = [];
  filteredProducts: ProductItem[] = [];
  selectedCategory = '';
  searchTerm = '';

  categories: { value: string; label: string }[] = [];

  // Expanded Variants details tracking
  expandedProductIds: { [key: number]: boolean } = {};
  
  // Custom Confirmation Dialog State
  showDeleteConfirmId: number | null = null;
  showDeleteConfirmName = '';

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private searchService: SearchService
  ) {}



  ngOnInit() {
    console.log('ProductsComponent ngOnInit called');
    this.loadCategoriesList();
    this.route.queryParams.subscribe(params => {
      this.selectedCategory = params['category'] || '';
      this.loadProducts();
    });

    this.searchService.searchQuery$.subscribe(query => {
      this.searchTerm = query;
      this.loadProducts();
    });
  }

  loadCategoriesList() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats.map(c => ({
          value: c.name,
          label: c.title || c.name
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load categories in products list:', err);
        this.categories = [
          { value: 'Shirt', label: 'Shirts' },
          { value: 'Pant', label: 'Cargo Pants' },
          { value: 'Cotton Pant', label: 'Trousers' },
          { value: 'Jeans', label: 'Jeans' },
          { value: 'Hoodie', label: 'Hoodies' },
          { value: 'T-shirt', label: 'T-Shirts' }
        ];
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {}

  loadProducts() {
    this.productService.getPublishedProducts().subscribe(prods => {
      this.products = prods;
      let temp = this.products;
      if (this.selectedCategory) {
        temp = temp.filter(p => p.category && p.category.toLowerCase() === this.selectedCategory.toLowerCase());
      }
      if (this.searchTerm.trim()) {
        const q = this.searchTerm.toLowerCase();
        temp = temp.filter(p => 
          (p.name && p.name.toLowerCase().includes(q)) || 
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }
      this.filteredProducts = temp;
      this.cdr.detectChanges();
    });
  }

  onCategoryFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterByCategory(select.value);
  }

  onCategorySelectionChange(event: any) {
    this.filterByCategory(event.value);
  }

  filterByCategory(categoryName: string) {
    this.router.navigate(['/products'], {
      queryParams: { category: categoryName || null }
    });
  }

  deleteProduct(product: ProductItem) {
    this.showDeleteConfirmId = product.id;
    this.showDeleteConfirmName = product.name;
    this.cdr.detectChanges();
  }

  cancelDelete() {
    this.showDeleteConfirmId = null;
    this.showDeleteConfirmName = '';
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (this.showDeleteConfirmId !== null) {
      this.productService.deleteProduct(this.showDeleteConfirmId).subscribe(() => {
        this.showDeleteConfirmId = null;
        this.showDeleteConfirmName = '';
        this.loadProducts();
      });
    }
  }

  getProductStock(product: ProductItem): number {
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((acc, curr) => acc + (curr.stock || 0), 0);
    }
    const mockStocks: { [key: number]: number } = { 1: 45, 2: 12, 3: 150, 4: 90 };
    return mockStocks[product.id] || 0;
  }

  toggleProductVariants(productId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.expandedProductIds[productId] = !this.expandedProductIds[productId];
    this.cdr.detectChanges();
  }

  isProductExpanded(productId: number): boolean {
    return !!this.expandedProductIds[productId];
  }

  hasOutOfStockVariants(product: ProductItem): boolean {
    if (product.variants && product.variants.length > 0) {
      return product.variants.some((v: any) => (v.stock || 0) <= 0);
    }
    return false;
  }
}

