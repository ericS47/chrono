// Mini-fenêtre (image dans l'image), comme une vidéo YouTube : le chrono reste affiché
// en petit par-dessus les autres apps, et la séance continue (temps et sons).
//
// Le navigateur ne sait mettre en mini-fenêtre qu'une vidéo : on dessine le chrono dans
// un canevas, filmé en direct par une vidéo invisible, que l'on passe en mini-fenêtre.

import * as S from '../engine/session';
import { pipView } from './pipView';
import { setPip } from './platform';

const W = 480;
const H = 300;
const INK = '#14183A';

let canvas: HTMLCanvasElement | null = null;
let video: HTMLVideoElement | null = null;
let timer: number | null = null;

export function pipSupported(): boolean {
  try {
    return typeof document !== 'undefined' && !!document.pictureInPictureEnabled
      && typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
  } catch {
    return false;
  }
}

export const pipOpen = () => !!video && document.pictureInPictureElement === video;

function draw(): void {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const v = pipView(S.getSession(), S.clock());
  ctx.fillStyle = v.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const font = (w: number, px: number) => `${w} ${px}px Manrope, system-ui, sans-serif`;
  ctx.font = font(800, 34);
  ctx.fillText(v.word, W / 2, 56);
  ctx.font = font(800, v.time.length > 5 ? 96 : 128);
  ctx.fillText(v.time, W / 2, 182);
  ctx.font = font(700, 26);
  const sub = v.sub.length > 30 ? `${v.sub.slice(0, 29)}…` : v.sub;
  ctx.fillText(sub, W / 2, 232);
  if (v.count) {
    ctx.textAlign = 'left';
    ctx.font = font(800, 22);
    ctx.fillText(v.count, 18, 34);
  }
  if (v.progress !== null) {
    ctx.fillStyle = 'rgba(20,24,58,0.15)';
    ctx.fillRect(24, 266, W - 48, 10);
    ctx.fillStyle = INK;
    ctx.fillRect(24, 266, (W - 48) * Math.min(1, Math.max(0, v.progress)), 10);
  }
}

function cleanup(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  (video?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
  video?.remove();
  video = null;
  canvas = null;
  setPip(false);
  S.refreshMedia();
}

/** Ouvre la mini-fenêtre (ou la ferme si elle est ouverte). À appeler sur un appui. */
export async function togglePip(): Promise<boolean> {
  if (!pipSupported()) return false;
  if (pipOpen()) {
    await document.exitPictureInPicture().catch(() => undefined);
    return false;
  }
  try {
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    draw();
    video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', left: '0', top: '0' });
    video.srcObject = canvas.captureStream(10);
    document.body.appendChild(video);
    // Le temps est redessiné 4 fois par seconde, même app en arrière-plan.
    timer = window.setInterval(draw, 250);
    await video.play();
    video.addEventListener('leavepictureinpicture', cleanup, { once: true });
    await video.requestPictureInPicture();
    setPip(true);
    // Boutons pause / suivant de la mini-fenêtre.
    S.refreshMedia();
    return true;
  } catch {
    cleanup();
    return false;
  }
}

/** Ferme la mini-fenêtre (fin ou abandon de la séance). */
export function closePip(): void {
  if (pipOpen()) void document.exitPictureInPicture().catch(() => undefined);
  else if (video) cleanup();
}
