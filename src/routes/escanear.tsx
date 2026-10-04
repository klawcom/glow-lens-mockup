// Tela 3 — Escanear produtos via código de barras, QR code ou foto
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Html5Qrcode, Html5QrcodeResult } from "html5-qrcode";
import {
  Camera,
  CameraOff,
  Barcode,
  QrCode,
  ImageUp,
  X,
  Sparkles,
  ExternalLink,
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useServerFn } from "@tanstack/react-start";
import { identifyProduct } from "@/lib/identify.functions";
import { getDeviceId } from "@/lib/device";

// Reduz a foto para no máximo `max` px no maior lado e devolve JPEG em base64.
async function resizeImage(file: File, max: number): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export const Route = createFileRoute("/escanear")({
  head: () => ({
    meta: [
      { title: "Escanear produto — Glow Lens" },
      {
        name: "description",
        content: "Escaneie o código de barras, QR code ou envie uma foto do produto.",
      },
      { property: "og:title", content: "Escanear produto — Glow Lens" },
      {
        property: "og:description",
        content: "Escaneie um produto de beleza para ver a ficha completa.",
      },
    ],
  }),
  component: ScanPage,
});

type ScannedProduct = {
  code: string;
  name: string;
  brand: string;
  image: string;
  ingredients: string;
  categories?: string;
  url?: string;
};

type ViewState =
  | { type: "idle" }
  | { type: "scanning" }
  | { type: "loading"; message: string }
  | { type: "product"; product: ScannedProduct }
  | { type: "not-found"; code: string }
  | { type: "qr-link"; url: string }
  | { type: "qr-text"; text: string }
  | { type: "photo"; previewUrl: string; scannedInfo?: string };

