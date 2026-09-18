import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../../core/services/permission.service';

/**
 * Route guard that checks if the user has permission to access a page.
 * Usage in routes: canActivate: [permissionGuard('inquiryPage')]
 */
export const permissionGuard = (page: string): CanActivateFn => {
  return async () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    // Revalidate permissions on every guarded navigation. The old implementation
    // trusted localStorage forever, so a browser refresh could keep an outdated
    // permission map and silently redirect valid admin routes to the dashboard.
    await permissionService.loadPermissionsFromApi();

    // Super admins bypass
    if (permissionService.isSuperAdmin()) return true;

    // Check visible + view permissions
    if (permissionService.hasPermission(page, 'visible') && permissionService.hasPermission(page, 'view')) {
      return true;
    }

    // Redirect to dashboard if no permission
    router.navigate(['/adminapp/dashboard']);
    return false;
  };
};
