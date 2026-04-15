import { useState, type FormEvent } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import type { ClientFormValues } from "../types/client";

type ClientFormProps = {
  onCreated?: () => Promise<void> | void;
};

const initialValues: ClientFormValues = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  memo: "",
};

export default function ClientForm({ onCreated }: ClientFormProps) {
  const { user } = useAuth();
  const [values, setValues] = useState<ClientFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (key: keyof ClientFormValues, value: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("ログイン情報が取得できません。再度ログインしてください。");
      return;
    }

    if (!values.name.trim()) {
      setError("顧客名は必須です。");
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, "clients"), {
        userId: user.uid,
        name: values.name.trim(),
        companyName: values.companyName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        memo: values.memo.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setValues(initialValues);
      setSuccess("顧客を登録しました。");

      if (onCreated) {
        await onCreated();
      }
    } catch (err) {
      console.error(err);
      setError("顧客の登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-slate-900">新規顧客登録</h3>
        <p className="mt-2 text-sm text-slate-600">
          案件に紐づける顧客情報を登録します。
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-semibold text-slate-800">
            顧客名<span className="ml-1 text-rose-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            className={inputClassName}
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="例：山田 花子 / 株式会社サンプル"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="companyName" className="text-sm font-semibold text-slate-800">
            会社名
          </label>
          <input
            id="companyName"
            type="text"
            className={inputClassName}
            value={values.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
            placeholder="例：株式会社サンプル"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-800">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            className={inputClassName}
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="example@email.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-semibold text-slate-800">
            電話番号
          </label>
          <input
            id="phone"
            type="text"
            className={inputClassName}
            value={values.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="090-1234-5678"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="memo" className="text-sm font-semibold text-slate-800">
            メモ
          </label>
          <textarea
            id="memo"
            rows={5}
            className={inputClassName}
            value={values.memo}
            onChange={(e) => handleChange("memo", e.target.value)}
            placeholder="顧客の特徴、依頼傾向、備考など"
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
          className="inline-flex w-full items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "登録中..." : "顧客を登録"}
        </button>
      </form>
    </div>
  );
}