import { useEffect, useRef, useState } from 'react';
import { prepareGuideImage, type CustomGuide } from './custom-media';

export function GuideImageField({ value, onChange, onBusyChange }: { value: CustomGuide | undefined; onChange(value: CustomGuide): void; onBusyChange?(busy: boolean): void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, []);
  return <fieldset className="guide-image-field span-2">
    <legend>Imagen del ejercicio</legend>
    <p>Usa una imagen propia o con permiso de uso que muestre la posición y el movimiento. Puedes combinar inicio y final en una sola imagen.</p>
    <label>Seleccionar imagen<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async (event) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) return;
      const request = ++generation.current;
      setError(null); setBusy(true); onBusyChange?.(true);
      try {
        const dataUrl = await prepareGuideImage(file);
        if (request === generation.current) onChange({ kind: 'image', dataUrl, alt: value?.alt ?? '' });
      } catch (cause) {
        if (request === generation.current) setError(cause instanceof Error ? cause.message : 'No pudimos preparar la imagen.');
      } finally {
        if (request === generation.current) { setBusy(false); onBusyChange?.(false); }
      }
    }} /><small>PNG, JPG o WebP · hasta 8 MB. Se optimiza antes de guardarla.</small></label>
    {busy && <p role="status">Preparando imagen…</p>}
    {error && <p className="error-banner" role="alert">{error}</p>}
    {value && <><img className="guide-image-preview" src={value.dataUrl} alt={value.alt || 'Vista previa de tu imagen'} /><label>Descripción del movimiento<input required maxLength={180} value={value.alt} onChange={(event) => onChange({ ...value, alt: event.target.value })} placeholder="Describe la posición inicial y final" /></label></>}
  </fieldset>;
}
