import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import ProjectForm from "../components/ProjectForm";
import ProjectList from "../components/ProjectList";
import ProjectDetail from "../components/ProjectDetail";
import ProjectCsvImport from "../components/ProjectCsvImport";
import type { Client } from "../types/client";
import {
  PROJECT_STATUS_OPTIONS,
  type Project,
  type ProjectStatus,
} from "../types/project";

type SortKey =
  | "newest"
  | "oldest"
  | "due_asc"
  | "due_desc"
  | "estimate_desc"
  | "estimate_asc"
  | "final_desc"
  | "final_asc"
  | "title_asc";

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

  return Number.MAX_SAFE_INTEGER;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const fetchProjects = async () => {
    if (!user?.uid) {
      setProjects([]);
      setClients([]);
      setSelectedProjectId(null);
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

      projectList.sort(
        (a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt)
      );
      clientList.sort((a, b) => a.name.localeCompare(b.name, "ja"));

      setProjects(projectList);
      setClients(clientList);
    } catch (err) {
      console.error(err);
      setError("案件一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProjects();
  }, [user?.uid]);

  const filteredProjects = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return projects.filter((project) => {
      const clientName =
        clients.find((client) => client.id === project.clientId)?.name ?? "";

      const matchesKeyword =
        !keyword ||
        [
          project.title,
          project.description,
          project.quoteNote,
          project.internalNote,
          clientName,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(keyword)
        );

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      const matchesClient =
        clientFilter === "all" || project.clientId === clientFilter;

      return matchesKeyword && matchesStatus && matchesClient;
    });
  }, [projects, clients, searchKeyword, statusFilter, clientFilter]);

  const filteredAndSortedProjects = useMemo(() => {
    const list = [...filteredProjects];

    list.sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return getSeconds(b.createdAt) - getSeconds(a.createdAt);
        case "oldest":
          return getSeconds(a.createdAt) - getSeconds(b.createdAt);
        case "due_asc":
          return getDateTime(a.dueDate) - getDateTime(b.dueDate);
        case "due_desc":
          return getDateTime(b.dueDate) - getDateTime(a.dueDate);
        case "estimate_desc":
          return Number(b.estimateAmount || 0) - Number(a.estimateAmount || 0);
        case "estimate_asc":
          return Number(a.estimateAmount || 0) - Number(b.estimateAmount || 0);
        case "final_desc":
          return Number(b.finalAmount || 0) - Number(a.finalAmount || 0);
        case "final_asc":
          return Number(a.finalAmount || 0) - Number(b.finalAmount || 0);
        case "title_asc":
          return a.title.localeCompare(b.title, "ja");
        default:
          return 0;
      }
    });

    return list;
  }, [filteredProjects, sortKey]);

  useEffect(() => {
    setSelectedProjectId((prev) => {
      if (filteredAndSortedProjects.length === 0) return null;
      if (prev && filteredAndSortedProjects.some((project) => project.id === prev)) {
        return prev;
      }
      return filteredAndSortedProjects[0].id;
    });
  }, [filteredAndSortedProjects]);

  const selectedProject = selectedProjectId
    ? filteredAndSortedProjects.find((project) => project.id === selectedProjectId) ??
      null
    : null;

  const resetFilters = () => {
    setSearchKeyword("");
    setStatusFilter("all");
    setClientFilter("all");
    setSortKey("newest");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">案件管理</h2>
        <p className="mt-2 text-slate-600">
          案件の登録・一覧確認・詳細編集ができます。
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
        <div className="space-y-6">
          <ProjectForm onCreated={fetchProjects} />
          <ProjectCsvImport clients={clients} onImported={fetchProjects} />
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h3 className="text-2xl font-bold text-slate-900">
                案件検索・絞り込み
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                キーワード、ステータス、顧客、並び順で案件を整理できます。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2 xl:col-span-2">
                <label
                  htmlFor="project-search"
                  className="text-sm font-semibold text-slate-800"
                >
                  キーワード検索
                </label>
                <input
                  id="project-search"
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="案件名・顧客名・説明などで検索"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="status-filter"
                  className="text-sm font-semibold text-slate-800"
                >
                  ステータス
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "all" | ProjectStatus)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">すべて</option>
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="client-filter"
                  className="text-sm font-semibold text-slate-800"
                >
                  顧客
                </label>
                <select
                  id="client-filter"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">すべて</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="sort-key"
                  className="text-sm font-semibold text-slate-800"
                >
                  並び順
                </label>
                <select
                  id="sort-key"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="newest">新しい順</option>
                  <option value="oldest">古い順</option>
                  <option value="due_asc">納期が近い順</option>
                  <option value="due_desc">納期が遠い順</option>
                  <option value="estimate_desc">見積金額が高い順</option>
                  <option value="estimate_asc">見積金額が低い順</option>
                  <option value="final_desc">最終金額が高い順</option>
                  <option value="final_asc">最終金額が低い順</option>
                  <option value="title_asc">案件名順</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                絞り込み結果:{" "}
                <span className="font-semibold text-slate-900">
                  {filteredAndSortedProjects.length}件
                </span>
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                条件をリセット
              </button>
            </div>
          </div>

          <ProjectDetail
            project={selectedProject}
            clients={clients}
            onUpdated={fetchProjects}
          />

          <ProjectList
            projects={filteredAndSortedProjects}
            clients={clients}
            loading={loading}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
          />
        </div>
      </div>
    </div>
  );
}