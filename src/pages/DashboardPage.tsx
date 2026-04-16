import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as quoteService from "../services/quoteService";
import { useAuth } from "../contexts/AuthContext";

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
  status?: string;
  issueDate?: string;
  validUntil?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type MetricCardProps = {
  title: string;
  value: string;
  sub: string;
};

function MetricCard({ title, value, sub }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

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

function getContactName(quote: QuoteLike) {
  return quote.shipperContactName || quote.customerName || quote.contactName || "-";
}

function getQuoteTotal(quote: QuoteLike) {
  return Number(quote.totalAmount ?? quote.total ?? quote.grandTotal ?? 0);
}

function getQuoteBaseDate(quote: QuoteLike) {
  return quote.issueDate || quote.createdAt || quote.updatedAt;
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "ダッシュボード | Mitsumori Flow";
  }, []);

  useEffect(() => {
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

        setQuotes(normalized as QuoteLike[]);
      } catch (err) {
        console.error(err);
        setError("ダッシュボード用データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    void loadQuotes();
  }, [user?.uid]);

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalCount = quotes.length;
    const totalAmount = quotes.reduce((sum, quote) => sum + getQuoteTotal(quote), 0);

    const thisMonthQuotes = quotes.filter((quote) => {
      const date = toDateValue(getQuoteBaseDate(quote));
      if (!date) return false;
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });

    const thisMonthCount = thisMonthQuotes.length;
    const thisMonthAmount = thisMonthQuotes.reduce((sum, quote) => sum + getQuoteTotal(quote), 0);
    const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

    return {
      totalCount,
      totalAmount,
      thisMonthCount,
      thisMonthAmount,
      avgAmount,
    };
  }, [quotes]);

  const recentQuotes = useMemo(() => {
    return [...quotes]
      .sort((a, b) => {
        const dateA = toDateValue(getQuoteBaseDate(a))?.getTime() ?? 0;
        const dateB = toDateValue(getQuoteBaseDate(b))?.getTime() ?? 0;
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [quotes]);

  const statusSummary = useMemo(() => {
    const summary = new Map<string, number>();

    for (const quote of quotes) {
      const status = normalizeStatus(quote.status);
      summary.set(status, (summary.get(status) ?? 0) + 1);
    }

    return Array.from(summary.entries()).sort((a, b) => b[1] - a[1]);
  }, [quotes]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-slate-500">業務ダッシュボード</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            物流見積管理ダッシュボード
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>

        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">業務ダッシュボード</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              物流見積管理ダッシュボード
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              見積の登録件数・総額・月次動向を一覧で確認できます。
              日々の見積対応状況を把握しやすい、提出向けの業務管理画面です。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/quotes"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              物流見積一覧へ
            </Link>
            <Link
              to="/quotes/new"
              className="inline-flex items-center justify-center rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-300"
            >
              新規見積を作成
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="総案件見積数"
          value={String(metrics.totalCount)}
          sub="登録されている全見積件数"
        />
        <MetricCard
          title="今月登録件数"
          value={String(metrics.thisMonthCount)}
          sub="当月に作成・登録された見積"
        />
        <MetricCard
          title="運送見積総額"
          value={formatCurrency(metrics.totalAmount)}
          sub="登録済み見積の総額"
        />
        <MetricCard
          title="見積平均単価"
          value={formatCurrency(metrics.avgAmount)}
          sub="1案件あたりの平均見積額"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">最近の物流見積</h2>
              <p className="mt-1 text-sm text-slate-500">
                最新の見積登録状況を上から確認できます。
              </p>
            </div>
            <Link
              to="/quotes"
              className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
            >
              すべて見る
            </Link>
          </div>

          {recentQuotes.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              まだ見積データがありません。新規作成またはCSV取込を実行してください。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">案件名</th>
                    <th className="px-5 py-3 font-semibold">荷主企業</th>
                    <th className="px-5 py-3 font-semibold">荷主担当者</th>
                    <th className="px-5 py-3 font-semibold">見積金額</th>
                    <th className="px-5 py-3 font-semibold">登録日</th>
                    <th className="px-5 py-3 font-semibold">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentQuotes.map((quote) => {
                    const status = normalizeStatus(quote.status);

                    return (
                      <tr key={quote.id ?? `${getProjectName(quote)}-${getCompanyName(quote)}`}>
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {getProjectName(quote)}
                        </td>
                        <td className="px-5 py-4 text-slate-700">{getCompanyName(quote)}</td>
                        <td className="px-5 py-4 text-slate-700">{getContactName(quote)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {formatCurrency(getQuoteTotal(quote))}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {formatDate(getQuoteBaseDate(quote))}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">月次サマリー</h2>
            <p className="mt-1 text-sm text-slate-500">
              今月の活動量と見積金額の目安です。
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">今月登録件数</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {metrics.thisMonthCount} 件
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">今月見積総額</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrency(metrics.thisMonthAmount)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">ステータス内訳</h2>
            <p className="mt-1 text-sm text-slate-500">
              現在登録されている見積の状態別件数です。
            </p>

            <div className="mt-5 space-y-3">
              {statusSummary.length === 0 ? (
                <div className="text-sm text-slate-500">見積データがありません。</div>
              ) : (
                statusSummary.map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{count} 件</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">クイックアクション</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Link
                to="/quotes/new"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                新規見積を作成
              </Link>
              <Link
                to="/quotes"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                物流見積一覧を確認
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}