import type { Exercise } from '../../types/state';

export const MAX_GUIDE_BYTES = 256 * 1024;
export const MAX_GUIDES_BYTES = 2 * 1024 * 1024;
export type CustomGuide = NonNullable<Exercise['guideMedia']>;

export function guideBytes(dataUrl: string): number {
  const encoded = dataUrl.split(',')[1] ?? '';
  return encoded.length * 3 / 4 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
}

export function validGuideImage(dataUrl: string): boolean {
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)
    && guideBytes(dataUrl) <= MAX_GUIDE_BYTES;
}

export function checkGuideCapacity(library: Exercise[], image: CustomGuide, replacingId?: string): void {
  const total = library.reduce((bytes, exercise) => bytes + (exercise.id !== replacingId && exercise.guideMedia ? guideBytes(exercise.guideMedia.dataUrl) : 0), guideBytes(image.dataUrl));
  if (total > MAX_GUIDES_BYTES) throw new Error('Tu biblioteca ha alcanzado el espacio disponible para imágenes propias. Sustituye alguna imagen antes de añadir otra.');
}

/** Decode locally and re-encode the pixels; metadata and original file never leave the device. */
export async function prepareGuideImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
    throw new Error('Elige una imagen PNG, JPG o WebP de hasta 8 MB.');
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!(png || jpeg || webp)) throw new Error('El archivo no es una imagen compatible.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('No pudimos abrir esa imagen. Prueba con otra.'); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) throw new Error('La imagen es demasiado grande. Elige una de menor resolución.');
    const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos preparar la imagen en este dispositivo.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (validGuideImage(dataUrl)) return dataUrl;
    }
    throw new Error('La imagen ocupa demasiado espacio. Elige una más sencilla.');
  } finally { bitmap.close(); }
}
