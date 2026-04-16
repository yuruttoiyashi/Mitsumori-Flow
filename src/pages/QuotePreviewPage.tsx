import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as quoteService from "../services/quoteService";
import QuotePrintDocument from "../components/QuotePrintDocument";

type QuoteLike = {
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
  taxRate?: number;
  issueDate?: string;
  validUntil?: string;
  notes?: string;
  remark?: string;
  memo?: string;
  status?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  items?: Array<{
    description?: string;
    itemName?: string;
    content?: string;
    quantity?: number;
    qty?: number;
    unitPrice?: number;
    price?: number;
    amount?: number;
    lineTotal?: number;
  }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value || 0);
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

function getProjectName(quote: QuoteLike) {
  return quote.projectName || quote.subject || quote.title || "案件名未設定";
}

function getCompanyName(quote: QuoteLike) {
  return (
    quote.shipperCompany ||
    quote.companyName ||
    quote.clientCompany ||
    quote.customerCompany ||
    "荷主企業未設定"
  );
}

function getTotalAmount(quote: QuoteLike) {
  return Number(quote.totalAmount ?? quote.total ?? quote.grandTotal ?? 0);
}

function getItemsCount(quote: QuoteLike) {
  return Array.isArray(quote.items) ? quote.items.length : 0;
}

function formatDate(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export default function QuotePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [quote, setQuote] = useState<QuoteLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "見積書プレビュー | Mitsumori Flow";
  }, []);

  useEffect(() => {
    const loadQuote = async () => {
      if (!id) {
        setError("見積IDが指定されていません。");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const service = quoteService as Record<string, unknown>;
        const getQuoteFn =
          (service.getQuoteById as ((quoteId: string, uid?: string) => Promise<unknown>) | undefined) ||
          (service.getQuote as ((quoteId: string, uid?: string) => Promise<unknown>) | undefined) ||
          (service.fetchQuote as ((quoteId: string, uid?: string) => Promise<unknown>) | undefined) ||
          (service.getSingleQuote as ((quoteId: string, uid?: string) => Promise<unknown>) | undefined) ||
          (service.readQuote as ((quoteId: string, uid?: string) => Promise<unknown>) | undefined);

        if (!getQuoteFn) {
          throw new Error("quoteService.ts に見積取得関数が見つかりません。");
        }

        const result = await getQuoteFn(id, user?.uid);

        const normalized =
          result && typeof result === "object" && "quote" in (result as Record<string, unknown>)
            ? ((result as { quote?: QuoteLike }).quote ?? null)
            : (result as QuoteLike | null);

        if (!normalized) {
          setError("対象の見積データが見つかりませんでした。");
          setQuote(null);
          return;
        }

        setQuote(normalized);
      } catch (err) {
        console.error(err);
        setError("見積データの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    void loadQuote();
  }, [id, user?.uid]);

  const status = useMemo(() => normalizeStatus(quote?.status), [quote?.status]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <style>
          {`
            @page {
              size: A4;
              margin: 12mm;
            }

            @media print {
              .no-print {
                display: none !important;
              }

              body {
                background: #ffffff !important;
              }
            }
          `}
        </style>

        <section className="no-print rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-4 h-5 w-96 animate-pulse rounded bg-slate-100" />
        </section>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-[960px] animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="space-y-6">
        <style>
          {`
            @page {
              size: A4;
              margin: 12mm;
            }

            @media print {
              .no-print {
                display: none !important;
              }

              body {
                background: #ffffff !important;
              }
            }
          `}
        </style>

        <section className="no-print rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">見積プレビュー</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            見積書プレビュー
          </h1>
        </section>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error || "見積データが見つかりません。"}
        </div>

        <div className="no-print">
          <Link
            to="/quotes"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            物流見積一覧へ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>
        {`
          @page {
            size: A4;
            margin: 12mm;
          }

          @media print {
            .no-print {
              display: none !important;
            }

            body {
              background: #ffffff !important;
            }

            #root {
              background: #ffffff !important;
            }

            .print-shell {
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              max-width: none !important;
              background: #ffffff !important;
            }
          }
        `}
      </style>

      <section className="no-print rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">見積プレビュー</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              見積書プレビュー
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              提出前の見積書レイアウトを確認できます。画面確認後、そのまま印刷帳票として出力できます。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/quotes"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              一覧へ戻る
            </Link>
            <Link
              to={`/quotes/${quote.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              編集する
            </Link>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              印刷する
            </button>
          </div>
        </div>
      </section>

      <section className="no-print grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">案件名</div>
          <div className="mt-2 text-lg font-semibold leading-7 text-slate-900">
            {getProjectName(quote)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">荷主企業</div>
          <div className="mt-2 text-lg font-semibold leading-7 text-slate-900">
            {getCompanyName(quote)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">見積総額</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {formatCurrency(getTotalAmount(quote))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">状態</div>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                status
              )}`}
            >
              {status}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            明細 {getItemsCount(quote)} 件 / 発行日 {formatDate(quote.issueDate)}
          </div>
        </div>
      </section>

      <section className="no-print rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <p className="text-sm font-medium text-slate-300">提出前チェック</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">印刷前の確認ポイント</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              宛先企業名、案件名、見積金額、発行日、有効期限、備考欄の内容を確認してから印刷すると、
              提出用資料としてより整って見えます。
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-300">見積番号</div>
            <div className="mt-2 text-lg font-semibold text-white">{quote.quoteNumber || "-"}</div>
            <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-300">発行日</div>
            <div className="mt-2 text-sm font-medium text-white">{formatDate(quote.issueDate)}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-300">有効期限</div>
            <div className="mt-2 text-lg font-semibold text-white">{formatDate(quote.validUntil)}</div>
            <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-300">明細件数</div>
            <div className="mt-2 text-sm font-medium text-white">{getItemsCount(quote)} 件</div>
          </div>
        </div>
      </section>

      <div className="print-shell rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
        <QuotePrintDocument quote={quote} />
      </div>
    </div>
  );
}