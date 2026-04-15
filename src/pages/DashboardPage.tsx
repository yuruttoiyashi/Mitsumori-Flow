import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import type { Client } from "../types/client";
import {
  PROJECT_STATUS_OPTIONS,
  type Project,
  type ProjectStatus,
} from "../types/project";
import {
  PROJECT_UPDATE_TYPE_OPTIONS,
  type ProjectUpdate,
  type ProjectUpdateType,
} from "../types/projectUpdate";

type DashboardUpdateItem = ProjectUpdate & {
  projectId: string;
  projectTitle: string;
  clientName: string;
};

function getSeconds(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return value.seconds;
  }

  return 0;
}

function getDateTime(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return (value.toDate() as Date).getTime();
  }

  return null;
}

function formatAmount(value: number) {
  return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
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

function getStatusBarClassName(status: ProjectStatus) {
  switch (status) {
    case "inquiry":
      return "bg-indigo-500";
    case "quoted":
      return "bg-sky-500";
    case "ordered":
      return "bg-emerald-500";
    case "in_progress":
      return "bg-amber-500";
    case "delivered":
      return "bg-violet-500";
    case "closed":
      return "bg-green-600";
    case "cancelled":
      return "bg-rose-500";
    default:
      return "bg-slate-500";
  }
}

function getUpdateTypeLabel(type: ProjectUpdateType) {
  return (
    PROJECT_UPDATE_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type
  );
}

function getUpdateTypeClassName(type: ProjectUpdateType) {
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<DashboardUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    if (!user?.uid) {
      setProjects([]);
      setClients([]);
      setRecentUpdates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [projectsSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(
          query(collection(db, "projects"), where("userId", "==", user.uid))
        ),
        getDocs(
          query(collection(db, "clients"), where("userId", "==", user.uid))
        ),
      ]);

      const projectList: Project[] = projectsSnapshot.docs.map((docItem) => {
        const data = docItem.data();

        return {
          id: docItem.id,
          userId: data.userId ?? "",
          clientId: data.clientId ?? "",
          title: data.title ?? "",
          description: data.description ?? "",
          status: (data.status ?? "inquiry") as ProjectStatus,
          estimateAmount: Number(data.estimateAmount ?? 0),
          finalAmount: Number(data.finalAmount ?? 0),
          inquiryDate: data.inquiryDate ?? null,
          dueDate: data.dueDate ?? null,
          deliveryDate: data.deliveryDate ?? null,
          quoteNote: data.quoteNote ?? "",
          internalNote: data.internalNote ?? "",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      const clientList: Client[] = clientsSnapshot.docs.map((docItem) => {
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

      projectList.sort((a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt));
      clientList.sort((a, b) => a.name.localeCompare(b.name, "ja"));

      const updateResults = await Promise.all(
        projectList.map(async (project) => {
          const snapshot = await getDocs(
            query(
              collection(db, "projects", project.id, "updates"),
              orderBy("createdAt", "desc"),
              limit(3)
            )
          );

          const clientName =
            clientList.find((client) => client.id === project.clientId)?.name ??
            "不明な顧客";

          return snapshot.docs.map((docItem) => {
            const data = docItem.data();

            return {
              id: docItem.id,
              userId: data.userId ?? "",
              type: (data.type ?? "note") as ProjectUpdateType,
              body: data.body ?? "",
              createdAt: data.createdAt,
              projectId: project.id,
              projectTitle: project.title,
              clientName,
            } satisfies DashboardUpdateItem;
          });
        })
      );

      const mergedUpdates = updateResults
        .flat()
        .sort((a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt))
        .slice(0, 8);

      setProjects(projectList);
      setClients(clientList);
      setRecentUpdates(mergedUpdates);
    } catch (err) {
      console.error(err);
      setError("ダッシュボード情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, [user?.uid]);

  const stats = useMemo(() => {
    const totalClients = clients.length;
    const totalProjects = projects.length;

    const inquiryCount = projects.filter(
      (project) => project.status === "inquiry" || project.status === "quoted"
    ).length;

    const inProgressCount = projects.filter(
      (project) => project.status === "ordered" || project.status === "in_progress"
    ).length;

    const completedCount = projects.filter(
      (project) => project.status === "delivered" || project.status === "closed"
    ).length;

    const cancelledCount = projects.filter(
      (project) => project.status === "cancelled"
    ).length;

    const totalEstimateAmount = projects.reduce(
      (sum, project) => sum + Number(project.estimateAmount || 0),
      0
    );

    const totalFinalAmount = projects.reduce(
      (sum, project) => sum + Number(project.finalAmount || 0),
      0
    );

    const now = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(now.getDate() + 7);

    const dueSoonCount = projects.filter((project) => {
      if (
        project.status === "closed" ||
        project.status === "cancelled" ||
        project.status === "delivered"
      ) {
        return false;
      }

      const dueTime = getDateTime(project.dueDate);
      if (!dueTime) return false;

      return dueTime >= now.getTime() && dueTime <= oneWeekLater.getTime();
    }).length;

    return {
      totalClients,
      totalProjects,
      inquiryCount,
      inProgressCount,
      completedCount,
      cancelledCount,
      totalEstimateAmount,
      totalFinalAmount,
      dueSoonCount,
    };
  }, [clients, projects]);

  const statusChartData = useMemo(() => {
    const counts = PROJECT_STATUS_OPTIONS.map((option) => {
      const count = projects.filter((project) => project.status === option.value).length;
      return {
        status: option.value,
        label: option.label,
        count,
      };
    });

    const maxCount = Math.max(...counts.map((item) => item.count), 1);

    return {
      counts,
      maxCount,
    };
  }, [projects]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt))
      .slice(0, 5);
  }, [projects]);

  const dueSoonProjects = useMemo(() => {
    const now = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(now.getDate() + 7);

    return [...projects]
      .filter((project) => {
        if (
          project.status === "closed" ||
          project.status === "cancelled" ||
          project.status === "delivered"
        ) {
          return false;
        }

        const dueTime = getDateTime(project.dueDate);
        if (!dueTime) return false;

        return dueTime >= now.getTime() && dueTime <= oneWeekLater.getTime();
      })
      .sort((a, b) => {
        const aTime = getDateTime(a.dueDate) ?? Number.MAX_SAFE_INTEGER;
        const bTime = getDateTime(b.dueDate) ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [projects]);

  const getClientName = (clientId: string) => {
    return clients.find((client) => client.id === clientId)?.name ?? "不明な顧客";
  };

  const summaryCards = [
    {
      label: "顧客数",
      value: `${stats.totalClients}件`,
      tone: "bg-slate-50 border-slate-200 text-slate-900",
    },
    {
      label: "総案件数",
      value: `${stats.totalProjects}件`,
      tone: "bg-slate-50 border-slate-200 text-slate-900",
    },
    {
      label: "問い合わせ・見積中",
      value: `${stats.inquiryCount}件`,
      tone: "bg-indigo-50 border-indigo-200 text-indigo-700",
    },
    {
      label: "進行中",
      value: `${stats.inProgressCount}件`,
      tone: "bg-amber-50 border-amber-200 text-amber-700",
    },
    {
      label: "完了・納品済み",
      value: `${stats.completedCount}件`,
      tone: "bg-emerald-50 border-emerald-200 text-emerald-700",
    },
    {
      label: "キャンセル",
      value: `${stats.cancelledCount}件`,
      tone: "bg-rose-50 border-rose-200 text-rose-700",
    },
    {
      label: "見積総額",
      value: formatAmount(stats.totalEstimateAmount),
      tone: "bg-sky-50 border-sky-200 text-sky-700",
    },
    {
      label: "受注総額",
      value: formatAmount(stats.totalFinalAmount),
      tone: "bg-violet-50 border-violet-200 text-violet-700",
    },
    {
      label: "7日以内の納期",
      value: `${stats.dueSoonCount}件`,
      tone: "bg-orange-50 border-orange-200 text-orange-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">ダッシュボード</h2>
        <p className="mt-2 text-slate-600">
          顧客・案件・金額・納期状況をまとめて確認できます。
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-600">読み込み中...</p>
        </div>
      ) : (
        <>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h3 className="text-2xl font-bold text-slate-900">集計カード</h3>
              <p className="mt-2 text-sm text-slate-600">
                全体の件数と金額をひと目で確認できます。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-3xl border p-5 ${card.tone}`}
                >
                  <p className="text-sm font-semibold">{card.label}</p>
                  <p className="mt-3 text-2xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h3 className="text-2xl font-bold text-slate-900">ステータス別グラフ</h3>
              <p className="mt-2 text-sm text-slate-600">
                案件のステータス分布を簡易グラフで確認できます。
              </p>
            </div>

            <div className="space-y-4">
              {statusChartData.counts.map((item) => {
                const widthPercent =
                  statusChartData.maxCount === 0
                    ? 0
                    : (item.count / statusChartData.maxCount) * 100;

                return (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                            item.status
                          )}`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {item.count}件
                      </span>
                    </div>

                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${getStatusBarClassName(
                          item.status
                        )}`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5">
                <h3 className="text-2xl font-bold text-slate-900">最近の案件</h3>
                <p className="mt-2 text-sm text-slate-600">
                  直近で追加された案件を表示します。
                </p>
              </div>

              {recentProjects.length === 0 ? (
                <p className="text-slate-600">案件がまだありません。</p>
              ) : (
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">
                            {project.title}
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            顧客: {getClientName(project.clientId)}
                          </p>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                            project.status
                          )}`}
                        >
                          {getStatusLabel(project.status)}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold tracking-wide text-slate-500">
                            見積金額
                          </p>
                          <p className="text-slate-800">
                            {formatAmount(project.estimateAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold tracking-wide text-slate-500">
                            問い合わせ日
                          </p>
                          <p className="text-slate-800">
                            {formatDate(project.inquiryDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5">
                <h3 className="text-2xl font-bold text-slate-900">納期が近い案件</h3>
                <p className="mt-2 text-sm text-slate-600">
                  7日以内に納期が来る案件を表示します。
                </p>
              </div>

              {dueSoonProjects.length === 0 ? (
                <p className="text-slate-600">7日以内の納期案件はありません。</p>
              ) : (
                <div className="space-y-4">
                  {dueSoonProjects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">
                            {project.title}
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            顧客: {getClientName(project.clientId)}
                          </p>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                            project.status
                          )}`}
                        >
                          {getStatusLabel(project.status)}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold tracking-wide text-slate-500">
                            納期
                          </p>
                          <p className="text-slate-800">
                            {formatDate(project.dueDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold tracking-wide text-slate-500">
                            最終金額
                          </p>
                          <p className="text-slate-800">
                            {formatAmount(project.finalAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h3 className="text-2xl font-bold text-slate-900">最近の進捗履歴</h3>
              <p className="mt-2 text-sm text-slate-600">
                案件ごとの最新の動きを時系列で確認できます。
              </p>
            </div>

            {recentUpdates.length === 0 ? (
              <p className="text-slate-600">進捗履歴はまだありません。</p>
            ) : (
              <div className="space-y-4">
                {recentUpdates.map((update) => (
                  <div
                    key={`${update.projectId}-${update.id}`}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">
                          {update.projectTitle}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          顧客: {update.clientName}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getUpdateTypeClassName(
                            update.type
                          )}`}
                        >
                          {getUpdateTypeLabel(update.type)}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {formatDateTime(update.createdAt)}
                        </span>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-slate-800">
                      {update.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}