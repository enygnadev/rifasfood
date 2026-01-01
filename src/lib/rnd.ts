import crypto from "crypto";

/**
 * Escolhe um número vencedor entre 1..totalNumbers usando uma seed auditable.
 * seed: string (ex: rifaId + timerExpiresAt + timestamp)
 */
export function chooseWinningNumber(seed: string, totalNumbers: number): number {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  // Use os primeiros 15 hex chars para gerar um inteiro
  const slice = hash.slice(0, 15);
  const num = parseInt(slice, 16);
  return (num % totalNumbers) + 1;
}
