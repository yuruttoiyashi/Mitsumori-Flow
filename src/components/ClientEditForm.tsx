import { useEffect, useState, type FormEvent } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Client, ClientFormValues } from "../types/client";

type ClientEditFormProps = {
  client: Client;
  onSaved?: () => Promise<void> | void;
  onCancel?: () => void;
};

function createInitialValues(client: Client): ClientFormValues {
  return {
    name: client.name ?? "",
    companyName: client.companyName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    memo: client.memo ?? "",
  };
}

export default function ClientEditForm({
  client,
  onSaved,
  onCancel,
}: ClientEditFormProps) {
  const [values, setValues] = useState<ClientFormValues>(createInitialValues(client));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValues(createInitialValues(client));
    setError("");
  }, [client.id, client.name, client.companyName, client.email, client.phone, client.memo]);

  const handleChange = (key: keyof ClientFormValues, value: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!values.name.trim()) {
      setError("顧客名は必須です。");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "clients", client.id), {
        name: values.name.trim(),
        companyName: values.companyName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        memo: values.memo.trim(),
        updatedAt: serverTimestamp(),
      });

      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      console.error(err);
      setError("顧客情報の更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="edit-name" className="text-sm font-semibold text-slate-800">
          顧客名<span className="ml-1 text-rose-500">*</span>
        </label>
        <input
          id="edit-name"
          type="text"
          className={inputClassName}
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-companyName" className="text-sm font-semibold text-slate-800">
          会社名
        </label>
        <input
          id="edit-companyName"
          type="text"
          className={inputClassName}
          value={values.companyName}
          onChange={(e) => handleChange("companyName", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-email" className="text-sm font-semibold text-slate-800">
          メールアドレス
        </label>
        <input
          id="edit-email"
          type="email"
          className={inputClassName}
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-phone" className="text-sm font-semibold text-slate-800">
          電話番号
        </label>
        <input
          id="edit-phone"
          type="text"
          className={inputClassName}
          value={values.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-memo" className="text-sm font-semibold text-slate-800">
          メモ
        </label>
        <textarea
          id="edit-memo"
          rows={5}
          className={inputClassName}
          value={values.memo}
          onChange={(e) => handleChange("memo", e.target.value)}
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