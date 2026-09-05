import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Plus, Send, Trash2, Info } from "lucide-react";
import {
  aiColleagueApi,
  type AiMessage,
  type AiThreadSummary,
} from "../lib/resources";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmProvider";

const STARTERS = [
  "Differential for a 55-year-old with new burning foot pain at night and poorly controlled T2DM?",
  "First-line management of community-acquired pneumonia in an otherwise healthy 30-year-old.",
  "Which red flags in low back pain warrant urgent imaging rather than conservative management?",
];

export function AiColleague() {
  const toast = useToast();
  const confirm = useConfirm();

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [threads, setThreads] = useState<AiThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiColleagueApi
      .status()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false));
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      setThreads(await aiColleagueApi.listThreads());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load your conversations");
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  async function openThread(id: string) {
    setActiveId(id);
    setMessages([]);
    try {
      const res = await aiColleagueApi.getThread(id);
      setMessages(res.messages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open that conversation");
    }
  }

  function newThread() {
    setActiveId(null);
    setMessages([]);
    setDraft("");
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const question = draft.trim();
    if (!question || thinking) return;

    // Show the question straight away; the answer can take a few seconds.
    const pending: AiMessage = {
      id: `pending-${Date.now()}`,
      role: "user",
      content: question,
      model: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, pending]);
    setDraft("");
    setThinking(true);

    try {
      const res = activeId
        ? await aiColleagueApi.reply(activeId, question)
        : await aiColleagueApi.start(question);
      setActiveId(res.threadId);
      setMessages(res.messages);
      loadThreads();
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setDraft(question);
      toast.error(err instanceof Error ? err.message : "The AI colleague could not answer");
    } finally {
      setThinking(false);
    }
  }

  async function removeThread(t: AiThreadSummary) {
    const ok = await confirm({
      title: "Delete this conversation?",
      message: `“${t.title}” will be removed permanently.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await aiColleagueApi.deleteThread(t.id);
      if (activeId === t.id) newThread();
      loadThreads();
      toast.success("Conversation deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete that conversation");
    }
  }

  if (configured === false) {
    return (
      <div className="empty-state">
        <Bot size={30} />
        <p>The AI colleague isn't switched on yet.</p>
        <p className="muted">
          Your administrator needs to add an API key on the server before this can be used.
        </p>
      </div>
    );
  }

  return (
    <div className="ai-layout">
      <aside className="ai-sidebar">
        <button className="btn btn-primary btn-block" onClick={newThread}>
          <Plus size={15} />
          New question
        </button>
        {loadError && <div className="error-banner">{loadError}</div>}
        <div className="ai-thread-list">
          {threads.length === 0 && !loadError && (
            <p className="muted">Your past questions will appear here.</p>
          )}
          {threads.map((t) => (
            <div
              key={t.id}
              className={`ai-thread-item ${t.id === activeId ? "ai-thread-item-active" : ""}`}
            >
              <button onClick={() => openThread(t.id)} title={t.title}>
                <span className="ai-thread-title">{t.title}</span>
                <span className="muted">{new Date(t.updatedAt).toLocaleDateString()}</span>
              </button>
              <button
                className="ai-thread-delete"
                onClick={() => removeThread(t)}
                title="Delete conversation"
                aria-label={`Delete ${t.title}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="ai-chat">
        <div className="ai-disclaimer">
          <Info size={15} />
          <span>
            A second opinion, not a decision. Verify anything you act on — especially drug doses —
            against your own judgement and a current formulary. Don't type patient-identifying
            details.
          </span>
        </div>

        <div className="ai-messages">
          {messages.length === 0 && !thinking && (
            <div className="ai-welcome">
              <Bot size={26} />
              <h3>Ask a colleague</h3>
              <p className="muted">
                Describe the clinical picture in your own words. Nothing is taken from a patient's
                chart — only what you type here is sent.
              </p>
              <div className="ai-starters">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => setDraft(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`ai-message ai-message-${m.role}`}>
              {m.role === "assistant" && (
                <div className="ai-message-who">
                  <Bot size={14} />
                  AI colleague
                </div>
              )}
              <div className="ai-message-body">{m.content}</div>
            </div>
          ))}

          {thinking && (
            <div className="ai-message ai-message-assistant">
              <div className="ai-message-who">
                <Bot size={14} />
                AI colleague
              </div>
              <div className="ai-typing" aria-live="polite">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="ai-composer" onSubmit={send}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e as unknown as FormEvent);
            }}
            placeholder="Describe the case or ask a clinical question…"
            rows={3}
            disabled={thinking}
          />
          <button type="submit" className="btn btn-primary" disabled={thinking || !draft.trim()}>
            <Send size={15} />
            {thinking ? "Thinking…" : "Ask"}
          </button>
        </form>
      </section>
    </div>
  );
}
