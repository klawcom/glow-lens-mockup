// Painel Administrativo do Glow Lens: Gestão do Dono, Login Google/Gmail e Métricas
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  Mail,
  Lock,
  LogOut,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Copy,
  Info,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { refreshTrendingNow } from "@/lib/identify.functions";
import { PageHeader } from "@/components/PageHeader";
import { APP_CONFIG } from "@/config/app";

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

interface TrendingItem {
  id: string;
  nome: string;
  marca: string;
  categoria: string;
  posicao: number;
  por_que: string;
  foto: string | null;
  atualizado_em: string;
}

export function AdminPanel({ currentPath = "/adm" }: { currentPath?: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dados do painel administrativo
  const [trendingList, setTrendingList] = useState<TrendingItem[]>([]);
  const [fichasCount, setFichasCount] = useState<number>(0);
  const [aiUsageCount, setAiUsageCount] = useState<number>(0);
  const [jobStatus, setJobStatus] = useState<{
    ultimo_status: string | null;
    atualizado_em: string | null;
  } | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const refresh = useServerFn(refreshTrendingNow);

  // Obter a URL base atual para redirecionamento do OAuth
  const getRedirectUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${currentPath}`;
    }
    return `${APP_CONFIG.url}${currentPath}`;
  };

  const callbackUrl =
    "https://c--a7eda77e-8f85-41a1-af14-0450e55839fc-prod.lovable.cloud/auth/v1/callback";

  // 1. Monitorar estado de autenticação e tratar retorno de OAuth/PKCE/Hash
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    const handleAuthRedirect = async () => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      // Erro retornado pelo OAuth
      const errorDesc = params.get("error_description") || params.get("error");
      if (errorDesc) {
        setMsg({
          type: "error",
          text: `Erro ao autenticar com o Google: ${decodeURIComponent(errorDesc)}`,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Código de troca PKCE do OAuth
      const code = params.get("code");
      if (code) {
        setBusy(true);
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMsg({ type: "error", text: `Falha na troca de autenticação: ${error.message}` });
          } else if (data.session) {
            setSession(data.session);
            setMsg({ type: "success", text: "Login com Google realizado com sucesso!" });
          }
        } catch {
          // ignora
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
          setBusy(false);
        }
        return;
      }

      // Tokens passados via fragmento hash (#access_token=...)
      if (hash && (hash.includes("access_token") || hash.includes("refresh_token"))) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setMsg({ type: "success", text: "Sessão iniciada com sucesso!" });
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      }
    };

    handleAuthRedirect();
    return () => subscription.unsubscribe();
  }, [currentPath]);

  // 2. Carregar estatísticas do banco quando autenticado
  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
      // Carregar produtos em alta
      const { data: produtos } = await supabase
        .from("produtos_em_alta")
        .select("id, nome, marca, categoria, posicao, por_que, foto, atualizado_em")
        .order("posicao", { ascending: true });

      if (produtos) setTrendingList(produtos as TrendingItem[]);

      // Carregar total de fichas
      const { count: fCount } = await supabase
        .from("fichas")
        .select("id", { count: "exact", head: true });
      if (typeof fCount === "number") setFichasCount(fCount);

      // Carregar status do job
      const { data: jobs } = await supabase
        .from("job_status")
        .select("ultimo_status, atualizado_em")
        .eq("nome", "trending_updater")
        .maybeSingle();
      if (jobs) setJobStatus(jobs);

      // Carregar consultas de IA
      const { count: aiCount } = await supabase
        .from("ai_usage")
        .select("id", { count: "exact", head: true });
      if (typeof aiCount === "number") setAiUsageCount(aiCount);
    } catch (err) {
      console.error("Erro ao carregar dados do painel:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadDashboardData();
    }
  }, [session]);

  // Login com Google via OAuth
  const handleGoogleOAuth = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const redirectTo = getRedirectUrl();

      // Solicita a URL do provedor Google
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        setMsg({
          type: "error",
          text: error?.message || "Não foi possível iniciar o login com o Google.",
        });
        setBusy(false);
        return;
      }

      // Testa a disponibilidade do provedor no Supabase para evitar tela de erro 400
      try {
        const checkRes = await fetch(data.url, { method: "GET" });
        if (checkRes.status === 400) {
          const body = await checkRes.json().catch(() => ({}));
          if (body?.msg?.includes("not enabled")) {
            setMsg({
              type: "info",
              text: `O provedor Google OAuth precisa ser habilitado no painel da Lovable/Supabase com o Client ID. Enquanto isso, use o botão "Acessar via Gmail (Link Mágico)" abaixo para entrar na hora!`,
            });
            setShowConfigHelp(true);
            setBusy(false);
            return;
          }
        }
      } catch {
        // se fetch falhar por CORS/redirect seguro, prossegue normalmente
      }

      // Se o provedor estiver ativo, redireciona para a página do Google
      window.location.assign(data.url);
    } catch (e: unknown) {
      setMsg({
        type: "error",
        text: (e as Error)?.message || "Erro inesperado ao conectar ao Google.",
      });
      setBusy(false);
    }
  };

  // Acesso direto com Google / Gmail com 1 clique (Magic Link)
  const handleGmailMagicLink = async (targetEmail = APP_CONFIG.ownerEmail) => {
    setBusy(true);
    setMsg(null);
    try {
      const redirectTo = getRedirectUrl();
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setMsg({ type: "error", text: error.message });
      } else {
        setMsg({
          type: "success",
          text: `Enviamos um link de login direto para ${targetEmail}! Abra seu Gmail e toque no link para acessar na hora.`,
        });
      }
    } catch {
      setMsg({ type: "error", text: "Não foi possível enviar o link de acesso." });
    } finally {
      setBusy(false);
    }
  };

  // Login ou cadastro tradicional com senha
  const handlePasswordAuth = async (mode: "in" | "up") => {
    setBusy(true);
    setMsg(null);
    try {
      const redirectTo = getRedirectUrl();
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMsg({ type: "error", text: "Não foi possível entrar. Confira e-mail e senha." });
        } else {
          setMsg({ type: "success", text: "Login realizado com sucesso!" });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) {
          setMsg({ type: "error", text: `Erro no cadastro: ${error.message}` });
        } else if (!data.session) {
          setMsg({
            type: "info",
            text: "Conta criada! Enviamos um link de confirmação para o seu e-mail.",
          });
        }
      }
    } catch {
      setMsg({ type: "error", text: "Erro ao processar autenticação." });
    } finally {
      setBusy(false);
    }
  };

  // Executar atualização imediata do catálogo
  const handleRefreshTrending = async () => {
    setBusy(true);
    setMsg({
      type: "info",
      text: "Atualizando produtos em alta... Isso pode levar alguns minutos.",
    });
    try {
      const r = await refresh();
      if (r.ok) {
        setMsg({ type: "success", text: `Pronto! ${r.message}` });
        await loadDashboardData();
      } else {
        setMsg({ type: "error", text: r.message });
      }
    } catch (err: unknown) {
      const errStr = String((err as { message?: string })?.message || "");
      if (errStr.includes("Unauthorized") || errStr.includes("dono")) {
        setMsg({
          type: "error",
          text: `Apenas o dono do app (${APP_CONFIG.ownerEmail}) pode atualizar.`,
        });
      } else {
        setMsg({
          type: "error",
          text: "Não foi possível atualizar agora. A lista anterior foi mantida.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const copyCallbackUrl = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isOwner =
    session?.user?.email?.toLowerCase().trim() === APP_CONFIG.ownerEmail.toLowerCase().trim();

  const inputClass =
    "w-full rounded-full border-2 border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary text-foreground transition";
  const btnPrimary =
    "flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-bold text-primary-foreground shadow-soft transition active:scale-[0.98] disabled:opacity-60 cursor-pointer";
  const btnGoogle =
    "flex w-full items-center justify-center gap-3 rounded-full border-2 border-border bg-card py-3.5 font-bold text-foreground shadow-card transition hover:bg-muted active:scale-[0.98] disabled:opacity-60 cursor-pointer";
  const btnGmail =
    "flex w-full items-center justify-center gap-2.5 rounded-full bg-secondary py-3 font-semibold text-secondary-foreground shadow-card transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60 cursor-pointer text-sm";

  return (
    <>
      <PageHeader title="Painel Administrativo" />

      <div className="space-y-5 pb-12">
        {/* Card Principal */}
        <div className="rounded-3xl bg-card p-6 shadow-card border border-border">
          {!session ? (
            /* =================== TELA DE LOGIN =================== */
            <div className="space-y-4">
              <div className="text-center pb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-2">
                  <ShieldCheck className="h-4 w-4" /> Acesso Restrito
                </span>
                <h2 className="text-xl font-bold text-foreground">Entrar no Glow Lens</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Área exclusiva do dono:{" "}
                  <strong className="text-foreground">{APP_CONFIG.ownerEmail}</strong>
                </p>
              </div>

              {/* Botão Oficial Google OAuth */}
              <button
                type="button"
                className={btnGoogle}
                disabled={busy}
                onClick={handleGoogleOAuth}
              >
                <GoogleIcon className="h-5 w-5" />
                <span>Entrar com Google</span>
              </button>

              {/* Botão Acesso Rápido Gmail (1-Clique via Magic Link) */}
              <button
                type="button"
                className={btnGmail}
                disabled={busy}
                onClick={() => handleGmailMagicLink(APP_CONFIG.ownerEmail)}
              >
                <Mail className="h-4 w-4 text-primary" />
                <span>Acessar via Gmail do Dono (Link 1-Clique)</span>
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="w-full border-t border-border"></div>
                <span className="absolute bg-card px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  ou e-mail e senha
                </span>
              </div>

              <div className="space-y-3">
                <input
                  className={inputClass}
                  type="email"
                  placeholder={`E-mail (ex: ${APP_CONFIG.ownerEmail})`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className={inputClass}
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy}
                  onClick={() => handlePasswordAuth("in")}
                >
                  <Lock className="h-4 w-4" /> Entrar com Senha
                </button>

                <div className="flex gap-2 pt-1 text-xs">
                  <button
                    type="button"
                    className="flex-1 text-center font-semibold text-link hover:underline py-1"
                    disabled={busy}
                    onClick={() => handlePasswordAuth("up")}
                  >
                    Criar conta
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    className="flex-1 text-center font-semibold text-link hover:underline py-1"
                    disabled={busy}
                    onClick={() => {
                      if (!email) {
                        setMsg({
                          type: "info",
                          text: "Digite seu e-mail no campo acima para receber o link de acesso.",
                        });
                      } else {
                        handleGmailMagicLink(email);
                      }
                    }}
                  >
                    Receber link no e-mail
                  </button>
                </div>
              </div>

              {/* Guia Expansível de Configuração do Google OAuth */}
              <div className="pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowConfigHelp(!showConfigHelp)}
                  className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" /> Como ativar o Google OAuth no Supabase?
                  </span>
                  {showConfigHelp ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showConfigHelp && (
                  <div className="mt-3 rounded-2xl bg-muted/60 p-4 text-xs text-foreground space-y-2 border border-border/60">
                    <p className="font-semibold text-primary">
                      Para ativar o botão direto do Google:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                      <li>
                        Acesse o <strong>Google Cloud Console</strong> &gt;{" "}
                        <em>APIs &amp; Services</em> &gt; <em>Credentials</em>.
                      </li>
                      <li>
                        Crie um <strong>OAuth Client ID</strong> (Web Application).
                      </li>
                      <li>
                        Em <strong>Authorized redirect URIs</strong>, adicione a URL abaixo:
                      </li>
                    </ol>

                    <div className="flex items-center gap-2 rounded-xl bg-card p-2 border border-border">
                      <code className="text-[11px] break-all text-primary flex-1 font-mono">
                        {callbackUrl}
                      </code>
                      <button
                        type="button"
                        onClick={copyCallbackUrl}
                        className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground hover:opacity-80 flex items-center gap-1 shrink-0"
                      >
                        {copied ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copied ? "Copiado!" : "Copiar"}
                      </button>
                    </div>

                    <p className="text-muted-foreground text-[11px] pt-1">
                      4. No painel da <strong>Lovable Cloud / Supabase</strong>, vá em{" "}
                      <em>Auth &gt; Providers &gt; Google</em>, marque <strong>Enabled</strong> e
                      cole o Client ID e Client Secret.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* =================== PAINEL DO ADMINISTRADOR =================== */
            <div className="space-y-5">
              {/* Cabeçalho do Usuário */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Conectado como:</p>
                  <p className="font-bold text-foreground text-base break-all">
                    {session.user.email}
                  </p>
                  {isOwner ? (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success-foreground border border-success/30">
                      <ShieldCheck className="h-4 w-4" /> Dono do site verificado
                    </span>
                  ) : (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-3 py-1 text-xs font-bold text-destructive">
                      <AlertCircle className="h-4 w-4" /> Conta não autorizada como administrador
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted self-start"
                  onClick={() => supabase.auth.signOut()}
                >
                  <LogOut className="h-3.5 w-3.5" /> Sair
                </button>
              </div>

              {/* Botão de Ação Principal: Atualizar Agora */}
              <div className="rounded-2xl bg-secondary/40 p-4 border border-border">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Sincronizar Produtos em Alta
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Consulta tendências e atualiza os produtos da página inicial.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy || !isOwner}
                  onClick={handleRefreshTrending}
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-5 w-5" />
                  )}
                  {busy ? "Sincronizando..." : "Atualizar agora"}
                </button>

                {!isOwner && (
                  <p className="text-[11px] text-destructive font-semibold mt-2 text-center">
                    Apenas o dono ({APP_CONFIG.ownerEmail}) possui permissão para atualizar o
                    catálogo.
                  </p>
                )}
              </div>

              {/* Métricas do Sistema */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-link" /> Indicadores do Sistema
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-muted/60 p-3.5 border border-border">
                    <div className="flex items-center gap-2 text-primary mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-bold">Em Alta</span>
                    </div>
                    <div className="text-2xl font-extrabold text-foreground">
                      {loadingData ? "..." : trendingList.length}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Produtos no ranking</p>
                  </div>

                  <div className="rounded-2xl bg-muted/60 p-3.5 border border-border">
                    <div className="flex items-center gap-2 text-link mb-1">
                      <Cpu className="h-4 w-4" />
                      <span className="text-xs font-bold">Fichas em Cache</span>
                    </div>
                    <div className="text-2xl font-extrabold text-foreground">
                      {loadingData ? "..." : fichasCount}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Produtos salvos</p>
                  </div>

                  <div className="rounded-2xl bg-muted/60 p-3.5 border border-border col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Status do Job de Atualização:
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-success-foreground bg-success/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />{" "}
                        {jobStatus?.ultimo_status || "Pronto / Ativo"}
                      </span>
                    </div>
                    {jobStatus?.atualizado_em && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Última execução: {new Date(jobStatus.atualizado_em).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista dos Produtos em Alta Cadastrados */}
              {trendingList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">
                      Produtos em Alta no App ({trendingList.length})
                    </h3>
                    <Link
                      to="/"
                      className="text-xs font-semibold text-link flex items-center gap-1"
                    >
                      Ver no app <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {trendingList.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3 border border-border"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-xs font-extrabold text-primary shrink-0">
                          #{item.posicao}
                        </span>
                        {item.foto && (
                          <img
                            src={item.foto}
                            alt={item.nome}
                            className="h-10 w-10 rounded-xl object-cover border border-border shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{item.nome}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.marca} • {item.categoria}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensagens de Feedback */}
          {msg && (
            <div
              className={`mt-4 rounded-2xl p-3.5 text-xs font-medium flex items-start gap-2.5 border ${
                msg.type === "success"
                  ? "bg-success/20 text-success-foreground border-success/30"
                  : msg.type === "error"
                    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : "bg-secondary text-secondary-foreground border-border"
              }`}
              role="alert"
            >
              {msg.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
              {msg.type === "error" && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              {msg.type === "info" && <Info className="h-4 w-4 shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{msg.text}</span>
            </div>
          )}
        </div>

        {/* Atalhos Rápidos para Outras Telas */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <Link
            to="/"
            className="rounded-2xl border border-border bg-card p-3 text-xs font-bold text-foreground hover:bg-muted transition"
          >
            ← Voltar para o Início
          </Link>
          <Link
            to="/sobre"
            className="rounded-2xl border border-border bg-card p-3 text-xs font-bold text-foreground hover:bg-muted transition"
          >
            Sobre o App
          </Link>
        </div>
      </div>
    </>
  );
}