export function ScanPage() {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>({ type: "idle" });
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [aiStatus, setAiStatus] = useState<
    | { type: "analyzing" }
    | { type: "retake"; guess?: string | undefined }
    | { type: "error"; message: string }
  >({ type: "analyzing" });
  const identify = useServerFn(identifyProduct);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Vibração de confirmação (200ms)
  const triggerVibrate = useCallback(() => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(200);
      } catch (e) {
        void e;
      }
    }
  }, []);

  // Parar a câmera
  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        // Html5QrcodeScannerState: SCANNING = 2
        if (
          typeof scannerRef.current.getState === "function" &&
          scannerRef.current.getState() === 2
        ) {
          await scannerRef.current.stop();
        }
        try {
          scannerRef.current.clear();
        } catch (e) {
          void e;
        }
      }
    } catch (err) {
      console.warn("Erro ao parar a câmera:", err);
    } finally {
      setCameraActive(false);
      if (viewState.type === "scanning") {
        setViewState({ type: "idle" });
      }
    }
  }, [viewState.type]);

  // Consulta à API Open Beauty Facts
  const lookupBarcode = useCallback(async (code: string) => {
    setViewState({ type: "loading", message: "Buscando informações no Open Beauty Facts..." });
    try {
      const cleanCode = code.trim();
      const res = await fetch(
        `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
      );
      if (!res.ok) {
        setViewState({ type: "not-found", code: cleanCode });
        return;
      }
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name =
          p.product_name_pt ||
          p.product_name ||
          p.product_name_en ||
          p.generic_name ||
          "Produto sem nome cadastrado";
        const brand = p.brands || p.brand_owner || "Marca não informada";
        const image = p.image_front_url || p.image_url || p.image_front_small_url || "";
        const ingredients =
          p.ingredients_text_pt ||
          p.ingredients_text ||
          p.ingredients_text_en ||
          "Ingredientes não listados no banco de dados.";

        setViewState({
          type: "product",
          product: {
            code: cleanCode,
            name,
            brand,
            image,
            ingredients,
            categories: p.categories || "",
            url: `https://world.openbeautyfacts.org/product/${cleanCode}`,
          },
        });
      } else {
        setViewState({ type: "not-found", code: cleanCode });
      }
    } catch (err) {
      console.error("Erro ao buscar produto por código de barras:", err);
      setViewState({ type: "not-found", code });
    }
  }, []);

  // Processamento do texto escaneado
  const handleDecodedCode = useCallback(
    async (decodedText: string, formatName?: string) => {
      triggerVibrate();
      await stopCamera();

      const text = decodedText.trim();
      const isQr =
        formatName?.includes("QR") ||
        (!/^\d{6,14}$/.test(text) && !formatName?.includes("EAN") && !formatName?.includes("UPC"));
      const isUrl = /^https?:\/\//i.test(text);

      if (isUrl) {
        setViewState({ type: "qr-link", url: text });
      } else if (isQr && !/^\d{6,14}$/.test(text)) {
        setViewState({ type: "qr-text", text });
      } else {
        // Código de barras (EAN-13, EAN-8, UPC ou numérico)
        lookupBarcode(text);
      }
    },
    [triggerVibrate, stopCamera, lookupBarcode],
  );

  // Iniciar a câmera somente após interação explícita do usuário
  const startCamera = useCallback(async () => {
    setPermissionDenied(false);
    setErrorMessage(null);
    setViewState({ type: "scanning" });
    setCameraActive(true);
  }, []);

  // Efeito para ciclo de vida do Html5Qrcode
  useEffect(() => {
    if (!cameraActive) return;

    let isMounted = true;
    let html5QrCode: Html5Qrcode | null = null;

    async function initScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (!isMounted) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ];

        html5QrCode = new Html5Qrcode("glowlens-scanner", {
          formatsToSupport,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edge = Math.max(200, Math.floor(minEdge * 0.8));
              return { width: edge, height: edge };
            },
            aspectRatio: 1.0,
          },
          (decodedText: string, result: Html5QrcodeResult) => {
            if (!isMounted) return;
            const formatName = result?.result?.format?.formatName || "";
            handleDecodedCode(decodedText, formatName);
          },
          () => {
            // Ignora frames sem detecção
          },
        );
      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn("Falha ao abrir a câmera:", err);
        setCameraActive(false);
        setViewState({ type: "idle" });

        const errObj = err as { name?: string; message?: string } | undefined;
        const errStr = String(errObj?.message || err || "").toLowerCase();
        if (
          errObj?.name === "NotAllowedError" ||
          errStr.includes("permission") ||
          errStr.includes("notallowed") ||
          errStr.includes("denied")
        ) {
          setPermissionDenied(true);
        } else {
          setErrorMessage(
            "Não foi possível acessar a câmera. Verifique se há uma câmera disponível no dispositivo.",
          );
        }
      }
    }

    // Pequeno timeout para garantir renderização do container no DOM
    const timer = setTimeout(() => {
      initScanner();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCode) {
        try {
          if (typeof html5QrCode.getState === "function" && html5QrCode.getState() === 2) {
            html5QrCode
              .stop()
              .catch(() => {})
              .finally(() => {
                try {
                  html5QrCode?.clear();
                } catch (e) {
                  void e;
                }
              });
          }
        } catch (e) {
          void e;
        }
      }
    };
  }, [cameraActive, handleDecodedCode]);

  const runAi = async (file: File) => {
    setAiStatus({ type: "analyzing" });
    try {
      const image = await resizeImage(file, 1024);
      const res = await identify({ data: { image, deviceId: getDeviceId() } });
      if (res.status === "ok") {
        sessionStorage.setItem("glowlens-ai-result", JSON.stringify(res));
        navigate({ to: "/identificado" });
      } else if (res.status === "retake") {
        setAiStatus({
          type: "retake",
          guess: res.ai?.name
            ? `${res.ai.name}${res.ai.brand ? ` (${res.ai.brand})` : ""}`
            : undefined,
        });
      } else {
        setAiStatus({ type: "error", message: res.message });
      }
    } catch {
      setAiStatus({ type: "error", message: "Sem conexão ou erro no envio. Tente de novo." });
    }
  };

  // Enviar / Tirar foto do produto
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await stopCamera();
    const previewUrl = URL.createObjectURL(file);
    setAiStatus({ type: "analyzing" });
    setViewState({ type: "photo", previewUrl });

    // TODO: identificação por IA
    // Tento também escanear se a imagem contém código de barras ou QR code
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const tempScanner = new Html5Qrcode("glowlens-temp-scanner", { verbose: false });
      const decoded = await tempScanner.scanFile(file, false);
      if (decoded) {
        triggerVibrate();
        setViewState({
          type: "photo",
          previewUrl,
          scannedInfo: `Código detectado na foto: ${decoded}`,
        });
        // Após mostrar a prévia por breve momento, consulta o código
        setTimeout(() => {
          handleDecodedCode(decoded);
        }, 1200);
      }
      try {
        tempScanner.clear();
      } catch (err) {
        void err;
      }
    } catch (err) {
      void err;
      // Sem código na foto: identificação por IA
      await runAi(file);
    }
    e.target.value = "";
  };

  const handleManualSearch = () => {
    if (manualQuery.trim()) {
      navigate({ to: "/buscar", search: { q: manualQuery.trim() } });
    }
  };

  const resetToIdle = () => {
    stopCamera();
    setPermissionDenied(false);
    setErrorMessage(null);
    setViewState({ type: "idle" });
  };

  const btnClass =
    "flex flex-col items-center justify-center gap-2 rounded-2xl bg-card p-4 text-sm font-semibold text-accent-foreground shadow-card transition-all hover:scale-[1.02] active:scale-[0.98] border border-transparent hover:border-primary/20";

  return (
    <>
      <PageHeader title="Escanear" />

      {/* Input de arquivo oculto para envio de foto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      {/* Container invisível temporário para scanFile */}
      <div id="glowlens-temp-scanner" className="hidden" />

      {/* Se permissão de câmera foi negada */}
      {permissionDenied && (
        <div className="mb-5 rounded-3xl border-2 border-destructive/20 bg-card p-6 shadow-card text-center space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
            <CameraOff className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Permissão da Câmera Negada</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-left">
              Para escanear códigos de barras e QR codes diretamente com o celular:
            </p>
            <ul className="mt-2 text-xs text-muted-foreground space-y-1.5 text-left list-disc list-inside rounded-2xl bg-muted p-4">
              <li>
                Toque no ícone de <b>cadeado ou permissões</b> na barra do navegador;
              </li>
              <li>
                Ative a permissão de <b>Câmera</b>;
              </li>
              <li>Toque no botão abaixo para tentar novamente.</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 text-left">
            <label className="text-sm font-semibold text-accent-foreground block">
              Ou faça a busca manual de produtos:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome da marca ou produto..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                className="w-full rounded-full border-2 border-border bg-muted px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={handleManualSearch}
                className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft"
              >
                Buscar
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setPermissionDenied(false);
              startCamera();
            }}
            className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition hover:opacity-90"
          >
            Tentar ligar a câmera novamente
          </button>
        </div>
      )}

      {/* Erro genérico de câmera */}
      {errorMessage && !permissionDenied && (
        <div className="mb-5 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-center">
          <p className="text-sm text-destructive font-semibold">{errorMessage}</p>
          <button onClick={resetToIdle} className="mt-2 text-xs font-bold text-primary underline">
            Voltar
          </button>
        </div>
      )}

      {/* Tela de Loading */}
      {viewState.type === "loading" && (
        <div className="grid aspect-[3/4] place-items-center rounded-3xl bg-card p-6 shadow-card text-center">
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="font-semibold text-foreground text-lg">Buscando produto...</p>
            <p className="text-sm text-muted-foreground">{viewState.message}</p>
          </div>
        </div>
      )}

      {/* Tela de Câmera Ativa */}
      {viewState.type === "scanning" && (
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border-4 border-primary bg-black shadow-card">
          <div id="glowlens-scanner" className="h-full w-full" />

          {/* Mira e efeito de linha laser animada */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
            <div className="relative h-64 w-64 rounded-2xl border-2 border-primary/60">
              <div className="absolute -left-1 -top-1 h-5 w-5 border-l-4 border-t-4 border-primary" />
              <div className="absolute -right-1 -top-1 h-5 w-5 border-r-4 border-t-4 border-primary" />
              <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-primary" />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-primary" />
              <div className="absolute left-2 right-2 h-0.5 bg-primary shadow-soft animate-scanline" />
            </div>
            <p className="mt-4 rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
              Aponte para o código de barras ou QR code
            </p>
          </div>

          {/* Botão de Fechar Câmera */}
          <button
            onClick={stopCamera}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/70 px-4 py-2 text-xs font-bold text-white shadow-soft backdrop-blur transition hover:bg-black/90 active:scale-95"
            aria-label="Fechar câmera"
          >
            <X className="h-4 w-4 text-primary" />
            Fechar câmera
          </button>
        </div>
      )}

      {/* Tela Inicial (Idle) */}
      {viewState.type === "idle" && !permissionDenied && (
        <div className="relative grid aspect-[3/4] place-items-center rounded-3xl border-4 border-dashed border-primary bg-muted p-6 text-center">
          <div className="space-y-4">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
              <Camera className="h-10 w-10" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">Área da câmera</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aponte para o produto ou toque no botão para iniciar
              </p>
            </div>
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-soft transition hover:opacity-90 active:scale-95"
            >
              <Camera className="h-5 w-5" />
              Escanear
            </button>
          </div>
        </div>
      )}

      {/* Ficha do Produto encontrado via Código de Barras (Open Beauty Facts) */}
      {viewState.type === "product" && (
        <div className="space-y-4 pt-1">
          <div className="rounded-3xl bg-card p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Cosmético encontrado
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                EAN: {viewState.product.code}
              </span>
            </div>

            {viewState.product.image ? (
              <img
                src={viewState.product.image}
                alt={viewState.product.name}
                className="aspect-square w-full rounded-2xl object-cover shadow-soft bg-muted"
              />
            ) : (
              <div className="grid aspect-square w-full place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Sparkles className="h-12 w-12 text-primary/40" />
                <p className="text-sm font-semibold">Sem foto cadastrada</p>
              </div>
            )}

            <div>
              <p className="text-sm font-bold text-link">{viewState.product.brand}</p>
              <h2 className="text-2xl font-bold text-foreground">{viewState.product.name}</h2>
            </div>

            {/* Ingredientes */}
            <section className="rounded-2xl bg-muted/60 p-4 space-y-2 border border-border/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Ingredientes declarados
              </h3>
              <p className="text-xs text-foreground/90 leading-relaxed max-h-48 overflow-y-auto pr-1 whitespace-pre-line">
                {viewState.product.ingredients}
              </p>
            </section>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                to="/buscar"
                search={{ q: viewState.product.name }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition hover:opacity-90"
              >
                <Search className="h-4 w-4" />
                Buscar no app
              </Link>

              {viewState.product.url && (
                <a
                  href={viewState.product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-border py-2.5 text-xs font-semibold text-accent-foreground hover:bg-muted"
                >
                  Ver no Open Beauty Facts
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              <button
                onClick={resetToIdle}
                className="mt-1 rounded-full border-2 border-border py-3 text-sm font-semibold text-accent-foreground hover:bg-muted"
              >
                Escanear outro produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Produto Não Encontrado */}
      {viewState.type === "not-found" && (
        <div className="rounded-3xl bg-card p-6 shadow-card space-y-4 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Não achamos esse produto</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O código de barras{" "}
              <span className="font-mono font-semibold text-foreground">{viewState.code}</span>{" "}
              ainda não está catalogado na base de cosméticos.
            </p>
          </div>

          <div className="space-y-2 pt-2 text-left">
            <label className="text-sm font-semibold text-accent-foreground block">
              Buscar produto por nome:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex.: Batom, Sérum facial..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                className="w-full rounded-full border-2 border-border bg-muted px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={handleManualSearch}
                className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft"
              >
                Buscar
              </button>
            </div>
          </div>

          <button
            onClick={resetToIdle}
            className="w-full rounded-full border-2 border-border py-3 text-sm font-semibold text-accent-foreground hover:bg-muted"
          >
            Tentar escanear novamente
          </button>
        </div>
      )}

      {/* QR Code com Link */}
      {viewState.type === "qr-link" && (
        <div className="rounded-3xl bg-card p-6 shadow-card text-center space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <QrCode className="h-8 w-8" />
          </div>
          <div>
            <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground mb-2">
              Link detectado
            </span>
            <h2 className="text-xl font-bold text-foreground">QR Code Escaneado</h2>
            <p className="mt-2 break-all rounded-2xl bg-muted p-3 text-xs font-mono text-muted-foreground">
              {viewState.url}
            </p>
          </div>

          <a
            href={viewState.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition hover:opacity-90"
          >
            Abrir link
            <ExternalLink className="h-4 w-4" />
          </a>

          <button
            onClick={resetToIdle}
            className="w-full rounded-full border-2 border-border py-3 text-sm font-semibold text-accent-foreground hover:bg-muted"
          >
            Escanear outro código
          </button>
        </div>
      )}

      {/* QR Code com Texto */}
      {viewState.type === "qr-text" && (
        <div className="rounded-3xl bg-card p-6 shadow-card text-center space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <QrCode className="h-8 w-8" />
          </div>
          <div>
            <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground mb-2">
              Texto detectado
            </span>
            <h2 className="text-xl font-bold text-foreground">QR Code Escaneado</h2>
            <p className="mt-2 rounded-2xl bg-muted p-4 text-sm text-foreground font-medium">
              "{viewState.text}"
            </p>
          </div>

          <Link
            to="/buscar"
            search={{ q: viewState.text }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition hover:opacity-90"
          >
            <Search className="h-4 w-4" />
            Buscar no Glow Lens
          </Link>

          <button
            onClick={resetToIdle}
            className="w-full rounded-full border-2 border-border py-3 text-sm font-semibold text-accent-foreground hover:bg-muted"
          >
            Escanear outro código
          </button>
        </div>
      )}

      {/* Prévia da Foto enviada */}
      {viewState.type === "photo" && (
        <div className="rounded-3xl bg-card p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Foto Carregada
            </span>
            <button
              onClick={resetToIdle}
              className="text-xs font-bold text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>

          <img
            src={viewState.previewUrl}
            alt="Prévia da foto enviada"
            className="aspect-square w-full rounded-2xl object-cover shadow-soft bg-muted"
          />

          {viewState.scannedInfo ? (
            <div className="rounded-2xl bg-success/20 p-3 text-xs font-semibold text-success-foreground text-center">
              {viewState.scannedInfo}
            </div>
          ) : (
            <div className="rounded-2xl bg-muted p-4 text-center space-y-2" aria-live="polite">
              {aiStatus.type === "analyzing" && (
                <p className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Identificando o produto
                  com IA...
                </p>
              )}
              {aiStatus.type === "retake" && (
                <>
                  <p className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
                    <AlertCircle className="h-4 w-4 text-primary" /> Não deu para identificar com
                    certeza
                  </p>
                  {aiStatus.guess && (
                    <p className="text-xs text-muted-foreground">Palpite: {aiStatus.guess}</p>
                  )}
                  <ul className="text-xs text-muted-foreground text-left list-disc pl-5">
                    <li>Use boa luz, sem reflexo</li>
                    <li>Deixe o rótulo de frente e inteiro na foto</li>
                    <li>Segure firme para a foto não ficar borrada</li>
                  </ul>
                </>
              )}
              {aiStatus.type === "error" && (
                <p className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
                  <AlertCircle className="h-4 w-4 text-primary" /> {aiStatus.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 pt-1 text-left">
            <label className="text-xs font-semibold text-accent-foreground block">
              Deseja buscar o produto agora pelo nome?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome do produto na foto..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                className="w-full rounded-full border-2 border-border bg-muted px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={handleManualSearch}
                className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft"
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-full border-2 border-border py-3 text-xs font-bold text-accent-foreground hover:bg-muted"
            >
              Tirar outra foto
            </button>
            <button
              onClick={resetToIdle}
              className="flex-1 rounded-full bg-primary py-3 text-xs font-bold text-primary-foreground shadow-soft"
            >
              Voltar ao leitor
            </button>
          </div>
        </div>
      )}

      {/* Botões de Ação Inferiores (Código de barras / QR code / Enviar foto) */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <button onClick={startCamera} className={btnClass} aria-label="Escanear Código de barras">
          <Barcode className="h-7 w-7 text-primary" />
          <span>Código de barras</span>
        </button>

        <button onClick={startCamera} className={btnClass} aria-label="Escanear QR code">
          <QrCode className="h-7 w-7 text-primary" />
          <span>QR code</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className={btnClass}
          aria-label="Enviar foto"
        >
          <ImageUp className="h-7 w-7 text-primary" />
          <span>Enviar foto</span>
        </button>
      </div>
    </>
  );
}
