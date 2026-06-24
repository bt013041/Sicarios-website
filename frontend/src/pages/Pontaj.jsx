import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { currentWeek, todayISO } from "@/lib/utils-cartel";
import { PageHeader, WeekNav } from "@/components/ui-cartel";
import { toast } from "sonner";
import { Trash2, Plus, Clock } from "lucide-react";

export default function Pontaj() {
  const { user, role } = useAuth();
  const [week, setWeek] = useState(currentWeek());
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");

  const load = () => api.get(`/pontaj?week=${week}`).then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, [week]);

  const add = async (e) => {
    e.preventDefault();
    if (!hours) return;
    await api.post("/pontaj", { date, hours: parseFloat(hours), note });
    setHours("");
    setNote("");
    toast.success("Pontaj înregistrat");
    if (week === currentWeek()) load();
    else setWeek(currentWeek());
  };

  const remove = async (id) => {
    await api.delete(`/pontaj/${id}`);
    load();
  };

  const total = rows.reduce((s, r) => s + (r.hours || 0), 0);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Pontaj" subtitle="Ore lucrate / zi">
        <WeekNav week={week} setWeek={setWeek} />
      </PageHeader>

      <form onSubmit={add} className="bg-cartel-surface border border-cartel-border rounded-sm p-5 mb-6 grid sm:grid-cols-[auto_auto_1fr_auto] gap-3 items-end" data-testid="pontaj-form">
        <div>
          <label className="label-mono mb-2 block">Data</label>
          <input data-testid="pontaj-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="cartel-input" />
        </div>
        <div>
          <label className="label-mono mb-2 block">Ore</label>
          <input data-testid="pontaj-hours-input" type="number" step="0.5" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className="cartel-input w-28" placeholder="8" />
        </div>
        <div>
          <label className="label-mono mb-2 block">Notă</label>
          <input data-testid="pontaj-note-input" value={note} onChange={(e) => setNote(e.target.value)} className="cartel-input" placeholder="opțional" />
        </div>
        <button data-testid="pontaj-add-btn" className="bg-cartel-red hover:bg-cartel-redhover text-white uppercase font-heading text-xl tracking-wide px-5 py-2.5 rounded-sm flex items-center gap-2 transition-colors h-[46px]">
          <Plus size={18} /> Pontează
        </button>
      </form>

      <div className="flex items-center gap-2 mb-4 text-cartel-gold">
        <Clock size={18} />
        <span className="font-mono text-sm">Total ore săptămână: <span className="font-heading text-2xl tracking-wide">{total}</span></span>
      </div>

      <div className="bg-cartel-surface border border-cartel-border rounded-sm overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="bg-cartel-elevated text-cartel-textsec font-mono text-xs uppercase tracking-wider p-3 border-y border-cartel-border">Membru</th>
              <th className="bg-cartel-elevated text-cartel-textsec font-mono text-xs uppercase tracking-wider p-3 border-y border-cartel-border">Data</th>
              <th className="bg-cartel-elevated text-cartel-textsec font-mono text-xs uppercase tracking-wider p-3 border-y border-cartel-border">Ore</th>
              <th className="bg-cartel-elevated text-cartel-textsec font-mono text-xs uppercase tracking-wider p-3 border-y border-cartel-border">Notă</th>
              <th className="bg-cartel-elevated border-y border-cartel-border"></th>
            </tr>
          </thead>
          <tbody data-testid="pontaj-table">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-cartel-textmuted text-sm">Niciun pontaj.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-cartel-border/50 hover:bg-cartel-elevated/50 transition-colors">
                <td className="p-3 text-sm text-cartel-text">{r.username}</td>
                <td className="p-3 text-sm font-mono text-cartel-textsec">{r.date}</td>
                <td className="p-3 text-sm font-mono text-cartel-gold">{r.hours}</td>
                <td className="p-3 text-sm text-cartel-textsec">{r.note}</td>
                <td className="p-3 text-right">
                  {(role === "boss" || r.user_id === user?.id) && (
                    <button data-testid={`pontaj-delete-${r.id}`} onClick={() => remove(r.id)} className="text-cartel-textmuted hover:text-cartel-danger transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
