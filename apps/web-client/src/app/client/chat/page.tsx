"use client";

import { ChatThread } from "@/components/chat/ChatThread";

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Messagerie</h1>
        <p className="text-sm text-muted">Échangez en sécurité avec votre comptable. Les messages s&apos;actualisent automatiquement.</p>
      </div>
      <ChatThread />
    </div>
  );
}
