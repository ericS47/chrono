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

/** Démonte la vidéo du chrono (fin ou abandon de la séance). */
function teardown(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  (video?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
  video?.remove();
  video = null;
  canvas = null;
  setPip(false);
  S.refreshMedia();
}

/** Mini-fenêtre refermée : la vidéo reste prête pour la prochaine sortie de l'app. */
function onLeave(): void {
  setPip(false);
  S.refreshMedia();
}

/**
 * Prépare la vidéo du chrono (invisible, sans son) et la lance. Une vidéo déjà en lecture
 * peut passer en mini-fenêtre sans attendre, y compris quand Chrome l'ouvre seul en quittant l'app.
 */
async function ensureVideo(): Promise<HTMLVideoElement> {
  if (!video) {
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    draw();
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('aria-hidden', 'true');
    v.dataset.pip = 'chrono';
    Object.assign(v.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', left: '0', top: '0' });
    v.srcObject = canvas.captureStream(10);
    v.addEventListener('leavepictureinpicture', onLeave);
    document.body.appendChild(v);
    video = v;
    // Le temps est redessiné 4 fois par seconde, même app en arrière-plan.
    timer = window.setInterval(draw, 250);
  }
  if (video.paused) await video.play();
  return video;
}

/** Séance lancée : la mini-fenêtre est préparée, prête à s'ouvrir en quittant l'app. */
export function armPip(): void {
  if (!pipSupported()) return;
  void ensureVideo().catch(() => undefined);
}

/** Ouvre la mini-fenêtre. */
export async function openPip(): Promise<boolean> {
  if (!pipSupported()) return false;
  if (pipOpen()) return true;
  try {
    const v = await ensureVideo();
    await v.requestPictureInPicture();
    setPip(true);
    // Boutons pause / suivant de la mini-fenêtre.
    S.refreshMedia();
    return true;
  } catch {
    return false;
  }
}

/** Bouton du chrono : ouvre la mini-fenêtre, ou la ferme si elle est ouverte. */
export async function togglePip(): Promise<boolean> {
  if (pipOpen()) {
    await document.exitPictureInPicture().catch(() => undefined);
    return false;
  }
  return openPip();
}

/** Ferme la mini-fenêtre et démonte la vidéo (fin ou abandon de la séance). */
export function closePip(): void {
  if (pipOpen()) void document.exitPictureInPicture().catch(() => undefined);
  if (video) teardown();
}
