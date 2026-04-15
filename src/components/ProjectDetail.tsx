import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Client } from "../types/client";
import {
  PROJECT_STATUS_OPTIONS,
  type Project,
  type ProjectStatus,
} from "../types/project";
import type { ProjectUpdate } from "../types/projectUpdate";
import ProjectEditForm from "./ProjectEditForm";
import ProjectUpdateForm from "./ProjectUpdateForm";
import ProjectUpdateList from "./ProjectUpdateList";

type ProjectDetailProps = {
  project: Project | null;
  clients: Client[];
  onUpdated?: () => Promise<void> | void;
};

function formatDate(value: unknown) {
  if (!value) return "-";

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate() as Date;
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }

  return "-";
}

function formatAmount(value: number) {
  return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
}

function getStatusLabel(status: ProjectStatus) {
  return (
    PROJECT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
  );
}

function getStatusClassName(status: ProjectStatus) {
  switch (status) {
    case "inquiry":
      return "bg-indigo-100 text-indigo-700";
    case "quoted":
      return "bg-sky-100 text-sky-700";
    case "ordered":
      return "bg-emerald-100 text-emerald-700";
    case "in_progress":
      return "bg-amber-100 text-amber-700";
    case "delivered":
      return "bg-violet-100 text-violet-700";
    case "closed":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function ProjectDetail({
  project,
  clients,
  onUpdated,
}: ProjectDetailProps) {
  const [editing, setEditing] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updatesError, setUpdatesError] = useState("");

  const clientName = useMemo(() => {
    if (!project) return "-";
    return (
      clients.find((client) => client.id === project.clientId)?.name ?? "不明な顧客"
    );
  }, [clients, project]);

  const fetchUpdates = async () => {
    if (!project) {
      setUpdates([]);
      return;
    }

    try {
      setUpdatesLoading(true);
      setUpdatesError("");

      const snapshot = await getDocs(
        query(
          collection(db, "projects", project.id, "updates"),
          orderBy("createdAt", "desc")
        )
      );

      const list: ProjectUpdate[] = snapshot.docs.map((docItem) => {
        const data = docItem.data();

        return {
          id: docItem.id,
          userId: data.userId ?? "",
          type: data.type ?? "note",
          body: data.body ?? "",
          createdAt: data.createdAt,
        };
      });

      setUpdates(list);
    } catch (err) {
      console.error(err);
      setUpdatesError("進捗履歴の取得に失敗しました。");
    } finally {
      setUpdatesLoading(false);
    }
  };

  useEffect(() => {
    setEditing(false);
    setError("");

    if (project) {
      void fetchUpdates();
    } else {
      setUpdates([]);
      setUpdatesError("");
    }
  }, [project?.id]);

  const handleStatusChange = async (nextStatus: ProjectStatus) => {
    if (!project || project.status === nextStatus) return;

    try {
      setStatusLoading(true);
      setError("");

      await updateDoc(doc(db, "projects", project.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      if (onUpdated) {
        await onUpdated();
      }
    } catch (err) {
      console.error(err);
      setError("ステータスの更新に失敗しました。");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    const confirmed = window.confirm(
      `「${project.title}」を削除しますか？\nこの操作は元に戻せません。`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await deleteDoc(doc(db, "projects", project.id));

      setEditing(false);

      if (onUpdated) {
        await onUpdated();
      }
    } catch (err) {
      console.error(err);
      setError("案件の削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
  };

  if (!project) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-2xl font-bold text-slate-900">案件詳細</h3>
        <p className="mt-3 text-slate-600">
          一覧から案件を選ぶと詳細が表示されます。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">案件詳細</h3>
          <p className="mt-2 text-sm text-slate-600">
            選択中の案件の内容確認・編集ができます。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
              project.status
            )}`}
          >
            {getStatusLabel(project.status)}
          </span>

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
        <h4 className="text-xl font-bold text-slate-900">{project.title}</h4>
        <p className="mt-1 text-sm text-slate-600">顧客: {clientName}</p>
      </div>

      <div className="mb-6 space-y-3">
        <p className="text-sm font-semibold text-slate-800">ステータス更新</p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_STATUS_OPTIONS.map((option) => {
            const active = option.value === project.status;

            return (
              <button
                key={option.value}
                type="button"
                disabled={statusLoading}
                onClick={() => handleStatusChange(option.value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {statusLoading && active ? "更新中..." : option.label}
              </button>
            );
          })}
        </div>
      </div>

      {editing ? (
        <ProjectEditForm
          project={project}
          clients={clients}
          onSaved={async () => {
            setEditing(false);
            if (onUpdated) {
              await onUpdated();
            }
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                見積金額
              </span>
              <p className="text-slate-800">{formatAmount(project.estimateAmount)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                最終金額
              </span>
              <p className="text-slate-800">{formatAmount(project.finalAmount)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                問い合わせ日
              </span>
              <p className="text-slate-800">{formatDate(project.inquiryDate)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                納期
              </span>
              <p className="text-slate-800">{formatDate(project.dueDate)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                納品日
              </span>
              <p className="text-slate-800">{formatDate(project.deliveryDate)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                案件説明
              </span>
              <p className="whitespace-pre-wrap text-slate-800">
                {project.description || "説明はありません。"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                見積メモ
              </span>
              <p className="whitespace-pre-wrap text-slate-800">
                {project.quoteNote || "見積メモはありません。"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wide text-slate-500">
                内部メモ
              </span>
              <p className="whitespace-pre-wrap text-slate-800">
                {project.internalNote || "内部メモはありません。"}
              </p>
            </div>
          </div>

          <ProjectUpdateForm
            projectId={project.id}
            onCreated={fetchUpdates}
          />

          {updatesError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {updatesError}
            </div>
          )}

          <ProjectUpdateList
            updates={updates}
            loading={updatesLoading}
          />
        </div>
      )}
    </div>
  );
}