'use client';

import { useMemo, useState } from 'react';
import type { IngredientGroup, InstructionStep } from '@/lib/wordpress';

function scaleLeadingQuantity(line: string, factor: number): string {
  if (factor === 1) return line;
  const match = line.match(/^(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)(\s+.*)$/);
  if (!match) return line;
  const quantity = match[1].includes('/')
    ? match[1].split(/\s+/).reduce((sum, part) => {
        if (!part.includes('/')) return sum + Number(part);
        const [top, bottom] = part.split('/').map(Number);
        return sum + top / bottom;
      }, 0)
    : Number(match[1]);
  const scaled = Math.round(quantity * factor * 100) / 100;
  return `${scaled}${match[2]}`;
}

export function RecipeCard({ title, servings, yieldText, groups, instructions, prepTime, cookTime, totalTime }: {
  title: string; servings: number | null; yieldText: string | null; groups: IngredientGroup[]; instructions: InstructionStep[];
  prepTime: number | null; cookTime: number | null; totalTime: number | null;
}) {
  const base = servings || 1;
  const [selectedServings, setSelectedServings] = useState(base);
  const factor = selectedServings / base;
  const scaledGroups = useMemo(() => groups.map((group) => ({ ...group, items: group.items.map((item) => scaleLeadingQuantity(item, factor)) })), [groups, factor]);

  return (
    <section id="recipe-card" className="relative mt-20 rounded-lg border border-accent bg-white p-8 shadow-sm md:p-12" aria-labelledby="recipe-card-title">
      <div className="absolute left-1/2 top-0 h-1 w-24 -translate-x-1/2 rounded-b-full bg-primary" />
      <div className="mb-10 text-center">
        <h2 id="recipe-card-title" className="mb-4 text-4xl">{title}</h2>
        <div className="flex flex-wrap justify-center gap-6 border-y border-gray-100 py-4 text-sm font-medium uppercase tracking-widest text-gray-500">
          {prepTime && <span>Prep: {prepTime} mins</span>}{cookTime && <span>Cook: {cookTime} mins</span>}{totalTime && <span className="font-bold text-primary">Total: {totalTime} mins</span>}{yieldText && <span>Yield: {yieldText}</span>}
        </div>
        {servings && <label className="mt-5 inline-flex items-center gap-3 text-sm font-semibold" htmlFor="recipe-servings">Scale servings <select id="recipe-servings" value={selectedServings} onChange={(event) => setSelectedServings(Number(event.target.value))} className="rounded border border-gray-300 bg-white px-3 py-2">{[0.5, 1, 2, 3].map((multiple) => { const value = Math.max(1, Math.round(base * multiple)); return <option key={multiple} value={value}>{value}</option>; })}</select></label>}
      </div>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div><h3 className="mb-6 border-b border-gray-200 pb-2 text-2xl">Ingredients</h3>{scaledGroups.map((group, groupIndex) => <div key={`${group.name}-${groupIndex}`} className="mb-6">{group.name && <h4 className="mb-3 text-lg">{group.name}</h4>}<ul className="space-y-3">{group.items.map((item, index) => <li key={`${item}-${index}`} className="flex items-start leading-relaxed text-gray-700"><span className="mr-3 text-primary">•</span>{item}</li>)}</ul></div>)}</div>
        <div><h3 className="mb-6 border-b border-gray-200 pb-2 text-2xl">Instructions</h3><ol className="space-y-6">{instructions.map((step) => <li key={step.position} className="leading-relaxed text-gray-700"><span className="mb-1 block text-lg font-bold text-dark">Step {step.position}</span>{step.text}</li>)}</ol></div>
      </div>
    </section>
  );
}
