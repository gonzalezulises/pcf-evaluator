import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const MATURITY_COLORS: Record<string, string> = {
  no_evaluado: '#E2E8F0',
  inexistente: '#FC8181',
  parcial: '#F6AD55',
  documentado: '#F6E05E',
  implementado: '#68D391',
  optimizado: '#4FD1C5',
};

const MATURITY_LABELS: Record<string, string> = {
  no_evaluado: 'No evaluado',
  inexistente: 'Inexistente',
  parcial: 'Parcial',
  documentado: 'Documentado',
  implementado: 'Implementado',
  optimizado: 'Optimizado',
};

const CATEGORY_NAMES: Record<number, string> = {
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

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  coverPage: { padding: 40, fontFamily: 'Helvetica', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 20, fontFamily: 'Helvetica-Bold', borderBottom: '2px solid #4F46E5', paddingBottom: 4 },
  subsectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginTop: 12, fontFamily: 'Helvetica-Bold' },
  text: { fontSize: 10, marginBottom: 4, lineHeight: 1.4 },
  smallText: { fontSize: 8, color: '#666' },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 140, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  value: { flex: 1, fontSize: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 6, borderBottom: '1px solid #E2E8F0' },
  tableRow: { flexDirection: 'row', padding: 6, borderBottom: '1px solid #F1F5F9' },
  tableCell: { fontSize: 8, paddingRight: 4 },
  maturityBadge: { padding: '2px 6px', borderRadius: 3, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  bar: { height: 8, borderRadius: 4 },
  barContainer: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 4 },
  scoreCard: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 16, marginBottom: 12, borderLeft: '4px solid #4F46E5' },
  scoreValue: { fontSize: 36, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', color: '#4F46E5' },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#999' },
});

interface EvalData {
  evaluation: { name: string; description: string | null; evaluation_depth: number; created_at: string };
  organization: { name: string; industry: string | null; country: string | null };
  consultant: { name: string; email: string };
  overall: {
    total: number; evaluated: number; pending: number; avg_score: number | null;
    inexistente: number; parcial: number; documentado: number; implementado: number; optimizado: number;
  };
  categoryStats: Array<{
    category_number: number; total: number; evaluated: number; avg_score: number | null;
    inexistente: number; parcial: number; documentado: number; implementado: number; optimizado: number;
  }>;
  gaps: Array<{
    pcf_element_hierarchy_id: string; pcf_name: string; category_number: number;
    maturity_status: string; client_process_name: string | null;
  }>;
}

