import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClientService } from '../../core/services/http-client.service';

export interface LedgerTransaction {
  _id: string;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT' | 'DEBIT' | 'ADJUSTMENT';
  transactionDate: string;
  referenceNo: string;
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
}

export interface LedgerSummary {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  outstandingBalance: number;
}

export interface LedgerTransactionsResponse {
  success: boolean;
  data: LedgerTransaction[];
}

export interface LedgerResponse {
  success: boolean;
  data: { ledger: { _id: string; openingBalance: number; currentBalance: number }; summary: LedgerSummary };
}

@Injectable({ providedIn: 'root' })
export class LedgerService {
  private http = inject(HttpClientService);

  async getLedger(customerId: string): Promise<LedgerResponse> {
    return firstValueFrom(this.http.get<LedgerResponse>(`/ledgers/${customerId}`));
  }

  async getTransactions(
    customerId: string,
    filters?: { dateFrom?: string; dateTo?: string; type?: string; referenceNo?: string },
  ): Promise<LedgerTransactionsResponse> {
    const q: Record<string, string | number> = {};
    if (filters?.dateFrom) q['dateFrom'] = filters.dateFrom;
    if (filters?.dateTo) q['dateTo'] = filters.dateTo;
    if (filters?.type) q['type'] = filters.type;
    if (filters?.referenceNo) q['referenceNo'] = filters.referenceNo;
    return firstValueFrom(this.http.get<LedgerTransactionsResponse>(`/ledgers/${customerId}/transactions`, q));
  }
}
