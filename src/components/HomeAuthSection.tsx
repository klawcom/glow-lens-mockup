// Área de Login / Cadastro no topo da tela Início
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  LogOut,
  ShieldCheck,
  Lock,
  Mail,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { APP_CONFIG } from "@/config/app";

function getFriendlyError(errMessage: string): string {
  const msg = errMessage.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "E-mail ou senha incorretos. Verifique seus dados.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered")) {
    return "Este e-mail já está cadastrado. Toque em Entrar ou recupere sua senha.";
  }
  if (msg.includes("password should be at least") || msg.includes("weak_password")) {
    return "A senha deve ter no mínimo 8 caracteres.";
  }
  if (msg.includes("email not confirmed")) {
    return "Por favor, confirme seu cadastro no link enviado para o seu e-mail.";
  }
  if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit")) {
    return "Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes.";
  }
  return "Não foi possível concluir a operação. Verifique os dados e tente novamente.";
}

export function HomeAuthSection({ isOpen, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"none" | "login" | "signup" | "forgot">("none");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Sincroniza abertura externa (ex: clique no ícone de perfil do header ou prop)
  useEffect(() => {
    if (isOpen !== undefined) {
      setMode((current) => {
        if (isOpen && current === "none") return "login";
        if (!isOpen && current !== "none") return "none";
        return current;
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleToggle = () => {
      setMode((current) => (current === "none" ? "login" : "none"));
    };
    window.addEventListener("toggle-glowlens-auth", handleToggle);
    return () => window.removeEventListener("toggle-glowlens-auth", handleToggle);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setStatusMsg({ type: "error", text: "Por favor, digite seu e-mail." });
      return;
    }
    if (!password) {
      setStatusMsg({ type: "error", text: "Por favor, digite sua senha." });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setStatusMsg({ type: "error", text: getFriendlyError(error.message) });
      } else {
        setStatusMsg({ type: "success", text: "Login realizado com sucesso!" });
        setPassword("");
        setMode("none");
        if (onToggle) onToggle();
      }
    } catch {
      setStatusMsg({ type: "error", text: "Erro ao tentar entrar. Tente novamente mais tarde." });
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setStatusMsg({ type: "error", text: "Por favor, digite um e-mail válido." });
      return;
    }
    if (password.length < 8) {
      setStatusMsg({ type: "error", text: "A senha deve ter no mínimo 8 caracteres." });
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : APP_CONFIG.url,
        },
      });

      if (error) {
        setStatusMsg({ type: "error", text: getFriendlyError(error.message) });
      } else if (data.session) {
        setStatusMsg({ type: "success", text: "Conta criada e conectada com sucesso!" });
        setPassword("");
        setMode("none");
        if (onToggle) onToggle();
      } else {
        setStatusMsg({
          type: "info",
          text: "Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail.",
        });
        setPassword("");
      }
    } catch {
      setStatusMsg({
        type: "error",
        text: "Não foi possível criar sua conta agora. Tente mais tarde.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setStatusMsg({
        type: "error",
        text: "Por favor, informe seu e-mail para recuperar a senha.",
      });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/adm` : `${APP_CONFIG.url}/adm`,
      });

      if (error) {
        setStatusMsg({ type: "error", text: getFriendlyError(error.message) });
      } else {
        setStatusMsg({
          type: "success",
          text: "Enviamos um link de recuperação para o seu e-mail! Siga as instruções para criar uma nova senha.",
        });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Não foi possível enviar a recuperação agora." });
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      setStatusMsg(null);
      setMode("none");
    } finally {
      setBusy(false);
    }
  };

  const isOwner =
    session?.user?.email?.toLowerCase().trim() === APP_CONFIG.ownerEmail.toLowerCase().trim();

  // Obter nome de exibição amigável
  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split("@")[0] ||
    "Usuário";

  const inputClass =
    "w-full rounded-full border-2 border-border bg-card px-4 py-2.5 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground transition";
  const btnPrimary =
    "flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-60 cursor-pointer";
  const btnSecondary =
    "flex items-center justify-center gap-1.5 rounded-full border border-border bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground shadow-card transition hover:bg-muted active:scale-[0.98] disabled:opacity-60 cursor-pointer";

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-card transition-all">
      {session ? (
        /* =================== ESTADO LOGADO =================== */
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground shrink-0 shadow-soft">
              {isOwner ? (
                <ShieldCheck className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-foreground truncate">
                  Olá, <span className="capitalize">{displayName}</span>
                </p>
                {isOwner && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                    Dono
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <Link
                to="/adm"
                className="hidden sm:inline-flex rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:bg-muted transition"
              >
                Painel Adm
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-secondary transition active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      ) : (
        /* =================== ESTADO DESLOGADO =================== */
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-soft">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Sua Conta</p>
                <p className="text-[11px] text-muted-foreground">
                  Entre ou crie uma conta para salvar seus favoritos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {mode === "none" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setStatusMsg(null);
                    }}
                    className={btnPrimary}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setStatusMsg(null);
                    }}
                    className={btnSecondary}
                  >
                    Criar conta
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode("none");
                    setStatusMsg(null);
                    if (onToggle) onToggle();
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label="Fechar formulário de login"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* FORMULÁRIO DE LOGIN / CADASTRO / ESQUECI A SENHA */}
          {mode !== "none" && (
            <div className="mt-2 border-t border-border pt-3">
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-primary" /> Entrar com e-mail e senha
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setStatusMsg(null);
                      }}
                      className="text-[11px] font-bold text-link hover:underline"
                    >
                      Não tem conta? Criar
                    </button>
                  </div>

                  <input
                    type="email"
                    placeholder="Seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    required
                  />

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setStatusMsg(null);
                      }}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Esqueci a senha
                    </button>
                    <button type="submit" disabled={busy} className={btnPrimary}>
                      {busy ? "Entrando..." : "Entrar"}
                    </button>
                  </div>
                </form>
              )}

              {mode === "signup" && (
                <form onSubmit={handleSignup} className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-primary" /> Criar nova conta
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setStatusMsg(null);
                      }}
                      className="text-[11px] font-bold text-link hover:underline"
                    >
                      Já tem conta? Entrar
                    </button>
                  </div>

                  <input
                    type="email"
                    placeholder="Seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <div className="space-y-1">
                    <input
                      type="password"
                      placeholder="Senha (mínimo de 8 caracteres)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      minLength={8}
                      required
                    />
                    <p className="px-1 text-[10px] text-muted-foreground">
                      A senha precisa ter pelo menos 8 caracteres.
                    </p>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button type="submit" disabled={busy} className={btnPrimary}>
                      {busy ? "Criando..." : "Criar conta"}
                    </button>
                  </div>
                </form>
              )}

              {mode === "forgot" && (
                <form onSubmit={handleForgotPassword} className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <KeyRound className="h-3.5 w-3.5 text-primary" /> Recuperar senha
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setStatusMsg(null);
                      }}
                      className="text-[11px] font-bold text-link hover:underline"
                    >
                      Voltar para o login
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Digite o e-mail cadastrado para receber as instruções de recuperação.
                  </p>

                  <input
                    type="email"
                    placeholder="Seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
                  />

                  <div className="flex justify-end pt-1">
                    <button type="submit" disabled={busy} className={btnPrimary}>
                      <Mail className="h-3.5 w-3.5 mr-1" />
                      {busy ? "Enviando..." : "Enviar instruções"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Mensagens de feedback */}
          {statusMsg && (
            <div
              className={`mt-2 flex items-start gap-2 rounded-2xl p-2.5 text-xs font-medium border ${
                statusMsg.type === "success"
                  ? "bg-success/20 text-success-foreground border-success/30"
                  : statusMsg.type === "error"
                    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : "bg-secondary text-secondary-foreground border-border"
              }`}
              role="alert"
            >
              {statusMsg.type === "success" && (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              )}
              {statusMsg.type === "error" && (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
