import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiResponse, INTERNAL_OP_CODES } from '../models/api-response.model.js';

/**
 * Interceptor HTTP que:
 * 1. Valida que las respuestas sigan el esquema JSON universal { statusCode, intOpCode, data }
 * 2. Maneja errores de forma centralizada
 * 3. Añade el token JWT a los headers
 * 4. Registra las respuestas (logs)
 */
@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Añadir fecha de inicio para calcular tiempo de respuesta
    const startTime = Date.now();

    // Los endpoints de /auth/login y /auth/register no requieren token
    const isAuthEndpoint = request.url.includes('/login') || request.url.includes('/register');

    // Clonar request y añadir headers necesarios
    let modifiedRequest = this.addHeaders(request, isAuthEndpoint);

    return next.handle(modifiedRequest).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          const responseTime = Date.now() - startTime;
          this.logRequest(modifiedRequest, event, responseTime);
          
          // Validar que la respuesta sigue el esquema esperado
          if (!this.isValidApiResponse(event.body)) {
            console.warn('Response does not match expected schema:', event.body);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        const responseTime = Date.now() - startTime;
        this.logError(modifiedRequest, error, responseTime);
        return throwError(() => this.formatErrorResponse(error));
      })
    );
  }

  /**
   * Añade headers necesarios al request
   */
  private addHeaders(request: HttpRequest<any>, isAuthEndpoint: boolean): HttpRequest<any> {
    let headers = request.headers
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // Añadir token JWT si existe y no es endpoint de autenticación
    if (!isAuthEndpoint) {
      const token = this.getToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return request.clone({ headers });
  }

  /**
   * Obtiene el token del localStorage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem('auth_user');
      if (stored) {
        const user = JSON.parse(stored);
        return user?.token || null;
      }
    } catch (e) {
      console.error('Error retrieving token:', e);
    }
    return null;
  }

  /**
   * Valida que la respuesta siga el esquema { statusCode, intOpCode, data }
   */
  private isValidApiResponse(body: any): boolean {
    if (!body || typeof body !== 'object') return false;
    return 'statusCode' in body && 'intOpCode' in body && 'data' in body;
  }

  /**
   * Registra un request exitoso (para logs centralizados)
   */
  private logRequest(request: HttpRequest<any>, response: HttpResponse<any>, responseTime: number): void {
    const logData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      statusCode: response.status,
      responseTime: `${responseTime}ms`,
      user: this.getCurrentUser()
    };
    console.log('[API Request]', logData);
    
    // TODO: Enviar a servicio centralizado de logs
    // this.logsService.log(logData);
  }

  /**
   * Registra un error de request (para logs centralizados)
   */
  private logError(request: HttpRequest<any>, error: HttpErrorResponse, responseTime: number): void {
    const logData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      statusCode: error.status,
      responseTime: `${responseTime}ms`,
      error: error.error?.error || error.message,
      user: this.getCurrentUser()
    };
    console.error('[API Error]', logData);
    
    // TODO: Enviar a servicio centralizado de logs
    // this.logsService.logError(logData);
  }

  /**
   * Obtiene información del usuario actual
   */
  private getCurrentUser(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem('auth_user');
      if (stored) {
        const user = JSON.parse(stored);
        return user?.usuario || null;
      }
    } catch (e) {
      console.error('Error retrieving user:', e);
    }
    return null;
  }

  /**
   * Formatea la respuesta de error al esquema universal
   */
  private formatErrorResponse(error: HttpErrorResponse): ApiResponse {
    let intOpCode = INTERNAL_OP_CODES.GATEWAY_SERVER_ERROR;
    let errorMessage = 'Error interno del servidor';

    // Determinar código de operación según status
    if (error.status === 400) {
      intOpCode = INTERNAL_OP_CODES.GATEWAY_BAD_REQUEST;
      errorMessage = 'Solicitud inválida';
    } else if (error.status === 401) {
      intOpCode = INTERNAL_OP_CODES.GATEWAY_UNAUTHORIZED;
      errorMessage = 'No autenticado';
    } else if (error.status === 403) {
      intOpCode = INTERNAL_OP_CODES.GATEWAY_FORBIDDEN;
      errorMessage = 'Permiso denegado';
    } else if (error.status === 404) {
      errorMessage = 'Recurso no encontrado';
    } else if (error.status === 429) {
      intOpCode = INTERNAL_OP_CODES.GATEWAY_RATE_LIMIT;
      errorMessage = 'Demasiadas solicitudes. Intenta más tarde.';
    }

    // Si la respuesta del servidor ya sigue el esquema, devolverla
    if (error.error && this.isValidApiResponse(error.error)) {
      return error.error;
    }

    // Si no, crear una respuesta estandarizada
    return {
      statusCode: error.status || 500,
      intOpCode,
      data: null,
      error: error.error?.error || errorMessage,
      details: error.error?.details || null
    };
  }
}
