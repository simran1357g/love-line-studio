// Stable anonymous client ID stored in localStorage.
export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("date_game_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("date_game_client_id", id);
  }
  return id;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}