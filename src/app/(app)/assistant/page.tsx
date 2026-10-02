"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/app-provider";
import { Button, Input } from "@/components/ui";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Analyse mes ventes.",
  "Pourquoi mon bénéfice diminue ?",
  "Quelles sont mes dépenses principales ?",
  "Comment améliorer ma rentabilité ?",
];

export default function AssistantPage() {
  const { business } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Salut 👋 Je suis l'assistant business LYRON HUSTLE AI pour ${business.name}. Pose-moi une question sur tes ventes, tes dépenses, tes clients ou tes bénéfices. Mes réponses s'appuient sur les données disponibles de ton activité.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const { reply } = await api.post<{ reply: string }>("/api/ai/chat", {
        message: question,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            e instanceof Error
              ? `Désolé, une erreur est survenue : ${e.message}`
              : "Désolé, une erreur est survenue.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col lg:h-[calc(100vh-7rem)]">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Ton assistant business 🤖</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pose une question sur ton activité et obtiens une analyse claire. Tes chiffres sont calculés par le serveur; l&apos;assistant les interprète sans en inventer.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-sm bg-blue-600 text-white"
                  : "rounded-bl-sm bg-slate-100 text-slate-800"
              }`}
            >
              {msg.content.replace(/\*\*/g, "")}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm text-slate-400">
              <span className="animate-pulse">Analyse de tes données…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => void send(s)}
            disabled={loading}
            className="shrink-0 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-2 flex gap-2"
      >
        <Input
          placeholder="Pose ta question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Ta question"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Envoyer
        </Button>
      </form>
    </div>
  );
}
