import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const STAR_COUNT = 260;
const SHOOTING_STAR_INTERVAL_MS = 4200; // avg gap between shooting stars
const PARALLAX_SPEED = 0.06; // subtle vertical drift

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number; // radians / frame
  twinklePhase: number;
  /** Depth layer 0‑1, affects parallax speed and brightness */
  depth: number;
}

interface ShootingStar {
  x: number;
  y: number;
  len: number;
  speed: number;
  angle: number;
  opacity: number;
  life: number; // 0→1 progress
  hue: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createStar(width: number, height: number): Star {
  const depth = Math.random();
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    radius: rand(0.3, 1.6) * (0.4 + depth * 0.6),
    opacity: rand(0.25, 0.95),
    twinkleSpeed: rand(0.008, 0.035),
    twinklePhase: rand(0, Math.PI * 2),
    depth,
  };
}

function createShootingStar(width: number, height: number): ShootingStar {
  const angle = rand(0.55, 0.85); // roughly top-right → bottom-left
  return {
    x: rand(width * 0.15, width),
    y: rand(0, height * 0.45),
    len: rand(60, 160),
    speed: rand(12, 22),
    angle,
    opacity: 1,
    life: 0,
    hue: Math.random() > 0.5 ? 165 : 200, // teal or cyan accent
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let shootingStars: ShootingStar[] = [];
    let lastShootTime = 0;
    let mouseX = 0.5; // normalized 0–1
    let mouseY = 0.5;

    /* ---------- resize ---------- */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // (re)populate stars
      stars = Array.from({ length: STAR_COUNT }, () =>
        createStar(width, height),
      );
    };

    /* ---------- pointer (subtle parallax) ---------- */
    const onPointer = (e: PointerEvent) => {
      mouseX = e.clientX / width;
      mouseY = e.clientY / height;
    };

    /* ---------- draw loop ---------- */
    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      /* -- ambient nebula glow -- */
      const nebula = ctx.createRadialGradient(
        width * 0.2,
        height * 0.15,
        0,
        width * 0.2,
        height * 0.15,
        width * 0.55,
      );
      nebula.addColorStop(0, "rgba(68,181,161,0.045)");
      nebula.addColorStop(0.5, "rgba(33,95,85,0.018)");
      nebula.addColorStop(1, "transparent");
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, width, height);

      /* -- stars -- */
      for (const s of stars) {
        s.twinklePhase += s.twinkleSpeed;
        const flicker =
          0.45 + 0.55 * ((Math.sin(s.twinklePhase) + 1) / 2);
        const alpha = s.opacity * flicker;

        // subtle parallax offset based on mouse & depth
        const px = (mouseX - 0.5) * 18 * s.depth;
        const py = (mouseY - 0.5) * 12 * s.depth;

        // gentle upward drift
        s.y -= PARALLAX_SPEED * (0.3 + s.depth * 0.7);
        if (s.y < -4) {
          s.y = height + 4;
          s.x = Math.random() * width;
        }

        const sx = s.x + px;
        const sy = s.y + py;

        /* glow layer */
        if (s.radius > 0.8) {
          ctx.beginPath();
          ctx.arc(sx, sy, s.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,240,230,${alpha * 0.08})`;
          ctx.fill();
        }

        /* core */
        ctx.beginPath();
        ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,255,250,${alpha})`;
        ctx.fill();
      }

      /* -- shooting stars -- */
      if (now - lastShootTime > SHOOTING_STAR_INTERVAL_MS) {
        shootingStars.push(createShootingStar(width, height));
        lastShootTime = now;
      }

      shootingStars = shootingStars.filter((ss) => ss.life < 1);

      for (const ss of shootingStars) {
        ss.life += 0.018;
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.opacity = 1 - ss.life;

        const tailX = ss.x - Math.cos(ss.angle) * ss.len;
        const tailY = ss.y - Math.sin(ss.angle) * ss.len;

        const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, `hsla(${ss.hue},80%,80%,0)`);
        grad.addColorStop(0.6, `hsla(${ss.hue},80%,82%,${ss.opacity * 0.5})`);
        grad.addColorStop(1, `hsla(${ss.hue},90%,92%,${ss.opacity})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ss.x, ss.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.stroke();

        /* bright head */
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${ss.hue},90%,95%,${ss.opacity})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    /* ---------- bootstrap ---------- */
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer);
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
