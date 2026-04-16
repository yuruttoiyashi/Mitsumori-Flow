import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import * as quoteService from "../services/quoteService";
import { useAuth } from "../contexts/AuthContext";

type QuoteLineItem = {
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

type QuoteRecord = {
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
  totalAmount?: number;
  total?: number;
  grandTotal?: number;
  subtotal?: number;
  taxAmount?: number;
  status?: string;
  issueDate?: string;
  validUntil?: string;
  notes?: string;
  remark?: string;
  memo?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  items?: QuoteLineItem[];
};

type CsvRow = Record<string, string>;

function toDateValue(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate();
    }
    if (typeof maybeTimestamp.seconds === "number") {
      return new Date(maybeTimestamp.seconds * 1000);
    }
  }

  return null;
}

function formatDate(value: unknown) {
  const date = toDateValue(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  const normalized = value.replace(/[¥,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getProjectName(quote: QuoteRecord) {
  return quote.projectName || quote.subject || quote.title || "案件名未設定";
}

function getCompanyName(quote: QuoteRecord) {
  return (
    quote.shipperCompany ||
    quote.companyName ||
    quote.clientCompany ||
    quote.customerCompany ||
    "荷主企業未設定"
  );
}

function getContactName(quote: QuoteRecord) {
  return quote.shipperContactName || quote.customerName || quote.contactName || "-";
}

function getQuoteTotal(quote: QuoteRecord) {
  return Number(quote.totalAmount ?? quote.total ?? quote.grandTotal ?? 0);
}

function getQuoteSubtotal(quote: QuoteRecord) {
  if (typeof quote.subtotal === "number") return quote.subtotal;

  if (!Array.isArray(quote.items)) return 0;

  return quote.items.reduce((sum: number, item: QuoteLineItem) => {
    const amount = Number(item.amount ?? item.lineTotal ?? 0);
    if (amount > 0) return sum + amount;

    const quantity = Number(item.quantity ?? item.qty ?? 0);
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
    return sum + quantity * unitPrice;
  }, 0);
}

function getQuoteTaxAmount(quote: QuoteRecord) {
  if (typeof quote.taxAmount === "number") return quote.taxAmount;

  const subtotal = getQuoteSubtotal(quote);
  const total = getQuoteTotal(quote);
  const tax = total - subtotal;
  return tax > 0 ? tax : 0;
}

function getQuoteBaseDate(quote: QuoteRecord) {
  return quote.issueDate || quote.createdAt || quote.updatedAt;
}

function getQuoteNotes(quote: QuoteRecord) {
  return quote.notes || quote.remark || quote.memo || "";
}

function normalizeStatus(raw?: string) {
  const value = (raw || "").toLowerCase();

  if (["approved", "sent", "submitted"].includes(value)) return "提出済み";
  if (["draft", "editing", ""].includes(value)) return "下書き";
  if (["expired"].includes(value)) return "期限切れ";
  if (["cancelled", "canceled"].includes(value)) return "取消";
  return "登録済み";
}

function getStatusBadgeClass(status: string) {
  if (status === "提出済み") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (status === "期限切れ") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  if (status === "取消") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (status === "下書き") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
}

function buildTemplateCsv() {
  const rows = [
    [
      "荷主企業",
      "荷主担当者",
      "案件名",
      "発行日",
      "有効期限",
      "内容",
      "数量",
      "単価",
      "備考",
      "ステータス",
    ],
    [
      "株式会社東日本ロジ",
      "山田 太郎",
      "関東エリア定期配送見積",
      "2026-04-01",
      "2026-04-30",
      "定期配送業務一式",
      "12",
      "85000",
      "月次定期便対応",
      "draft",
    ],
    [
      "西日本フレート株式会社",
      "佐藤 花子",
      "幹線輸送スポット案件",
      "2026-04-05",
      "2026-05-05",
      "幹線輸送スポット対応",
      "3",
      "120000",
      "深夜対応あり",
      "submitted",
    ],
  ];

  return rows.map((row) => row.join(",")).join("\n");
}

function csvRowToQuote(row: CsvRow) {
  const quantity = parseNumber(row["数量"]);
  const unitPrice = parseNumber(row["単価"]);
  const amount = quantity * unitPrice;

  return {
    shipperCompany: row["荷主企業"] || "",
    shipperContactName: row["荷主担当者"] || "",
    projectName: row["案件名"] || "",
    issueDate: row["発行日"] || "",
    validUntil: row["有効期限"] || "",
    notes: row["備考"] || "",
    status: row["ステータス"] || "draft",
    subtotal: amount,
    taxRate: 0.1,
    taxAmount: Math.round(amount * 0.1),
    totalAmount: Math.round(amount * 1.1),
    items: [
      {
        description: row["内容"] || "",
        quantity,
        unitPrice,
        amount,
      },
    ],
  };
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function getItemSummary(quote: QuoteRecord) {
  if (!Array.isArray(quote.items) || quote.items.length === 0) return "";

  return quote.items
    .map((item: QuoteLineItem) => {
      const name = item.description || item.itemName || item.content || "明細";
      const quantity = Number(item.quantity ?? item.qty ?? 0);
      return quantity > 0 ? `${name} × ${quantity}` : name;
    })
    .join(" / ");
}

function buildExportCsv(quotes: QuoteRecord[]) {
  const headers = [
    "見積番号",
    "案件名",
    "荷主企業",
    "荷主担当者",
    "発行日",
    "有効期限",
    "ステータス",
    "小計",
    "消費税",
    "合計金額",
    "備考",
    "明細概要",
  ];

  const lines = quotes.map((quote) => {
    const status = normalizeStatus(quote.status);

    const row = [
      quote.quoteNumber || "",
      getProjectName(quote),
      getCompanyName(quote),
      getContactName(quote),
      formatDate(quote.issueDate || quote.createdAt),
      formatDate(quote.validUntil),
      status,
      getQuoteSubtotal(quote),
      getQuoteTaxAmount(quote),
      getQuoteTotal(quote),
      getQuoteNotes(quote),
      getItemSummary(quote),
    ];

    return row.map(escapeCsvCell).join(",");
  });

  return [headers.map(escapeCsvCell).join(","), ...lines].join("\r\n");
}

function buildExportFileName(mode: "filtered" | "all" | "selected") {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  if (mode === "filtered") {
    return `mitsumori-flow-filtered-export-${y}${m}${d}-${h}${min}.csv`;
  }

  if (mode === "selected") {
    return `mitsumori-flow-selected-export-${y}${m}${d}-${h}${min}.csv`;
  }

  return `mitsumori-flow-all-export-${y}${m}${d}-${h}${min}.csv`;
}

function downloadCsv(csv: string, fileName: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  window.URL.revokeObjectURL(url);
}

export default function QuotesListPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyMessage, setBusyMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.title = "物流見積一覧 | Mitsumori Flow";
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      setError("");

      const service = quoteService as Record<string, unknown>;
      const getQuotesFn =
        (service.getQuotes as ((uid?: string) => Promise<unknown>) | undefined) ||
        (service.fetchQuotes as ((uid?: string) => Promise<unknown>) | undefined) ||
        (service.listQuotes as ((uid?: string) => Promise<unknown>) | undefined) ||
        (service.getAllQuotes as ((uid?: string) => Promise<unknown>) | undefined);

      if (!getQuotesFn) {
        throw new Error("quoteService.ts に見積一覧取得関数が見つかりません。");
      }

      const result = await getQuotesFn(user?.uid);

      const normalized = Array.isArray(result)
        ? result
        : Array.isArray((result as { quotes?: unknown[] })?.quotes)
          ? ((result as { quotes?: unknown[] }).quotes ?? [])
          : [];

      setQuotes(normalized as QuoteRecord[]);
    } catch (err) {
      console.error(err);
      setError("物流見積一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuotes();
  }, [user?.uid]);

  useEffect(() => {
    const existingIds = new Set(
      quotes.map((quote) => quote.id).filter((id): id is string => Boolean(id))
    );

    setSelectedIds((prev) => prev.filter((id) => existingIds.has(id)));
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return [...quotes]
      .filter((quote) => {
        const keyword = searchKeyword.trim().toLowerCase();
        if (!keyword) return true;

        const joined = [
          getProjectName(quote),
          getCompanyName(quote),
          getContactName(quote),
          quote.quoteNumber || "",
          getQuoteNotes(quote),
        ]
          .join(" ")
          .toLowerCase();

        return joined.includes(keyword);
      })
      .filter((quote) => {
        if (statusFilter === "all") return true;
        return normalizeStatus(quote.status) === statusFilter;
      })
      .sort((a, b) => {
        const dateA = toDateValue(getQuoteBaseDate(a))?.getTime() ?? 0;
        const dateB = toDateValue(getQuoteBaseDate(b))?.getTime() ?? 0;
        return dateB - dateA;
      });
  }, [quotes, searchKeyword, statusFilter]);

  const selectedQuotes = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return quotes.filter((quote) => quote.id && selectedSet.has(quote.id));
  }, [quotes, selectedIds]);

  const visibleSelectableIds = useMemo(() => {
    return filteredQuotes
      .map((quote) => quote.id)
      .filter((id): id is string => Boolean(id));
  }, [filteredQuotes]);

  const isAllVisibleSelected =
    visibleSelectableIds.length > 0 &&
    visibleSelectableIds.every((id) => selectedIds.includes(id));

  const summary = useMemo(() => {
    const totalCount = filteredQuotes.length;
    const totalAmount = filteredQuotes.reduce((sum, quote) => sum + getQuoteTotal(quote), 0);
    const submittedCount = filteredQuotes.filter(
      (quote) => normalizeStatus(quote.status) === "提出済み"
    ).length;
    const draftCount = filteredQuotes.filter(
      (quote) => normalizeStatus(quote.status) === "下書き"
    ).length;

    return {
      totalCount,
      totalAmount,
      submittedCount,
      draftCount,
    };
  }, [filteredQuotes]);

  const toggleSelect = (id?: string) => {
    if (!id) return;

    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    if (visibleSelectableIds.length === 0) return;

    if (isAllVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleSelectableIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleSelectableIds])));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleDelete = async (id?: string) => {
    if (!id) {
      window.alert("削除対象のIDが見つかりません。");
      return;
    }

    const confirmed = window.confirm("この見積を削除しますか？");
    if (!confirmed) return;

    try {
      setBusyMessage("見積を削除しています...");

      const service = quoteService as Record<string, unknown>;
      const deleteQuoteFn =
        (service.deleteQuote as ((id: string, uid?: string) => Promise<void>) | undefined) ||
        (service.removeQuote as ((id: string, uid?: string) => Promise<void>) | undefined);

      if (!deleteQuoteFn) {
        throw new Error("quoteService.ts に削除関数が見つかりません。");
      }

      await deleteQuoteFn(id, user?.uid);
      await loadQuotes();
    } catch (err) {
      console.error(err);
      window.alert("見積の削除に失敗しました。");
    } finally {
      setBusyMessage("");
    }
  };

  const handleDownloadTemplate = () => {
    const csv = buildTemplateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "mitsumori-flow-template.csv";
    link.click();

    window.URL.revokeObjectURL(url);
  };

  const handleExportFilteredCsv = () => {
    if (filteredQuotes.length === 0) {
      window.alert("表示中の見積データがありません。");
      return;
    }

    const csv = buildExportCsv(filteredQuotes);
    downloadCsv(csv, buildExportFileName("filtered"));
  };

  const handleExportSelectedCsv = () => {
    if (selectedQuotes.length === 0) {
      window.alert("選択中の見積データがありません。");
      return;
    }

    const sortedSelectedQuotes = [...selectedQuotes].sort((a, b) => {
      const dateA = toDateValue(getQuoteBaseDate(a))?.getTime() ?? 0;
      const dateB = toDateValue(getQuoteBaseDate(b))?.getTime() ?? 0;
      return dateB - dateA;
    });

    const csv = buildExportCsv(sortedSelectedQuotes);
    downloadCsv(csv, buildExportFileName("selected"));
  };

  const handleExportAllCsv = () => {
    if (quotes.length === 0) {
      window.alert("エクスポートできる見積データがありません。");
      return;
    }

    const sortedAllQuotes = [...quotes].sort((a, b) => {
      const dateA = toDateValue(getQuoteBaseDate(a))?.getTime() ?? 0;
      const dateB = toDateValue(getQuoteBaseDate(b))?.getTime() ?? 0;
      return dateB - dateA;
    });

    const csv = buildExportCsv(sortedAllQuotes);
    downloadCsv(csv, buildExportFileName("all"));
  };

  const handleSelectCsv = () => {
    fileInputRef.current?.click();
  };

  const handleCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setBusyMessage("CSVを取り込んでいます...");
      setError("");

      const parsed = await new Promise<CsvRow[]>((resolve, reject) => {
        Papa.parse<CsvRow>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (err) => reject(err),
        });
      });

      if (!parsed.length) {
        window.alert("CSVに取り込めるデータがありません。");
        return;
      }

      const records = parsed.map(csvRowToQuote);

      const service = quoteService as Record<string, unknown>;
      const createQuoteFn =
        (service.createQuote as ((payload: unknown, uid?: string) => Promise<unknown>) | undefined) ||
        (service.addQuote as ((payload: unknown, uid?: string) => Promise<unknown>) | undefined) ||
        (service.saveQuote as ((payload: unknown, uid?: string) => Promise<unknown>) | undefined);

      if (!createQuoteFn) {
        throw new Error("quoteService.ts に登録関数が見つかりません。");
      }

      for (const record of records) {
        await createQuoteFn(record, user?.uid);
      }

      await loadQuotes();
      window.alert(`${records.length}件の見積データを取り込みました。`);
    } catch (err) {
      console.error(err);
      setError("CSV取込に失敗しました。ヘッダー名や値の形式を確認してください。");
    } finally {
      setBusyMessage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const statusOptions = ["all", "下書き", "提出済み", "登録済み", "期限切れ", "取消"];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">見積管理</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              物流見積一覧
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              物流案件の見積を一覧で管理できます。検索・絞り込み・編集・プレビュー・削除に加え、
              CSVテンプレート配布、一括取込、選択中CSV・表示中CSV・全件CSVの出力に対応しています。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              テンプレートCSVをDL
            </button>

            <button
              type="button"
              onClick={handleSelectCsv}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              CSVを選んで取込
            </button>

            <button
              type="button"
              onClick={handleExportSelectedCsv}
              disabled={selectedQuotes.length === 0}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                selectedQuotes.length === 0
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              選択中をCSV
            </button>

            <button
              type="button"
              onClick={handleExportFilteredCsv}
              disabled={filteredQuotes.length === 0}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                filteredQuotes.length === 0
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              表示中のみCSV
            </button>

            <button
              type="button"
              onClick={handleExportAllCsv}
              disabled={quotes.length === 0}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                quotes.length === 0
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              全件CSV
            </button>

            <button
              type="button"
              onClick={() => void loadQuotes()}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              一覧を更新
            </button>

            <Link
              to="/quotes/new"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              新規見積を作成
            </Link>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleCsvImport}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-slate-700">
            選択中 <span className="font-bold text-slate-900">{selectedQuotes.length}</span> 件
            ／ 表示中 <span className="font-bold text-slate-900">{filteredQuotes.length}</span> 件
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              disabled={visibleSelectableIds.length === 0}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                visibleSelectableIds.length === 0
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isAllVisibleSelected ? "表示中を全解除" : "表示中を全選択"}
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              disabled={selectedQuotes.length === 0}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                selectedQuotes.length === 0
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              選択解除
            </button>
          </div>
        </div>
      </section>

      {busyMessage ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          {busyMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">表示中件数</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{summary.totalCount}</div>
          <div className="mt-2 text-xs text-slate-500">現在の検索条件に一致した見積件数</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">表示中総額</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {formatCurrency(summary.totalAmount)}
          </div>
          <div className="mt-2 text-xs text-slate-500">一覧に表示中の見積合計額</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">提出済み件数</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{summary.submittedCount}</div>
          <div className="mt-2 text-xs text-slate-500">提出・送付済みとして扱う件数</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">下書き件数</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{summary.draftCount}</div>
          <div className="mt-2 text-xs text-slate-500">社内確認前の見積件数</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_0.8fr_0.8fr]">
          <div>
            <label htmlFor="quote-search" className="mb-2 block text-sm font-semibold text-slate-700">
              キーワード検索
            </label>
            <input
              id="quote-search"
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="案件名・荷主企業・担当者・備考で検索"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label htmlFor="status-filter" className="mb-2 block text-sm font-semibold text-slate-700">
              ステータス
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "すべて" : status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchKeyword("");
                setStatusFilter("all");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              条件をクリア
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">見積一覧テーブル</h2>
            <p className="mt-1 text-sm text-slate-500">
              実務で見やすい表形式で、案件の状態や金額をまとめて確認できます。
            </p>
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-10">
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-base font-semibold text-slate-700">該当する見積がありません</p>
            <p className="mt-2 text-sm text-slate-500">
              条件を変更するか、新規見積作成・CSV取込をお試しください。
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        onChange={handleSelectAllVisible}
                        className="h-4 w-4 rounded border-slate-300"
                        aria-label="表示中を全選択"
                      />
                    </th>
                    <th className="px-5 py-3 font-semibold">案件名</th>
                    <th className="px-5 py-3 font-semibold">荷主企業</th>
                    <th className="px-5 py-3 font-semibold">荷主担当者</th>
                    <th className="px-5 py-3 font-semibold">発行日</th>
                    <th className="px-5 py-3 font-semibold">有効期限</th>
                    <th className="px-5 py-3 font-semibold">見積金額</th>
                    <th className="px-5 py-3 font-semibold">状態</th>
                    <th className="px-5 py-3 font-semibold text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredQuotes.map((quote) => {
                    const status = normalizeStatus(quote.status);
                    const checked = quote.id ? selectedIds.includes(quote.id) : false;

                    return (
                      <tr
                        key={quote.id ?? `${getProjectName(quote)}-${getCompanyName(quote)}`}
                        className={checked ? "bg-sky-50/50" : ""}
                      >
                        <td className="px-5 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(quote.id)}
                            disabled={!quote.id}
                            className="h-4 w-4 rounded border-slate-300"
                            aria-label="この見積を選択"
                          />
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-900">
                          <div>{getProjectName(quote)}</div>
                          {quote.quoteNumber ? (
                            <div className="mt-1 text-xs text-slate-500">
                              見積番号: {quote.quoteNumber}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-slate-700">{getCompanyName(quote)}</td>
                        <td className="px-5 py-4 text-slate-700">{getContactName(quote)}</td>
                        <td className="px-5 py-4 text-slate-700">
                          {formatDate(quote.issueDate || quote.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {formatDate(quote.validUntil)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {formatCurrency(getQuoteTotal(quote))}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/quotes/${quote.id}/preview`}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              プレビュー
                            </Link>
                            <Link
                              to={`/quotes/${quote.id}`}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              編集
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDelete(quote.id)}
                              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 lg:hidden">
              {filteredQuotes.map((quote) => {
                const status = normalizeStatus(quote.status);
                const checked = quote.id ? selectedIds.includes(quote.id) : false;

                return (
                  <div
                    key={quote.id ?? `${getProjectName(quote)}-${getCompanyName(quote)}`}
                    className={`rounded-2xl border p-4 ${
                      checked ? "border-sky-300 bg-sky-50/50" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(quote.id)}
                          disabled={!quote.id}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                          aria-label="この見積を選択"
                        />
                        <div>
                          <div className="text-base font-semibold text-slate-900">
                            {getProjectName(quote)}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">{getCompanyName(quote)}</div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-slate-500">荷主担当者</div>
                        <div className="mt-1 text-slate-900">{getContactName(quote)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">見積金額</div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatCurrency(getQuoteTotal(quote))}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">発行日</div>
                        <div className="mt-1 text-slate-900">
                          {formatDate(quote.issueDate || quote.createdAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">有効期限</div>
                        <div className="mt-1 text-slate-900">{formatDate(quote.validUntil)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to={`/quotes/${quote.id}/preview`}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        プレビュー
                      </Link>
                      <Link
                        to={`/quotes/${quote.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        編集
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(quote.id)}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}