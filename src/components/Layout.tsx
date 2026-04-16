import { NavLink, Outlet } from 'react-router-dom';
import logo from '../assets/mitsumori-flow-logo.png';

const navItems = [
  { to: '/dashboard', label: 'ダッシュボード' },
  { to: '/quotes', label: '物流見積一覧' },
  { to: '/quotes/new', label: '新規見積作成' },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
          <div className="border-b border-slate-200 px-6 py-8">
            <div className="flex justify-center">
              <img
                src={logo}
                alt="Mitsumori Flow logo"
                className="h-24 w-full object-contain"
              />
            </div>
          </div>

          <nav className="space-y-2 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-4 md:px-8">
              <div>
                <p className="text-sm text-slate-500">物流向け見積管理システム</p>
                <h2 className="text-lg font-semibold text-slate-900">
                  保存・一覧・編集・プレビュー・印刷対応
                </h2>
              </div>

              <NavLink
                to="/quotes/new"
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                ＋ 新規見積
              </NavLink>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}