import React from "react";

interface BarraProgressoProps {
  progresso: number;
}

export const BarraProgresso: React.FC<BarraProgressoProps> = ({ progresso }) => (
  <div className="w-full bg-gray-200 rounded-full h-4">
    <div className="bg-green-600 h-4 rounded-full transition-all duration-500" style={{ width: `${progresso}%` }}></div>
  </div>
);
