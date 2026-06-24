import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmtMoney } from "@/lib/utils-cartel";
import { PageHeader } from "@/components/ui-cartel";
import { toast } from "sonner";
import { Shield, User, Trash2 } from "lucide-react";

export default function Membri() {
  const { user, isAdmin } = useAuth();
  const [members, setMembers] = useState([]);

  const load = () => api.get("/members").then((r) => setMembers(r.data));
  useEffect(() => {
    load();
  }, []);

  const setRole = async (id, role) => {
    await api.patch(`/members/${id}/role`, { role });
    toast.success("Rol actualizat");
    load();
  };

  const remove = async (id) => {
    await api.delete(`/members/${id}`);
    toast.success("Membru eliminat");
    load();
  };

  return (
    <div className="animate-fade-up">
      <PageHeader title="Membri" subtitle="Organizația" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="members-list">
        {members.map((m) => (
          <div key={m.id} className="bg-cartel-surface border border-cartel-border rounded-sm p-5 hover:border-cartel-borderlt transition-colors" data-testid={`member-${m.id}`}>
            <div className="flex items-center gap-3 mb-4">
              <img src={m.avatar_url} alt="" className="w-12 h-12 rounded-sm bg-cartel-elevated object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-cartel-text font-medium truncate">{m.username}</div>
                <div className={`label-mono flex items-center gap-1 ${m.role === "admin" ? "text-cartel-red" : "text-cartel-textsec"}`}>
                  {m.role === "admin" ? <Shield size={11} /> : <User size={11} />}
                  {m.role === "admin" ? "BOSS / ADMIN" : "MEMBRU"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-4 pt-3 border-t border-cartel-border/40">
              <div><div className="font-mono text-cartel-gold text-lg">{m.total_hours}</div><div className="text-[10px] uppercase text-cartel-textmuted font-mono">Ore</div></div>
              <div><div className="font-mono text-cartel-text text-lg">{m.total_jafuri_count}</div><div className="text-[10px] uppercase text-cartel-textmuted font-mono">Jafuri</div></div>
              <div><div className="font-mono text-cartel-success text-sm pt-1">{fmtMoney(m.total_jafuri_amount)}</div><div className="text-[10px] uppercase text-cartel-textmuted font-mono">Total</div></div>
            </div>
            {isAdmin && m.id !== user?.id && (
              <div className="flex gap-2">
                {m.role === "admin" ? (
                  <button data-testid={`demote-${m.id}`} onClick={() => setRole(m.id, "member")} className="flex-1 text-xs uppercase font-mono py-2 rounded-sm border border-cartel-border text-cartel-textsec hover:text-cartel-text transition-colors">
                    Retrogradează
                  </button>
                ) : (
                  <button data-testid={`promote-${m.id}`} onClick={() => setRole(m.id, "admin")} className="flex-1 text-xs uppercase font-mono py-2 rounded-sm border border-cartel-red/40 text-cartel-red hover:bg-cartel-red/10 transition-colors">
                    Promovează Boss
                  </button>
                )}
                <button data-testid={`remove-${m.id}`} onClick={() => remove(m.id)} className="px-3 py-2 rounded-sm border border-cartel-border text-cartel-textmuted hover:text-cartel-danger hover:border-cartel-danger/40 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
