// Identificador anônimo do aparelho (usado no limite de consultas de IA).
export function getDeviceId() {
  let id = localStorage.getItem("glowlens-device");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("glowlens-device", id);
  }
  return id;
}
