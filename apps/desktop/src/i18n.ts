/**
 * The brain writes its activity lines and a few errors in English (the Mac app
 * shows them as they are, and chats keep them that way). Here they are shown in
 * Portuguese; anything not listed is left as the brain wrote it.
 */
const DIRECTIONS: Record<string, string> = { up: "cima", down: "baixo", left: "a esquerda", right: "a direita" };

const RULES: [RegExp, (...m: string[]) => string][] = [
  [/^Looked at the screen$/, () => "Olhou a tela"],
  [/^Clicked at (\(.*\))$/, (_, xy) => `Clicou em ${xy}`],
  [/^Double-clicked at (\(.*\))$/, (_, xy) => `Clicou duas vezes em ${xy}`],
  [/^Typed (“[\s\S]*”)$/, (_, t) => `Digitou ${t}`],
  [/^Pressed (.+)$/, (_, k) => `Pressionou ${k}`],
  [/^Scrolled (\w+)$/, (_, d) => `Rolou para ${DIRECTIONS[d] ?? d}`],
  [/^Opened (.+?) at (.+)$/, (_, app, url) => `Abriu ${app} em ${url}`],
  [/^Opened (.+)$/, (_, app) => `Abriu ${app}`],
  [/^Ran: ([\s\S]*)$/, (_, c) => `Executou: ${c}`],
  [/^Waited (.+)$/, (_, s) => `Esperou ${s}`],
  [/^Unknown tool: (.+)$/, (_, n) => `Ferramenta desconhecida: ${n}`],
  [/^Invalid arguments for (.+)$/, (_, n) => `Argumentos inválidos para ${n}`],
  [/^Used (.+?): (.+?) \(failed\)$/, (_, s, t) => `Usou ${s}: ${t} (falhou)`],
  [/^Used (.+?): (.+)$/, (_, s, t) => `Usou ${s}: ${t}`],
  [/^Couldn’t use (.+?): (.+)$/, (_, s, t) => `Não conseguiu usar ${s}: ${t}`],
  [/^Couldn’t find an app tool$/, () => "Não encontrou uma ferramenta do app"],
  [/^Remembered: ([\s\S]*)$/, (_, t) => `Lembrou: ${t}`],
  [/^Forgot: ([\s\S]*)$/, (_, t) => `Esqueceu: ${t}`],
  [/^Stopped$/, () => "Interrompido"],
  [/^The device is off\.$/, () => "O dispositivo está desligado."],
];

export function pt(text: string): string {
  for (const [re, out] of RULES) {
    const m = re.exec(text);
    if (m) return out(...m);
  }
  return text;
}
