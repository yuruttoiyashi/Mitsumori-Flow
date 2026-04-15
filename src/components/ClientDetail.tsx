import { useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Client } from "../types/client";
import ClientEditForm from "./ClientEditForm";

type ClientDetailProps = {
  client: Client | null;
  onUpdated?: () => Promise<void> | void;
};

export default function ClientDetail({
  client,
  onUpdated,
}: ClientDetailProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!client) return;

    const confirmed = window.confirm(
      `「${client.name}」を削除しますか？\nこの操作は元に戻せません。`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      const relatedProjectsSnapshot = await getDocs(
        query(
          collection(db, "projects"),
          where("userId", "==", client.userId),
          where("clientId", "==", client.id)
        )
      );

      if (!relatedProjectsSnapshot.empty) {
        setError(
          "この顧客に紐づく案件があるため削除できません。先に案件を削除するか、別の顧客に付け替えてください。"
        );
        return;
      }

      await deleteDoc(doc(db, "clients", client.id));

      setEditing(false);

      if (onUpdated) {
        await onUpdated();
      }
    } catch (err) {
      console.error(err);
      setError("顧客の削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
  };

  if (!client) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-2xl font-bold text-slate-900">顧客詳細</h3>
        <p className="mt-3 text-slate-600">
          一覧から顧客を選ぶと詳細が表示されます。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">顧客詳細</h3>
          <p className="mt-2 text-sm text-slate-600">
            選択中の顧客情報の確認・編集ができます。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setEditing((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            {editing ? "詳細に戻る" : "編集する"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center rounded-2xl bg-rose-100 px-4 py-2 font-semibold text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "削除中..." : "削除する"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h4 className="text-xl font-bold text-slate-900">{client.name}</h4>
        {client.companyName && (
          <p className="mt-1 text-sm text-slate-600">{client.companyName}</p>
        )}
      </div>

      {editing ? (
        <ClientEditForm
          client={client}
          onSaved={async () => {
            setEditing(false);
            if (onUpdated) {
              await onUpdated();
            }
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                顧客名
              </span>
              <p className="text-slate-800">{client.name || "-"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                会社名
              </span>
              <p className="text-slate-800">{client.companyName || "-"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                メールアドレス
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

          <div className="space-y-1">
            <span className="text-xs font-bold tracking-wide text-slate-500">
              メモ
            </span>
            <p className="whitespace-pre-wrap text-slate-800">
              {client.memo || "メモはありません。"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}