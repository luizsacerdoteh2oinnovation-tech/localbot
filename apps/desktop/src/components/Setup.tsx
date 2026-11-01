import { useState } from "react";
import { brain } from "../brain";
import type { ProviderStatus } from "../types";

/** First run: bots need a model provider. OpenRouter covers most models with one key. */
export function Setup({ status, onDone }: { status: ProviderStatus; onDone: () => void }) {
  const [preset, setPreset] = useState("openrouter");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = status.presets.find((p) => p.id === preset);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await brain.request("providers.add", { preset, ...(key.trim() ? { apiKey: key.trim() } : {}) });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setup">
      <div className="setup-card">
        <h1>Boas-vindas ao Local Bot</h1>
        <p className="muted">Os bots pensam com um modelo de IA. Escolha um provedor e cole a chave de API; ela fica criptografada para o seu usuário do Windows ({status.secretStore}).</p>
        <label>Provedor</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          {status.presets.filter((p) => p.id !== "custom").map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {!chosen?.keyless && (
          <>
            <label>Chave de API</label>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Cole sua chave" autoFocus />
            {chosen?.keyURL && <a className="link" href={chosen.keyURL} target="_blank" rel="noreferrer">Obter uma chave</a>}
          </>
        )}
        {error && <div className="chat-error">{error}</div>}
        <button className="primary" disabled={busy || (!chosen?.keyless && !key.trim())} onClick={save}>
          {busy ? "Salvando…" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
