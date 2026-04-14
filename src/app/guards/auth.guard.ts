import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service.js';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    console.log('🛡️  [AuthGuard] Checking route:', state.url);
    
    let isLoggedIn = this.authService.isLoggedIn();
    
    // If not logged in, try to recover session (useful for HMR)
    if (!isLoggedIn) {
      console.log('⚠️  [AuthGuard] Not logged in, attempting session recovery...');
      const recovered = await this.authService.recoverSession();
      isLoggedIn = recovered;
      console.log('🔄 [AuthGuard] Session recovery result:', recovered ? 'SUCCESS' : 'FAILED');
    }
    
    const user = this.authService.getUser();
    console.log('🛡️  [AuthGuard] Final status - isLoggedIn:', isLoggedIn, 'user:', user?.usuario || 'null');
    
    if (isLoggedIn) {
      console.log('✅ [AuthGuard] User authenticated, allowing access');
      return true;
    }
    
    console.warn('❌ [AuthGuard] User not authenticated, redirecting to login');
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
