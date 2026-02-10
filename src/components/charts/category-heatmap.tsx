'use client';

import { CATEGORY_NAMES, MATURITY_COLORS } from '@/lib/constants';
import type { MaturityStatus } from '@/lib/constants';

interface CategoryStat {
  category_number: number;
  total: number;
  evaluated: number;
  avg_score: number | null;
}

function getColorForScore(score: number | null): string {
  if (score === null) return MATURITY_COLORS.no_evaluado;
  if (score <= 1) return MATURITY_COLORS.inexistente;
  if (score <= 2) return MATURITY_COLORS.parcial;
  if (score <= 3) return MATURITY_COLORS.documentado;
  if (score <= 4) return MATURITY_COLORS.implementado;
  return MATURITY_COLORS.optimizado;
}

function getStatusForScore(score: number | null): MaturityStatus {
  if (score === null) return 'no_evaluado';
  if (score <= 1) return 'inexistente';
  if (score <= 2) return 'parcial';
  if (score <= 3) return 'documentado';
  if (score <= 4) return 'implementado';
  return 'optimizado';
}

interface Props {
  data: CategoryStat[];
  selectedCategory: number | null;
  onSelectCategory: (cat: number | null) => void;
}

export function CategoryHeatmap({ data, selectedCategory, onSelectCategory }: Props) {
  const operational = data.filter((d) => d.category_number <= 6);
  const support = data.filter((d) => d.category_number >= 7);

  function renderTile(cat: CategoryStat) {
    const score = cat.avg_score ? Number(cat.avg_score) : null;
    const color = getColorForScore(score);
    const isSelected = selectedCategory === cat.category_number;
    const pct = cat.total > 0 ? Math.round((Number(cat.evaluated) / Number(cat.total)) * 100) : 0;

    return (
      <button
        key={cat.category_number}
        className={`rounded-lg p-3 text-left transition-all ${
          isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:opacity-80'
        }`}
        style={{ backgroundColor: color }}
        onClick={() => onSelectCategory(isSelected ? null : cat.category_number)}
      >
        <p className="font-bold text-sm text-gray-900">{cat.category_number}.0</p>
        <p className="text-xs text-gray-800 line-clamp-2 leading-tight mt-0.5">
          {CATEGORY_NAMES[cat.category_number]}
        </p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-lg font-bold text-gray-900">{score ?? '—'}</span>
          <span className="text-xs text-gray-700">/ 5</span>
        </div>
        <p className="text-xs text-gray-700">{pct}% evaluado</p>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Procesos operativos</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {operational.map(renderTile)}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Procesos de gestión y soporte</p>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {support.map(renderTile)}
        </div>
      </div>
    </div>
  );
}
