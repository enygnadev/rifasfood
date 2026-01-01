import React from "react";

interface TimerProps {
  tempo: number; // segundos
}

export const Timer: React.FC<TimerProps> = ({ tempo }) => {
  const minutos = Math.floor(tempo / 60);
  const segundos = tempo % 60;
  return (
    <span className="font-mono text-lg text-red-600">
      {minutos}:{segundos.toString().padStart(2, "0")}
    </span>
  );
};
