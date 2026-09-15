import { useState } from 'react';
import { useStateStore } from '../../stores/state.store';
import type { Exercise } from '../../types/state';
import { checkGuideCapacity } from './custom-media';
import { GuideImageField } from './GuideImageField';

export function CustomGuideEditor({ exercise }: { exercise: Exercise }) {
  const [editing, setEditing] = useState(false);
  const [image, setImage] = useState(exercise.guideMedia);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return <section className="custom-guide-editor">
    <button type="button" className="secondary-button" aria-expanded={editing} disabled={preparing || saving} onClick={() => { setImage(exercise.guideMedia); setMessage(null); setEditing(!editing); }}>{editing ? 'Cerrar editor' : exercise.guideMedia ? 'Cambiar mi imagen' : 'Añadir imagen del ejercicio'}</button>
    {editing && <form onSubmit={async (event) => {
      event.preventDefault();
      if (saving || preparing) return;
      if (!image?.alt.trim()) { setMessage('Selecciona una imagen y describe el movimiento.'); return; }
      setSaving(true); setMessage(null);
      try {
        await useStateStore.getState().update((draft) => {
          checkGuideCapacity(draft.exerciseLibrary, image, exercise.id);
          const target = draft.exerciseLibrary.find((item) => item.id === exercise.id);
          if (!target) throw new Error('Este ejercicio ya no está en la biblioteca.');
          target.guideMedia = { ...image, alt: image.alt.trim() };
        });
        setEditing(false); setMessage('Imagen guardada.');
      } catch { setMessage('No pudimos guardar la imagen. Comprueba la conexión y el espacio disponible; conservamos tu selección.'); }
      finally { setSaving(false); }
    }}><GuideImageField value={image} onChange={setImage} onBusyChange={setPreparing} /><button type="submit" className="primary-button" disabled={saving || preparing}>{saving ? 'Guardando…' : 'Guardar imagen'}</button></form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
