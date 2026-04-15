import { useEffect, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import type { Client } from "../types/client";
import {
  PROJECT_STATUS_OPTIONS,
  type ProjectFormValues,
} from "../types/project";

type ProjectFormProps = {
  onCreated?: () => Promise<void> | void;
};

const initialValues: ProjectFormValues = {
  clientId: "",
  title: "",
  description: "",
  status: "inquiry",
  estimateAmount: "0",
  finalAmount: "0",
  inquiryDate: "",
  dueDate: "",
  deliveryDate: "",
  quoteNote: "",
  internalNote: "",
};

function toNullableTimestamp(value: string) {
  if (!value) return null;
  return Timestamp.fromDate(new Date(`${value}T00:00:00`));
}

export default function ProjectForm({ onCreated }: ProjectFormProps) {
  const { user } = useAuth();
  const [values, setValues] = useState<ProjectFormValues>(initialValues);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchClients = async () => {
      if (!user) {
        setClients([]);
        setClientsLoading(false);
        return;
      }

      try {
        setClientsLoading(true);

        const q = query(
          collection(db, "clients"),
          where("userId", "==", user.uid)
        );

        const snapshot = await getDocs(q);

        const list: Client[] = snapshot.docs.map((docItem) => {
          const data = docItem.data();

          return {
            id: docItem.id,
            userId: data.userId ?? "",
            name: data.name ?? "",
            companyName: data.companyName ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            memo: data.memo ?? "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });

        list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
        setClients(list);
      } catch (err) {
        console.error(err);
        setError("顧客一覧の取得に失敗しました。");
      } finally {
        setClientsLoading(false);
      }
    };

    void fetchClients();
  }, [user]);

  const handleChange = (key: keyof ProjectFormValues, value: string) => {
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

    if (clients.length === 0) {
      setError("先に顧客を登録してください。");
      return;
    }

    if (!values.clientId) {
      setError("顧客を選択してください。");
      return;
    }

    if (!values.title.trim()) {
      setError("案件名は必須です。");
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, "projects"), {
        userId: user.uid,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setValues(initialValues);
      setSuccess("案件を登録しました。");

      if (onCreated) {
        await onCreated();
      }
    } catch (err) {
      console.error(err);
      setError("案件の登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  const selectClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-slate-900">新規案件登録</h3>
        <p className="mt-2 text-sm text-slate-600">
          顧客に紐づく案件を登録します。
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="clientId"
            className="text-sm font-semibold text-slate-800"
          >
            顧客<span className="ml-1 text-rose-500">*</span>
          </label>
          <select
            id="clientId"
            className={selectClassName}
            value={values.clientId}
            onChange={(e) => handleChange("clientId", e.target.value)}
            disabled={clientsLoading || clients.length === 0}
          >
            <option value="">
              {clientsLoading
                ? "顧客を読み込み中..."
                : clients.length === 0
                  ? "顧客を先に登録してください"
                  : "顧客を選択してください"}
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="title"
            className="text-sm font-semibold text-slate-800"
          >
            案件名<span className="ml-1 text-rose-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            className={inputClassName}
            value={values.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="例：LP制作 / バナー制作 / システム改修"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="description"
            className="text-sm font-semibold text-slate-800"
          >
            案件説明
          </label>
          <textarea
            id="description"
            rows={3}
            className={inputClassName}
            value={values.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="依頼内容の概要"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="status"
              className="text-sm font-semibold text-slate-800"
            >
              ステータス
            </label>
            <select
              id="status"
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
            <label
              htmlFor="estimateAmount"
              className="text-sm font-semibold text-slate-800"
            >
              見積金額
            </label>
            <input
              id="estimateAmount"
              type="number"
              min="0"
              className={inputClassName}
              value={values.estimateAmount}
              onChange={(e) => handleChange("estimateAmount", e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="finalAmount"
              className="text-sm font-semibold text-slate-800"
            >
              最終金額
            </label>
            <input
              id="finalAmount"
              type="number"
              min="0"
              className={inputClassName}
              value={values.finalAmount}
              onChange={(e) => handleChange("finalAmount", e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="inquiryDate"
              className="text-sm font-semibold text-slate-800"
            >
              問い合わせ日
            </label>
            <input
              id="inquiryDate"
              type="date"
              className={inputClassName}
              value={values.inquiryDate}
              onChange={(e) => handleChange("inquiryDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="dueDate"
              className="text-sm font-semibold text-slate-800"
            >
              納期
            </label>
            <input
              id="dueDate"
              type="date"
              className={inputClassName}
              value={values.dueDate}
              onChange={(e) => handleChange("dueDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="deliveryDate"
              className="text-sm font-semibold text-slate-800"
            >
              納品日
            </label>
            <input
              id="deliveryDate"
              type="date"
              className={inputClassName}
              value={values.deliveryDate}
              onChange={(e) => handleChange("deliveryDate", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="quoteNote"
            className="text-sm font-semibold text-slate-800"
          >
            見積メモ
          </label>
          <textarea
            id="quoteNote"
            rows={3}
            className={inputClassName}
            value={values.quoteNote}
            onChange={(e) => handleChange("quoteNote", e.target.value)}
            placeholder="見積条件、提案内容など"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="internalNote"
            className="text-sm font-semibold text-slate-800"
          >
            内部メモ
          </label>
          <textarea
            id="internalNote"
            rows={4}
            className={inputClassName}
            value={values.internalNote}
            onChange={(e) => handleChange("internalNote", e.target.value)}
            placeholder="対応メモ、注意点など"
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
          disabled={submitting || clientsLoading || clients.length === 0}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "登録中..." : "案件を登録"}
        </button>
      </form>
    </div>
  );
}