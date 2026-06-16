/**
 * WhatsApp sender (Meta Cloud API). Falls back to a console "mock" when no
 * token is configured, so the pipeline is fully testable locally without Meta.
 */
import axios from "axios";
import { env, whatsappConfigured } from "./env";

const GRAPH = `https://graph.facebook.com/${env.GRAPH_API_VERSION}`;

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  if (!whatsappConfigured) {
    console.log(`[WhatsApp MOCK] → ${to}\n${text}\n`);
    return;
  }
  try {
    await axios.post(
      `${GRAPH}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      { messaging_product: "whatsapp", to, type: "text", text: { body: text } },
      { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const e = err as { response?: { data?: unknown }; message?: string };
    console.error("[whatsapp] send error", e.response?.data ?? e.message);
  }
}
