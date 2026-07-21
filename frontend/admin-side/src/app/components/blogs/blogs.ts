import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService, BlogItem as Blog } from '../../services/blog.service';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-blogs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './blogs.html',
  styleUrl: './blogs.scss'
})
export class BlogsComponent implements OnInit {
  blogs: Blog[] = [];
  isUploading = false;
  uploadedFileName = '';
  uploadStatusText = 'No file chosen';

  showForm = false;
  editingBlog: Blog | null = null;

  showDeleteConfirmId: number | null = null;
  showDeleteConfirmTitle = '';

  form = {
    title: '',
    author: '',
    date: '',
    imageUrl: '',
    category: 'Fashion',
    content: '',
    tagsString: ''
  };

  constructor(
    private blogService: BlogService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const sizeKB = Math.round(file.size / 1024);
      this.uploadedFileName = file.name;
      this.uploadStatusText = `Uploading: ${file.name} (${sizeKB} KB)...`;
      this.isUploading = true;
      this.cdr.detectChanges();
      
      const formData = new FormData();
      formData.append('image', file);

      this.http.post<{ imageUrl: string }>('http://localhost:3000/api/campaigns/upload', formData).subscribe({
        next: (res) => {
          this.isUploading = false;
          this.form.imageUrl = res.imageUrl;
          this.uploadStatusText = `${file.name} (${sizeKB} KB) - Uploaded ✅`;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isUploading = false;
          this.uploadedFileName = '';
          this.uploadStatusText = 'Upload failed ❌';
          this.cdr.detectChanges();
          console.error('Failed to upload blog cover image:', err);
        }
      });
    }
  }

  ngOnInit() {
    this.loadBlogs();
  }

  loadBlogs() {
    this.blogService.getBlogs().subscribe(blogs => {
      this.blogs = blogs;
      this.cdr.detectChanges();
    });
  }

  openAddForm() {
    this.editingBlog = null;
    this.uploadStatusText = 'No file chosen';
    this.form = {
      title: '',
      author: '',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      imageUrl: '',
      category: 'Fashion',
      content: '',
      tagsString: ''
    };
    this.showForm = true;
  }

  editBlog(blog: Blog) {
    this.editingBlog = blog;
    this.uploadStatusText = blog.image ? 'Image Uploaded' : 'No file chosen';
    this.form = {
      title: blog.title,
      author: blog.author,
      date: blog.date,
      imageUrl: blog.image, // map image to imageUrl
      category: blog.category || 'Fashion',
      content: blog.content || '',
      tagsString: blog.tags ? blog.tags.join(', ') : ''
    };
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveBlog() {
    if (this.isUploading) {
      this.snackBar.open('⚠️ Please wait for the cover image to finish uploading.', 'Dismiss', { duration: 4000 });
      return;
    }

    const title = this.form.title?.trim();
    const author = this.form.author?.trim();
    const imageUrl = this.form.imageUrl?.trim();
    const content = this.form.content?.trim();

    if (!title || !author || !imageUrl || !content) {
      console.warn('Blog validation failed. Form state:', { title, author, imageUrl, content });
      this.snackBar.open('⚠️ Please fill out all required fields.', 'Dismiss', { duration: 4000 });
      return;
    }

    const tagsArray = (this.form.tagsString || '')
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload: any = {
      title: title,
      author: author,
      date: this.form.date,
      imageUrl: imageUrl,
      category: this.form.category,
      content: content,
      tags: tagsArray
    };

    if (this.editingBlog) {
      payload.id = this.editingBlog.id;
    }

    this.blogService.saveBlog(payload).subscribe(() => {
      this.loadBlogs();
      this.cancelForm();
    });
  }

  deleteBlog(blog: Blog) {
    this.showDeleteConfirmId = blog.id;
    this.showDeleteConfirmTitle = blog.title;
  }

  cancelDelete() {
    this.showDeleteConfirmId = null;
    this.showDeleteConfirmTitle = '';
  }

  confirmDelete() {
    if (this.showDeleteConfirmId !== null) {
      this.blogService.deleteBlog(this.showDeleteConfirmId).subscribe(() => {
        this.loadBlogs();
        this.cancelDelete();
      });
    }
  }

  cancelForm() {
    this.showForm = false;
    this.editingBlog = null;
    this.uploadedFileName = '';
    this.uploadStatusText = 'No file chosen';
    this.form = {
      title: '',
      author: '',
      date: '',
      imageUrl: '',
      category: 'Fashion',
      content: '',
      tagsString: ''
    };
  }
}
