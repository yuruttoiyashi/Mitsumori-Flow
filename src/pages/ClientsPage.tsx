import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import ClientForm from "../components/ClientForm";
import ClientList from "../components/ClientList";
import ClientDetail from "../components/ClientDetail";
import ClientCsvImport from "../components/ClientCsvImport";
import type { Client } from "../types/client";

function getCreatedAtSeconds(value: unknown) {
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

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchClients = async () => {
    if (!user?.uid) {
      setClients([]);
      setSelectedClientId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

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

      list.sort(
        (a, b) =>
          getCreatedAtSeconds(b.createdAt) - getCreatedAtSeconds(a.createdAt)
      );

      setClients(list);
    } catch (err) {
      console.error(err);
      setError("顧客一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchClients();
  }, [user?.uid]);

  const filteredClients = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return clients.filter((client) => {
      if (!keyword) return true;

      return [
        client.name,
        client.companyName,
        client.email,
        client.phone,
        client.memo,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [clients, searchKeyword]);

  useEffect(() => {
    setSelectedClientId((prev) => {
      if (filteredClients.length === 0) return null;
      if (prev && filteredClients.some((client) => client.id === prev)) {
        return prev;
      }
      return filteredClients[0].id;
    });
  }, [filteredClients]);

  const selectedClient = selectedClientId
    ? filteredClients.find((client) => client.id === selectedClientId) ?? null
    : null;

  const resetSearch = () => {
    setSearchKeyword("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">顧客管理</h2>
        <p className="mt-2 text-slate-600">
          顧客情報の登録・一覧確認・詳細編集ができます。
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <ClientForm onCreated={fetchClients} />
          <ClientCsvImport onImported={fetchClients} />
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h3 className="text-2xl font-bold text-slate-900">顧客検索</h3>
              <p className="mt-2 text-sm text-slate-600">
                顧客名・会社名・メール・電話番号・メモで検索できます。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <label
                  htmlFor="client-search"
                  className="text-sm font-semibold text-slate-800"
                >
                  キーワード検索
                </label>
                <input
                  id="client-search"
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="顧客名・会社名・メールなどで検索"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetSearch}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  検索を解除
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-600">
              検索結果:{" "}
              <span className="font-semibold text-slate-900">
                {filteredClients.length}件
              </span>
            </div>
          </div>

          <ClientDetail client={selectedClient} onUpdated={fetchClients} />

          <ClientList
            clients={filteredClients}
            loading={loading}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
          />
        </div>
      </div>
    </div>
  );
}