// Área escondida do dono: login simples + Google + "Atualizar agora".
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { refreshTrendingNow } from "@/lib/identify.functions";
import { PageHeader } from "@/components/PageHeader";
import { APP_CONFIG } from "@/config/app";

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

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.255 21.3 7.335 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.43l4.02-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.335 0 3.255 2.7 1.26 6.57l4.02 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

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
    "w-full rounded-full border-2 border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary text-foreground";
  const btn =
    "flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-60";
  const btnGoogle =
    "flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border bg-card py-3 font-semibold text-foreground shadow-card transition hover:bg-muted active:scale-[0.98] disabled:opacity-60";

  const authGoogle = async () => {
    setBusy(true);
    setMsg(null);
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/admin` : `${APP_CONFIG.url}/admin`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    if (error) {
      setMsg(
        "Não foi possível iniciar o login com o Google. Verifique se o provedor está ativo no Supabase.",
      );
      setBusy(false);
    }
  };

  const auth = async (mode: "in" | "up") => {
    setBusy(true);
    setMsg(null);
    const { error, data } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo:
                typeof window !== "undefined"
                  ? `${window.location.origin}/admin`
                  : `${APP_CONFIG.url}/admin`,
            },
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
        setMsg(`Apenas o dono do app (${APP_CONFIG.ownerEmail}) pode atualizar.`);
      } else {
        setMsg("Não foi possível atualizar agora. A lista anterior foi mantida.");
      }
    }
    setBusy(false);
  };

  const isOwner =
    session?.user?.email?.toLowerCase().trim() === APP_CONFIG.ownerEmail.toLowerCase().trim();

  return (
    <>
      <PageHeader title="Área do dono" />
      <div className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
        {!session ? (
          <>
            <button className={btnGoogle} disabled={busy} onClick={authGoogle}>
              <GoogleIcon className="h-5 w-5" />
              Entrar com Google
            </button>

            <div className="relative my-2 flex items-center justify-center">
              <div className="w-full border-t border-border"></div>
              <span className="absolute bg-card px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ou com e-mail e senha
              </span>
            </div>

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
              Criar conta com este e-mail
            </button>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Conectado como:</p>
              <p className="font-semibold text-foreground break-all">{session.user.email}</p>
              {isOwner ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Dono do site verificado
                </span>
              ) : (
                <span className="mt-1 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  Conta comum
                </span>
              )}
            </div>

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
          <p className="text-center text-sm font-semibold text-foreground pt-1" aria-live="polite">
            {msg}
          </p>
        )}
      </div>
    </>
  );
}
