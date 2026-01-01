
import RifaPage from "./RifaPage";
import React, { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto p-4">Carregando...</main>}>
      <RifaPage />
    </Suspense>
  );
}
