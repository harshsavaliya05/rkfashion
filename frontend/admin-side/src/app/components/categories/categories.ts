import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category } from '../../services/category.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss'
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  isUploading = false;
  uploadStatusText = 'No file chosen';

  showForm = false;
  editingCategory: Category | null = null;

  showDeleteConfirmId: number | null = null;
  showDeleteConfirmName = '';

  form = {
    name: '',
    cursive: '',
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    icon: '🛍️'
  };

  availableIcons = ['🛍️', '👕', '👔', '🧥', '👖', '🏕️', 'sneaker', '🕶️', '⌚', '🎒', '🧢', '🧦', '🧣', '🧤', '👠', '👜'];

  constructor(
    private categoryService: CategoryService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  getSafeVideoUrl(url: string | undefined): SafeResourceUrl | string {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  isFormValidForPreview(): boolean {
    return !!(
      this.form.name && this.form.name.trim() &&
      this.form.title && this.form.title.trim() &&
      this.form.cursive && this.form.cursive.trim() &&
      this.form.description && this.form.description.trim() &&
      (this.form.imageUrl || this.form.videoUrl)
    );
  }

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploading = true;
      this.uploadStatusText = `Uploading ${file.name}...`;
      this.cdr.detectChanges();

      this.categoryService.uploadMedia(file).subscribe({
        next: (res) => {
          this.isUploading = false;
          if (res.videoUrl) {
            this.form.videoUrl = res.videoUrl;
            this.form.imageUrl = '';
            this.uploadStatusText = `${file.name} (Video) - Uploaded ✅`;
          } else if (res.imageUrl) {
            this.form.imageUrl = res.imageUrl;
            this.form.videoUrl = '';
            this.uploadStatusText = `${file.name} (Image) - Uploaded ✅`;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isUploading = false;
          this.uploadStatusText = 'Upload failed ❌';
          this.cdr.detectChanges();
          console.error('Failed to upload category media:', err);
        }
      });
    }
  }

  openAddForm() {
    this.editingCategory = null;
    this.uploadStatusText = 'No file chosen';
    this.form = {
      name: '',
      cursive: '',
      title: '',
      description: '',
      imageUrl: '',
      videoUrl: '',
      icon: '🛍️'
    };
    this.showForm = true;
  }

  editCategory(cat: Category) {
    this.editingCategory = cat;
    this.uploadStatusText = cat.videoUrl || cat.imageUrl ? 'Media attached' : 'No file chosen';
    this.form = {
      name: cat.name,
      cursive: cat.cursive || '',
      title: cat.title || '',
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      videoUrl: cat.videoUrl || '',
      icon: cat.icon || '🛍️'
    };
    this.showForm = true;
  }

  cancelForm() {
    this.showForm = false;
    this.editingCategory = null;
  }

  saveCategory() {
    if (!this.form.name || !this.form.name.trim()) return;

    const payload: any = {
      name: this.form.name.trim(),
      cursive: this.form.cursive.trim(),
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      imageUrl: this.form.imageUrl,
      videoUrl: this.form.videoUrl,
      icon: this.form.icon
    };

    if (this.editingCategory) {
      payload.id = this.editingCategory.id;
    }

    this.categoryService.saveCategory(payload).subscribe({
      next: () => {
        this.showForm = false;
        this.editingCategory = null;
        this.loadCategories();
      },
      error: (err) => {
        console.error('Failed to save category:', err);
      }
    });
  }

  triggerDeleteCategory(cat: Category) {
    this.showDeleteConfirmId = cat.id;
    this.showDeleteConfirmName = cat.name;
    this.cdr.detectChanges();
  }

  cancelDelete() {
    this.showDeleteConfirmId = null;
    this.showDeleteConfirmName = '';
  }

  confirmDelete() {
    if (this.showDeleteConfirmId) {
      this.categoryService.deleteCategory(this.showDeleteConfirmId).subscribe({
        next: () => {
          this.showDeleteConfirmId = null;
          this.showDeleteConfirmName = '';
          this.loadCategories();
        },
        error: (err) => {
          console.error('Failed to delete category:', err);
        }
      });
    }
  }
}
