import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL } from "@/lib/utils-cartel";
import {
  LayoutDashboard,
  Clock,
  Crosshair,
  Ticket,
  Wallet,
  FileBarChart,
  Users,
  ListChecks,
  LogOut,
  Skull,
} from "lucide-react";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard", mod: "dashboard" },
  { to: "/app/task", label: "Task Săptămânal", icon: ListChecks, testid: "nav-task", mod: "task" },
  { to: "/app/pontaj", label: "Pontaj", icon: Clock, testid: "nav-pontaj", mod: "pontaj" },
  { to: "/app/jafuri", label: "Jafuri", icon: Crosshair, testid: "nav-jafuri", mod: "jafuri" },
  { to: "/app/loterie", label: "Loterie", icon: Ticket, testid: "nav-loterie", mod: "loterie" },
  { to: "/app/fonduri", label: "Fonduri", icon: Wallet, testid: "nav-fonduri", mod: "fonduri" },
  { to: "/app/rapoarte", label: "Rapoarte", icon: FileBarChart, testid: "nav-rapoarte", mod: "rapoarte" },
  { to: "/app/membri", label: "Membri", icon: Users, testid: "nav-membri", mod: "membri" },
];

export default function Sidebar() {
  const { user, logout, canAccess } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="w-64 shrink-0 bg-cartel-surface border-r border-cartel-border flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-cartel-border flex items-center gap-2.5">
        <Skull className="w-7 h-7 text-cartel-red" />
        <div className="leading-none">
          <div className="font-heading text-2xl tracking-wide text-cartel-text">SICARIOS</div>
          <div className="label-mono text-cartel-red">CARTEL</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.filter((item) => canAccess(item.mod)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-testid={item.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                isActive
                  ? "bg-cartel-red/15 text-cartel-red border-l-2 border-cartel-red"
                  : "text-cartel-textsec hover:bg-cartel-elevated hover:text-cartel-text border-l-2 border-transparent"
              }`
            }
          >
            <item.icon style={{ width: 18, height: 18 }} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-cartel-border">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <img
            src={user?.avatar_url}
            alt=""
            className="w-9 h-9 rounded-sm bg-cartel-elevated object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-cartel-text truncate" data-testid="sidebar-username">
              {user?.username}
            </div>
            <div className="label-mono text-[10px]" data-testid="sidebar-role">
              {ROLE_LABEL[user?.role] || user?.role}
            </div>
          </div>
        </div>
        <button
          data-testid="logout-btn"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-cartel-textsec hover:bg-cartel-danger/10 hover:text-cartel-danger transition-colors"
        >
          <LogOut size={16} /> Deconectare
        </button>
      </div>
    </aside>
  );
}
