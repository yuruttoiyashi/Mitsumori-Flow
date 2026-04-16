import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const QUOTES_COLLECTION = "quotes";

export type QuoteItemRecord = {
  description?: string;
  itemName?: string;
  content?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  price?: number;
  amount?: number;
  lineTotal?: number;
};

export type QuoteRecord = {
  id?: string;
  quoteNumber?: string;
  projectName?: string;
  subject?: string;
  title?: string;
  shipperCompany?: string;
  companyName?: string;
  clientCompany?: string;
  customerCompany?: string;
  shipperContactName?: string;
  customerName?: string;
  contactName?: string;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  total?: number;
  grandTotal?: number;
  issueDate?: string;
  validUntil?: string;
  notes?: string;
  remark?: string;
  memo?: string;
  status?: string;
  items?: QuoteItemRecord[];
  ownerUid?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};

type LooseQuoteInput = {
  id?: string;
  quoteNumber?: string;
  projectName?: string;
  subject?: string;
  title?: string;
  shipperCompany?: string;
  companyName?: string;
  clientCompany?: string;
  customerCompany?: string;
  shipperContactName?: string;
  customerName?: string;
  contactName?: string;
  subtotal?: number | string;
  taxRate?: number | string;
  taxAmount?: number | string;
  totalAmount?: number | string;
  total?: number | string;
  grandTotal?: number | string;
  issueDate?: string;
  validUntil?: string;
  notes?: string;
  remark?: string;
  memo?: string;
  status?: string;
  items?: unknown;
  ownerUid?: string;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  const normalized = value.replace(/[¥,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeItems(items: unknown): QuoteItemRecord[] {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;

    const quantity = toNumber(row.quantity ?? row.qty);
    const unitPrice = toNumber(row.unitPrice ?? row.price);
    const directAmount = toNumber(row.amount ?? row.lineTotal);
    const amount = directAmount || quantity * unitPrice;

    return {
      description: toStringValue(row.description),
      itemName: toStringValue(row.itemName),
      content: toStringValue(row.content),
      quantity,
      qty: quantity,
      unitPrice,
      price: unitPrice,
      amount,
      lineTotal: amount,
    };
  });
}

function calculateSubtotal(items: QuoteItemRecord[]) {
  return items.reduce((sum, item) => {
    const amount = toNumber(item.amount ?? item.lineTotal);
    if (amount > 0) return sum + amount;

    const quantity = toNumber(item.quantity ?? item.qty);
    const unitPrice = toNumber(item.unitPrice ?? item.price);
    return sum + quantity * unitPrice;
  }, 0);
}

function buildQuoteNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return `Q-${y}${m}${d}-${h}${min}`;
}

