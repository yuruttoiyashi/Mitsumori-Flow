import { useEffect, useState, type FormEvent } from "react";
import { doc, Timestamp, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Client } from "../types/client";
import {
  PROJECT_STATUS_OPTIONS,
  type Project,
  type ProjectFormValues,
} from "../types/project";

type ProjectEditFormProps = {
  project: Project;
  clients: Client[];
  onSaved?: () => Promise<void> | void;
  onCancel?: () => void;
};

function toDateInputValue(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate() as Date;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return "";
}

function toNullableTimestamp(value: string) {
  if (!value) return null;
  return Timestamp.fromDate(new Date(`${value}T00:00:00`));
}

function createInitialValues(project: Project): ProjectFormValues {
  return {
    clientId: project.clientId,
    title: project.title,
    description: project.description,
    status: project.status,
    estimateAmount: String(project.estimateAmount ?? 0),
    finalAmount: String(project.finalAmount ?? 0),
    inquiryDate: toDateInputValue(project.inquiryDate),
    dueDate: toDateInputValue(project.dueDate),
    deliveryDate: toDateInputValue(project.deliveryDate),
    quoteNote: project.quoteNote,
    internalNote: project.internalNote,
  };
}

export default function ProjectEditForm({
  project,
  clients,
  onSaved,
  onCancel,
}: ProjectEditFormProps) {
  const [values, setValues] = useState<ProjectFormValues>(createInitialValues(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValues(createInitialValues(project));
    setError("");
  }, [project]);

  const handleChange = (key: keyof ProjectFormValues, value: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!values.clientId) {
      setError("顧客を選択してください。");
      return;
    }

    if (!values.title.trim()) {
      setError("案件名は必須です。");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "projects", project.id), {
        clientId: values.clientId,
        title: values.title.trim(),
        description: values.description.trim(),
        status: values.status,
        estimateAmount: Number(values.estimateAmount || 0),
        finalAmount: Number(values.finalAmount || 0),
        inquiryDate: toNullableTimestamp(values.inquiryDate),
        dueDate: toNullableTimestamp(values.dueDate),
        deliveryDate: toNullableTimestamp(values.deliveryDate),
        quoteNote: values.quoteNote.trim(),
        internalNote: values.internalNote.trim(),
        updatedAt: serverTimestamp(),
      });

      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      console.error(err);
      setError("案件の更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  const selectClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="edit-clientId" className="text-sm font-semibold text-slate-800">
            顧客<span className="ml-1 text-rose-500">*</span>
          </label>
          <select
            id="edit-clientId"
            className={selectClassName}
            value={values.clientId}
            onChange={(e) => handleChange("clientId", e.target.value)}
          >
            <option value="">顧客を選択してください</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-title" className="text-sm font-semibold text-slate-800">
            案件名<span className="ml-1 text-rose-500">*</span>
          </label>
          <input
            id="edit-title"
            type="text"
            className={inputClassName}
            value={values.title}
            onChange={(e) => handleChange("title", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-description" className="text-sm font-semibold text-slate-800">
          案件説明
        </label>
        <textarea
          id="edit-description"
          rows={3}
          className={inputClassName}
          value={values.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="edit-status" className="text-sm font-semibold text-slate-800">
            ステータス
          </label>
          <select
            id="edit-status"
            className={selectClassName}
            value={values.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            {PROJECT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-estimateAmount" className="text-sm font-semibold text-slate-800">
            見積金額
          </label>
          <input
            id="edit-estimateAmount"
            type="number"
            min="0"
            className={inputClassName}
            value={values.estimateAmount}
            onChange={(e) => handleChange("estimateAmount", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-finalAmount" className="text-sm font-semibold text-slate-800">
            最終金額
          </label>
          <input
            id="edit-finalAmount"
            type="number"
            min="0"
            className={inputClassName}
            value={values.finalAmount}
            onChange={(e) => handleChange("finalAmount", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-inquiryDate" className="text-sm font-semibold text-slate-800">
            問い合わせ日
          </label>
          <input
            id="edit-inquiryDate"
            type="date"
            className={inputClassName}
            value={values.inquiryDate}
            onChange={(e) => handleChange("inquiryDate", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-dueDate" className="text-sm font-semibold text-slate-800">
            納期
          </label>
          <input
            id="edit-dueDate"
            type="date"
            className={inputClassName}
            value={values.dueDate}
            onChange={(e) => handleChange("dueDate", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-deliveryDate" className="text-sm font-semibold text-slate-800">
            納品日
          </label>
          <input
            id="edit-deliveryDate"
            type="date"
            className={inputClassName}
            value={values.deliveryDate}
            onChange={(e) => handleChange("deliveryDate", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-quoteNote" className="text-sm font-semibold text-slate-800">
          見積メモ
        </label>
        <textarea
          id="edit-quoteNote"
          rows={3}
          className={inputClassName}
          value={values.quoteNote}
          onChange={(e) => handleChange("quoteNote", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-internalNote" className="text-sm font-semibold text-slate-800">
          内部メモ
        </label>
        <textarea
          id="edit-internalNote"
          rows={4}
          className={inputClassName}
          value={values.internalNote}
          onChange={(e) => handleChange("internalNote", e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "保存中..." : "変更を保存"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}