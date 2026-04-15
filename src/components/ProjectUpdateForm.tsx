import { useState, type FormEvent } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  PROJECT_UPDATE_TYPE_OPTIONS,
  type ProjectUpdateType,
} from "../types/projectUpdate";

type ProjectUpdateFormProps = {
  projectId: string;
  onCreated?: () => Promise<void> | void;
};

export default function ProjectUpdateForm({
  projectId,
  onCreated,
}: ProjectUpdateFormProps) {
  const { user } = useAuth();
  const [type, setType] = useState<ProjectUpdateType>("note");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("ログイン情報が取得できません。");
      return;
    }

    if (!body.trim()) {
      setError("進捗内容を入力してください。");
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, "projects", projectId, "updates"), {
        userId: user.uid,
        type,
        body: body.trim(),
        createdAt: serverTimestamp(),
      });

      setBody("");
      setType("note");
      setSuccess("進捗履歴を追加しました。");

      if (onCreated) {
        await onCreated();
      }
    } catch (err) {
      console.error(err);
      setError("進捗履歴の追加に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4">
        <h4 className="text-lg font-bold text-slate-900">進捗を追加</h4>
        <p className="mt-1 text-sm text-slate-600">
          見積送付、初稿提出、修正対応などの履歴を残せます。
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="update-type"
            className="text-sm font-semibold text-slate-800"
          >
            種別
          </label>
          <select
            id="update-type"
            value={type}
            onChange={(e) => setType(e.target.value as ProjectUpdateType)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          >
            {PROJECT_UPDATE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="update-body"
            className="text-sm font-semibold text-slate-800"
          >
            内容
          </label>
          <textarea
            id="update-body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="例：見積書をメールで送付。4/18まで返答待ち。"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "追加中..." : "進捗を追加"}
        </button>
      </form>
    </div>
  );
}