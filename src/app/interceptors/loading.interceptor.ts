import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private requestCount = 0;

  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Increment request count and show loader
    this.requestCount++;
    this.loadingService.show();

    return next.handle(req).pipe(
      finalize(() => {
        // Decrement request count
        this.requestCount--;
        
        // Hide loader only when all requests are done
        if (this.requestCount === 0) {
          setTimeout(() => this.loadingService.hide(), 200);
        }
      })
    );
  }
}
