// Tela Escanear — Glow Lens
// 5 caminhos convergindo para a mesma ficha do produto (/ficha):
// 1. Texto digitado (na busca manual ou tela de busca)
// 2. Código de barras (Open Beauty Facts -> se não achar, IA com busca na web)
// 3. QR code (se link https, descobre produto da página com bloqueio SSRF e timeout; se texto, busca como texto)
// 4. Foto da galeria (reduzida a 1024px e enviada para IA existente)
// 5. Câmera do próprio app (botão "Tirar foto" com getUserMedia, captura snapshot, reduz a 1024px e envia para IA existente)
// Exibe "Buscando..." e, se nada for achado, sugere nova tentativa com dicas.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Search,
  AlertCircle,
  Loader2,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useServerFn } from "@tanstack/react-start";
import { identifyProduct, resolveBarcode, resolveProductFromUrl } from "@/lib/identify.functions";
import { getDeviceId } from "@/lib/device";

// Reduz a foto da galeria para no máximo `max` px no maior lado e devolve JPEG em base64.
async function resizeImage(file: File, max = 1024): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

// Captura o frame atual do vídeo da câmera do app com getUserMedia e reduz a no máximo 1024px
async function captureVideoFrame(max = 1024): Promise<string | null> {
  const container = document.getElementById("glowlens-scanner");
  const video = container?.querySelector("video") as HTMLVideoElement | null;
  if (!video || !video.videoWidth || !video.videoHeight) {
    return null;
  }
  const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export const Route = createFileRoute("/escanear")({
  head: () => ({
    meta: [
      { title: "Escanear Produto — Glow Lens" },
      {
        name: "description",
        content:
          "Escaneie o código de barras, QR code ou tire uma foto para abrir a ficha completa do produto.",
      },
      { property: "og:title", content: "Escanear Produto — Glow Lens" },
      {
        property: "og:description",
        content:
          "Descubra tudo sobre qualquer produto de beleza com leitura de código de barras, QR code ou foto.",
      },
    ],
  }),
  component: ScanPage,
});

type ViewState =
  | { type: "idle" }
  | { type: "scanning" }
  | { type: "loading"; title?: string; message: string }
  | {
      type: "not-found";
      code?: string;
      message: string;
      tips: string[];
    };

export function ScanPage() {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>({ type: "idle" });
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState("");

  const identifyFn = useServerFn(identifyProduct);
  const resolveBarcodeFn = useServerFn(resolveBarcode);
  const resolveUrlFn = useServerFn(resolveProductFromUrl);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Vibração de confirmação tátil ao ler código
  const triggerVibrate = useCallback(() => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(200);
      } catch {
        // ignora se o navegador não permitir
      }
    }
  }, []);

  // Parar a câmera
  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        if (
          typeof scannerRef.current.getState === "function" &&
          scannerRef.current.getState() === 2
        ) {
          await scannerRef.current.stop();
        }
        try {
          scannerRef.current.clear();
        } catch {
          // ignora
        }
      }
    } catch (err) {
      console.warn("Aviso ao parar a câmera:", err);
    } finally {
      setCameraActive(false);
      if (viewState.type === "scanning") {
        setViewState({ type: "idle" });
      }
    }
  }, [viewState.type]);

  // Iniciar a câmera
  const startCamera = useCallback(async () => {
    setPermissionDenied(false);
    setErrorMessage(null);
    setViewState({ type: "scanning" });
    setCameraActive(true);
  }, []);

  // CAMINHO 2: Código de Barras (Open Beauty Facts -> se não achar, IA com busca na web)
  const handleBarcodeLookup = useCallback(
    async (code: string) => {
      const cleanCode = code.trim();
      setViewState({
        type: "loading",
        title: "Buscando...",
        message: `Consultando código de barras ${cleanCode}...`,
      });

      try {
        const res = await resolveBarcodeFn({
          data: { code: cleanCode, deviceId: getDeviceId() },
        });

        if (res.status === "ok" && res.name) {
          // Redireciona imediatamente para a mesma ficha do produto!
          navigate({
            to: "/ficha",
            search: { nome: res.name },
          });
          return;
        }
      } catch (err) {
        console.warn("Erro ao resolver código de barras:", err);
      }

      // Se nada for achado: sugere nova tentativa com dicas
      setViewState({
        type: "not-found",
        code: cleanCode,
        message: `Não encontramos esse produto com o código de barras ${cleanCode}.`,
        tips: [
          "Verifique se todos os números do código de barras foram enquadrados",
          "Aproxime a câmera e garanta boa iluminação sem reflexos",
          "Produtos importados ou artesanais podem não estar nos bancos abertos",
          "Tente tirar uma foto do produto com a câmera ou buscar pelo nome",
        ],
      });
    },
    [navigate, resolveBarcodeFn],
  );

  // CAMINHO 3: QR Code (se link https, backend descobre o produto; se texto, busca como texto)
  const handleQrLookup = useCallback(
    async (text: string) => {
      const cleanText = text.trim();
      const isUrl = /^https?:\/\//i.test(cleanText);

      if (isUrl) {
        // Bloqueia links que não sejam estritamente HTTPS
        if (!cleanText.toLowerCase().startsWith("https://")) {
          setViewState({
            type: "not-found",
            code: cleanText,
            message: "Apenas links seguros (HTTPS) são aceitos para consulta.",
            tips: [
              "Verifique se o QR code aponta para uma página segura iniciando com https://",
              "Tente digitar o nome do produto na busca abaixo",
            ],
          });
          return;
        }

        setViewState({
          type: "loading",
          title: "Buscando...",
          message: "Consultando produto da página indicada no QR code...",
        });

        try {
          const res = await resolveUrlFn({
            data: { url: cleanText, deviceId: getDeviceId() },
          });

          if (res.status === "ok" && res.name) {
            navigate({
              to: "/ficha",
              search: { nome: res.name },
            });
            return;
          }

          setViewState({
            type: "not-found",
            code: cleanText,
            message:
              res.status === "error"
                ? res.message
                : "Não identificamos um produto de beleza na página deste link.",
            tips: [
              "Verifique se o link do QR code é de um produto de beleza ou cosmético",
              "Experimente tirar uma foto do produto com a câmera",
              "Ou digite o nome do produto no campo abaixo",
            ],
          });
        } catch {
          setViewState({
            type: "not-found",
            code: cleanText,
            message: "Não foi possível carregar as informações do link.",
            tips: [
              "Verifique sua conexão com a internet",
              "Tente pesquisar digitando o nome do produto",
            ],
          });
        }
      } else {
        // QR code é texto simples: busca direto na ficha!
        setViewState({
          type: "loading",
          title: "Buscando...",
          message: `Buscando produto "${cleanText}"...`,
        });
        navigate({
          to: "/ficha",
          search: { nome: cleanText },
        });
      }
    },
    [navigate, resolveUrlFn],
  );

  // Tratador de decodificação da câmera (código de barras ou QR code)
  const handleDecodedCode = useCallback(
    async (decodedText: string, formatName?: string) => {
      triggerVibrate();
      await stopCamera();

      const text = decodedText.trim();
      const isQr =
        formatName?.includes("QR") ||
        (!/^\d{6,14}$/.test(text) && !formatName?.includes("EAN") && !formatName?.includes("UPC"));

      if (isQr || /^https?:\/\//i.test(text)) {
        handleQrLookup(text);
      } else {
        handleBarcodeLookup(text);
      }
    },
    [triggerVibrate, stopCamera, handleBarcodeLookup, handleQrLookup],
  );

  // CAMINHO 4: Foto da galeria (reduz a 1024px e envia para IA existente)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await stopCamera();
    setViewState({
      type: "loading",
      title: "Buscando...",
      message: "Processando foto da galeria e identificando com inteligência artificial...",
    });

    try {
      // 1. Tenta verificar se a imagem contém código de barras ou QR code legível
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const tempScanner = new Html5Qrcode("glowlens-temp-scanner", { verbose: false });
        const decoded = await tempScanner.scanFile(file, false);
        if (decoded) {
          triggerVibrate();
          try {
            tempScanner.clear();
          } catch {
            // ignora
          }
          if (/^https?:\/\//i.test(decoded) || !/^\d{6,14}$/.test(decoded)) {
            handleQrLookup(decoded);
          } else {
            handleBarcodeLookup(decoded);
          }
          e.target.value = "";
          return;
        }
      } catch {
        // Sem código legível, prossegue normalmente para identificação visual por IA
      }

      // 2. Reduz para no máximo 1024px e envia para identifyProduct
      const imageBase64 = await resizeImage(file, 1024);
      const res = await identifyFn({
        data: { image: imageBase64, deviceId: getDeviceId() },
      });

      if (res.status === "ok") {
        const productName = res.off?.name || `${res.ai.brand || ""} ${res.ai.name}`.trim();
        navigate({
          to: "/ficha",
          search: { nome: productName },
        });
        return;
      }

      // Se não identificou com certeza
      setViewState({
        type: "not-found",
        message: "Não conseguimos identificar o produto na foto da galeria.",
        tips: [
          "Enquadre o rótulo principal de frente com o nome da marca visível",
          "Evite fotos borradas, muito escuras ou com reflexos fortes",
          "Aproxime a imagem para destacar o nome do cosmético",
          "Se preferir, digite o nome do produto no campo abaixo",
        ],
      });
    } catch {
      setViewState({
        type: "not-found",
        message: "Não foi possível enviar a foto no momento.",
        tips: [
          "Verifique sua conexão com a internet e tente novamente",
          "Ou busque digitando o nome do produto",
        ],
      });
    } finally {
      e.target.value = "";
    }
  };

  // CAMINHO 5: Câmera do próprio app (botão "Tirar foto" com getUserMedia, reduz a 1024px e envia para IA)
  const handleCaptureFromCamera = async () => {
    setViewState({
      type: "loading",
      title: "Buscando...",
      message: "Capturando frame da câmera e identificando com inteligência artificial...",
    });

    try {
      const imageBase64 = await captureVideoFrame(1024);
      await stopCamera();

      if (!imageBase64) {
        setViewState({
          type: "not-found",
          message: "Não foi possível capturar a imagem da câmera.",
          tips: [
            "Certifique-se de que a câmera está ativa e bem iluminada",
            "Toque em Tentar ligar a câmera novamente",
          ],
        });
        return;
      }

      const res = await identifyFn({
        data: { image: imageBase64, deviceId: getDeviceId() },
      });

      if (res.status === "ok") {
        const productName = res.off?.name || `${res.ai.brand || ""} ${res.ai.name}`.trim();
        navigate({
          to: "/ficha",
          search: { nome: productName },
        });
        return;
      }

      setViewState({
        type: "not-found",
        message: "Não foi possível identificar o produto na foto capturada.",
        tips: [
          "Aproxime mais a câmera do rótulo do frasco",
          "Mantenha o aparelho estável para a foto não ficar tremida",
          "Garanta boa luz ambiente sem reflexos no vidro ou plástico",
          "Ou tente escanear o código de barras ou buscar pelo nome",
        ],
      });
    } catch {
      setViewState({
        type: "not-found",
        message: "Erro ao processar a captura da câmera.",
        tips: ["Tente novamente em instantes", "Ou busque pelo nome do produto"],
      });
    }
  };

  // CAMINHO 1: Busca manual de texto
  const handleManualSearch = () => {
    if (manualQuery.trim()) {
      navigate({
        to: "/ficha",
        search: { nome: manualQuery.trim() },
      });
    }
  };

  const resetToIdle = () => {
    stopCamera();
    setPermissionDenied(false);
    setErrorMessage(null);
    setViewState({ type: "idle" });
  };

  // Ciclo de vida da câmera Html5Qrcode
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
              const edge = Math.max(220, Math.floor(minEdge * 0.85));
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
        const errStr = String(err).toLowerCase();
        if (
          errStr.includes("notallowederror") ||
          errStr.includes("permission denied") ||
          errStr.includes("permission")
        ) {
          setPermissionDenied(true);
        } else {
          setErrorMessage("Não foi possível acessar a câmera. Verifique as permissões.");
        }
        setCameraActive(false);
        setViewState({ type: "idle" });
      }
    }

    initScanner();

    return () => {
      isMounted = false;
      if (html5QrCode) {
        try {
          if (typeof html5QrCode.getState === "function" && html5QrCode.getState() === 2) {
            html5QrCode
              .stop()
              .then(() => html5QrCode?.clear())
              .catch(() => {});
          }
        } catch {
          // ignora
        }
      }
    };
  }, [cameraActive, handleDecodedCode]);

  const btnOptionClass =
    "flex flex-col items-center justify-center gap-2 rounded-3xl border border-border bg-card p-4 text-xs font-bold text-foreground shadow-card transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-primary/40 cursor-pointer";

  return (
    <>
      <PageHeader title="Escanear Produto" />

      {/* Input de arquivo oculto para envio da galeria */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      {/* Container temporário para escaneamento de arquivo */}
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
              Para escanear códigos de barras, QR codes e tirar fotos diretamente:
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
            <label className="text-xs font-semibold text-foreground block">
              Ou faça a busca digitando o nome do produto:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex.: Sérum Ácido Hialurônico..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                className="w-full rounded-full border-2 border-border bg-muted px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleManualSearch}
                className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-soft cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPermissionDenied(false);
              startCamera();
            }}
            className="w-full rounded-full bg-primary py-3.5 text-xs font-bold text-primary-foreground shadow-soft transition hover:opacity-90 cursor-pointer"
          >
            Tentar ligar a câmera novamente
          </button>
        </div>
      )}

      {/* Erro de câmera */}
      {errorMessage && !permissionDenied && (
        <div className="mb-5 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-center">
          <p className="text-xs text-destructive font-semibold">{errorMessage}</p>
          <button
            type="button"
            onClick={resetToIdle}
            className="mt-2 text-xs font-bold text-primary underline cursor-pointer"
          >
            Voltar
          </button>
        </div>
      )}

      {/* TELA DE BUSCANDO... (Estado de Carregamento) */}
      {viewState.type === "loading" && (
        <div className="grid aspect-[3/4] place-items-center rounded-3xl bg-card p-6 shadow-card text-center border border-border">
          <div className="space-y-4 max-w-xs">
            <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-9 w-9 animate-spin" />
            </div>
            <div>
              <p className="font-bold text-foreground text-xl">
                {viewState.title || "Buscando..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {viewState.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE CÂMERA ATIVA (Caminho 2, 3 e 5) */}
      {viewState.type === "scanning" && (
        <div className="space-y-3">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border-4 border-primary bg-black shadow-card">
            <div id="glowlens-scanner" className="h-full w-full" />

            {/* Mira com efeito de mira animada */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="relative h-64 w-64 rounded-2xl border-2 border-primary/60">
                <div className="absolute -left-1 -top-1 h-5 w-5 border-l-4 border-t-4 border-primary" />
                <div className="absolute -right-1 -top-1 h-5 w-5 border-r-4 border-t-4 border-primary" />
                <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-primary" />
                <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-primary" />
                <div className="absolute left-2 right-2 h-0.5 bg-primary shadow-soft animate-scanline" />
              </div>
              <p className="mt-4 rounded-full bg-black/70 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur text-center">
                Aponte para o código ou toque em Tirar foto abaixo
              </p>
            </div>

            {/* Botão de Fechar Câmera */}
            <button
              type="button"
              onClick={stopCamera}
              className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/70 px-3.5 py-1.5 text-xs font-bold text-white shadow-soft backdrop-blur transition hover:bg-black/90 active:scale-95 cursor-pointer"
              aria-label="Fechar câmera"
            >
              <X className="h-3.5 w-3.5 text-primary" />
              Fechar
            </button>
          </div>

          {/* CAMINHO 5: Botão "Tirar foto" com getUserMedia capturando o frame da câmera */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCaptureFromCamera}
              className="flex-1 flex items-center justify-center gap-2.5 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition hover:opacity-95 active:scale-95 cursor-pointer"
            >
              <Camera className="h-5 w-5" />
              <span>Tirar foto do produto</span>
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-full border border-border bg-card px-5 py-3.5 text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* TELA DE PRODUTO NÃO ENCONTRADO / SUGESTÃO DE NOVA TENTATIVA COM DICAS */}
      {viewState.type === "not-found" && (
        <div className="rounded-3xl bg-card p-6 shadow-card space-y-4 text-center border border-border">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground">Não achamos esse produto</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {viewState.message}
            </p>
          </div>

          {/* Card com Dicas Úteis */}
          <div className="rounded-2xl bg-secondary/50 p-4 text-left border border-border space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Lightbulb className="h-4 w-4" />
              <span>Dicas para uma nova tentativa:</span>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
              {viewState.tips.map((tip, idx) => (
                <li key={idx} className="leading-relaxed">
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Campo de Busca Manual por Texto */}
          <div className="space-y-2 pt-1 text-left">
            <label className="text-xs font-semibold text-foreground block">
              Tente buscar digitando o nome do produto:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex.: Protetor Solar Facial FPS 50..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                className="w-full rounded-full border-2 border-border bg-muted/60 px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleManualSearch}
                className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-soft cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Botões de Ação para Repetir */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={startCamera}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-xs font-bold text-primary-foreground shadow-soft transition hover:opacity-95 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" /> Tentar escanear novamente
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              <ImageUp className="h-4 w-4 text-primary" /> Enviar outra foto
            </button>
          </div>
        </div>
      )}

      {/* TELA INICIAL (IDLE) COM OS PRINCIPAIS CAMINHOS */}
      {viewState.type === "idle" && !permissionDenied && (
        <div className="space-y-4">
          {/* Card Principal da Câmera */}
          <div className="relative grid aspect-[3/4] place-items-center rounded-3xl border-3 border-dashed border-primary/40 bg-card p-6 text-center shadow-card">
            <div className="space-y-4 max-w-xs">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
                <Camera className="h-10 w-10" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">Leitor Inteligente</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Aponte para o código de barras, QR code ou tire uma foto para abrir a ficha
                  completa.
                </p>
              </div>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition hover:opacity-95 active:scale-95 cursor-pointer"
              >
                <Camera className="h-5 w-5" />
                <span>Abrir Câmera</span>
              </button>
            </div>
          </div>

          {/* Grade com os 3 botões de ação */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={startCamera}
              className={btnOptionClass}
              aria-label="Código de barras"
            >
              <Barcode className="h-6 w-6 text-primary" />
              <span>Código de barras</span>
            </button>

            <button
              type="button"
              onClick={startCamera}
              className={btnOptionClass}
              aria-label="QR code"
            >
              <QrCode className="h-6 w-6 text-primary" />
              <span>QR code</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={btnOptionClass}
              aria-label="Foto da galeria"
            >
              <ImageUp className="h-6 w-6 text-primary" />
              <span>Foto da galeria</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
