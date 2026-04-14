import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service.js';

@Injectable({ providedIn: 'root' })
export class GroupService {
  constructor(private apiHttp: ApiHttpService) {}

  getAll(): Observable<any[]> {
    return this.apiHttp.getGroups() as unknown as Observable<any[]>;
  }

  getById(id: any): Observable<any> {
    return this.apiHttp.getGroup(id);
  }

  create(payload: any): Observable<any> {
    return this.apiHttp.createGroup(payload);
  }

  update(id: any, payload: any): Observable<any> {
    return this.apiHttp.updateGroup(id, payload);
  }

  delete(id: any): Observable<any> {
    return this.apiHttp.deleteGroup(id);
  }
}
