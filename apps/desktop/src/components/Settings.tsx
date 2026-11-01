import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { brain } from "../brain";
import type { Computer, ProviderStatus } from "../types";
import { Modal } from "./Modal";
import { stateLabel } from "./Sidebar";

/** AI providers (keys), the default model for new bots, devices, and the version. */
export function Settings({ providers, computers, onClose }: { providers: ProviderStatus; computers: Computer[]; onClose: () => void }) {
  const [tab, setTab] = useState<"providers" | "devices" | "about">("providers");
  return (
    <Modal title="Configurações" onClose={onClose} wide>
      <div className="tabs">
        {(["providers", "devices", "about"] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? "selected" : ""}`} onClick={() => setTab(t)}>
            {t === "providers" ? "Provedores de IA" : t === "devices" ? "Dispositivos" : "Sobre"}
          </button>
        ))}
      </div>
      {tab === "providers" && <Providers status={providers} />}
      {tab === "devices" && <Devices computers={computers} />}
      {tab === "about" && <About status={providers} />}
    </Modal>
  );
}

function Providers({ status }: { status: ProviderStatus }) {
  const [preset, setPreset] = useState("");
  const [key, setKey] = useState("");
  const [model, setModel] = useState(status.defaultModel);
  const [defaultProvider, setDefaultProvider] = useState(status.defaultProvider);
  const [error, setError] = useState<string | null>(null);
  const chosen = status.presets.find((p) => p.id === preset);
  const run = (f: () => Promise<unknown>) => { setError(null); f().catch((e) => setError(e.message)); };

  return (
    <div className="settings-body">
      {status.providers.map((p) => (
        <div key={p.id} className="list-row">
          <div className="row-text">
            <span className="row-title">{p.label}</span>
            <span className="row-sub">{p.configured ? `Chave ${p.keyHint ?? "definida"}` : "Sem chave"}{p.id === status.defaultProvider ? " · padrão" : ""}</span>
          </div>
          <button className="pill" onClick={() => run(() => brain.request("providers.remove", { id: p.id }))}>Remover</button>
        </div>
      ))}

      <div className="section-title">Padrão para novos bots</div>
      <div className="row2">
        <select value={defaultProvider} onChange={(e) => setDefaultProvider(e.target.value)}>
          {status.providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="ID do modelo" />
      </div>
      <div className="modal-actions">
        <span className="spacer" />
        <button className="pill" disabled={!model.trim()}
          onClick={() => run(() => brain.request("providers.setDefault", { provider: defaultProvider, model: model.trim() }))}>Salvar padrão</button>
      </div>

      <div className="section-title">Adicionar um provedor</div>
      <select value={preset} onChange={(e) => setPreset(e.target.value)}>
        <option value="">Escolher…</option>
        {status.presets.filter((p) => p.id !== "custom").map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      {chosen && !chosen.keyless && (
        <>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Chave de API" />
          {chosen.keyURL && <a className="link" onClick={() => openUrl(chosen.keyURL!)}>Obter uma chave</a>}
        </>
      )}
      {error && <div className="chat-error">{error}</div>}
      <div className="modal-actions">
        <span className="muted small">As chaves ficam criptografadas para o seu usuário ({status.secretStore}).</span>
        <span className="spacer" />
        <button className="primary" disabled={!chosen || (!chosen.keyless && !key.trim())}
          onClick={() => run(async () => {
            await brain.request("providers.add", { preset, ...(key.trim() ? { apiKey: key.trim() } : {}) });
            setPreset("");
            setKey("");
          })}>Adicionar</button>
      </div>
    </div>
  );
}

function Devices({ computers }: { computers: Computer[] }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="settings-body">
      {computers.length === 0 && <div className="muted">Nenhum dispositivo ainda.</div>}
      {computers.map((c) => (
        <div key={c.id} className="list-row">
          <div className="row-text">
            <span className="row-title">{c.name}</span>
            <span className="row-sub">{c.os === "linux" ? "Linux" : c.os} · {stateLabel(c.state)} · {c.bots.length} bot{c.bots.length === 1 ? "" : "s"}</span>
          </div>
          {confirm === c.id
            ? <button className="pill danger" onClick={() => brain.request("computers.remove", { id: c.id }).catch((e) => setError(e.message)).finally(() => setConfirm(null))}>Excluir e apagar os arquivos</button>
            : <button className="pill" onClick={() => setConfirm(c.id)}>Excluir…</button>}
        </div>
      ))}
      {error && <div className="chat-error">{error}</div>}
    </div>
  );
}

function About({ status }: { status: ProviderStatus }) {
  const [version, setVersion] = useState("");
  useEffect(() => {
    brain.request<{ version: string }>("app.info").then((i) => setVersion(i.version)).catch(() => {});
  }, []);
  return (
    <div className="settings-body">
      <div className="list-row"><span className="row-title">Local Bot</span><span className="muted">{version}</span></div>
      <div className="list-row"><span className="row-title">Armazenamento de segredos</span><span className="muted">{status.secretStore}</span></div>
      <a className="link" onClick={() => openUrl("https://github.com/patrick-mns/localbot")}>github.com/patrick-mns/localbot</a>
    </div>
  );
}
