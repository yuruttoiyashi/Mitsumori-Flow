import * as companyProfileModule from "../constants/companyProfile";

type QuoteItemLike = {
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
  items?: QuoteItemLike[];
};

type QuotePrintDocumentProps = {
  quote: QuoteLike;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value || 0);
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

function getItemDescription(item: QuoteItemLike) {
  return item.description || item.itemName || item.content || "明細";
}

function getItemQuantity(item: QuoteItemLike) {
  return Number(item.quantity ?? item.qty ?? 0);
}

function getItemUnitPrice(item: QuoteItemLike) {
  return Number(item.unitPrice ?? item.price ?? 0);
}

function getItemAmount(item: QuoteItemLike) {
  const direct = Number(item.amount ?? item.lineTotal ?? 0);
  if (direct > 0) return direct;

  return getItemQuantity(item) * getItemUnitPrice(item);
}

function getQuoteTitle(quote: QuoteLike) {
  return quote.projectName || quote.subject || quote.title || "案件名未設定";
}

function getRecipientCompany(quote: QuoteLike) {
  return (
    quote.shipperCompany ||
    quote.companyName ||
    quote.clientCompany ||
    quote.customerCompany ||
    "荷主企業未設定"
  );
}

function getRecipientContact(quote: QuoteLike) {
  return quote.shipperContactName || quote.customerName || quote.contactName || "";
}

function getQuoteItems(quote: QuoteLike) {
  if (Array.isArray(quote.items) && quote.items.length > 0) {
    return quote.items;
  }

  const total = Number(quote.totalAmount ?? quote.total ?? quote.grandTotal ?? 0);

  return [
    {
      description: getQuoteTitle(quote),
      quantity: 1,
      unitPrice: total,
      amount: total,
    },
  ];
}

function getSubtotal(quote: QuoteLike, items: QuoteItemLike[]) {
  const explicit = Number(quote.subtotal ?? 0);
  if (explicit > 0) return explicit;

  return items.reduce((sum, item) => sum + getItemAmount(item), 0);
}

function getTaxRate(quote: QuoteLike) {
  if (typeof quote.taxRate === "number" && quote.taxRate > 0) return quote.taxRate;
  return 0.1;
}

function getTaxAmount(quote: QuoteLike, subtotal: number) {
  const explicit = Number(quote.taxAmount ?? 0);
  if (explicit > 0) return explicit;

  return Math.round(subtotal * getTaxRate(quote));
}

function getTotalAmount(quote: QuoteLike, subtotal: number, taxAmount: number) {
  const explicit = Number(quote.totalAmount ?? quote.total ?? quote.grandTotal ?? 0);
  if (explicit > 0) return explicit;

  return subtotal + taxAmount;
}

function getProfileValue(keys: string[]) {
  const moduleObject = companyProfileModule as Record<string, unknown>;

  const profile =
    moduleObject.default && typeof moduleObject.default === "object"
      ? (moduleObject.default as Record<string, unknown>)
      : moduleObject;

  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}

