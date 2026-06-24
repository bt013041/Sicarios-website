import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { currentWeek, todayISO, fmtMoney } from "@/lib/utils-cartel";
import { PageHeader, WeekNav, StatCard } from "@/components/ui-cartel";
import { toast } from "sonner";
import { Trash2, Plus, Trophy, Ticket, Lock } from "lucide-react";

export default function Loterie() {
  const { isAdmin } = useAuth();
  const [week, setWeek] = useState(currentWeek());
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ winner_name: "", amount_won: "", tickets_sold: "", ticket_price: "", details: "", date: todayISO() });

  const load = () => api.get(`/loterie?week=${week}`).then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, [week]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    if (!form.winner_name.trim()) return;
    await api.post("/loterie", {
      week,
      winner_name: form.winner_name,
      amount_won: parseFloat(form.amount_won || 0),
      tickets_sold: parseInt(form.tickets_sold || 0),
      ticket_price: parseFloat(form.ticket_price || 0),
      details: form.details,
      date: form.date,
    });
    setForm({ winner_name: "", amount_won: "", tickets_sold: "", ticket_price: "", details: "", date: todayISO() });
    toast.success("Extragere adăugată");
    load();
  };

  const remove = async (id) => {
    await api.delete(`/loterie/${id}`);
    load();
  };

  const tickets = rows.reduce((s, r) => s + (r.tickets_sold || 0), 0);
  const revenue = rows.reduce((s, r) => s + (r.revenue || 0), 0);
  const won = rows.reduce((s, r) => s + (r.amount_won || 0), 0);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Loterie" subtitle="Extrageri & Bilete">
        <WeekNav week={week} setWeek={setWeek} />
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard testid="lot-tickets" label="Bilete vândute" value={tickets} accent="gold" icon={Ticket} />
        <StatCard testid="lot-revenue" label="Venit bilete" value={fmtMoney(revenue)} accent="success" icon={Ticket} />
        <StatCard testid="lot-won" label="Total câștigat" value={fmtMoney(won)} accent="red" icon={Trophy} />
      </div>

      {isAdmin ? (
        <form onSubmit={add} className="bg-cartel-surface border border-cartel-gold/30 rounded-sm p-5 mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end" data-testid="lot-form">
          <div>
            <label className="label-mono mb-2 block">Câștigător</label>
            <input data-testid="lot-winner-input" value={form.winner_name} onChange={set("winner_name")} className="cartel-input" placeholder="Nume membru" />
          </div>
          <div>
            <label className="label-mono mb-2 block">Sumă câștigată ($)</label>
            <input data-testid="lot-amount-input" type="number" min="0" value={form.amount_won} onChange={set("amount_won")} className="cartel-input" placeholder="10000" />
          </div>
          <div>
            <label className="label-mono mb-2 block">Bilete vândute</label>
            <input data-testid="lot-tickets-input" type="number" min="0" value={form.tickets_sold} onChange={set("tickets_sold")} className="cartel-input" placeholder="120" />
          </div>
          <div>
            <label className="label-mono mb-2 block">Preț bilet ($)</label>
            <input data-testid="lot-price-input" type="number" min="0" value={form.ticket_price} onChange={set("ticket_price")} className="cartel-input" placeholder="100" />
          </div>
          <div>
            <label className="label-mono mb-2 block">Detalii</label>
            <input data-testid="lot-details-input" value={form.details} onChange={set("details")} className="cartel-input" placeholder="opțional" />
          </div>
          <button data-testid="lot-add-btn" className="bg-cartel-gold hover:bg-cartel-goldhover text-black uppercase font-heading text-xl tracking-wide px-5 py-2.5 rounded-sm flex items-center justify-center gap-2 transition-colors h-[46px]">
            <Plus size={18} /> Adaugă extragere
          </button>
        </form>
      ) : (
        <div className="bg-cartel-surface border border-cartel-border rounded-sm p-4 mb-6 flex items-center gap-2 text-cartel-textsec text-sm">
          <Lock size={15} /> Doar Boss/Admin poate adăuga extrageri.
        </div>
      )}

      <div className="space-y-3" data-testid="lot-list">
        {rows.length === 0 && <p className="text-cartel-textmuted text-sm">Nicio extragere înregistrată.</p>}
        {rows.map((l) => (
          <div key={l.id} className="bg-cartel-surface border border-cartel-border rounded-sm p-5 flex flex-wrap items-center gap-6" data-testid={`lot-item-${l.id}`}>
            <Trophy className="text-cartel-gold shrink-0" size={28} />
            <div className="min-w-0">
              <div className="label-mono">Câștigător</div>
              <div className="text-cartel-text text-lg">{l.winner_name}</div>
            </div>
            <div>
              <div className="label-mono">Câștig</div>
              <div className="font-heading text-2xl tracking-wide text-cartel-red">{fmtMoney(l.amount_won)}</div>
            </div>
            <div>
              <div className="label-mono">Bilete</div>
              <div className="font-mono text-cartel-gold">{l.tickets_sold} × {fmtMoney(l.ticket_price)}</div>
            </div>
            <div>
              <div className="label-mono">Venit</div>
              <div className="font-mono text-cartel-success">{fmtMoney(l.revenue)}</div>
            </div>
            {l.details && <div className="text-cartel-textsec text-sm flex-1 min-w-[120px]">{l.details}</div>}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs font-mono text-cartel-textmuted">{l.date}</span>
              {isAdmin && (
                <button data-testid={`lot-delete-${l.id}`} onClick={() => remove(l.id)} className="text-cartel-textmuted hover:text-cartel-danger transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
