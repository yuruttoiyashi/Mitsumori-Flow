import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import ProjectsPage from "./pages/ProjectsPage";

type TabKey = "dashboard" | "clients" | "projects";

export default function App() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-700">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-4xl font-bold text-slate-900">Mitsumori Flow</h1>
          <p className="mt-3 text-slate-600">
            依頼・見積・進捗をまとめて管理するアプリ
          </p>

          <button
            className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
            onClick={signInWithGoogle}
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Mitsumori Flow</h1>
            <p className="mt-2 text-sm text-slate-600">
              ログイン中: {user.displayName || user.email}
            </p>
          </div>

          <button
            className="inline-flex w-fit rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200"
            onClick={logout}
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "dashboard"
                ? "bg-violet-600 text-white shadow"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setActiveTab("dashboard")}
          >
            ダッシュボード
          </button>

          <button
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "clients"
                ? "bg-violet-600 text-white shadow"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setActiveTab("clients")}
          >
            顧客管理
          </button>

          <button
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "projects"
                ? "bg-violet-600 text-white shadow"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setActiveTab("projects")}
          >
            案件管理
          </button>
        </div>

        {activeTab === "dashboard" && <DashboardPage />}
        {activeTab === "clients" && <ClientsPage />}
        {activeTab === "projects" && <ProjectsPage />}
      </main>
    </div>
  );
}