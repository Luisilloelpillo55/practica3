import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    console.log('🛡️  [AuthGuard] Checking route:', state.url);
    // If running on the server (SSR) do not attempt client-side session checks
    // Allow the server to render the route and defer auth enforcement to the client.
    if (typeof window === 'undefined') {
      console.log('🛡️  [AuthGuard] Server-side navigation detected — allowing route for SSR.');
      return true;
    }

    let isLoggedIn = this.authService.isLoggedIn();
    
    // If not logged in, try to recover from storage
    if (!isLoggedIn) {
      console.log('⚠️  [AuthGuard] Not logged in, attempting session recovery from localStorage...');
      const recovered = await this.authService.recoverSession();
      isLoggedIn = recovered;
      console.log('🔄 [AuthGuard] Session recovery result:', recovered ? 'SUCCESS' : 'FAILED');
    }
    
    const user = this.authService.getUser();
    console.log('🛡️  [AuthGuard] Final status - isLoggedIn:', isLoggedIn, 'user:', user?.usuario || 'null');
    
    if (isLoggedIn) {
      console.log('✅ [AuthGuard] User authenticated, allowing access to:', state.url);
      return true;
    }
    
    console.warn('❌ [AuthGuard] User not authenticated, redirecting to login from:', state.url);
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
