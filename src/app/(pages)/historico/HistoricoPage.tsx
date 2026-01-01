
// Mock de histórico (SSR/static)
const historico = [
  { nome: "🐔 Galinha Assada", vencedor: "Ana", data: "28/12", prova: "https://via.placeholder.com/40" },
  { nome: "🥩 Carne Assada", vencedor: "Bruno", data: "27/12", prova: "https://via.placeholder.com/40" },
  { nome: "🍱 Marmita Diária", vencedor: "Carlos", data: "26/12", prova: "https://via.placeholder.com/40" }
];

export default function HistoricoPage() {
  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Histórico de Rifas</h1>
      <ul>
        {historico.map((item, i) => (
          <li key={i} className="flex items-center mb-4 bg-white rounded shadow p-2">
            <img src={item.prova} alt="prova" className="w-10 h-10 rounded-full mr-3" />
            <div>
              <div className="font-semibold">{item.nome}</div>
              <div className="text-xs text-gray-500">Vencedor: {item.vencedor} — {item.data}</div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
