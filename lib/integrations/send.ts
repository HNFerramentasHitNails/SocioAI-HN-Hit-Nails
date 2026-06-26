import { ChannelError, type EmailConfig, type WhatsappConfig } from "./config";
import { renderMessage } from "./merge";
import { sendEmail } from "./email";
import { sendText } from "./evolution";
import type { Channel } from "@/lib/config";
import type { Tables } from "@/lib/supabase/types";

type Lead = Partial<Tables<"leads">>;

/**
 * Renders a template body for a lead and dispatches it on the given channel.
 * Used by test sends and the campaign send worker (Phase 6).
 */
export async function sendToLead(opts: {
  channel: Channel;
  body: string;
  subject?: string;
  lead: Lead;
  whatsapp?: WhatsappConfig;
  email?: EmailConfig;
}): Promise<string | null> {
  const text = renderMessage(opts.body, opts.lead);

  if (opts.channel === "whatsapp") {
    if (!opts.lead.phone) throw new ChannelError("O lead não tem telefone.");
    if (!opts.whatsapp) throw new ChannelError("WhatsApp não configurado.");
    return await sendText(opts.whatsapp, opts.lead.phone, text);
  }

  if (!opts.lead.email) throw new ChannelError("O lead não tem email.");
  if (!opts.email) throw new ChannelError("Email não configurado.");
  await sendEmail(opts.email, {
    to: opts.lead.email,
    subject: opts.subject || "Mensagem",
    html: text.replace(/\n/g, "<br>"),
    text,
  });
  return null;
}