function getSortTime(value: unknown) {
  if (!value) return 0;

  if (typeof value === "object" && value !== null) {
    const maybe = value as { seconds?: number; toDate?: () => Date };
    if (typeof maybe.toDate === "function") {
      return maybe.toDate().getTime();
    }
    if (typeof maybe.seconds === "number") {
      return maybe.seconds * 1000;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  return 0;
}

function sortQuotes(quotes: QuoteRecord[]) {
  return [...quotes].sort((a, b) => {
    const bTime =
      getSortTime(b.updatedAt) || getSortTime(b.createdAt) || getSortTime(b.issueDate);
    const aTime =
      getSortTime(a.updatedAt) || getSortTime(a.createdAt) || getSortTime(a.issueDate);
    return bTime - aTime;
  });
}

function normalizeQuotePayload(payload: LooseQuoteInput, userId?: string): QuoteRecord {
  const items = normalizeItems(payload.items);
  const subtotal =
    toNumber(payload.subtotal) > 0 ? toNumber(payload.subtotal) : calculateSubtotal(items);

  const taxRate =
    toNumber(payload.taxRate) > 0 ? toNumber(payload.taxRate) : 0.1;

  const taxAmount =
    toNumber(payload.taxAmount) > 0
      ? toNumber(payload.taxAmount)
      : Math.round(subtotal * taxRate);

  const totalAmount =
    toNumber(payload.totalAmount ?? payload.total ?? payload.grandTotal) > 0
      ? toNumber(payload.totalAmount ?? payload.total ?? payload.grandTotal)
      : subtotal + taxAmount;

  return {
    ...payload,
    quoteNumber: toStringValue(payload.quoteNumber) || buildQuoteNumber(),
    projectName: toStringValue(payload.projectName ?? payload.subject ?? payload.title),
    shipperCompany: toStringValue(
      payload.shipperCompany ??
        payload.companyName ??
        payload.clientCompany ??
        payload.customerCompany
    ),
    shipperContactName: toStringValue(
      payload.shipperContactName ?? payload.customerName ?? payload.contactName
    ),
    issueDate: toStringValue(payload.issueDate),
    validUntil: toStringValue(payload.validUntil),
    notes: toStringValue(payload.notes ?? payload.remark ?? payload.memo),
    status: toStringValue(payload.status) || "draft",
    items,
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    total: totalAmount,
    grandTotal: totalAmount,
    ownerUid: toStringValue(payload.ownerUid) || userId || "",
  };
}

export async function getQuotes(_userId?: string): Promise<QuoteRecord[]> {
  const snapshot = await getDocs(collection(db, QUOTES_COLLECTION));

  const quotes = snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as QuoteRecord;
    return {
      id: docSnap.id,
      ...data,
    };
  });

  return sortQuotes(quotes);
}

export async function fetchQuotes(userId?: string) {
  return getQuotes(userId);
}

export async function listQuotes(userId?: string) {
  return getQuotes(userId);
}

export async function getAllQuotes(userId?: string) {
  return getQuotes(userId);
}

export async function getQuoteById(id: string, _userId?: string): Promise<any | null> {
  const ref = doc(db, QUOTES_COLLECTION, id);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as QuoteRecord),
  };
}

export async function getQuote(id: string, userId?: string) {
  return getQuoteById(id, userId);
}

export async function fetchQuote(id: string, userId?: string) {
  return getQuoteById(id, userId);
}

export async function getSingleQuote(id: string, userId?: string) {
  return getQuoteById(id, userId);
}

export async function readQuote(id: string, userId?: string) {
  return getQuoteById(id, userId);
}

export async function createQuote(payload: LooseQuoteInput, userId?: string): Promise<string> {
  const normalized = normalizeQuotePayload(payload, userId);

  const record = {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, QUOTES_COLLECTION), record);
  return docRef.id;
}

export async function addQuote(payload: LooseQuoteInput, userId?: string) {
  return createQuote(payload, userId);
}

export async function updateQuote(
  id: string,
  payload: LooseQuoteInput,
  userId?: string
): Promise<void> {
  const normalized = normalizeQuotePayload(payload, userId);
  const { id: _omitId, createdAt: _omitCreatedAt, ...updatePayload } = normalized;

  const ref = doc(db, QUOTES_COLLECTION, id);

  await updateDoc(ref, {
    ...updatePayload,
    updatedAt: serverTimestamp(),
  });
}

export async function updateQuoteById(
  id: string,
  payload: LooseQuoteInput,
  userId?: string
) {
  return updateQuote(id, payload, userId);
}

export async function saveQuote(payload: LooseQuoteInput, userId?: string) {
  if (typeof payload.id === "string" && payload.id) {
    await updateQuote(payload.id, payload, userId);
    return payload.id;
  }

  return createQuote(payload, userId);
}

export async function deleteQuote(id: string, _userId?: string): Promise<void> {
  const ref = doc(db, QUOTES_COLLECTION, id);
  await deleteDoc(ref);
}

export async function removeQuote(id: string, userId?: string) {
  return deleteQuote(id, userId);
}