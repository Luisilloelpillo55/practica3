import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('../app/layout/main-layout/main-layout.component.js').then(m => m.MainLayoutComponent),
		children: [
			{ path: 'home', loadComponent: () => import('./home/home.component.js').then(m => m.HomeComponent) },
			{ path: 'practice-button', loadComponent: () => import('./practice-button/practice-button.component.js').then(m => m.PracticeButtonComponent) },
			{ path: 'group', loadComponent: () => import('./pages/group/group.component.js').then(m => m.GroupComponent) },
			{ path: 'user', loadComponent: () => import('./pages/user/user.component.js').then(m => m.UserComponent) },
			{ path: 'register', loadComponent: () => import('./register/register.component.js').then(m => m.RegisterComponent) },
			{ path: 'login', loadComponent: () => import('./login/login.component.js').then(m => m.LoginComponent) },
			{ path: 'practice', redirectTo: 'practice-button', pathMatch: 'full' },
			{ path: '', redirectTo: 'home', pathMatch: 'full' }
		]
	},
	{ path: '**', redirectTo: 'login' }
];
