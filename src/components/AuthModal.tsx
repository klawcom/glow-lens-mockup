// Modal de Login / Cadastro / Perfil aberto exclusivamente pelo ícone no canto superior esquerdo
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  LogOut,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  X,
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

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  if (!isOpen) return null;

  const isOwner =
    session?.user?.email?.toLowerCase().trim() === APP_CONFIG.ownerEmail.toLowerCase().trim();

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split("@")[0] ||
    "Usuário";

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
        setTimeout(() => onClose(), 600);
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
        setTimeout(() => onClose(), 800);
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
          text: "Enviamos as instruções de recuperação para o seu e-mail! Siga o link para criar uma nova senha.",
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
      setTimeout(() => onClose(), 300);
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-full border-2 border-border bg-muted/60 px-4 py-3 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground transition";
  const btnPrimary =
    "w-full flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-xs font-bold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-60 cursor-pointer";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-card border border-border space-y-4">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
              {session ? (
                isOwner ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <h3 className="font-bold text-base text-foreground">
              {session
                ? "Sua Conta"
                : mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Criar Conta"
                    : "Recuperar Senha"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {session ? (
          /* =================== MODAL LOGADO =================== */
          <div className="space-y-4 pt-1">
            <div className="rounded-2xl bg-muted/50 p-4 border border-border">
              <p className="text-xs text-muted-foreground">Conectado como:</p>
              <p className="font-bold text-sm text-foreground break-all">{displayName}</p>
              <p className="text-xs text-muted-foreground break-all mt-0.5">{session.user.email}</p>

              {isOwner ? (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Dono do site verificado
                </span>
              ) : (
                <span className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  Membro Glow Lens
                </span>
              )}
            </div>

            {isOwner && (
              <Link
                to="/adm"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full rounded-full bg-secondary py-2.5 text-xs font-bold text-secondary-foreground hover:bg-muted transition"
              >
                Acessar Painel Adm
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="flex items-center justify-center gap-2 w-full rounded-full border border-border bg-card py-2.5 text-xs font-bold text-foreground hover:bg-muted transition active:scale-95 cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>
          </div>
        ) : (
          /* =================== MODAL DESLOGADO =================== */
          <div className="space-y-3">
            {/* Seletor de Modo */}
            {mode !== "forgot" && (
              <div className="grid grid-cols-2 gap-1 rounded-full bg-muted/60 p-1 border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setStatusMsg(null);
                  }}
                  className={`rounded-full py-1.5 text-xs font-bold transition ${
                    mode === "login"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setStatusMsg(null);
                  }}
                  className={`rounded-full py-1.5 text-xs font-bold transition ${
                    mode === "signup"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Criar conta
                </button>
              </div>
            )}

            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-3">
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

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setStatusMsg(null);
                    }}
                    className="font-semibold text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Esqueci a senha
                  </button>
                </div>

                <button type="submit" disabled={busy} className={btnPrimary}>
                  <Lock className="h-4 w-4" /> {busy ? "Entrando..." : "Entrar"}
                </button>
              </form>
            )}

            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-3">
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
                    A senha deve ter pelo menos 8 caracteres.
                  </p>
                </div>

                <button type="submit" disabled={busy} className={btnPrimary}>
                  <User className="h-4 w-4" /> {busy ? "Criando conta..." : "Criar conta"}
                </button>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Digite seu e-mail cadastrado para receber o link de redefinição de senha:
                </p>

                <input
                  type="email"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />

                <button type="submit" disabled={busy} className={btnPrimary}>
                  <KeyRound className="h-4 w-4" />{" "}
                  {busy ? "Enviando..." : "Enviar link de recuperação"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setStatusMsg(null);
                  }}
                  className="w-full text-center text-xs font-semibold text-link hover:underline pt-1"
                >
                  Voltar para o login
                </button>
              </form>
            )}

            {/* Mensagem de Feedback */}
            {statusMsg && (
              <div
                className={`mt-2 flex items-start gap-2 rounded-2xl p-3 text-xs font-medium border ${
                  statusMsg.type === "success"
                    ? "bg-success/20 text-success-foreground border-success/30"
                    : statusMsg.type === "error"
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : "bg-secondary text-secondary-foreground border-border"
                }`}
                role="alert"
              >
                {statusMsg.type === "success" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                {statusMsg.type === "error" && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
