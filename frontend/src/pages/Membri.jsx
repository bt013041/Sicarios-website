import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmtMoney, ROLE_LABEL, ROLE_OPTIONS } from "@/lib/utils-cartel";
import { PageHeader } from "@/components/ui-cartel";
import { toast } from "sonner";
import { Crown, Shield, Ticket, Trash2, Handshake } from "lucide-react";

const ROLE_ICON = { boss: Crown, sicarios: Shield, asociat: Handshake, loterie: Ticket };
const ROLE_COLOR = { boss: "text-cartel-red", sicarios: "text-cartel-gold", asociat: "text-cartel-textsec", loterie: "text-cartel-discord" };

export default function Membri() {
  const { user, canGrade } = useAuth();
  const [members, setMembers] = useState([]);

  const load = () => api.get("/members").then((r) => setMembers(r.data));
  useEffect(() => {
    load();
  }, []);

  const setRole = async (id, role) => {
    await api.patch(`/members/${id}/role`, { role });
    toast.success("Grad actualizat");
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
        {members.map((m) => {
          const Icon = ROLE_ICON[m.role] || Shield;
          return (
            <div key={m.id} className="bg-cartel-surface border border-cartel-border rounded-sm p-5 hover:border-cartel-borderlt transition-colors" data-testid={`member-${m.id}`}>
              <div className="flex items-center gap-3 mb-4">
                <img src={m.avatar_url} alt="" className="w-12 h-12 rounded-sm bg-cartel-elevated object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="text-cartel-text font-medium truncate">{m.username}</div>
                  <div className={`label-mono flex items-center gap-1 ${ROLE_COLOR[m.role] || "text-cartel-textsec"}`} data-testid={`member-role-${m.id}`}>
                    <Icon size={11} />
                    {ROLE_LABEL[m.role] || m.role}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-4 pt-3 border-t border-cartel-border/40">
                <div><div className="font-mono text-cartel-gold text-lg">{m.total_hours}</div><div className="text-[10px] uppercase text-cartel-textmuted font-mono">Ore</div></div>
                <div><div className="font-mono text-cartel-text text-lg">{m.total_jafuri_count}</div><div className="text-[10px] uppercase text-cartel-textmuted font-mono">Jafuri</div></div>
                <div><div className="font-mono text-cartel-success text-sm pt-1">{fmtMoney(m.total_jafuri_amount)}</div><div className="text-[10px] uppercase text-cartel-textmuted font-mono">Total</div></div>
              </div>
              {canGrade && m.id !== user?.id && (
                <div className="flex gap-2 items-center">
                  <select
                    data-testid={`role-select-${m.id}`}
                    value={m.role}
                    onChange={(e) => setRole(m.id, e.target.value)}
                    className="flex-1 bg-[#0A0A0A] border border-cartel-border rounded-sm p-2 text-sm text-cartel-text focus:border-cartel-red focus:outline-none"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button data-testid={`remove-${m.id}`} onClick={() => remove(m.id)} className="px-3 py-2 rounded-sm border border-cartel-border text-cartel-textmuted hover:text-cartel-danger hover:border-cartel-danger/40 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
