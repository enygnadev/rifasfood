"use client";
import React, { useEffect, useRef } from 'react';

export default function Confetti({ trigger }: { trigger: boolean }){
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trigger) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;
    const w = canvas.width = window.innerWidth;
    const h = canvas.height = window.innerHeight;

    const colors = ['#f97316','#fb923c','#f59e0b','#34d399','#60a5fa','#a78bfa'];
    const pieces: any[] = [];
    for (let i=0;i<120;i++) {
      pieces.push({
        x: Math.random()*w,
        y: Math.random()*-h,
        dx: (Math.random()-0.5)*6,
        dy: Math.random()*6+2,
        size: Math.random()*8+4,
        color: colors[Math.floor(Math.random()*colors.length)],
        rot: Math.random()*360
      });
    }

    let raf = 0;
    function draw(){
      ctx.clearRect(0,0,w,h);
      pieces.forEach(p => {
        p.x += p.dx; p.y += p.dy; p.rot += 6;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    const timeout = setTimeout(()=>{ cancelAnimationFrame(raf); ctx.clearRect(0,0,w,h); }, 5000);
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout); };
  }, [trigger]);

  return <canvas ref={ref} id="confetti-canvas" className="fixed inset-0 pointer-events-none z-50" aria-hidden={!trigger} />;
}
