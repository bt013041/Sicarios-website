import { useEffect, useState } from "react";
import api from "@/lib/api";
import { currentWeek, todayISO, fmtMoney } from "@/lib/utils-cartel";
import { PageHeader, WeekNav, StatCard } from "@/components/ui-cartel";
import { toast } from "sonner";
import { Trash2, Plus, Trophy, Users } from "lucide-react";

export default function Loterie() {
  const [week, setWeek] = useState(currentWeek());
  const [rows, setRows] = useState([]);
  const [members, setMembers] = useState([]);
  const [winner, setWinner] = useState("");
  const [prize, setPrize] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState(todayISO());

  const load = () => api.get(`/loterie?week=${week}`).then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, [week]);
  useEffect(() => {
    api.get("/members").then((r) => setMembers(r.data));
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!winner.trim()) return toast.error("Alege un câștigător");
    await api.post("/loterie", { week, winner_name: winner, prize: parseFloat(prize || 0), details, date });
    setWinner("");
    setPrize("");
    setDetails("");
    toast.success("Câștigător adăugat");
    load();
  };

  const remove = async (id) => {
    await api.delete(`/loterie/${id}`);
    load();
  };

  const totalPrize = rows.reduce((s, r) => s + (r.prize || 0), 0);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Loterie" subtitle="Câștigătorii săptămânii">
        <WeekNav week={week} setWeek={setWeek} />
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard testid="lot-winners" label="Nr. câștigători" value={rows.length} accent="gold" icon={Users} />
        <StatCard testid="lot-total" label="Total premii" value={fmtMoney(totalPrize)} accent="success" icon={Trophy} />
      </div>

      <form onSubmit={add} className="bg-cartel-surface border border-cartel-gold/30 rounded-sm p-5 mb-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end" data-testid="lot-form">
        <div>
          <label className="label-mono mb-2 block">Câștigător</label>
          <select data-testid="lot-winner-select" value={winner} onChange={(e) => setWinner(e.target.value)} className="cartel-input">
            <option value="">— alege membru —</option>
            {members.map((m) => (
              <option key={m.id} value={m.username}>{m.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-mono mb-2 block">Premiu ($)</label>
          <input data-testid="lot-prize-input" type="number" min="0" value={prize} onChange={(e) => setPrize(e.target.value)} className="cartel-input" placeholder="10000" />
        </div>
        <div>
          <label className="label-mono mb-2 block">Detalii</label>
          <input data-testid="lot-details-input" value={details} onChange={(e) => setDetails(e.target.value)} className="cartel-input" placeholder="opțional" />
        </div>
        <button data-testid="lot-add-btn" className="bg-cartel-gold hover:bg-cartel-goldhover text-black uppercase font-heading text-xl tracking-wide px-5 py-2.5 rounded-sm flex items-center justify-center gap-2 transition-colors h-[46px]">
          <Plus size={18} /> Adaugă câștigător
        </button>
      </form>

      <div className="space-y-3" data-testid="lot-list">
        {rows.length === 0 && <p className="text-cartel-textmuted text-sm">Niciun câștigător înregistrat.</p>}
        {rows.map((l) => (
          <div key={l.id} className="bg-cartel-surface border border-cartel-border rounded-sm p-5 flex flex-wrap items-center gap-6" data-testid={`lot-item-${l.id}`}>
            <Trophy className="text-cartel-gold shrink-0" size={28} />
            <div className="min-w-0">
              <div className="label-mono">Câștigător</div>
              <div className="text-cartel-text text-lg">{l.winner_name}</div>
            </div>
            <div>
              <div className="label-mono">Premiu</div>
              <div className="font-heading text-2xl tracking-wide text-cartel-success">{fmtMoney(l.prize)}</div>
            </div>
            {l.details && <div className="text-cartel-textsec text-sm flex-1 min-w-[120px]">{l.details}</div>}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs font-mono text-cartel-textmuted">{l.date}</span>
              <button data-testid={`lot-delete-${l.id}`} onClick={() => remove(l.id)} className="text-cartel-textmuted hover:text-cartel-danger transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
