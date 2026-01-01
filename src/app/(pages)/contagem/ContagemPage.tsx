
import { Timer } from "@/components/Timer";

// Mock de participantes e tempo estático (SSR/static)
const participantes = [
  "Ana", "Bruno", "Carlos", "Duda", "Edu", "Fabi", "Gabi", "Hugo"
];
const tempo = 600; // 10 minutos fixo (exemplo)

export default function ContagemPage() {
  return (
    <main className="max-w-md mx-auto p-4 text-center">
      <h1 className="text-xl font-bold mb-2">Meta atingida!</h1>
      <div className="mb-4">Sorteio em <Timer tempo={tempo} /></div>
      <div className="bg-gray-100 rounded p-4 mb-4">
        <div className="font-semibold mb-2">Participantes</div>
        <div className="flex flex-wrap gap-2 justify-center animate-pulse">
          {participantes.map((nome, i) => (
            <span key={i} className="bg-white px-2 py-1 rounded shadow text-xs">{nome}</span>
          ))}
        </div>
      </div>
      <div className="text-red-600 font-bold text-lg">Compras bloqueadas</div>
    </main>
  );
}
