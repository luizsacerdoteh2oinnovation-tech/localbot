import type { Bot } from "../types";
import { AnimatedFace } from "./AnimatedFace";

/** The bot's face, animated like the macOS app; the brain's flat SVG if it sent no face parts. */
export function Avatar({ bot, size = 28, working = false, failed = false, still = false }: {
  bot: Pick<Bot, "id" | "name" | "avatar" | "face">; size?: number; working?: boolean; failed?: boolean; still?: boolean;
}) {
  if (bot.face) return <AnimatedFace face={bot.face} size={size} working={working} failed={failed} still={still} seed={bot.id} />;
  const style = { width: size, height: size };
  if (!bot.avatar) return <span className="avatar-fallback" style={style}>{bot.name.slice(0, 1)}</span>;
  return <img className="avatar-img" style={style} alt="" draggable={false}
    src={`data:image/svg+xml;utf8,${encodeURIComponent(bot.avatar)}`} />;
}
