"use client";
import React from 'react';

export type PaymentMethod = 'simulated' | 'pix' | 'stripe';

export default function PaymentSelector({ value, onChange, stripeAvailable }: { value: PaymentMethod, onChange: (v: PaymentMethod) => void, stripeAvailable?: boolean }){
  return (
    <div className="flex items-center gap-4 text-sm">
      <label className="flex items-center gap-2">
        <input type="radio" name="payment" checked={value==='simulated'} onChange={() => onChange('simulated')} />
        <span>Simulado (PIX rápido)</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name="payment" checked={value==='pix'} onChange={() => onChange('pix')} />
        <span>PIX</span>
      </label>
      <label className={`flex items-center gap-2 ${!stripeAvailable ? 'opacity-50' : ''}`}>
        <input type="radio" name="payment" checked={value==='stripe'} onChange={() => stripeAvailable && onChange('stripe')} disabled={!stripeAvailable} />
        <span>Cartão</span>
      </label>
    </div>
  );
}
