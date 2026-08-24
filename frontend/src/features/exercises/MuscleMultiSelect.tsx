import { Check, ChevronDown, X } from 'lucide-react';
import { MUSCLE_OPTION_GROUPS, muscleLabel } from './muscle-options';

interface MuscleMultiSelectProps {
  id: string;
  label: string;
  selected: string[];
  excluded?: string[];
  required?: boolean;
  hint: string;
  invalid?: boolean;
  onChange(selected: string[]): void;
}

export function MuscleMultiSelect({
  id,
  label,
  selected,
  excluded = [],
  required = false,
  hint,
  invalid = false,
  onChange,
}: MuscleMultiSelectProps) {
  const excludedSet = new Set(excluded);

  function toggle(muscleId: string) {
    onChange(selected.includes(muscleId)
      ? selected.filter((candidate) => candidate !== muscleId)
      : [...selected, muscleId]);
  }

  return (
    <fieldset className="muscle-select-field" aria-describedby={`${id}-hint`}>
      <legend id={`${id}-label`}>{label}{required && <span aria-hidden="true"> *</span>}</legend>
      <details name="exercise-muscle-selector" className={invalid ? 'muscle-select invalid' : 'muscle-select'}>
        <summary aria-labelledby={`${id}-label ${id}-summary`} aria-required={required} aria-invalid={invalid}>
          <span id={`${id}-summary`}>{selected.length === 0 ? 'Seleccionar músculos' : `${selected.length} ${selected.length === 1 ? 'seleccionado' : 'seleccionados'}`}</span>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <div className="muscle-select-menu">
          {MUSCLE_OPTION_GROUPS.map((group) => {
            const available = group.options.filter((option) => !excludedSet.has(option.id));
            if (available.length === 0) return null;
            return <section key={group.id} aria-labelledby={`${id}-${group.id}`}><strong id={`${id}-${group.id}`}>{group.label}</strong><div>{available.map((option) => {
              const checked = selected.includes(option.id);
              return <label className="muscle-option" key={option.id}><input type="checkbox" checked={checked} onChange={() => toggle(option.id)} /><span className="muscle-checkbox" aria-hidden="true">{checked && <Check size={13} />}</span><span>{option.label}</span></label>;
            })}</div></section>;
          })}
        </div>
      </details>
      {selected.length > 0 && <div className="muscle-selection" aria-label={`${label} seleccionados`}>{selected.map((muscleId) => <span key={muscleId}>{muscleLabel(muscleId)}<button type="button" onClick={() => toggle(muscleId)} aria-label={`Quitar ${muscleLabel(muscleId)} de ${label.toLowerCase()}`}><X size={13} /></button></span>)}</div>}
      <small id={`${id}-hint`}>{hint}</small>
    </fieldset>
  );
}
