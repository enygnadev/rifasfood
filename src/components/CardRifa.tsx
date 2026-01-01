import React from "react";

interface CardRifaProps {
  nome: string;
  progresso: number;
  tempoRestante: string;
  participantes: number;
  status: string;
  onClick: () => void;
}

export const CardRifa: React.FC<CardRifaProps> = ({ nome, progresso, tempoRestante, participantes, status, onClick }) => (
  <div className="bg-white rounded-lg shadow-md p-4 mb-4 cursor-pointer hover:shadow-lg transition" onClick={onClick}>
    <div className="flex justify-between items-center mb-2">
      <span className="font-bold text-lg">{nome}</span>
      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">{status}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progresso}%` }}></div>
    </div>
    <div className="flex justify-between text-xs text-gray-600">
      <span>Tempo: {tempoRestante}</span>
      <span>Participantes: {participantes}</span>
    </div>
  </div>
);
