import { useEffect, useRef } from "react";

const COLORS = ["#3fb950", "#58a6ff", "#f0883e", "#a371f7", "#ffa657", "#56d364", "#ff7b72", "#d2a8ff"];
const PARTICLE_COUNT = 120;
const GRAVITY = 0.003;
const DRAG = 0.98;
const DURATION = 3500;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function createParticle(canvasW, canvasH) {
  const angle = randomBetween(0, Math.PI * 2);
  const speed = randomBetween(0.02, 0.06);
  return {
    x: canvasW / 2 + randomBetween(-canvasW * 0.2, canvasW * 0.2),
    y: canvasH * 0.35,
    vx: Math.cos(angle) * speed * canvasW,
    vy: Math.sin(angle) * speed * canvasH - randomBetween(0.01, 0.03) * canvasH,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: randomBetween(4, 8),
    rotation: randomBetween(0, 360),
    rotationSpeed: randomBetween(-6, 6),
    opacity: 1,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  };
}

export default function Confetti({ active, onDone }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas.width, canvas.height)
    );

    const start = performance.now();
    let rafId;

    const animate = (now) => {
      const elapsed = now - start;
      if (elapsed > DURATION) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (onDone) onDone();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fadeStart = DURATION * 0.6;
      const globalFade = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / (DURATION - fadeStart) : 1;

      for (const p of particles) {
        p.vy += GRAVITY * canvas.height;
        p.vx *= DRAG;
        p.vy *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity = globalFade;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [active, onDone]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="confetti-canvas"
    />
  );
}
