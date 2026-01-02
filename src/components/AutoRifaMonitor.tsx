"use client";
import { useEffect, useRef } from "react";

/**
 * Componente invisível que monitora e executa o ciclo do motor automático
 * Executa a cada 30 segundos quando o motor está ativo
 */
export default function AutoRifaMonitor() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    async function runCycle() {
      if (isRunningRef.current) return; // Evitar execuções simultâneas
      
      try {
        isRunningRef.current = true;
        const response = await fetch("/api/auto-rifa/cron", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.processed) {
            console.log("[AutoRifa Monitor]", result.message);
          }
        }
      } catch (error) {
        // Silently ignore errors to not spam console
      } finally {
        isRunningRef.current = false;
      }
    }

    // Executar imediatamente na montagem
    runCycle();

    // Configurar intervalo de 30 segundos
    intervalRef.current = setInterval(runCycle, 30 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Componente invisível
  return null;
}
