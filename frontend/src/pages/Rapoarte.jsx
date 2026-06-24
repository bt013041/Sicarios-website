import { useEffect, useState } from "react";
import api from "@/lib/api";
import { currentWeek, fmtMoney } from "@/lib/utils-cartel";
import { PageHeader, WeekNav } from "@/components/ui-cartel";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Rapoarte() {
  const [week, setWeek] = useState(currentWeek());
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/rapoarte?week=${week}`).then((r) => setData(r.data));
  }, [week]);

  const f = data?.funds || {};
  const jafChart = (data?.jafuri_ranking || []).slice(0, 8).map((x) => ({ name: x.username, value: x.amount }));

  return (
    <div className="animate-fade-up">
      <PageHeader title="Rapoarte" subtitle="Analiză săptămânală">
        <WeekNav week={week} setWeek={setWeek} />
      </PageHeader>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-cartel-surface border border-cartel-border rounded-sm">
          <div className="border-b border-cartel-border p-4 bg-cartel-elevated"><span className="label-mono">Top jafuri (sumă)</span></div>
          <div className="p-4 h-72">
            {jafChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jafChart}>
                  <XAxis dataKey="name" tick={{ fill: "#A1A1AA", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#A1A1AA", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#121212", border: "1px solid #262626", borderRadius: 2 }} formatter={(v) => fmtMoney(v)} />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {jafChart.map((_, i) => <Cell key={i} fill="#DC2626" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-cartel-textmuted text-sm">Date insuficiente.</p>}
          </div>
        </div>

        <div className="bg-cartel-surface border border-cartel-border rounded-sm">
          <div className="border-b border-cartel-border p-4 bg-cartel-elevated"><span className="label-mono">Clasament ore (pontaj)</span></div>
          <div className="p-4 space-y-2" data-testid="hours-ranking">
            {(data?.hours_ranking || []).length === 0 && <p className="text-cartel-textmuted text-sm">Niciun pontaj.</p>}
            {(data?.hours_ranking || []).map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-cartel-border/40 last:border-0">
                <span className="text-cartel-text text-sm"><span className="text-cartel-textmuted font-mono mr-2">#{i + 1}</span>{h.username}</span>
                <span className="font-mono text-cartel-gold">{h.hours} ore</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-cartel-surface border border-cartel-border rounded-sm mt-6 p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="rapoarte-summary">
        <div><div className="label-mono mb-1">Total jafuri</div><div className="font-heading text-3xl text-cartel-red">{fmtMoney(f.jafuri_total)}</div></div>
        <div><div className="label-mono mb-1">Nr. jafuri</div><div className="font-heading text-3xl text-cartel-text">{f.jafuri_count || 0}</div></div>
        <div><div className="label-mono mb-1">Venit loterie</div><div className="font-heading text-3xl text-cartel-success">{fmtMoney(f.loterie_revenue)}</div></div>
        <div><div className="label-mono mb-1">Total fonduri</div><div className="font-heading text-3xl text-cartel-gold">{fmtMoney(f.total)}</div></div>
      </div>
    </div>
  );
}
