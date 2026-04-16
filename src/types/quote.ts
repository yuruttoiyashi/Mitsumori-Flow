export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'pending';

export interface QuoteItem {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export interface QuoteInput {
  quoteNumber: string;
  customerName: string;
  companyName: string;
  subject: string;
  issueDate: string;
  validUntil: string;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  status: QuoteStatus;
}

export interface QuoteRecord extends QuoteInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}