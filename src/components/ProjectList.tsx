import type { Client } from "../types/client";
import {
  PROJECT_STATUS_OPTIONS,
  type Project,
  type ProjectStatus,
} from "../types/project";

type ProjectListProps = {
  projects: Project[];
  clients: Client[];
  loading: boolean;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
};

function getStatusLabel(status: ProjectStatus) {
  return (
    PROJECT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
  );
}

function getClientName(clientId: string, clients: Client[]) {
  return clients.find((client) => client.id === clientId)?.name ?? "不明な顧客";
}

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

export default function ProjectList({
  projects,
  clients,
  loading,
  selectedProjectId,
  onSelectProject,
}: ProjectListProps) {
  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-2xl font-bold text-slate-900">案件一覧</h3>
        <p className="mt-3 text-slate-600">読み込み中...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-2xl font-bold text-slate-900">案件一覧</h3>
        <p className="mt-3 text-slate-600">条件に合う案件がありません。</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-slate-900">案件一覧</h3>
        <p className="mt-2 text-sm text-slate-600">
          {projects.length}件の案件が表示されています。
        </p>
      </div>

      <div className="space-y-4">
        {projects.map((project) => {
          const selected = project.id === selectedProjectId;

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelectProject(project.id)}
              className={`block w-full rounded-3xl border bg-slate-50 p-5 text-left transition ${
                selected
                  ? "border-violet-400 ring-4 ring-violet-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h4 className="text-xl font-bold text-slate-900">
                    {project.title}
                  </h4>
                  <p className="mt-1 text-sm text-slate-600">
                    顧客: {getClientName(project.clientId, clients)}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                    project.status
                  )}`}
                >
                  {getStatusLabel(project.status)}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-wide text-slate-500">
                    見積金額
                  </span>
                  <p className="text-slate-800">
                    {formatAmount(project.estimateAmount)}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-wide text-slate-500">
                    最終金額
                  </span>
                  <p className="text-slate-800">
                    {formatAmount(project.finalAmount)}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-wide text-slate-500">
                    問い合わせ日
                  </span>
                  <p className="text-slate-800">{formatDate(project.inquiryDate)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}