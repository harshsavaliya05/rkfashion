import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface BlogItem {
  id: number;
  date: string;
  title: string;
  image: string;
  imageUrl: string;
  author: string;
  content: string;
  contentParagraphs: string[];
  tags: string[];
  category?: string;
  commentsCount?: number;
  quote?: string;
  quoteAuthor?: string;
}

export interface BlogComment {
  id?: number;
  name: string;
  email: string;
  phone: string;
  text: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private apiUrl = 'http://localhost:3000/api/blogs';

  private defaultBlogs = [
    {
      title: 'What Wearing Your Favorite Color Says About Your Mood',
      author: 'Alessandro Michele',
      date: '16 February 2026',
      imageUrl: 'assets/img/blog/blog-1.jpg',
      category: 'Fashion',
      content: 'Colors speak louder than words. Everyday choices in what color shirt or trousers you wear can communicate subtle messages about your feelings, confidence levels, and current mindset to the world.\n\nBlue represents tranquility and intelligence, white shows neatness and organization, and red stands for high energy and confidence. Learn to align your fashion choice with your mood.',
      quote: 'Colors, like features, follow the changes of the emotions.',
      quoteAuthor: 'Pablo Picasso',
      tags: ['Fashion', 'Color', 'Mood']
    },
    {
      title: 'Eternity Bands Do Last Forever',
      author: 'Aiden Blair',
      date: '21 February 2026',
      imageUrl: 'assets/img/blog/blog-2.jpg',
      category: 'Fashion',
      content: "Eternity bands are the ultimate symbol of eternal love. Typically featuring a continuous line of identically cut gemstones (usually diamonds), these rings are gifted on major milestones like anniversaries or births.\n\nChoosing an eternity band requires careful attention to the setting style (channel, prong, or bezel) and the quality of the diamonds. Since the stones go all the way around, correct sizing is crucial as these rings cannot easily be resized.",
      quote: "Love is not about how many days, months, or years you've been together. It's about how much you love each other every single day.",
      quoteAuthor: 'Emily Rose',
      tags: ['Jewelry', 'Wedding', 'Gift']
    },
    {
      title: 'The Health Benefits Of Sunglasses',
      author: 'Deercreative',
      date: '28 February 2026',
      imageUrl: 'assets/img/blog/blog-3.jpg',
      category: 'Accessories',
      content: 'Sunglasses are much more than a fashion statement. While they certainly complete a stylish look, their primary function is to protect your eyes from harmful ultraviolet (UV) radiation.\n\nExtended exposure to UV rays can lead to serious eye conditions, including cataracts and macular degeneration. High-quality sunglasses block 100% of both UVA and UVB rays, reducing glare and preventing eye strain when outdoors.',
      quote: 'Your vision will become clear only when you look into your heart.',
      quoteAuthor: 'Carl Jung',
      tags: ['Health', 'Accessories', 'Sun']
    }
  ];

  constructor(private http: HttpClient) {}

  getBlogs(): Observable<BlogItem[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      switchMap(blogs => {
        if (blogs.length === 0) {
          // Seed defaults
          return this.seedDefaultBlogs().pipe(
            switchMap(() => this.http.get<any[]>(this.apiUrl))
          );
        }
        return of(blogs);
      }),
      map(blogs => blogs.map(b => ({
        id: b.id,
        date: b.date,
        title: b.title,
        image: b.imageUrl,
        imageUrl: b.imageUrl,
        author: b.author,
        content: b.content,
        contentParagraphs: b.content ? b.content.split('\n\n') : [],
        category: b.category,
        quote: b.quote,
        quoteAuthor: b.quoteAuthor,
        tags: b.tags || []
      })))
    );
  }

  private seedDefaultBlogs(): Observable<any> {
    return of(null).pipe(
      switchMap(() => this.http.post(this.apiUrl, this.defaultBlogs[0])),
      switchMap(() => this.http.post(this.apiUrl, this.defaultBlogs[1])),
      switchMap(() => this.http.post(this.apiUrl, this.defaultBlogs[2]))
    );
  }

  getBlogById(id: number): Observable<BlogItem> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(b => ({
        id: b.id,
        date: b.date,
        title: b.title,
        image: b.imageUrl,
        imageUrl: b.imageUrl,
        author: b.author,
        content: b.content,
        contentParagraphs: b.content ? b.content.split('\n\n') : [],
        category: b.category,
        quote: b.quote,
        quoteAuthor: b.quoteAuthor,
        tags: b.tags || []
      }))
    );
  }

  saveBlog(blog: any): Observable<any> {
    if (blog.id && typeof blog.id === 'number' && blog.id > 1000000) {
      const { id, ...payload } = blog;
      return this.http.post(this.apiUrl, payload);
    }
    if (blog.id) {
      return this.http.put(`${this.apiUrl}/${blog.id}`, blog);
    }
    return this.http.post(this.apiUrl, blog);
  }

  deleteBlog(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getCommentsByBlogId(blogId: number): Observable<BlogComment[]> {
    return this.http.get<BlogComment[]>(`${this.apiUrl}/${blogId}/comments`);
  }

  addComment(blogId: number, comment: any): Observable<BlogComment> {
    return this.http.post<BlogComment>(`${this.apiUrl}/${blogId}/comments`, comment);
  }
}
