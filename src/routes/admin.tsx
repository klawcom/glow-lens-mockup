// Área escondida do dono: login simples + "Atualizar agora".
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { refreshTrendingNow } from "@/lib/identify.functions";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Área do dono — Glow Lens" },
      { name: "description", content: "Área restrita do dono do Glow Lens." },
      { property: "og:title", content: "Área do dono — Glow Lens" },
      { property: "og:description", content: "Área restrita." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const refresh = useServerFn(refreshTrendingNow);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  const input =
    "w-full rounded-full border-2 border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary";
  const btn =
    "flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-soft disabled:opacity-60";

  const auth = async (mode: "in" | "up") => {
    setBusy(true);
    setMsg(null);
    const { error, data } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    if (error) setMsg("Não foi possível entrar. Confira e-mail e senha.");
    else if (mode === "up" && !data.session)
      setMsg("Enviamos um link de confirmação para o seu e-mail.");
    setBusy(false);
  };

  const run = async () => {
    setBusy(true);
    setMsg("Atualizando... pode levar alguns minutos.");
    try {
      const r = await refresh();
      setMsg(r.ok ? `Pronto! ${r.message}` : r.message);
    } catch (err: unknown) {
      const errStr = String((err as { message?: string })?.message || "");
      if (errStr.includes("Unauthorized") || errStr.includes("dono")) {
        setMsg("Apenas o dono do app pode atualizar.");
      } else {
        setMsg("Não foi possível atualizar agora. A lista anterior foi mantida.");
      }
    }
    setBusy(false);
  };

  return (
    <>
      <PageHeader title="Área do dono" />
      <div className="space-y-3 rounded-2xl bg-card p-5 shadow-card">
        {!session ? (
          <>
            <input
              className={input}
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className={input}
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className={btn} disabled={busy} onClick={() => auth("in")}>
              Entrar
            </button>
            <button
              className="w-full text-sm font-semibold text-link"
              disabled={busy}
              onClick={() => auth("up")}
            >
              Criar conta do dono
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Conectado como {session.user.email}</p>
            <button className={btn} disabled={busy} onClick={run}>
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}{" "}
              Atualizar agora
            </button>
            <button
              className="w-full text-sm font-semibold text-link"
              onClick={() => supabase.auth.signOut()}
            >
              Sair
            </button>
          </>
        )}
        {msg && (
          <p className="text-center text-sm font-semibold" aria-live="polite">
            {msg}
          </p>
        )}
      </div>
    </>
  );
}
