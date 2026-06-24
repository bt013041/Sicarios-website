import { useEffect, useState } from "react";
import api from "@/lib/api";
import { currentWeek, fmtMoney } from "@/lib/utils-cartel";
import { PageHeader, WeekNav, StatCard } from "@/components/ui-cartel";
import { Wallet, Crosshair, Ticket } from "lucide-react";

export default function Fonduri() {
  const [week, setWeek] = useState(currentWeek());
  const [data, setData] = useState(null);
  const [weeks, setWeeks] = useState([]);

  useEffect(() => {
    api.get(`/fonduri?week=${week}`).then((r) => setData(r.data));
  }, [week]);

  useEffect(() => {
    api.get("/fonduri/weeks").then((r) => setWeeks(r.data));
  }, []);

  const d = data || {};

  return (
    <div className="animate-fade-up">
      <PageHeader title="Fonduri" subtitle="Total săptămânal din jafuri + loterie">
        <WeekNav week={week} setWeek={setWeek} />
      </PageHeader>

      <div className="bg-gradient-to-br from-cartel-surface to-black border border-cartel-gold/30 rounded-sm p-8 mb-6" data-testid="fonduri-total-card">
        <div className="label-mono mb-2">Total fonduri săptămâna {week}</div>
        <div className="font-heading text-7xl tracking-wide text-cartel-gold drop-shadow-[0_2px_20px_rgba(212,175,55,0.3)]" data-testid="fonduri-total-value">
          {fmtMoney(d.total)}
        </div>
        <div className="flex gap-6 mt-4 text-sm font-mono text-cartel-textsec">
          <span>Jafuri: <span className="text-cartel-red">{fmtMoney(d.jafuri_total)}</span></span>
          <span>Loterie (venit): <span className="text-cartel-success">{fmtMoney(d.loterie_revenue)}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard testid="fond-jafuri" label="Jafuri" value={fmtMoney(d.jafuri_total)} accent="red" icon={Crosshair} />
        <StatCard testid="fond-magazin" label="din Magazin" value={fmtMoney(d.jafuri_magazin)} />
        <StatCard testid="fond-banca" label="din Bancă" value={fmtMoney(d.jafuri_banca)} />
        <StatCard testid="fond-loterie" label="Loterie" value={fmtMoney(d.loterie_revenue)} accent="gold" icon={Ticket} />
      </div>

      <div className="bg-cartel-surface border border-cartel-border rounded-sm overflow-x-auto">
        <div className="border-b border-cartel-border p-4 bg-cartel-elevated"><span className="label-mono">Istoric săptămânal</span></div>
        <table className="w-full text-left">
          <thead>
            <tr>
              {["Săptămână", "Jafuri", "Loterie", "Total"].map((h) => (
                <th key={h} className="bg-cartel-elevated text-cartel-textsec font-mono text-xs uppercase tracking-wider p-3 border-y border-cartel-border">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody data-testid="fonduri-history">
            {weeks.length === 0 && <tr><td colSpan={4} className="p-4 text-cartel-textmuted text-sm">Niciun fond înregistrat.</td></tr>}
            {weeks.map((w) => (
              <tr key={w.week} className="border-b border-cartel-border/50 hover:bg-cartel-elevated/50 transition-colors cursor-pointer" onClick={() => setWeek(w.week)}>
                <td className="p-3 text-sm font-mono text-cartel-text">{w.week}</td>
                <td className="p-3 text-sm font-mono text-cartel-red">{fmtMoney(w.jafuri_total)}</td>
                <td className="p-3 text-sm font-mono text-cartel-success">{fmtMoney(w.loterie_revenue)}</td>
                <td className="p-3 text-sm font-mono text-cartel-gold font-bold">{fmtMoney(w.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
