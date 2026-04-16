import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createQuote, getQuoteById, updateQuoteById } from '../services/quoteService';
import type { QuoteInput, QuoteStatus } from '../types/quote';
import {
  createEmptyQuoteInput,
  createQuoteItem,
  formatCurrency,
  recalculateQuote,
} from '../utils/quote';

const statusOptions: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: '下書き' },
  { value: 'sent', label: '送付済み' },
  { value: 'approved', label: '承認' },
  { value: 'rejected', label: '失注' },
  { value: 'pending', label: '保留' },
];

export default function QuoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<QuoteInput>(createEmptyQuoteInput());
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const quote = await getQuoteById(id);

        if (!quote) {
          if (active) {
            setError('見積データが見つかりません。');
          }
          return;
        }

        const { id: _id, createdAt, updatedAt, ...rest } = quote;

        if (active) {
          setForm(recalculateQuote(rest));
        }
      } catch {
        if (active) {
          setError('見積データの取得に失敗しました。');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id]);

  const updateForm = (partial: Partial<QuoteInput>) => {
    setForm((prev) => recalculateQuote({ ...prev, ...partial }));
  };

  const handleItemChange = (
    itemId: string,
    field: 'description' | 'unitPrice' | 'quantity',
    value: string,
  ) => {
    setForm((prev) => {
      const nextItems = prev.items.map((item) => {
        if (item.id !== itemId) return item;

        return {
          ...item,
          [field]: field === 'description' ? value : Number(value) || 0,
        };
      });

      return recalculateQuote({
        ...prev,
        items: nextItems,
      });
    });
  };

  const addItem = () => {
    setForm((prev) =>
      recalculateQuote({
        ...prev,
        items: [...prev.items, createQuoteItem()],
      }),
    );
  };

  const removeItem = (itemId: string) => {
    setForm((prev) => {
      const nextItems = prev.items.filter((item) => item.id !== itemId);

      return recalculateQuote({
        ...prev,
        items: nextItems.length > 0 ? nextItems : [createQuoteItem()],
      });
    });
  };

  const normalizedItems = useMemo(() => {
    return form.items.filter((item) => item.description.trim() !== '');
  }, [form.items]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter as HTMLButtonElement | null;
    const submitAction = submitter?.value === 'preview' ? 'preview' : 'save';

    if (!form.customerName.trim()) {
      setError('荷主担当者を入力してください。');
      return;
    }

    if (!form.subject.trim()) {
      setError('案件名を入力してください。');
      return;
    }

    if (normalizedItems.length === 0) {
      setError('明細を1件以上入力してください。');
      return;
    }

    const payload = recalculateQuote({
      ...form,
      items: normalizedItems,
    });

    try {
      setSubmitting(true);

      if (isEdit && id) {
        await updateQuoteById(id, payload);

        if (submitAction === 'preview') {
          navigate(`/quotes/${id}/preview`);
          return;
        }

        navigate('/quotes');
        return;
      }

      const createdId = await createQuote(payload);

      if (submitAction === 'preview') {
        navigate(`/quotes/${createdId}/preview`);
        return;
      }

      navigate('/quotes');
    } catch {
      setError('保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {isEdit ? '物流向け見積編集' : '物流向け新規見積作成'}
              </h3>
              <p className="text-sm text-slate-500">
                荷主企業向けの提案内容・明細・ステータスを入力します
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                見積番号
              </label>
              <input
                type="text"
                value={form.quoteNumber}
                onChange={(e) => updateForm({ quoteNumber: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ステータス
              </label>
              <select
                value={form.status}
                onChange={(e) => updateForm({ status: e.target.value as QuoteStatus })}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                荷主担当者
              </label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => updateForm({ customerName: e.target.value })}
                placeholder="山田 太郎"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                荷主企業
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => updateForm({ companyName: e.target.value })}
                placeholder="○○運輸株式会社"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                案件名
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => updateForm({ subject: e.target.value })}
                placeholder="配送管理ダッシュボード導入見積"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                作成日
              </label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => updateForm({ issueDate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                有効期限
              </label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => updateForm({ validUntil: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">見積明細</h3>
              <p className="text-sm text-slate-500">
                物流システム導入・業務改善の明細を入力します
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ＋ 明細追加
            </button>
          </div>

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">
                    明細 {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    削除
                  </button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      内容
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(item.id, 'description', e.target.value)
                      }
                      placeholder="例：配送案件一覧・地図表示・CSV取込・再配達管理機能"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        単価
                      </label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(item.id, 'unitPrice', e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        数量
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(item.id, 'quantity', e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        金額
                      </label>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900">
                        ¥{formatCurrency(item.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                消費税率（%）
              </label>
              <input
                type="number"
                value={form.taxRate}
                onChange={(e) => updateForm({ taxRate: Number(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                備考
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                rows={5}
                placeholder="対象拠点、導入スケジュール、保守範囲、支払条件、物流現場の課題など"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            value="save"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? '保存中...' : isEdit ? '更新する' : '保存する'}
          </button>

          <button
            type="submit"
            value="preview"
            disabled={submitting}
            className="rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            {submitting ? '処理中...' : '保存してプレビュー'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/quotes')}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            一覧へ戻る
          </button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">金額サマリー</h3>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>小計</span>
              <span className="font-semibold text-slate-900">
                ¥{formatCurrency(form.subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>消費税</span>
              <span className="font-semibold text-slate-900">
                ¥{formatCurrency(form.taxAmount)}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">合計</span>
                <span className="text-2xl font-bold text-slate-900">
                  ¥{formatCurrency(form.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">確認ポイント</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>・荷主担当者と案件名は必須</li>
            <li>・明細は空欄を除外して保存</li>
            <li>・保存してプレビューから提出用確認が可能</li>
            <li>・物流会社向けの見積書レイアウトで印刷対応</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}