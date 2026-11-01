import type { Bot } from "../types";

/** The bot's face from the brain's SVG, as in the macOS app (which animates it; here it bobs while working). */
export function Avatar({ bot, size = 28, working = false }: { bot: Pick<Bot, "name" | "avatar">; size?: number; working?: boolean }) {
  const style = { width: size, height: size };
  if (!bot.avatar) return <span className="avatar-fallback" style={style}>{bot.name.slice(0, 1)}</span>;
  return <img className={`avatar-img ${working ? "working" : ""}`} style={style} alt="" draggable={false}
    src={`data:image/svg+xml;utf8,${encodeURIComponent(bot.avatar)}`} />;
}