export function EvaluationPDF({ data }: { data: EvalData }) {
  const { evaluation, organization, consultant, overall, categoryStats, gaps } = data;
  const date = new Date(evaluation.created_at).toLocaleDateString('es-PA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ alignItems: 'center', marginTop: 100 }}>
          <Text style={{ fontSize: 12, color: '#4F46E5', marginBottom: 20, fontFamily: 'Helvetica-Bold' }}>
            PCF EVALUATOR
          </Text>
          <Text style={styles.title}>{evaluation.name}</Text>
          <Text style={styles.subtitle}>{organization.name}</Text>
          {organization.industry && <Text style={styles.subtitle}>{organization.industry} · {organization.country}</Text>}
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={styles.text}>Consultor: {consultant.name}</Text>
            <Text style={styles.text}>Fecha: {date}</Text>
            <Text style={styles.text}>Profundidad: Nivel {evaluation.evaluation_depth}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text>PCF Evaluator — Reporte de evaluación</Text>
          <Text>Confidencial</Text>
        </View>
      </Page>

      {/* Executive Summary */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Resumen ejecutivo</Text>

        <View style={styles.scoreCard}>
          <Text style={styles.smallText}>SCORE PROMEDIO DE MADUREZ</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={styles.scoreValue}>{overall.avg_score ?? '—'}</Text>
            <Text style={{ fontSize: 14, color: '#666' }}>/ 5.0</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Procesos evaluados:</Text>
          <Text style={styles.value}>{Number(overall.evaluated)} de {Number(overall.total)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Completitud:</Text>
          <Text style={styles.value}>{Number(overall.total) > 0 ? Math.round((Number(overall.evaluated) / Number(overall.total)) * 100) : 0}%</Text>
        </View>

        <Text style={styles.subsectionTitle}>Distribución de madurez</Text>
        <View style={styles.barContainer}>
          {(['inexistente', 'parcial', 'documentado', 'implementado', 'optimizado'] as const).map((s) => {
            const count = Number(overall[s]);
            const evaluated = Number(overall.evaluated);
            if (count === 0 || evaluated === 0) return null;
            return (
              <View key={s} style={{ ...styles.bar, backgroundColor: MATURITY_COLORS[s], width: `${(count / evaluated) * 100}%` }} />
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          {(['inexistente', 'parcial', 'documentado', 'implementado', 'optimizado'] as const).map((s) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: MATURITY_COLORS[s] }} />
              <Text style={styles.smallText}>{MATURITY_LABELS[s]}: {Number(overall[s])}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Madurez por categoría</Text>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableCell, width: '8%', fontFamily: 'Helvetica-Bold' }}>Cat</Text>
          <Text style={{ ...styles.tableCell, width: '42%', fontFamily: 'Helvetica-Bold' }}>Nombre</Text>
          <Text style={{ ...styles.tableCell, width: '12%', fontFamily: 'Helvetica-Bold' }}>Score</Text>
          <Text style={{ ...styles.tableCell, width: '12%', fontFamily: 'Helvetica-Bold' }}>Evaluados</Text>
          <Text style={{ ...styles.tableCell, width: '26%', fontFamily: 'Helvetica-Bold' }}>Distribución</Text>
        </View>
        {categoryStats.map((cat) => {
          const evaluated = Number(cat.evaluated);
          return (
            <View key={cat.category_number} style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, width: '8%' }}>{cat.category_number}.0</Text>
              <Text style={{ ...styles.tableCell, width: '42%' }}>{CATEGORY_NAMES[cat.category_number]}</Text>
              <Text style={{ ...styles.tableCell, width: '12%', fontFamily: 'Helvetica-Bold' }}>{cat.avg_score ?? '—'}</Text>
              <Text style={{ ...styles.tableCell, width: '12%' }}>{evaluated}/{Number(cat.total)}</Text>
              <View style={{ width: '26%', flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                {evaluated > 0 && (['inexistente', 'parcial', 'documentado', 'implementado', 'optimizado'] as const).map((s) => {
                  const count = Number(cat[s]);
                  if (count === 0) return null;
                  return (
                    <View key={s} style={{ height: 6, backgroundColor: MATURITY_COLORS[s], width: `${(count / evaluated) * 100}%` }} />
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text>PCF Evaluator — {organization.name}</Text>
          <Text>{date}</Text>
        </View>
      </Page>

      {/* Gap Analysis */}
      {gaps.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Análisis de brechas</Text>
          <Text style={styles.text}>
            Se identificaron {gaps.length} brechas (procesos inexistentes o parciales) a nivel 3 o superior.
          </Text>

          {gaps.filter(g => g.maturity_status === 'inexistente').length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Procesos inexistentes (prioridad alta)</Text>
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.tableCell, width: '15%', fontFamily: 'Helvetica-Bold' }}>ID</Text>
                <Text style={{ ...styles.tableCell, width: '55%', fontFamily: 'Helvetica-Bold' }}>Proceso</Text>
                <Text style={{ ...styles.tableCell, width: '30%', fontFamily: 'Helvetica-Bold' }}>Categoría</Text>
              </View>
              {gaps.filter(g => g.maturity_status === 'inexistente').slice(0, 30).map((g) => (
                <View key={g.pcf_element_hierarchy_id} style={styles.tableRow}>
                  <Text style={{ ...styles.tableCell, width: '15%', fontSize: 7 }}>{g.pcf_element_hierarchy_id}</Text>
                  <Text style={{ ...styles.tableCell, width: '55%' }}>{g.pcf_name}</Text>
                  <Text style={{ ...styles.tableCell, width: '30%' }}>{CATEGORY_NAMES[g.category_number]}</Text>
                </View>
              ))}
            </>
          )}

          {gaps.filter(g => g.maturity_status === 'parcial').length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Procesos parciales (prioridad media)</Text>
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.tableCell, width: '15%', fontFamily: 'Helvetica-Bold' }}>ID</Text>
                <Text style={{ ...styles.tableCell, width: '55%', fontFamily: 'Helvetica-Bold' }}>Proceso</Text>
                <Text style={{ ...styles.tableCell, width: '30%', fontFamily: 'Helvetica-Bold' }}>Categoría</Text>
              </View>
              {gaps.filter(g => g.maturity_status === 'parcial').slice(0, 30).map((g) => (
                <View key={g.pcf_element_hierarchy_id} style={styles.tableRow}>
                  <Text style={{ ...styles.tableCell, width: '15%', fontSize: 7 }}>{g.pcf_element_hierarchy_id}</Text>
                  <Text style={{ ...styles.tableCell, width: '55%' }}>{g.pcf_name}</Text>
                  <Text style={{ ...styles.tableCell, width: '30%' }}>{CATEGORY_NAMES[g.category_number]}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.footer}>
            <Text>PCF Evaluator — {organization.name}</Text>
            <Text>{date}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
