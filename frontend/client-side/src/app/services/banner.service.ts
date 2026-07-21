import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Banner {
  id: number;
  title: string;
  subtitleTag: string;
  description: string;
  seasonLabel: string;
  btnText: string;
  link: string;
  imageUrl: string;
  videoUrl?: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private apiUrl = 'http://localhost:3000/api/banners';

  constructor(private http: HttpClient) {}

  getBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(this.apiUrl);
  }

  saveBanner(banner: any): Observable<Banner> {
    if (banner.id && typeof banner.id === 'number' && banner.id > 1000000) {
      // it was a temp client-side ID or we want to create a new banner
      const { id, ...payload } = banner;
      return this.http.post<Banner>(this.apiUrl, payload);
    }
    if (banner.id) {
      return this.http.put<Banner>(`${this.apiUrl}/${banner.id}`, banner);
    }
    return this.http.post<Banner>(this.apiUrl, banner);
  }

  deleteBanner(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
