import type { CreativeBrief } from "../../supabase/functions/_shared/art-direction";

const MOODS = [
  { id: "tema", label: "Cores do tema", colors: ["#287BCA", "#F4BD28", "#ED567B"] },
  { id: "vibrante", label: "Bem colorida", colors: ["#EB2453", "#FFCA08", "#00A9B5"] },
  { id: "pastel", label: "Pastel delicada", colors: ["#F6B5C9", "#A6DDD0", "#C7C0ED"] },
  { id: "elegante", label: "Elegante", colors: ["#145A52", "#D3AA50", "#E9ECED"] },
] as const;

export function ArtDirectionControls({ value, onChange }: { value: CreativeBrief; onChange: (value: CreativeBrief) => void }) {
  return <div className="space-y-5 border-t border-border pt-5">
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">Clima das cores</legend>
      <div className="grid grid-cols-2 gap-3">
        {MOODS.map((mood) => <label key={mood.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 ${value.colorMood === mood.id ? "border-primary bg-primary/5" : "border-border"}`}>
          <input type="radio" name="color-mood" className="accent-primary" value={mood.id} checked={value.colorMood === mood.id} onChange={() => onChange({ ...value, colorMood: mood.id })} />
          <span className="min-w-0 flex-1">
            <span className="mb-2 flex gap-1" aria-hidden="true">{mood.colors.map((color) => <span key={color} className="h-3 flex-1 rounded-sm" style={{ backgroundColor: color }} />)}</span>
            <span className="text-xs font-medium">{mood.label}</span>
          </span>
        </label>)}
      </div>
    </fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-semibold">Acabamento
        <select aria-label="Acabamento" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-normal" value={value.finish} onChange={(e) => onChange({ ...value, finish: e.target.value as CreativeBrief["finish"] })}>
          <option value="limpo">Grafico limpo</option><option value="camadas">Apliques em camadas</option><option value="ornamental">Molduras e ornamentos</option>
        </select>
      </label>
      <label className="space-y-2 text-sm font-semibold">Publico da festa
        <select aria-label="Publico da festa" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-normal" value={value.audience} onChange={(e) => onChange({ ...value, audience: e.target.value as CreativeBrief["audience"] })}>
          <option value="infantil">Infantil</option><option value="teen">Adolescente</option><option value="adulto">Adulto / tematica</option>
        </select>
      </label>
    </div>
    <label className="block space-y-2 text-sm font-semibold">Detalhes desejados
      <textarea aria-label="Detalhes desejados" maxLength={400} rows={3} value={value.wishes} onChange={(e) => onChange({ ...value, wishes: e.target.value })} className="block w-full resize-y rounded-md border border-input bg-background p-3 text-sm font-normal" />
    </label>
  </div>;
}
