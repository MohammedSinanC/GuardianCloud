import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Options for HTTP requests.
 * @toastAction - Dot-notation action key (e.g. 'quotation.send') for auto-toast.
 *               When set, the interceptor will show a toast on success/error.
 */
export interface HttpRequestOptions {
  toastAction?: string;
}

/**
 * Centralized HTTP client service for all API communication.
 *
 * - Wraps Angular HttpClient
 * - Provides convenience methods: get, post, put, delete
 * - Automatically prefixes the API base URL
 * - Auth headers are handled by the authInterceptor (not here)
 * - Toast notifications are handled by the interceptor when toastAction is set
 *
 * Usage:
 *   constructor(private httpClient: HttpClientService) {}
 *   this.httpClient.get('/admin/dashboard')
 *   this.httpClient.post('/inquiries', data, { toastAction: 'inquiry.create' })
 */
@Injectable({ providedIn: 'root' })
export class HttpClientService {
  private http = inject(HttpClient);

  /** Base API URL derived from environment (strips /api/v1 if present for admin routes) */
  private readonly baseUrl = environment.apiUrl.replace('/api/v1', '');

  /**
   * Build full URL from a relative path
   */
  private buildUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}/api${normalizedPath}`;
  }

  /**
   * HTTP GET request — no toast by default
   */
  get<T = any>(path: string, params?: Record<string, string | number | boolean>, options?: HttpRequestOptions): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    const headers = options?.toastAction ? new HttpHeaders({ 'X-Toast-Action': options.toastAction }) : undefined;
    return this.http.get<T>(this.buildUrl(path), { params: httpParams, headers });
  }

  /**
   * HTTP POST request — pass toastAction to trigger auto-toast
   */
  post<T = any>(path: string, body: any = {}, options?: HttpRequestOptions): Observable<T> {
    const headers = options?.toastAction ? new HttpHeaders({ 'X-Toast-Action': options.toastAction }) : undefined;
    return this.http.post<T>(this.buildUrl(path), body, { headers });
  }

  /**
   * HTTP PUT request — pass toastAction to trigger auto-toast
   */
  put<T = any>(path: string, body: any = {}, options?: HttpRequestOptions): Observable<T> {
    const headers = options?.toastAction ? new HttpHeaders({ 'X-Toast-Action': options.toastAction }) : undefined;
    return this.http.put<T>(this.buildUrl(path), body, { headers });
  }

  /**
   * HTTP DELETE request — pass toastAction to trigger auto-toast
   */
  delete<T = any>(path: string, options?: HttpRequestOptions): Observable<T> {
    const headers = options?.toastAction ? new HttpHeaders({ 'X-Toast-Action': options.toastAction }) : undefined;
    return this.http.delete<T>(this.buildUrl(path), { headers });
  }

  /**
   * HTTP PATCH request — pass toastAction to trigger auto-toast
   */
  patch<T = any>(path: string, body: any = {}, options?: HttpRequestOptions): Observable<T> {
    const headers = options?.toastAction ? new HttpHeaders({ 'X-Toast-Action': options.toastAction }) : undefined;
    return this.http.patch<T>(this.buildUrl(path), body, { headers });
  }

}
