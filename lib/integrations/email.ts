import { ChannelError, type EmailConfig } from "./config";

/** Sends an email via the Resend API. */
export async function sendEmail(
  c: EmailConfig,
  {
    to,
    subject,
    html,
    text,
  }: { to: string; subject: string; html: string; text?: string },
): Promise<void> {
  if (!c.apiKey) {
    throw new ChannelError("O email (Resend) não está configurado — falta a API key.");
  }
  if (!c.from) {
    throw new ChannelError("Falta o remetente do email (From).");
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: c.from, to: [to], subject, html, text }),
    });
  } catch {
    throw new ChannelError("Não foi possível contactar o serviço de email.");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ChannelError(
      `Falha ao enviar email (${res.status}). ${body.slice(0, 160)}`.trim(),
    );
  }
}
