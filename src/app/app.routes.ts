import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
		children: [
			{ path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
			{ path: 'practice-button', loadComponent: () => import('./practice-button/practice-button.component').then(m => m.PracticeButtonComponent) },
			{ path: 'register', loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent) },
			{ path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
			{ path: '', redirectTo: 'home', pathMatch: 'full' }
		]
	},
	{ path: '**', redirectTo: '' }
];
