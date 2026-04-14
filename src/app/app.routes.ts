import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard.js';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('../app/layout/main-layout/main-layout.component.js').then(m => m.MainLayoutComponent),
		children: [
			{ path: 'home', loadComponent: () => import('./home/home.component.js').then(m => m.HomeComponent), canActivate: [AuthGuard] },
			{ path: 'practice-button', loadComponent: () => import('./practice-button/practice-button.component.js').then(m => m.PracticeButtonComponent), canActivate: [AuthGuard] },
			{ path: 'group', loadComponent: () => import('./pages/group/group.component.js').then(m => m.GroupComponent), canActivate: [AuthGuard] },
			{ path: 'group-info', loadComponent: () => import('./pages/group-info/group-info.component.js').then(m => m.GroupInfoComponent), canActivate: [AuthGuard] },
			{ path: 'kanban', loadComponent: () => import('./pages/kanban/kanban.component.js').then(m => m.KanbanComponent), canActivate: [AuthGuard] },
			{ path: 'user', loadComponent: () => import('./pages/user/user.component.js').then(m => m.UserComponent), canActivate: [AuthGuard] },
			{ path: 'user-management', loadComponent: () => import('./pages/user-management/user-management.component.js').then(m => m.UserManagementComponent), canActivate: [AuthGuard] },
			{ path: 'admin-groups', loadComponent: () => import('./pages/admin-groups/admin-groups.component.js').then(m => m.AdminGroupsComponent), canActivate: [AuthGuard] },
			{ path: 'admin-users', loadComponent: () => import('./pages/admin-users/admin-users.component.js').then(m => m.AdminUsersComponent), canActivate: [AuthGuard] },
			{ path: 'register', loadComponent: () => import('./register/register.component.js').then(m => m.RegisterComponent) },
			{ path: 'login', loadComponent: () => import('./login/login.component.js').then(m => m.LoginComponent) },
			{ path: 'practice', redirectTo: 'practice-button', pathMatch: 'full' },
			{ path: '', redirectTo: 'home', pathMatch: 'full' }
		]
	},
	{ path: '**', redirectTo: 'home' }
];
