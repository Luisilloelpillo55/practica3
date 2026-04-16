import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service.js';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private apiHttp: ApiHttpService) {}

  getAll(): Observable<any[]> {
    return this.apiHttp.get('/api/users') as unknown as Observable<any[]>;
  }

  getById(id: any): Observable<any> {
    return this.apiHttp.getUser(id) as unknown as Observable<any>;
  }

  create(payload: any): Observable<any> {
    return this.apiHttp.post('/api/users', payload) as unknown as Observable<any>;
  }

  update(id: any, payload: any): Observable<any> {
    return this.apiHttp.updateUser(id, payload) as unknown as Observable<any>;
  }

  delete(id: any): Observable<any> {
    return this.apiHttp.delete(`/api/users/${id}`) as unknown as Observable<any>;
  }

  // Permissions management
  getAllPermissions(): Observable<any[]> {
    return this.apiHttp.get('/api/users/permissions') as unknown as Observable<any[]>;
  }

  getUserPermissions(id: any): Observable<string[]> {
    return this.apiHttp.get(`/api/users/${id}/permissions`) as unknown as Observable<string[]>;
  }

  setUserPermissions(id: any, permissions: string[]): Observable<any> {
    return this.apiHttp.put(`/api/users/${id}/permissions`, { permissions });
  }
}
