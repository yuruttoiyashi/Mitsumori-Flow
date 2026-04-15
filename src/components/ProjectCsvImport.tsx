import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import type { Client } from "../types/client";
import { parseProjectRows, readCsvFile } from "../utils/csvImport";

type ProjectCsvImportProps = {
  clients: Client[];
  onImported?: () => Promise<void> | void;
};

export default function ProjectCsvImport({
  clients,
  onImported,
}: ProjectCsvImportProps) {
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;
    if (!user) {
      setError("ログイン情報が取得できません。");
      return;
    }

    try {
      setImporting(true);
      setError("");
      setMessage("");

      const rows = await readCsvFile(file);
      const parsed = parseProjectRows(rows);

      for (const row of parsed) {
        const client = clients.find(
          (item) => item.name.trim() === row.clientName.trim()
        );

        if (!client) {
          throw new Error(
            `顧客「${row.clientName}」が見つかりません。先に顧客を登録してください。`
          );
        }

        await addDoc(collection(db, "projects"), {
          userId: user.uid,
          clientId: client.id,
          title: row.title,
          description: row.description,
          status: row.status,
          estimateAmount: row.estimateAmount,
          finalAmount: row.finalAmount,
          inquiryDate: row.inquiryDate,
          dueDate: row.dueDate,
          deliveryDate: row.deliveryDate,
          quoteNote: row.quoteNote,
          internalNote: row.internalNote,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setMessage(`${parsed.length}件の案件を取り込みました。`);

      if (onImported) {
        await onImported();
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "案件CSVの取り込みに失敗しました。"
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-slate-900">案件CSV取込</h3>
        <p className="mt-2 text-sm text-slate-600">
          clientName, title, description, status, estimateAmount, finalAmount,
          inquiryDate, dueDate, deliveryDate, quoteNote, internalNote のCSVを取り込めます。
        </p>
      </div>

      <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700">
        {importing ? "取込中..." : "CSVファイルを選択"}
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
          disabled={importing}
        />
      </label>

      {message && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}