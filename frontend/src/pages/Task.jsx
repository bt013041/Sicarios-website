import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { currentWeek } from "@/lib/utils-cartel";
import { PageHeader, WeekNav } from "@/components/ui-cartel";
import { toast } from "sonner";
import { Check, Trash2, Plus, ChevronDown, ChevronUp, Users } from "lucide-react";

export default function Task() {
  const { user, role } = useAuth();
  const canManage = role === "boss" || role === "sicarios";
  const [week, setWeek] = useState(currentWeek());
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expanded, setExpanded] = useState({});

  const load = () => api.get(`/tasks?week=${week}`).then((r) => setTasks(r.data));
  useEffect(() => {
    load();
  }, [week]);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await api.post("/tasks", { title, description, week });
    setTitle("");
    setDescription("");
    toast.success("Task adăugat");
    load();
  };

  const toggle = async (id) => {
    await api.patch(`/tasks/${id}`);
    load();
  };

  const remove = async (id) => {
    await api.delete(`/tasks/${id}`);
    toast.success("Task șters");
    load();
  };

  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="animate-fade-up">
      <PageHeader title="Task Săptămânal" subtitle="Obiective">
        <WeekNav week={week} setWeek={setWeek} />
      </PageHeader>

      {canManage && (
      <form onSubmit={add} className="bg-cartel-surface border border-cartel-border rounded-sm p-5 mb-6 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end" data-testid="task-form">
        <div>
          <label className="label-mono mb-2 block">Titlu task</label>
          <input data-testid="task-title-input" value={title} onChange={(e) => setTitle(e.target.value)} className="cartel-input" placeholder="ex: 10 jafuri la magazin" />
        </div>
        <div>
          <label className="label-mono mb-2 block">Descriere</label>
          <input data-testid="task-desc-input" value={description} onChange={(e) => setDescription(e.target.value)} className="cartel-input" placeholder="detalii" />
        </div>
        <button data-testid="task-add-btn" className="bg-cartel-red hover:bg-cartel-redhover text-white uppercase font-heading text-xl tracking-wide px-5 py-2.5 rounded-sm flex items-center gap-2 transition-colors h-[46px]">
          <Plus size={18} /> Adaugă
        </button>
      </form>
      )}

      <div className="space-y-2" data-testid="task-list">
        {tasks.length === 0 && <p className="text-cartel-textmuted text-sm">Niciun task pentru această săptămână.</p>}
        {tasks.map((t) => {
          const completed = t.completed_by || [];
          const mine = completed.some((c) => c.user_id === user?.id);
          const isOpen = expanded[t.id];
          return (
            <div key={t.id} className="bg-cartel-surface border border-cartel-border rounded-sm" data-testid={`task-item-${t.id}`}>
              <div className="p-4 flex items-center gap-4">
                <button
                  data-testid={`task-toggle-${t.id}`}
                  onClick={() => toggle(t.id)}
                  className={`w-6 h-6 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${mine ? "bg-cartel-success border-cartel-success text-black" : "border-cartel-borderlt text-transparent hover:border-cartel-success"}`}
                >
                  <Check size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-cartel-text ${completed.length ? "" : ""}`}>{t.title}</div>
                  {t.description && <div className="text-cartel-textsec text-sm">{t.description}</div>}
                </div>
                <button
                  data-testid={`task-completed-count-${t.id}`}
                  onClick={() => toggleExpand(t.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-sm transition-colors ${completed.length ? "bg-cartel-success/15 text-cartel-success hover:bg-cartel-success/25" : "bg-cartel-border/40 text-cartel-textsec"}`}
                >
                  <Users size={12} /> {completed.length} au bifat
                  {completed.length > 0 && (isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
                {canManage && (
                  <button data-testid={`task-delete-${t.id}`} onClick={() => remove(t.id)} className="text-cartel-textmuted hover:text-cartel-danger transition-colors shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {isOpen && completed.length > 0 && (
                <div className="border-t border-cartel-border/60 bg-cartel-elevated/40 p-4" data-testid={`task-completed-list-${t.id}`}>
                  <div className="label-mono mb-3">Membri care au realizat task-ul</div>
                  <div className="flex flex-wrap gap-2">
                    {completed.map((c) => (
                      <div key={c.user_id} className="flex items-center gap-2 bg-cartel-surface border border-cartel-border rounded-sm pl-1.5 pr-3 py-1.5" data-testid={`task-member-${t.id}-${c.user_id}`}>
                        <img src={c.avatar_url} alt="" className="w-6 h-6 rounded-sm bg-cartel-elevated object-cover" />
                        <span className="text-sm text-cartel-text">{c.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
