import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_ENDPOINTS } from '../config/api.config.js';
import { AuthService } from './auth.service.js';

/**
 * HTTP Service wrapper that ensures all requests go to the API Gateway (port 3008)
 * instead of the SSR server (port 4200)
 */
@Injectable({
  providedIn: 'root'
})
export class ApiHttpService {
  constructor(private http: HttpClient, private injector: Injector) {}

  private getHeaders(): HttpHeaders {
    // Get auth headers from AuthService (includes Authorization token)
    // Use injector.get() for lazy injection to avoid circular dependency
    try {
      const authService = this.injector.get(AuthService);
      return authService.getAuthHeaders();
    } catch (e) {
      // Fallback if AuthService not available
      return new HttpHeaders({ 'Content-Type': 'application/json' });
    }
  }

  // Users endpoints
  post<T = any>(endpoint: string, data: any, options?: any) {
    return this.http.post<T>(endpoint, data, { headers: this.getHeaders(), ...options });
  }

  get<T = any>(endpoint: string, options?: any) {
    return this.http.get<T>(endpoint, { headers: this.getHeaders(), ...options });
  }

  put<T = any>(endpoint: string, data: any, options?: any) {
    return this.http.put<T>(endpoint, data, { headers: this.getHeaders(), ...options });
  }

  delete<T = any>(endpoint: string, options?: any) {
    return this.http.delete<T>(endpoint, { headers: this.getHeaders(), ...options });
  }

  // Convenience methods for API endpoints
  loginUser(username: string, password: string) {
    return this.post(`${API_ENDPOINTS.USERS}/login`, { username, password });
  }

  registerUser(data: any) {
    return this.post(`${API_ENDPOINTS.USERS}/register`, data);
  }

  getUser(id: string) {
    return this.get(`${API_ENDPOINTS.USERS}/${id}`);
  }

  updateUser(id: string, data: any) {
    return this.put(`${API_ENDPOINTS.USERS}/${id}`, data);
  }

  getGroups() {
    return this.get(API_ENDPOINTS.GROUPS);
  }

  getGroup(id: string) {
    return this.get(`${API_ENDPOINTS.GROUPS}/${id}`);
  }

  createGroup(data: any) {
    return this.post(API_ENDPOINTS.GROUPS, data);
  }

  updateGroup(id: string, data: any) {
    return this.put(`${API_ENDPOINTS.GROUPS}/${id}`, data);
  }

  deleteGroup(id: string) {
    return this.delete(`${API_ENDPOINTS.GROUPS}/${id}`);
  }

  getTickets() {
    return this.get(API_ENDPOINTS.TICKETS);
  }

  getTicketsByGroup(groupId: string) {
    return this.get(`${API_ENDPOINTS.GROUPS}/${groupId}/tickets`);
  }

  createTicket(data: any) {
    return this.post(API_ENDPOINTS.TICKETS, data);
  }

  updateTicket(id: string, data: any) {
    return this.put(`${API_ENDPOINTS.TICKETS}/${id}`, data);
  }

  deleteTicket(id: string) {
    return this.delete(`${API_ENDPOINTS.TICKETS}/${id}`);
  }
}
