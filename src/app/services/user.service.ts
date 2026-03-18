import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>('/api/users', {
      headers: this.auth.getAuthHeaders()
    });
  }

  getById(id: any): Observable<any> {
    return this.http.get<any>(`/api/users/${id}`, {
      headers: this.auth.getAuthHeaders()
    });
  }

  update(id: any, payload: any): Observable<any> {
    return this.http.put<any>(`/api/users/${id}`, payload, {
      headers: this.auth.getAuthHeaders()
    });
  }

  delete(id: any): Observable<any> {
    return this.http.delete<any>(`/api/users/${id}`, {
      headers: this.auth.getAuthHeaders()
    });
  }

  // Permissions management
  getAllPermissions(): Observable<any[]> {
    return this.http.get<any[]>('/api/users/permissions', { headers: this.auth.getAuthHeaders() });
  }

  getUserPermissions(id: any): Observable<string[]> {
    return this.http.get<string[]>(`/api/users/${id}/permissions`, { headers: this.auth.getAuthHeaders() });
  }

  setUserPermissions(id: any, permissions: string[]): Observable<any> {
    return this.http.put<any>(`/api/users/${id}/permissions`, { permissions }, { headers: this.auth.getAuthHeaders() });
  }
}
