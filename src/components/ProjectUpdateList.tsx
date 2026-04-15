import {
  PROJECT_UPDATE_TYPE_OPTIONS,
  type ProjectUpdate,
  type ProjectUpdateType,
} from "../types/projectUpdate";

type ProjectUpdateListProps = {
  updates: ProjectUpdate[];
  loading: boolean;
};

function getTypeLabel(type: ProjectUpdateType) {
  return (
    PROJECT_UPDATE_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type
  );
}

function getTypeClassName(type: ProjectUpdateType) {
  switch (type) {
    case "estimate_sent":
      return "bg-sky-100 text-sky-700";
    case "first_draft":
      return "bg-indigo-100 text-indigo-700";
    case "revision":
      return "bg-amber-100 text-amber-700";
    case "delivered":
      return "bg-emerald-100 text-emerald-700";
    case "note":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDateTime(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate() as Date;
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  return "-";
}

export default function ProjectUpdateList({
  updates,
  loading,
}: ProjectUpdateListProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4">
        <h4 className="text-lg font-bold text-slate-900">進捗履歴</h4>
        <p className="mt-1 text-sm text-slate-600">
          案件ごとの対応履歴を時系列で確認できます。
        </p>
      </div>

      {loading ? (
        <p className="text-slate-600">読み込み中...</p>
      ) : updates.length === 0 ? (
        <p className="text-slate-600">まだ進捗履歴がありません。</p>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div
              key={update.id}
              className="rounded-3xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeClassName(
                    update.type
                  )}`}
                >
                  {getTypeLabel(update.type)}
                </span>

                <span className="text-xs font-medium text-slate-500">
                  {formatDateTime(update.createdAt)}
                </span>
              </div>

              <p className="whitespace-pre-wrap text-slate-800">{update.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}