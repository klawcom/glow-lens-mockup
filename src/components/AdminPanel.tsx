import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  Mail,
  Lock,
  LogOut,
  ChevronDown,
  ChevronUp,
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Copy,
  Info,
  Sliders,
  ExternalLink,
  RotateCcw,
  Save,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { APP_CONFIG } from "@/config/app";
import {
  getAffiliateLinks,
  saveAffiliateLinks,
  DEFAULT_AFFILIATE_STORES,
  buildAffiliateUrl,
  type AffiliateStoreConfig,
} from "@/lib/affiliates.functions";

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

export function AdminPanel({ currentPath = "/adm" }: { currentPath?: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dados do painel administrativo
  const [fichasCount, setFichasCount] = useState<number>(0);
  const [aiUsageCount, setAiUsageCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(false);

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
      // Carregar total de fichas
      const { count: fCount } = await supabase
        .from("fichas")
        .select("id", { count: "exact", head: true });
      if (typeof fCount === "number") setFichasCount(fCount);

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

  const copyCallbackUrl = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isOwner =
    session?.user?.email?.toLowerCase().trim() === APP_CONFIG.ownerEmail.toLowerCase().trim();

  // Abas do administrador (Ajustes visível apenas para o dono)
  const [adminTab, setAdminTab] = useState<"indicadores" | "ajustes">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "ajustes" || window.location.hash === "#ajustes") {
        return "ajustes";
      }
    }
    return "indicadores";
  });

  // Estado dos links de afiliados (Ajustes)
  const [stores, setStores] = useState<AffiliateStoreConfig[]>(DEFAULT_AFFILIATE_STORES);
  const [loadingStores, setLoadingStores] = useState(false);
  const [savingStores, setSavingStores] = useState(false);

  const fetchAffiliates = useServerFn(getAffiliateLinks);
  const saveAffiliates = useServerFn(saveAffiliateLinks);

  // Carregar lojas de afiliados quando logado como dono
  const loadAffiliateStores = async () => {
    setLoadingStores(true);
    try {
      const res = await fetchAffiliates();
      if (res?.stores && res.stores.length > 0) {
        setStores(res.stores);
      }
    } catch (err) {
      console.warn("Erro ao carregar lojas de afiliados:", err);
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    if (session?.user && isOwner) {
      loadAffiliateStores();
    }
  }, [session, isOwner]);

  const handleStoreModelChange = (loja: string, newModelo: string) => {
    setStores((prev) => prev.map((s) => (s.loja === loja ? { ...s, modelo: newModelo } : s)));
  };

  const handleStoreToggle = (loja: string, ativo: boolean) => {
    setStores((prev) => prev.map((s) => (s.loja === loja ? { ...s, ativo } : s)));
  };

  const handleStoreReset = (loja: string) => {
    const defaultStore = DEFAULT_AFFILIATE_STORES.find((d) => d.loja === loja);
    if (!defaultStore) return;
    setStores((prev) =>
      prev.map((s) => (s.loja === loja ? { ...s, modelo: defaultStore.modelo, ativo: true } : s)),
    );
    setMsg({
      type: "info",
      text: `Modelo padrão da loja ${loja} restaurado. Clique em "Salvar Ajustes" para confirmar.`,
    });
  };

  const handleTestLink = (store: AffiliateStoreConfig) => {
    const model = store.modelo.trim();
    if (!model.toLowerCase().startsWith("https://")) {
      setMsg({
        type: "error",
        text: `Link de ${store.loja} inválido: deve começar com https://`,
      });
      return;
    }
    if (!model.includes("{busca}")) {
      setMsg({
        type: "error",
        text: `Link de ${store.loja} inválido: deve conter {busca} onde o produto será inserido.`,
      });
      return;
    }

    const testTerm = "protetor solar facial";
    const testUrl = buildAffiliateUrl(store.modelo, store.loja, testTerm);
    if (typeof window !== "undefined") {
      window.open(testUrl, "_blank", "noopener,noreferrer");
    }
    setMsg({
      type: "info",
      text: `Testando link de ${store.loja} em nova aba com o termo "${testTerm}".`,
    });
  };

  const handleSaveStores = async () => {
    setSavingStores(true);
    setMsg(null);

    // Validação no cliente antes do envio: aceitar apenas https:// e deve conter {busca}
    for (const store of stores) {
      const model = store.modelo.trim();
      if (!model.toLowerCase().startsWith("https://")) {
        setMsg({
          type: "error",
          text: `Erro na loja ${store.loja}: o modelo deve começar obrigatoriamente com https://`,
        });
        setSavingStores(false);
        return;
      }
      if (!model.includes("{busca}")) {
        setMsg({
          type: "error",
          text: `Erro na loja ${store.loja}: o modelo deve conter a tag {busca} no endereço.`,
        });
        setSavingStores(false);
        return;
      }
    }

    try {
      const res = await saveAffiliates({
        data: {
          stores: stores.map((s) => ({
            loja: s.loja,
            modelo: s.modelo.trim(),
            ativo: s.ativo,
          })),
        },
      });

      if (res.ok) {
        setMsg({
          type: "success",
          text: res.message || "Modelos de links de afiliados salvos com sucesso!",
        });
      } else {
        setMsg({
          type: "error",
          text: res.message || "Erro ao salvar os modelos de afiliados.",
        });
      }
    } catch (e: unknown) {
      setMsg({
        type: "error",
        text: (e as Error)?.message || "Não foi possível salvar os ajustes de afiliados.",
      });
    } finally {
      setSavingStores(false);
    }
  };

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
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted self-start cursor-pointer"
                  onClick={() => supabase.auth.signOut()}
                >
                  <LogOut className="h-3.5 w-3.5" /> Sair
                </button>
              </div>

              {/* Abas de Navegação (Apenas visíveis para o dono) */}
              {isOwner && (
                <div className="flex rounded-2xl bg-muted/80 p-1 border border-border">
                  <button
                    type="button"
                    onClick={() => setAdminTab("indicadores")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      adminTab === "indicadores"
                        ? "bg-card text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>Indicadores</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminTab("ajustes")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      adminTab === "ajustes"
                        ? "bg-card text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    <span>Ajustes</span>
                  </button>
                </div>
              )}

              {/* ABA 1: INDICADORES DO SISTEMA */}
              {adminTab === "indicadores" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-link" /> Indicadores do Sistema
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-muted/60 p-3.5 border border-border">
                      <div className="flex items-center gap-2 text-link mb-1">
                        <Cpu className="h-4 w-4" />
                        <span className="text-xs font-bold">Fichas em Cache</span>
                      </div>
                      <div className="text-2xl font-extrabold text-foreground">
                        {loadingData ? "..." : fichasCount}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Produtos consultados</p>
                    </div>

                    <div className="rounded-2xl bg-muted/60 p-3.5 border border-border">
                      <div className="flex items-center gap-2 text-primary mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-bold">Consultas IA</span>
                      </div>
                      <div className="text-2xl font-extrabold text-foreground">
                        {loadingData ? "..." : aiUsageCount}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Análises realizadas</p>
                    </div>

                    <div className="rounded-2xl bg-muted/60 p-3.5 border border-border col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Modo de Operação:
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-success-foreground bg-success/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Busca Pura & Escaneamento
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        App focado em busca rápida, leitura de código de barras e IA sob demanda.
                      </p>
                    </div>
                  </div>

                  {/* Atalho para os Ajustes exclusivo para o dono */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setAdminTab("ajustes")}
                      className="w-full flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-3.5 text-xs font-bold text-primary hover:bg-primary/10 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Sliders className="h-4 w-4" /> Configurar modelos de links de afiliados
                      </span>
                      <span>Abrir Ajustes →</span>
                    </button>
                  )}
                </div>
              )}

              {/* ABA 2: AJUSTES DE AFILIADOS (EXCLUSIVO PARA O DONO) */}
              {adminTab === "ajustes" && isOwner && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Sliders className="h-4 w-4 text-primary" /> Ajustes de Afiliados
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Personalize os modelos de links para os botões &ldquo;Onde comprar&rdquo;.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveStores}
                      disabled={savingStores}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
                    >
                      {savingStores ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>Salvar Ajustes</span>
                    </button>
                  </div>

                  <div className="rounded-2xl bg-muted/40 p-3 text-[11px] text-muted-foreground border border-border flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Use{" "}
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono font-bold text-foreground">
                        {"{busca}"}
                      </code>{" "}
                      no local onde o nome e a marca do produto serão inseridos. Exemplo:{" "}
                      <code className="break-all font-mono text-primary">
                        https://www.amazon.com.br/s?k={"{"}busca{"}"}&amp;tag=SEUCODIGO
                      </code>
                    </span>
                  </div>

                  {loadingStores ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {stores.map((store) => (
                        <div
                          key={store.loja}
                          className={`rounded-2xl border p-4 transition ${
                            store.ativo
                              ? "bg-card border-border shadow-xs"
                              : "bg-muted/30 border-border/60 opacity-75"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-4 w-4 text-primary" />
                              <span className="font-bold text-sm text-foreground">
                                {store.loja}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  store.ativo
                                    ? "bg-success/20 text-success-foreground"
                                    : "bg-muted text-muted-foreground border border-border"
                                }`}
                              >
                                {store.ativo ? "Ativo" : "Desativado"}
                              </span>
                            </div>

                            {/* Opção ativar/desativar por loja */}
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <span className="text-xs font-semibold text-muted-foreground">
                                {store.ativo ? "Habilitado" : "Desabilitado"}
                              </span>
                              <input
                                type="checkbox"
                                checked={store.ativo}
                                onChange={(e) => handleStoreToggle(store.loja, e.target.checked)}
                                className="h-4 w-4 rounded accent-primary cursor-pointer"
                              />
                            </label>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Modelo do link (apenas https:// com a tag {"{busca}"})
                            </label>
                            <input
                              type="text"
                              value={store.modelo}
                              onChange={(e) => handleStoreModelChange(store.loja, e.target.value)}
                              placeholder={`https://...{busca}...`}
                              className="w-full rounded-xl border border-border bg-muted/60 px-3.5 py-2.5 text-xs font-mono text-foreground outline-none focus:border-primary transition"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/60">
                            {/* Botão Restaurar padrão */}
                            <button
                              type="button"
                              onClick={() => handleStoreReset(store.loja)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground py-1 transition cursor-pointer"
                            >
                              <RotateCcw className="h-3 w-3" /> Restaurar padrão
                            </button>

                            {/* Botão Testar link */}
                            <button
                              type="button"
                              onClick={() => handleTestLink(store)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:opacity-90 transition cursor-pointer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Testar link
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleSaveStores}
                          disabled={savingStores}
                          className={btnPrimary}
                        >
                          {savingStores ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          <span>Salvar Todos os Ajustes</span>
                        </button>
                      </div>
                    </div>
                  )}
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
