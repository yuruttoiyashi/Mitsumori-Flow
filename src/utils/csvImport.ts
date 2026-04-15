import Papa from "papaparse";
import { Timestamp } from "firebase/firestore";
import type { ProjectStatus } from "../types/project";

export type ParsedClientRow = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  memo: string;
};

export type ParsedProjectRow = {
  clientName: string;
  title: string;
  description: string;
  status: ProjectStatus;
  estimateAmount: number;
  finalAmount: number;
  inquiryDate: Timestamp | null;
  dueDate: Timestamp | null;
  deliveryDate: Timestamp | null;
  quoteNote: string;
  internalNote: string;
};

type RawRow = Record<string, string | undefined>;

function normalizeValue(value: string | undefined) {
  return String(value ?? "").trim();
}

 function parseDate(value: string | undefined): Timestamp | null {
  const text = normalizeValue(value);
  if (!text) return null;

  const normalized = text
    .replace(/\./g, "-")
    .replace(/\//g, "-")
    .trim();

  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (!match) {
    throw new Error(`日付の形式が不正です: ${text}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`日付の形式が不正です: ${text}`);
  }

  return Timestamp.fromDate(date);
}

function parseNumber(value: string | undefined) {
  const text = normalizeValue(value);
  if (!text) return 0;

  const normalized = text.replace(/,/g, "");
  const num = Number(normalized);

  if (Number.isNaN(num)) {
    throw new Error(`数値の形式が不正です: ${text}`);
  }

  return num;
}

function parseStatus(value: string | undefined): ProjectStatus {
  const text = normalizeValue(value);

  const map: Record<string, ProjectStatus> = {
    inquiry: "inquiry",
    quoted: "quoted",
    ordered: "ordered",
    in_progress: "in_progress",
    delivered: "delivered",
    closed: "closed",
    cancelled: "cancelled",
    問い合わせ: "inquiry",
    見積提出済み: "quoted",
    受注: "ordered",
    対応中: "in_progress",
    納品済み: "delivered",
    完了: "closed",
    キャンセル: "cancelled",
  };

  if (!text) return "inquiry";

  const status = map[text];
  if (!status) {
    throw new Error(`status の値が不正です: ${text}`);
  }

  return status;
}

function cleanRow(row: RawRow): RawRow {
  const cleaned: RawRow = {};

  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = String(key ?? "").replace(/^\uFEFF/, "").trim();
    cleaned[normalizedKey] =
      typeof value === "string" ? value.replace(/^\uFEFF/, "").trim() : value;
  });

  return cleaned;
}

function hasMeaningfulData(rows: RawRow[]) {
  return rows.some((row) =>
    Object.values(row).some((value) => String(value ?? "").trim() !== "")
  );
}

function looksMojibake(text: string) {
  return text.includes("�");
}

async function readFileAsText(file: File, encoding: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  return new TextDecoder(encoding).decode(buffer);
}

async function parseCsvText(
  text: string,
  delimiter?: string
): Promise<{ rows: RawRow[]; fieldCount: number }> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: "greedy",
      delimiter,
      delimitersToGuess: [",", ";", "\t", "|"],
      transformHeader: (header) =>
        String(header ?? "").replace(/^\uFEFF/, "").trim(),
      complete: (results) => {
        const fatalErrors = results.errors.filter(
          (error) => error.code !== "UndetectableDelimiter"
        );

        if (fatalErrors.length > 0) {
          reject(
            new Error(
              `CSVの読み込みに失敗しました: ${fatalErrors[0].message}`
            )
          );
          return;
        }

        const fields = (results.meta.fields ?? [])
          .map((field) => String(field ?? "").replace(/^\uFEFF/, "").trim())
          .filter(Boolean);

        const rows = (results.data ?? [])
          .map((row) => cleanRow(row))
          .filter((row) =>
            Object.values(row).some((value) => String(value ?? "").trim() !== "")
          );

        if (fields.length === 0) {
          reject(new Error("CSVのヘッダー行を読み取れませんでした。"));
          return;
        }

        resolve({
          rows,
          fieldCount: fields.length,
        });
      },
      error: (error: Error) => reject(error),
    });
  });
}

export async function readCsvFile(file: File): Promise<RawRow[]> {
  const encodings = ["utf-8", "shift_jis"];
  const delimiters: Array<string | undefined> = [undefined, ",", ";", "\t", "|"];

  let bestRows: RawRow[] = [];
  let lastError: unknown = null;

  for (const encoding of encodings) {
    try {
      const text = await readFileAsText(file, encoding);

      for (const delimiter of delimiters) {
        try {
          const result = await parseCsvText(text, delimiter);

          if (result.fieldCount >= 2 || hasMeaningfulData(result.rows)) {
            const joined = JSON.stringify(result.rows);

            if (!looksMojibake(joined)) {
              return result.rows;
            }

            if (bestRows.length === 0) {
              bestRows = result.rows;
            }
          }
        } catch (error) {
          lastError = error;
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (bestRows.length > 0) {
    return bestRows;
  }

  throw (
    lastError ??
    new Error(
      "CSVの読み込みに失敗しました。CSV UTF-8 または Shift-JIS で保存されているか確認してください。"
    )
  );
}

export function parseClientRows(rows: RawRow[]): ParsedClientRow[] {
  return rows.map((row, index) => {
    const name = normalizeValue(row.name);

    if (!name) {
      throw new Error(`${index + 2}行目: name は必須です`);
    }

    return {
      name,
      companyName: normalizeValue(row.companyName),
      email: normalizeValue(row.email),
      phone: normalizeValue(row.phone),
      memo: normalizeValue(row.memo),
    };
  });
}

export function parseProjectRows(rows: RawRow[]): ParsedProjectRow[] {
  return rows.map((row, index) => {
    const clientName = normalizeValue(row.clientName);
    const title = normalizeValue(row.title);

    if (!clientName) {
      throw new Error(`${index + 2}行目: clientName は必須です`);
    }

    if (!title) {
      throw new Error(`${index + 2}行目: title は必須です`);
    }

    return {
      clientName,
      title,
      description: normalizeValue(row.description),
      status: parseStatus(row.status),
      estimateAmount: parseNumber(row.estimateAmount),
      finalAmount: parseNumber(row.finalAmount),
      inquiryDate: parseDate(row.inquiryDate),
      dueDate: parseDate(row.dueDate),
      deliveryDate: parseDate(row.deliveryDate),
      quoteNote: normalizeValue(row.quoteNote),
      internalNote: normalizeValue(row.internalNote),
    };
  });
}