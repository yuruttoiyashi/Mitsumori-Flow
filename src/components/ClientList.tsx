import type { Client } from "../types/client";

type ClientListProps = {
  clients: Client[];
  loading: boolean;
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
};

export default function ClientList({
  clients,
  loading,
  selectedClientId,
  onSelectClient,
}: ClientListProps) {
  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-2xl font-bold text-slate-900">顧客一覧</h3>
        <p className="mt-3 text-slate-600">読み込み中...</p>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-2xl font-bold text-slate-900">顧客一覧</h3>
        <p className="mt-3 text-slate-600">条件に合う顧客がありません。</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-slate-900">顧客一覧</h3>
        <p className="mt-2 text-sm text-slate-600">
          {clients.length}件の顧客が表示されています。
        </p>
      </div>

      <div className="space-y-4">
        {clients.map((client) => {
          const selected = client.id === selectedClientId;

          return (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelectClient(client.id)}
              className={`block w-full rounded-3xl border p-5 text-left transition ${
                selected
                  ? "border-violet-400 bg-violet-50 ring-4 ring-violet-100"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-xl font-bold text-slate-900">
                    {client.name}
                  </h4>
                  {client.companyName && (
                    <p className="mt-1 text-sm text-slate-600">
                      {client.companyName}
                    </p>
                  )}
                </div>

                {client.companyName && (
                  <span className="inline-flex w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                    {client.companyName}
                  </span>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-wide text-slate-500">
                    メール
                  </span>
                  <p className="text-slate-800">{client.email || "-"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-wide text-slate-500">
                    電話番号
                  </span>
                  <p className="text-slate-800">{client.phone || "-"}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <span className="text-xs font-bold tracking-wide text-slate-500">
                  メモ
                </span>
                <p className="whitespace-pre-wrap text-slate-800">
                  {client.memo || "メモはありません。"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}