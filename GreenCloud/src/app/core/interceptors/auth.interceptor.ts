import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToasterService } from '../services/toaster.service';
import { resolveToastMessages } from '../config/toast-messages';

const TOKEN_KEY = 'admin_token';

/** Header name used by HttpClientService to pass toast action context */
const TOAST_ACTION_HEADER = 'X-Toast-Action';

/** Extract the most meaningful message from any backend response shape */
function extractBackendMessage(body: any): string | null {
  if (!body || typeof body !== 'object') return null;
  if (body.message && typeof body.message === 'string') return body.message;
  if (body.error?.message && typeof body.error.message === 'string') return body.error.message;
  return null;
}

/** Extract validation errors array */
function extractValidationErrors(body: any): string | null {
  if (!body?.errors || !Array.isArray(body.errors) || body.errors.length === 0) return null;
  return body.errors.slice(0, 3).join('; ');
}

/** Map HTTP status codes to user-friendly messages */
function getGenericError(status: number): string {
  const map: Record<number, string> = {
    0: 'Unable to connect to the server.',
    400: 'Invalid request. Please check your input.',
    401: 'Your session has expired. Please login again.',
    403: 'You do not have permission to perform this action.',
    404: 'Requested data was not found.',
    409: 'A conflict occurred. The record may already exist.',
    422: 'Validation failed. Please check the form.',
    500: 'Something went wrong on the server.',
    502: 'Server is temporarily unavailable.',
    503: 'Service is currently unavailable.',
  };
  return map[status] || `An error occurred (${status}).`;
}

/**
 * Functional HTTP interceptor that:
 * - Attaches Authorization: Bearer <JWT> header to API requests
 * - Handles 401 responses by redirecting to login
 * - Shows toast ONLY when X-Toast-Action header is present (explicit action context)
 *
 * Registered via provideHttpClient(withInterceptors([authInterceptor]))
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const toaster = inject(ToasterService);

  // Only attach token in browser (not SSR)
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const token = localStorage.getItem(TOKEN_KEY);

  // Clone request with Authorization header if token exists
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  // Check if this request wants auto-toast (set by HttpClientService options.toastAction)
  const toastAction = req.headers.get(TOAST_ACTION_HEADER);

  // Strip the custom header before sending to backend
  const cleanReq = toastAction ? authReq.clone({ headers: authReq.headers.delete(TOAST_ACTION_HEADER) }) : authReq;

  return next(cleanReq).pipe(
    // Handle successful responses — only toast if toastAction header was present
    tap((event) => {
      if (!toastAction || !(event instanceof HttpResponse) || !event.body) return;

      const body = event.body as any;
      const isSuccess = body?.success === true || body?.status === true;

      if (isSuccess) {
        // Priority: backend message > resolved action message
        const backendMsg = extractBackendMessage(body);
        const resolved = resolveToastMessages(toastAction);
        const message = backendMsg || (resolved?.success) || '';

        if (message) {
          toaster.success(message);
        }
      }
    }),
    // Handle errors
    catchError((error: HttpErrorResponse) => {
      // 401 → always redirect and toast, regardless of toastAction
      if (error.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('admin_data');
        toaster.warning('Your session has expired. Please login again.');
        router.navigate(['/adminapp/login']);
        return throwError(() => error);
      }

      // Only show error toast if toastAction header was present
      if (toastAction) {
        const body = error.error;

        // Priority: backend message > validation errors > resolved action error > generic
        const backendMsg = extractBackendMessage(body);
        const validationMsg = extractValidationErrors(body);
        const resolved = resolveToastMessages(toastAction);
        const message = backendMsg || validationMsg || (resolved?.error) || getGenericError(error.status);

        toaster.error(message);
      }

      return throwError(() => error);
    })
  );
};
