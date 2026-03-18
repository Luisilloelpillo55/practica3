import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class TicketService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>('/api/tickets', {
      headers: this.auth.getAuthHeaders()
    });
  }

  getById(id: any): Observable<any> {
    return this.http.get<any>(`/api/tickets/${id}`, {
      headers: this.auth.getAuthHeaders()
    });
  }

  update(id: any, payload: any): Observable<any> {
    return this.http.put<any>(`/api/tickets/${id}`, payload, {
      headers: this.auth.getAuthHeaders()
    });
  }

  delete(id: any): Observable<any> {
    return this.http.delete<any>(`/api/tickets/${id}`, {
      headers: this.auth.getAuthHeaders()
    });
  }
}
