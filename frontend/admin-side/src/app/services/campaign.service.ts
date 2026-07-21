import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CampaignPayload {
  subject: string;
  title: string;
  description: string;
  buttonText?: string;
  discountPercent?: number | null;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private apiUrl = 'http://localhost:3000/api/campaigns';

  constructor(private http: HttpClient) {}

  sendCampaign(payload: CampaignPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/send`, payload);
  }

  uploadCampaignImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ imageUrl: string }>(`${this.apiUrl}/upload`, formData);
  }
}