export default function QuotePrintDocument({ quote }: QuotePrintDocumentProps) {
  const items = getQuoteItems(quote);
  const subtotal = getSubtotal(quote, items);
  const taxAmount = getTaxAmount(quote, subtotal);
  const totalAmount = getTotalAmount(quote, subtotal, taxAmount);

  const companyName = getProfileValue(["companyName", "name", "businessName"]) || "提出元企業名";
  const departmentName = getProfileValue(["departmentName", "department"]);
  const representativeName = getProfileValue(["representativeName", "ownerName", "contactName"]);
  const postalCode = getProfileValue(["postalCode"]);
  const address = getProfileValue(["address"]);
  const phone = getProfileValue(["phone", "tel"]);
  const email = getProfileValue(["email"]);
  const website = getProfileValue(["website", "url"]);
  const logoUrl = getProfileValue(["logoUrl", "logo", "logoPath"]);

  const recipientCompany = getRecipientCompany(quote);
  const recipientContact = getRecipientContact(quote);
  const notes = quote.notes || quote.remark || quote.memo || "特記事項なし";

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white text-slate-900">
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 sm:px-10">
        <header className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="company logo"
                className="h-14 w-auto object-contain sm:h-16"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white sm:h-16 sm:w-16">
                M
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Logistics Estimate
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">御見積書</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                下記の通り、物流案件に関する御見積を申し上げます。
              </p>
            </div>
          </div>

          <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Document Info
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">見積番号</dt>
                <dd className="font-semibold text-slate-900">{quote.quoteNumber || "-"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">発行日</dt>
                <dd className="font-semibold text-slate-900">{formatDate(quote.issueDate)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">有効期限</dt>
                <dd className="font-semibold text-slate-900">{formatDate(quote.validUntil)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 border-b border-slate-200 py-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              To
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 p-5">
              <div className="text-xl font-bold text-slate-900">{recipientCompany}</div>
              <div className="mt-2 text-sm text-slate-600">御中</div>

              {recipientContact ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="text-sm text-slate-500">荷主担当者</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {recipientContact} 様
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              From
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 p-5">
              <div className="text-xl font-bold text-slate-900">{companyName}</div>

              {departmentName ? (
                <div className="mt-2 text-sm text-slate-600">{departmentName}</div>
              ) : null}

              <div className="mt-4 space-y-1 text-sm text-slate-600">
                {postalCode ? <div>〒{postalCode}</div> : null}
                {address ? <div>{address}</div> : null}
                {phone ? <div>TEL: {phone}</div> : null}
                {email ? <div>Email: {email}</div> : null}
                {website ? <div>{website}</div> : null}
              </div>

              {representativeName ? (
                <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
                  担当者: <span className="font-semibold">{representativeName}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 py-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Project
              </div>
              <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900">
                {getQuoteTitle(quote)}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                下記条件にて、物流業務に関するお見積を提出いたします。内容をご確認のうえ、
                ご検討くださいますようお願い申し上げます。
              </p>
            </div>

            <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
              <div className="text-sm font-medium text-slate-300">御見積金額</div>
              <div className="mt-3 text-4xl font-bold tracking-tight">
                {formatCurrency(totalAmount)}
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs leading-6 text-slate-200">
                ※ 消費税を含む総額です。<br />
                ※ 詳細は下記明細欄をご確認ください。
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 py-8">
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Details
            </div>
            <h3 className="mt-2 text-xl font-bold text-slate-900">見積明細</h3>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600">内容</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">数量</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">単価</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">金額</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={`${getItemDescription(item)}-${index}`}
                    className="border-t border-slate-200"
                  >
                    <td className="px-4 py-4 align-top text-slate-900">
                      <div className="leading-7">{getItemDescription(item)}</div>
                    </td>
                    <td className="px-4 py-4 text-right align-top text-slate-700">
                      {getItemQuantity(item)}
                    </td>
                    <td className="px-4 py-4 text-right align-top text-slate-700">
                      {formatCurrency(getItemUnitPrice(item))}
                    </td>
                    <td className="px-4 py-4 text-right align-top font-semibold text-slate-900">
                      {formatCurrency(getItemAmount(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 ml-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
              <span className="text-slate-500">小計</span>
              <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
              <span className="text-slate-500">消費税</span>
              <span className="font-semibold text-slate-900">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 px-4 py-4">
              <span className="text-sm font-semibold text-slate-700">合計金額</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 py-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Notes
            </div>
            <div className="mt-4 min-h-[180px] rounded-2xl border border-slate-200 p-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{notes}</p>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Conditions
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 p-5">
              <dl className="space-y-4 text-sm">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                  <dt className="text-slate-500">案件名</dt>
                  <dd className="text-right font-semibold text-slate-900">{getQuoteTitle(quote)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                  <dt className="text-slate-500">有効期限</dt>
                  <dd className="text-right font-semibold text-slate-900">
                    {formatDate(quote.validUntil)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                  <dt className="text-slate-500">金額表示</dt>
                  <dd className="text-right font-semibold text-slate-900">税込</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">備考</dt>
                  <dd className="text-right font-semibold text-slate-900">別途調整可</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-xs leading-6 text-slate-500">
              本見積書の内容は、案件条件や運行内容に応じて変更となる場合があります。<br />
              ご不明点がございましたら、提出元担当者までお問い合わせください。
            </div>

            <div className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500">
              Generated with Mitsumori Flow
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}