
import React, { Suspense } from 'react';
import SorteioClient from './SorteioClient';

export default function SorteioPage(){
  return (
    <main className="max-w-md mx-auto p-4 text-center">
      <h1 className="text-xl font-bold mb-4">Sorteio</h1>
      <Suspense fallback={<div className="p-6 bg-gray-50 rounded">Carregando...</div>}>
        <SorteioClient />
      </Suspense>
    </main>
  );
}
