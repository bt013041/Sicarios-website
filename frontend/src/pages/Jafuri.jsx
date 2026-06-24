import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { currentWeek, todayISO, fmtMoney } from "@/lib/utils-cartel";
import { PageHeader, WeekNav } from "@/components/ui-cartel";
import { toast } from "sonner";
import { Trash2, Plus, Store, Building2, MapPin } from "lucide-react";

const HEADER_IMG =
  "https://images.pexels.com/photos/19920920/pexels-photo-19920920.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Jafuri() {
  const { user, isAdmin } = useAuth();
  const [week, setWeek] = useState(currentWeek());
  const [rows, setRows] = useState([]);
  const [type, setType] = useState("magazin");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState(todayISO());

  const load = () => api.get(`/jafuri?week=${week}`).then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, [week]);

  const add = async (e) => {
    e.preventDefault();
    if (!amount || !location.trim()) return;
    await api.post("/jafuri", { type, amount: parseFloat(amount), location, details, date });
    setAmount("");
    setLocation("");
    setDetails("");
    toast.success("Jaf înregistrat");
    if (week === currentWeek()) load();
    else setWeek(currentWeek());
  };

  const remove = async (id) => {
    await api.delete(`/jafuri/${id}`);
    load();
  };

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="animate-fade-up">
      <div className="relative rounded-sm overflow-hidden mb-8 border border-cartel-border">
        <img src={HEADER_IMG} alt="" className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
        <div className="absolute inset-0 flex flex-col justify-center px-8">
          <div className="label-mono mb-1">Operațiuni</div>
          <h1 className="font-heading text-5xl sm:text-6xl tracking-wide text-cartel-text leading-none">JAFURI</h1>
        </div>
        <div className="absolute right-8 bottom-6">
          <WeekNav week={week} setWeek={setWeek} />
        </div>
      </div>

      <form onSubmit={add} className="bg-cartel-surface border border-cartel-border rounded-sm p-5 mb-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end" data-testid="jaf-form">
        <div>
          <label className="label-mono mb-2 block">Tip</label>
          <div className="flex gap-2">
            <button type="button" data-testid="jaf-type-magazin" onClick={() => setType("magazin")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm border text-sm transition-colors ${type === "magazin" ? "bg-cartel-gold/15 border-cartel-gold text-cartel-gold" : "border-cartel-border text-cartel-textsec"}`}>
              <Store size={15} /> Magazin
            </button>
            <button type="button" data-testid="jaf-type-banca" onClick={() => setType("banca")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm border text-sm transition-colors ${type === "banca" ? "bg-cartel-red/15 border-cartel-red text-cartel-red" : "border-cartel-border text-cartel-textsec"}`}>
              <Building2 size={15} /> Bancă
            </button>
          </div>
        </div>
        <div>
          <label className="label-mono mb-2 block">Sumă ($)</label>
          <input data-testid="jaf-amount-input" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="cartel-input" placeholder="5000" />
        </div>
        <div>
          <label className="label-mono mb-2 block">Locație</label>
          <input data-testid="jaf-location-input" value={location} onChange={(e) => setLocation(e.target.value)} className="cartel-input" placeholder="ex: Bancă Pacific" />
        </div>
        <div>
          <label className="label-mono mb-2 block">Detalii</label>
          <input data-testid="jaf-details-input" value={details} onChange={(e) => setDetails(e.target.value)} className="cartel-input" placeholder="opțional" />
        </div>
        <button data-testid="jaf-add-btn" className="bg-cartel-red hover:bg-cartel-redhover text-white uppercase font-heading text-xl tracking-wide px-5 py-2.5 rounded-sm flex items-center justify-center gap-2 transition-colors h-[46px]">
          <Plus size={18} /> Adaugă
        </button>
      </form>

      <div className="flex items-center gap-2 mb-4 text-cartel-success font-mono text-sm">
        Total săptămână: <span className="font-heading text-2xl tracking-wide">{fmtMoney(total)}</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="jaf-list">
        {rows.length === 0 && <p className="text-cartel-textmuted text-sm">Niciun jaf înregistrat.</p>}
        {rows.map((j) => (
          <div key={j.id} className="bg-cartel-surface border border-cartel-border rounded-sm p-4 hover:border-cartel-borderlt transition-colors" data-testid={`jaf-item-${j.id}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded-sm ${j.type === "banca" ? "bg-cartel-red/15 text-cartel-red" : "bg-cartel-gold/15 text-cartel-gold"}`}>
                {j.type}
              </span>
              {(isAdmin || j.user_id === user?.id) && (
                <button data-testid={`jaf-delete-${j.id}`} onClick={() => remove(j.id)} className="text-cartel-textmuted hover:text-cartel-danger transition-colors">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className="font-heading text-3xl tracking-wide text-cartel-success mb-2">{fmtMoney(j.amount)}</div>
            <div className="flex items-center gap-1.5 text-cartel-text text-sm mb-1">
              <MapPin size={13} className="text-cartel-textmuted" /> {j.location}
            </div>
            {j.details && <p className="text-cartel-textsec text-sm mb-2">{j.details}</p>}
            <div className="flex items-center justify-between text-xs text-cartel-textmuted font-mono pt-2 border-t border-cartel-border/40">
              <span>{j.username}</span>
              <span>{j.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
