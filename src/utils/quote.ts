import type { QuoteInput, QuoteItem } from '../types/quote';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const createQuoteItem = (): QuoteItem => ({
  id: createId(),
  description: '',
  unitPrice: 0,
  quantity: 1,
  amount: 0,
});

export const calculateItemAmount = (unitPrice: number, quantity: number) => {
  const safeUnitPrice = Number(unitPrice) || 0;
  const safeQuantity = Number(quantity) || 0;
  return safeUnitPrice * safeQuantity;
};

export const recalculateQuote = (input: QuoteInput): QuoteInput => {
  const items = input.items.map((item) => {
    const unitPrice = Number(item.unitPrice) || 0;
    const quantity = Number(item.quantity) || 0;

    return {
      ...item,
      unitPrice,
      quantity,
      amount: calculateItemAmount(unitPrice, quantity),
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = Number(input.taxRate) || 0;
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + taxAmount;

  return {
    ...input,
    items,
    taxRate,
    subtotal,
    taxAmount,
    total,
  };
};

const toDateInputValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

export const createQuoteNumber = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');

  return `Q-${y}${m}${d}-${h}${min}${s}`;
};

export const createEmptyQuoteInput = (): QuoteInput => {
  const issueDate = new Date();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 14);

  return recalculateQuote({
    quoteNumber: createQuoteNumber(issueDate),
    customerName: '',
    companyName: '',
    subject: '',
    issueDate: toDateInputValue(issueDate),
    validUntil: toDateInputValue(validUntil),
    items: [createQuoteItem()],
    subtotal: 0,
    taxRate: 10,
    taxAmount: 0,
    total: 0,
    notes: '',
    status: 'draft',
  });
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ja-JP').format(value);
};