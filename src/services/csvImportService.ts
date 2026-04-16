import Papa from 'papaparse';
import { createQuote } from './quoteService';
import type { QuoteInput, QuoteItem, QuoteStatus } from '../types/quote';
import {
  createQuoteItem,
  createQuoteNumber,
  recalculateQuote,
} from '../utils/quote';

type CsvRow = Record<string, string | undefined>;

export type CsvImportResult = {
  createdCount: number;
  skippedCount: number;
  errors: string[];
};

const getTodayString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

const getDefaultValidUntil = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

const pickValue = (row: CsvRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return '';
};

const normalizeDate = (value: string, fallback: string) => {
  if (!value) return fallback;

  const normalized = value.trim().replace(/\./g, '-').replace(/\//g, '-');
  const parts = normalized.split('-');

  if (parts.length !== 3) return fallback;

  const [year, month, day] = parts;
  if (!year || !month || !day) return fallback;

  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const toNumber = (value: string, fallback = 0) => {
  if (!value) return fallback;

  const normalized = value.replace(/[^\d.-]/g, '');
  const num = Number(normalized);

  return Number.isFinite(num) ? num : fallback;
};

const normalizeStatus = (value: string): QuoteStatus => {
  const normalized = value.trim().toLowerCase();

  const map: Record<string, QuoteStatus> = {
    draft: 'draft',
    sent: 'sent',
    approved: 'approved',
    rejected: 'rejected',
    pending: 'pending',
    下書き: 'draft',
    送付済み: 'sent',
    承認: 'approved',
    失注: 'rejected',
    保留: 'pending',
  };

  return map[normalized] ?? 'draft';
};

const buildItem = (
  description: string,
  unitPriceRaw: string,
  quantityRaw: string,
): QuoteItem | null => {
  const trimmedDescription = description.trim();
  if (!trimmedDescription) return null;

  return {
    id: createQuoteItem().id,
    description: trimmedDescription,
    unitPrice: toNumber(unitPriceRaw, 0),
    quantity: toNumber(quantityRaw, 1),
    amount: 0,
  };
};

const parseCompactItems = (raw: string): QuoteItem[] => {
  if (!raw.trim()) return [];

  return raw
    .split('|')
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [description = '', unitPrice = '0', quantity = '1'] = block
        .split('::')
        .map((part) => part.trim());

      return buildItem(description, unitPrice, quantity);
    })
    .filter((item): item is QuoteItem => item !== null);
};

const parseColumnItems = (row: CsvRow): QuoteItem[] => {
  const items: QuoteItem[] = [];

  for (let i = 1; i <= 5; i += 1) {
    const description = pickValue(row, [
      `item${i}Description`,
      `item${i}Desc`,
      `明細${i}`,
      `明細${i}内容`,
    ]);

    const unitPrice = pickValue(row, [
      `item${i}UnitPrice`,
      `明細${i}単価`,
    ]);

    const quantity = pickValue(row, [
      `item${i}Quantity`,
      `明細${i}数量`,
    ]);

    const item = buildItem(description, unitPrice, quantity);
    if (item) {
      items.push(item);
    }
  }

  return items;
};

const rowToQuoteInput = (row: CsvRow): QuoteInput => {
  const today = getTodayString();
  const validUntil = getDefaultValidUntil();

  const customerName = pickValue(row, ['customerName', '顧客名', '担当者名']);
  const companyName = pickValue(row, ['companyName', '会社名', '荷主企業']);
  const subject = pickValue(row, ['subject', '件名']);
  const compactItems = pickValue(row, ['items', '明細']);
  const taxRate = toNumber(pickValue(row, ['taxRate', '税率', '消費税率']), 10);

  const items =
    compactItems !== '' ? parseCompactItems(compactItems) : parseColumnItems(row);

  if (!customerName) {
    throw new Error('顧客名が不足しています。');
  }

  if (!subject) {
    throw new Error('件名が不足しています。');
  }

  if (items.length === 0) {
    throw new Error('明細が不足しています。');
  }

  return recalculateQuote({
    quoteNumber:
      pickValue(row, ['quoteNumber', '見積番号']) || createQuoteNumber(),
    customerName,
    companyName,
    subject,
    issueDate: normalizeDate(
      pickValue(row, ['issueDate', '作成日']),
      today,
    ),
    validUntil: normalizeDate(
      pickValue(row, ['validUntil', '有効期限']),
      validUntil,
    ),
    items,
    subtotal: 0,
    taxRate,
    taxAmount: 0,
    total: 0,
    notes: pickValue(row, ['notes', '備考']),
    status: normalizeStatus(pickValue(row, ['status', 'ステータス'])),
  });
};

export const importQuotesFromCsvFile = async (
  file: File,
): Promise<CsvImportResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: async (results) => {
        try {
          let createdCount = 0;
          let skippedCount = 0;
          const errors: string[] = [];

          for (let index = 0; index < results.data.length; index += 1) {
            const row = results.data[index];

            try {
              const input = rowToQuoteInput(row);
              await createQuote(input);
              createdCount += 1;
            } catch (error) {
              skippedCount += 1;
              errors.push(
                `${index + 2}行目: ${
                  error instanceof Error ? error.message : '取込に失敗しました。'
                }`,
              );
            }
          }

          for (const parseError of results.errors) {
            const rowNumber =
              typeof parseError.row === 'number' ? parseError.row + 2 : '?';
            errors.push(`${rowNumber}行目: ${parseError.message}`);
          }

          resolve({
            createdCount,
            skippedCount,
            errors,
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

const CSV_TEMPLATE = `見積番号,顧客名,会社名,件名,作成日,有効期限,ステータス,税率,備考,明細
Q-20260416-100001,山田太郎,○○運輸株式会社,スポット配送見積,2026-04-16,2026-04-30,下書き,10,四国エリア向けスポット配送案件,配送案件一覧画面::120000::1|再配達ステータス管理::80000::1|CSV取込機能::50000::1
Q-20260416-100002,佐藤花子,△△物流株式会社,定期配送管理システム導入見積,2026-04-16,2026-04-30,送付済み,10,定期便の進捗可視化を想定,配送ダッシュボード::150000::1|ドライバー別集計::90000::1|管理者レポート::60000::1
Q-20260416-100003,鈴木一郎,□□ロジスティクス株式会社,再配達削減ダッシュボード構築見積,2026-04-16,2026-04-30,承認,10,再配達率低減のための分析画面,再配達分析画面::180000::1|理由分類レポート::70000::1|月次サマリー出力::40000::1
`;

export const downloadQuoteCsvTemplate = () => {
  const blob = new Blob(['\uFEFF' + CSV_TEMPLATE], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mitsumori-flow-demo-template.csv';
  link.click();
  URL.revokeObjectURL(url);
};