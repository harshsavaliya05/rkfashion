import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchQuerySubject = new BehaviorSubject<string>('');
  searchQuery$ = this.searchQuerySubject.asObservable();

  setQuery(query: string) {
    console.log('SearchService setQuery called with:', query);
    this.searchQuerySubject.next(query);
  }

  getQuery(): string {
    return this.searchQuerySubject.value;
  }
}
