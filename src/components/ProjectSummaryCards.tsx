import type { Project } from "../types/project";

type ProjectSummaryCardsProps = {
  projects: Project[];
};

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

export default function ProjectSummaryCards({
  projects,
}: ProjectSummaryCardsProps) {
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

  const cards = [
    {
      label: "総案件数",
      value: `${totalProjects}件`,
      tone: "bg-slate-50 border-slate-200 text-slate-900",
    },
    {
      label: "問い合わせ・見積中",
      value: `${inquiryCount}件`,
      tone: "bg-indigo-50 border-indigo-200 text-indigo-700",
    },
    {
      label: "進行中",
      value: `${inProgressCount}件`,
      tone: "bg-amber-50 border-amber-200 text-amber-700",
    },
    {
      label: "完了・納品済み",
      value: `${completedCount}件`,
      tone: "bg-emerald-50 border-emerald-200 text-emerald-700",
    },
    {
      label: "見積総額",
      value: formatAmount(totalEstimateAmount),
      tone: "bg-sky-50 border-sky-200 text-sky-700",
    },
    {
      label: "受注総額",
      value: formatAmount(totalFinalAmount),
      tone: "bg-violet-50 border-violet-200 text-violet-700",
    },
    {
      label: "7日以内の納期",
      value: `${dueSoonCount}件`,
      tone: "bg-rose-50 border-rose-200 text-rose-700",
    },
  ];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5">
        <h3 className="text-2xl font-bold text-slate-900">ダッシュボード</h3>
        <p className="mt-2 text-sm text-slate-600">
          案件全体の件数・金額・納期状況をまとめて確認できます。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
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
  );
}