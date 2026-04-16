import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service.js';

@Injectable({ providedIn: 'root' })
export class TicketService {
  constructor(private apiHttp: ApiHttpService) {}

  getAll(): Observable<any[]> {
    return this.apiHttp.getTickets() as unknown as Observable<any[]>;
  }

  getById(id: any): Observable<any> {
    return this.apiHttp.get(`/api/tickets/${id}`) as unknown as Observable<any>;
  }

  getByGroup(groupId: any): Observable<any[]> {
    return this.apiHttp.getTicketsByGroup(groupId) as unknown as Observable<any[]>;
  }

  create(payload: any): Observable<any> {
    return this.apiHttp.createTicket(payload);
  }

  update(id: any, payload: any): Observable<any> {
    return this.apiHttp.updateTicket(id, payload);
  }

  delete(id: any): Observable<any> {
    return this.apiHttp.deleteTicket(id);
  }

  getHistory(id: any): Observable<any[]> {
    return this.apiHttp.get(`/api/tickets/${id}/history`) as unknown as Observable<any[]>;
  }
}
