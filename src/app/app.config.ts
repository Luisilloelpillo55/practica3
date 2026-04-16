import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes.js';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { ApiInterceptor } from './interceptors/api.interceptor.js';
import { LoadingInterceptor } from './interceptors/loading.interceptor.js';
import { AuthService } from './services/auth.service';

/**
 * Initialize app - recover session from localStorage
 */
function initializeApp(authService: AuthService) {
  return () => {
    console.log('🚀 [App Initializer] Starting application session recovery...');
    return authService.recoverSession().then(recovered => {
      console.log('🚀 [App Initializer] Session recovery complete:', recovered ? 'USER RECOVERED' : 'NO USER');
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimations(),
    provideHttpClient(),
    MessageService,
    AuthService,
    
    /**
     * App Initializer - Recover session before angular bootstraps
     */
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    },

    /**
     * Registrar HttpInterceptor para:
     * - Validar esquema JSON universal
     * - Manejar errores de forma centralizada
     * - Añadir token JWT a requests
     * - Registrar logs de requests
     */
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor,
      multi: true
    },
    /**
     * Loading Interceptor
     * - Muestra spinner durante requests HTTP
     */
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    }
  ]
};

