import { useId, type ReactNode } from 'react';
import type { BiologicalSex } from '../../types/state';
import { muscleLabel } from '../../features/exercises/muscle-options';

export type AnatomySide = 'front' | 'back';

interface AnatomyFigureProps {
  side: AnatomySide;
  sex: BiologicalSex | null;
  scores: ReadonlyMap<string, number>;
  maximumScore: number;
}

export function AnatomyFigure({ side, sex, scores, maximumScore }: AnatomyFigureProps) {
  const gradientId = `body-${useId().replaceAll(':', '')}`;
  const region = (id: string, children: ReactNode) => (
    <MuscleRegion id={id} score={scores.get(id) ?? 0} maximumScore={maximumScore}>{children}</MuscleRegion>
  );

  return (
    <svg className={`anatomy-svg anatomy-${sex ?? 'neutral'} anatomy-${side}`} viewBox="0 0 180 360" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f3f1e9" />
          <stop offset=".58" stopColor="#dfe4dc" />
          <stop offset="1" stopColor="#cbd3ca" />
        </linearGradient>
      </defs>
      <g className="anatomy-base" style={{ fill: `url(#${gradientId})` }}>
        <ellipse className="anatomy-head" cx="90" cy="31" rx={sex === 'male' ? 18 : 17} ry="22" />
        <path d="M76 51 C78 61 75 66 69 71 L111 71 C105 66 102 61 104 51 Z" />
        <path className="anatomy-ear" d="M72 27 C67 25 67 37 73 39 M108 27 C113 25 113 37 107 39" />
        <path className="anatomy-arm" d="M51 77 C39 79 31 90 28 108 L22 157 L15 207 C14 216 24 219 28 210 L39 163 L48 123 L58 91 Z" />
        <path className="anatomy-arm" d="M129 77 C141 79 149 90 152 108 L158 157 L165 207 C166 216 156 219 152 210 L141 163 L132 123 L122 91 Z" />
        {sex === 'female' ? (
          <>
            <path className="anatomy-torso" d="M69 68 C58 70 49 76 47 89 C45 103 52 122 57 141 C61 156 57 174 61 188 L119 188 C123 174 119 156 123 141 C128 122 135 103 133 89 C131 76 122 70 111 68 C103 75 77 75 69 68 Z" />
            <path className="anatomy-pelvis" d="M61 181 C55 196 51 211 57 226 C64 237 116 237 123 226 C129 211 125 196 119 181 Z" />
            <path className="anatomy-leg" d="M58 222 C53 247 56 277 60 303 L58 340 L79 340 L84 304 L88 230 Z" />
            <path className="anatomy-leg" d="M122 222 C127 247 124 277 120 303 L122 340 L101 340 L96 304 L92 230 Z" />
          </>
        ) : sex === 'male' ? (
          <>
            <path className="anatomy-torso" d="M66 67 C52 69 43 76 42 91 C43 110 51 131 55 151 C58 164 60 178 64 188 L116 188 C120 178 122 164 125 151 C129 131 137 110 138 91 C137 76 128 69 114 67 C104 75 76 75 66 67 Z" />
            <path className="anatomy-pelvis" d="M64 181 C59 197 59 211 63 226 C71 235 109 235 117 226 C121 211 121 197 116 181 Z" />
            <path className="anatomy-leg" d="M63 222 C57 251 59 279 63 304 L60 340 L80 340 L86 303 L88 228 Z" />
            <path className="anatomy-leg" d="M117 222 C123 251 121 279 117 304 L120 340 L100 340 L94 303 L92 228 Z" />
          </>
        ) : (
          <>
            <path className="anatomy-torso" d="M68 68 C55 70 46 77 45 91 C46 109 53 129 57 149 C60 164 60 177 63 188 L117 188 C120 177 120 164 123 149 C127 129 134 109 135 91 C134 77 125 70 112 68 C103 75 77 75 68 68 Z" />
            <path className="anatomy-pelvis" d="M63 181 C57 197 56 211 61 226 C69 236 111 236 119 226 C124 211 123 197 117 181 Z" />
            <path className="anatomy-leg" d="M61 222 C56 250 58 278 62 304 L59 340 L80 340 L85 303 L88 229 Z" />
            <path className="anatomy-leg" d="M119 222 C124 250 122 278 118 304 L121 340 L100 340 L95 303 L92 229 Z" />
          </>
        )}
        <path className="anatomy-foot" d="M59 335 L80 335 L82 347 C75 351 57 351 54 347 Z M100 335 L121 335 L126 347 C123 351 105 351 98 347 Z" />
      </g>

      {side === 'front' ? (
        <g className="anatomy-regions">
          {region('anterior-deltoid', <><path d="M47 84 C49 74 59 71 68 76 C64 89 59 96 48 98 Z" /><path d="M133 84 C131 74 121 71 112 76 C116 89 121 96 132 98 Z" /></>)}
          {region('lateral-deltoid', <><path d="M43 88 C43 79 49 74 56 73 C55 86 51 94 45 101 Z" /><path d="M137 88 C137 79 131 74 124 73 C125 86 129 94 135 101 Z" /></>)}
          {region('pectoralis-major', <><path d="M58 87 C66 78 78 78 88 85 L88 116 C76 120 64 116 57 106 Z" /><path d="M122 87 C114 78 102 78 92 85 L92 116 C104 120 116 116 123 106 Z" /></>)}
          {region('serratus-anterior', <><path d="M56 113 L68 119 L64 151 L55 142 Z" /><path d="M124 113 L112 119 L116 151 L125 142 Z" /></>)}
          {region('biceps', <><path d="M37 105 C44 102 49 109 47 125 L42 153 C35 158 31 150 33 136 Z" /><path d="M143 105 C136 102 131 109 133 125 L138 153 C145 158 149 150 147 136 Z" /></>)}
          {region('brachialis', <><path d="M34 145 C39 150 44 150 46 145 L43 163 C39 168 34 164 32 159 Z" /><path d="M146 145 C141 150 136 150 134 145 L137 163 C141 168 146 164 148 159 Z" /></>)}
          {region('forearms', <><path d="M31 157 C36 160 40 162 43 159 L35 196 C31 206 24 204 25 195 Z" /><path d="M149 157 C144 160 140 162 137 159 L145 196 C149 206 156 204 155 195 Z" /></>)}
          {region('abdominals', <><path d="M74 119 Q90 114 106 119 L103 178 Q90 185 77 178 Z" /><path className="anatomy-detail" d="M90 120 L90 179 M76 137 L104 137 M76 157 L104 157" /></>)}
          {region('obliques', <><path d="M61 123 L73 120 L76 178 L65 184 C58 164 57 143 61 123 Z" /><path d="M119 123 L107 120 L104 178 L115 184 C122 164 123 143 119 123 Z" /></>)}
          {region('hip-flexors', <><path d="M65 182 C73 179 82 182 87 194 L82 222 L63 216 Z" /><path d="M115 182 C107 179 98 182 93 194 L98 222 L117 216 Z" /></>)}
          {region('adductors', <><path d="M82 197 C88 202 88 216 86 245 L76 277 L72 220 Z" /><path d="M98 197 C92 202 92 216 94 245 L104 277 L108 220 Z" /></>)}
          {region('abductors', <><path d="M61 207 C67 200 73 201 78 211 L73 252 L59 242 Z" /><path d="M119 207 C113 200 107 201 102 211 L107 252 L121 242 Z" /></>)}
          {region('quadriceps', <><path d="M62 223 C69 213 79 218 83 232 L78 291 C70 302 62 292 60 274 Z" /><path d="M118 223 C111 213 101 218 97 232 L102 291 C110 302 118 292 120 274 Z" /></>)}
          {region('tibialis-anterior', <><path d="M64 287 C70 284 75 289 74 305 L70 333 L62 333 Z" /><path d="M116 287 C110 284 105 289 106 305 L110 333 L118 333 Z" /></>)}
        </g>
      ) : (
        <g className="anatomy-regions">
          {region('trapezius', <path d="M74 66 C79 73 84 77 90 78 C96 77 101 73 106 66 L119 104 L90 127 L61 104 Z" />)}
          {region('posterior-deltoid', <><path d="M47 84 C49 74 59 71 69 77 C65 91 58 98 47 98 Z" /><path d="M133 84 C131 74 121 71 111 77 C115 91 122 98 133 98 Z" /></>)}
          {region('rotator-cuff', <><path d="M57 88 C63 80 72 79 79 86 L72 105 C64 103 59 98 57 88 Z" /><path d="M123 88 C117 80 108 79 101 86 L108 105 C116 103 121 98 123 88 Z" /></>)}
          {region('triceps', <><path d="M38 102 C46 100 49 110 47 130 L42 156 C35 160 31 151 33 136 Z" /><path d="M142 102 C134 100 131 110 133 130 L138 156 C145 160 149 151 147 136 Z" /></>)}
          {region('forearms', <><path d="M31 157 C36 160 40 162 43 159 L35 196 C31 206 24 204 25 195 Z" /><path d="M149 157 C144 160 140 162 137 159 L145 196 C149 206 156 204 155 195 Z" /></>)}
          {region('rhomboids', <><path d="M70 94 L88 83 L88 129 L67 113 Z" /><path d="M110 94 L92 83 L92 129 L113 113 Z" /></>)}
          {region('thoracic-spine', <path d="M85 82 L95 82 L99 143 L90 154 L81 143 Z" />)}
          {region('latissimus-dorsi', <><path d="M60 105 C69 110 78 122 86 137 L80 178 L63 184 C57 159 54 129 60 105 Z" /><path d="M120 105 C111 110 102 122 94 137 L100 178 L117 184 C123 159 126 129 120 105 Z" /></>)}
          {region('erector-spinae', <><path d="M81 127 L88 132 L87 184 L78 195 L74 176 Z" /><path d="M99 127 L92 132 L93 184 L102 195 L106 176 Z" /></>)}
          {region('gluteus-medius', <><path d="M61 186 C69 179 80 181 87 193 L83 210 L61 211 Z" /><path d="M119 186 C111 179 100 181 93 193 L97 210 L119 211 Z" /></>)}
          {region('gluteus-maximus', <><path d="M59 207 C66 196 79 195 88 205 L86 230 C78 240 63 235 58 225 Z" /><path d="M121 207 C114 196 101 195 92 205 L94 230 C102 240 117 235 122 225 Z" /></>)}
          {region('hamstrings', <><path d="M62 231 C70 224 80 228 83 244 L78 293 C69 301 62 291 60 273 Z" /><path d="M118 231 C110 224 100 228 97 244 L102 293 C111 301 118 291 120 273 Z" /></>)}
          {region('calves', <><path d="M63 286 C70 279 77 289 76 305 L70 331 C63 336 59 328 60 314 Z" /><path d="M117 286 C110 279 103 289 104 305 L110 331 C117 336 121 328 120 314 Z" /></>)}
        </g>
      )}

      <g className="anatomy-linework">
        <path d="M90 72 L90 186" />
        <path d="M61 224 C72 230 80 230 88 227 M119 224 C108 230 100 230 92 227" />
        <path d="M79 340 L81 347 M101 340 L99 347" />
        {side === 'front' && sex === 'female' && <path d="M60 102 C68 92 79 91 89 101 M120 102 C112 92 101 91 91 101" />}
        {side === 'back' && <path d="M90 78 L90 226" />}
      </g>
    </svg>
  );
}

function MuscleRegion({ id, score, maximumScore, children }: { id: string; score: number; maximumScore: number; children: ReactNode }) {
  const level = score <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(score / Math.max(1, maximumScore) * 4)));
  return <g className={`anatomy-muscle level-${level}`} data-muscle={id}><title>{muscleLabel(id)}: {score ? `${score} puntos de estímulo` : 'sin carga reciente'}</title>{children}</g>;
}
