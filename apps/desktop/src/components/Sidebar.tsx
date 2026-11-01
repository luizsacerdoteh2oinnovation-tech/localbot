import type { Bot, Computer } from "../types";
import { Avatar } from "./Avatar";

export type Selection = { kind: "bot"; id: string } | { kind: "device"; id: string } | null;

/** Bots and devices, as in the macOS app's sidebar. */
export function Sidebar({ bots, computers, thinking, selection, onSelect, onNewBot, onNewDevice, onSettings }: {
  bots: Bot[];
  computers: Computer[];
  thinking: Set<string>;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onNewBot: () => void;
  onNewDevice: () => void;
  onSettings: () => void;
}) {
  return (
    <nav className="sidebar">
      <div className="section-head">
        <span>BOTS</span>
        <button className="icon" onClick={onNewBot} title="Novo bot">+</button>
      </div>
      {bots.length === 0 && (
        <button className="row" onClick={onNewBot}>
          <span className="tile dashed">+</span>
          <span className="row-sub create">Criar bot</span>
        </button>
      )}
      {bots.map((b) => (
        <button key={b.id} className={`row ${selection?.kind === "bot" && selection.id === b.id ? "selected" : ""}`}
          onClick={() => onSelect({ kind: "bot", id: b.id })}>
          <Avatar bot={b} size={28} working={thinking.has(b.id)} />
          <span className="row-text">
            <span className="row-title">{b.name}</span>
            <span className="row-sub">{thinking.has(b.id) ? "Trabalhando…" : b.role || "Bot"}</span>
          </span>
        </button>
      ))}
      <div className="section-head">
        <span>DISPOSITIVOS</span>
        <button className="icon" onClick={onNewDevice} title="Adicionar dispositivo">+</button>
      </div>
      {computers.length === 0 && <div className="empty">Nenhum dispositivo ainda</div>}
      {computers.map((c) => (
        <button key={c.id} className={`row ${selection?.kind === "device" && selection.id === c.id ? "selected" : ""}`}
          onClick={() => onSelect({ kind: "device", id: c.id })}>
          <span className="tile">▭</span>
          <span className="row-text">
            <span className="row-title">{c.name}</span>
            <span className="row-sub">{[c.os === "linux" ? "Linux" : c.os, stateLabel(c.state), c.bots.length ? `${c.bots.length} bot${c.bots.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ")}</span>
          </span>
          <span className={`dot ${c.state}`} />
        </button>
      ))}
      <button className="settings-button" onClick={onSettings} title="Configurações">⚙ Configurações</button>
    </nav>
  );
}

export const stateLabel = (s: string) =>
  ({ running: "Ligado", stopped: "Desligado", starting: "Iniciando…", stopping: "Desligando…", creating: "Sendo criado…" } as Record<string, string>)[s] ?? "Erro";
