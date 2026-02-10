export const MATURITY_STATUSES = [
  'no_evaluado',
  'inexistente',
  'parcial',
  'documentado',
  'implementado',
  'optimizado',
] as const;

export type MaturityStatus = (typeof MATURITY_STATUSES)[number];

export const MATURITY_LABELS: Record<MaturityStatus, string> = {
  no_evaluado: 'No evaluado',
  inexistente: 'Inexistente',
  parcial: 'Parcial',
  documentado: 'Documentado',
  implementado: 'Implementado',
  optimizado: 'Optimizado',
};

export const MATURITY_SCORES: Record<MaturityStatus, number> = {
  no_evaluado: 0,
  inexistente: 1,
  parcial: 2,
  documentado: 3,
  implementado: 4,
  optimizado: 5,
};

export const MATURITY_COLORS: Record<MaturityStatus, string> = {
  no_evaluado: '#E2E8F0',
  inexistente: '#FC8181',
  parcial: '#F6AD55',
  documentado: '#F6E05E',
  implementado: '#68D391',
  optimizado: '#4FD1C5',
};

export const EVALUATION_STATUSES = ['draft', 'in_progress', 'completed', 'archived'] as const;
export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  draft: 'Borrador',
  in_progress: 'En progreso',
  completed: 'Completada',
  archived: 'Archivada',
};

export const USER_ROLES = ['admin', 'consultant', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CATEGORY_NAMES: Record<number, string> = {
  1: 'Desarrollar visión y estrategia',
  2: 'Desarrollar y gestionar productos y servicios',
  3: 'Comercializar y vender productos y servicios',
  4: 'Gestionar la cadena de suministro',
  5: 'Entregar servicios',
  6: 'Gestionar el servicio al cliente',
  7: 'Desarrollar y gestionar el capital humano',
  8: 'Gestionar la tecnología de la información',
  9: 'Gestionar recursos financieros',
  10: 'Adquirir, construir y gestionar activos',
  11: 'Gestionar riesgo empresarial',
  12: 'Gestionar las relaciones externas',
  13: 'Desarrollar y gestionar capacidades comerciales',
};
