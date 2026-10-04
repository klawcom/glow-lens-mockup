// Identificador anônimo do aparelho (usado no limite de consultas de IA).
export function getDeviceId(): string {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "anonymous-device";
  }
  try {
    let id = localStorage.getItem("glowlens-device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("glowlens-device", id);
    }
    return id;
  } catch {
    return "anonymous-device";
  }
}
