import { Info } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DEFINITIONS = {
  RPE: {
    short: 'RPE',
    expanded: 'Escala de esfuerzo percibido',
    description: 'Valora la dificultad de una serie del 1 al 10. Un RPE 8 suele indicar que aún podrías completar unas dos repeticiones.',
  },
  RIR: {
    short: 'RIR',
    expanded: 'Repeticiones en reserva',
    description: 'Número estimado de repeticiones que todavía podrías realizar con buena técnica antes de llegar al fallo.',
  },
  '1RM': {
    short: '1RM',
    expanded: 'Una repetición máxima',
    description: 'Carga máxima estimada que podrías mover una sola vez manteniendo una técnica correcta.',
  },
  IMC: {
    short: 'IMC',
    expanded: 'Índice de masa corporal',
    description: 'Relación entre el peso y la estatura. Es una referencia general y no distingue músculo de grasa corporal.',
  },
  FFMI: {
    short: 'FFMI',
    expanded: 'Índice de masa libre de grasa',
    description: 'Relaciona la masa corporal sin grasa con la estatura para contextualizar el desarrollo de masa magra.',
  },
  TDEE: {
    short: 'TDEE',
    expanded: 'Gasto energético diario total',
    description: 'Estimación de las calorías utilizadas en un día al sumar metabolismo basal, actividad y entrenamiento.',
  },
  TMB: {
    short: 'TMB',
    expanded: 'Tasa metabólica basal',
    description: 'Energía estimada que el cuerpo necesita en reposo para mantener sus funciones esenciales.',
  },
  PWA: {
    short: 'PWA',
    expanded: 'Aplicación web progresiva',
    description: 'Sitio web instalable que puede funcionar como una aplicación y conservar funciones sin conexión.',
  },
  JSON: {
    short: 'JSON',
    expanded: 'Notación de objetos de JavaScript',
    description: 'Formato de texto estructurado usado por FORJA para almacenar los datos privados en el servidor autoalojado.',
  },
  PIN: {
    short: 'PIN',
    expanded: 'Número de identificación personal',
    description: 'Código numérico privado que protege el acceso al dispositivo o a una credencial de seguridad.',
  },
  REPS: {
    short: 'Reps',
    expanded: 'Repeticiones',
    description: 'Cantidad de veces que se completa el recorrido de un ejercicio dentro de una serie.',
  },
} as const;

export type AbbreviationCode = keyof typeof DEFINITIONS;

export function Abbreviation({ code }: { code: AbbreviationCode }) {
  const definition = DEFINITIONS[code];
  const tooltipId = `abbreviation-${useId().replaceAll(':', '')}`;
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const pinnedRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tooltipRef.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const margin = 10;
    const left = Math.min(window.innerWidth - tooltip.width - margin, Math.max(margin, anchor.left + anchor.width / 2 - tooltip.width / 2));
    const below = anchor.bottom + 9;
    const top = below + tooltip.height <= window.innerHeight - margin ? below : Math.max(margin, anchor.top - tooltip.height - 9);
    setPosition({ left, top });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => { pinnedRef.current = false; setOpen(false); };
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !tooltipRef.current?.contains(target)) close();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };
  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = window.setTimeout(() => {
      if (!pinnedRef.current) setOpen(false);
    }, 120);
  };

  return (
    <>
      <button
        type="button"
        ref={anchorRef}
        className="abbreviation"
        aria-label={`${definition.short}: ${definition.expanded}`}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onMouseEnter={() => { cancelScheduledClose(); setOpen(true); }}
        onMouseLeave={scheduleClose}
        onFocus={() => { cancelScheduledClose(); setOpen(true); }}
        onBlur={scheduleClose}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (pinnedRef.current) {
            pinnedRef.current = false;
            setOpen(false);
          } else {
            pinnedRef.current = true;
            setOpen(true);
          }
        }}
      >
        <abbr>{definition.short}</abbr><Info aria-hidden="true" />
      </button>
      {open && createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          className="abbreviation-tooltip"
          role="tooltip"
          style={position ? { left: position.left, top: position.top, visibility: 'visible' } : undefined}
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
        >
          <strong>{definition.short} · {definition.expanded}</strong>
          <span>{definition.description}</span>
        </span>,
        document.body,
      )}
    </>
  );
}
