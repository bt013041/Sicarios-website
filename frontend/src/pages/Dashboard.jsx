import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { currentWeek, fmtMoney } from "@/lib/utils-cartel";
import { PageHeader, WeekNav, StatCard } from "@/components/ui-cartel";
import { Wallet, Ticket, Users, ListChecks } from "lucide-react";

export default function Dashboard() {
  const { user, role } = useAuth();
  const isLoterie = role === "loterie";
  const [week, setWeek] = useState(currentWeek());
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/dashboard?week=${week}`).then((r) => setData(r.data));
  }, [week]);

  const f = data?.funds || {};

  return (
    <div className="animate-fade-up">
      <PageHeader title={`Salut, ${user?.username}`} subtitle="Panou de comandă">
        <WeekNav week={week} setWeek={setWeek} />
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard testid="stat-fonduri" label="Fonduri (săpt.)" value={fmtMoney(f.total)} accent="gold" icon={Wallet} />
        <StatCard testid="stat-loterie" label="Premii Loterie" value={fmtMoney(f.loterie_total)} accent="success" icon={Ticket} />
        <StatCard testid="stat-membri" label="Membri" value={data?.members_count ?? 0} icon={Users} />
        {!isLoterie && (
          <StatCard testid="stat-tasks" label="Task-uri" value={`${data?.tasks_done ?? 0}/${data?.tasks_total ?? 0}`} accent="red" icon={ListChecks} />
        )}
      </div>

      {!isLoterie && (
      <div className="bg-cartel-surface border border-cartel-border rounded-sm">
        <div className="border-b border-cartel-border p-4 bg-cartel-elevated">
          <span className="label-mono">Ultimele Jafuri</span>
        </div>
        <div className="p-4">
          {data?.recent_jafuri?.length ? (
            <div className="space-y-2" data-testid="recent-jafuri-list">
              {data.recent_jafuri.map((j) => (
                <div key={j.id} className="flex items-center justify-between py-2 border-b border-cartel-border/40 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded-sm ${j.type === "banca" ? "bg-cartel-red/15 text-cartel-red" : "bg-cartel-gold/15 text-cartel-gold"}`}>
                      {j.type}
                    </span>
                    <span className="text-cartel-text text-sm">{j.location}</span>
                    <span className="text-cartel-textmuted text-xs">{j.username}</span>
                  </div>
                  <span className="font-mono text-cartel-success">{fmtMoney(j.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-cartel-textmuted text-sm">Niciun jaf înregistrat săptămâna aceasta.</p>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
