// Lógica de números dinâmicos por progresso da rifa
export function calcularNumerosPorCompra(progresso: number): number {
  if (progresso < 20) return 1;
  if (progresso < 50) return 2;
  if (progresso < 80) return 4;
  if (progresso < 99) return 8;
  return 1; // Após 99%, trava compras
}

// Exemplo de cálculo de progresso (0-100%)
export function calcularProgresso(qtdVendida: number, meta: number): number {
  return Math.min(100, Math.round((qtdVendida / meta) * 100));
}
