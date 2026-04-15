import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '../client.js';
import { charts } from '../schema.js';

export async function listCharts() {
  return getDb().select().from(charts).orderBy(asc(charts.displayOrder), asc(charts.id));
}

export async function listChartsPaginated(offset = 0, limit = null) {
  const safeLimit = limit == null ? null : Math.min(1000, Math.max(1, Number(limit) || 100));
  const query = getDb().select().from(charts).orderBy(asc(charts.displayOrder), asc(charts.id));
  if (safeLimit == null) {
    return query;
  }
  const safeOffset = Math.max(0, Number(offset) || 0);
  return query.limit(safeLimit).offset(safeOffset);
}

export async function findChartById(id) {
  const result = await getDb().select().from(charts).where(eq(charts.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createChart(data) {
  const now = new Date();
  const db = getDb();
  const [maxOrderRow] = await db
    .select({ maxDisplayOrder: sql`coalesce(max(${charts.displayOrder}), -1)` })
    .from(charts);

  const [{ id }] = await db
    .insert(charts)
    .values({
      name: data.name,
      chartType: data.chartType,
      configuration: JSON.stringify(data.configuration),
      displayOrder: Number(maxOrderRow?.maxDisplayOrder ?? -1) + 1,
      createdAt: now,
      updatedAt: now
    })
    .$returningId();
  const [row] = await db.select().from(charts).where(eq(charts.id, id)).limit(1);
  return [row];
}

export async function updateChart(id, data) {
  const now = new Date();
  const updates = {
    updatedAt: now
  };

  if (data.name !== undefined) {
    updates.name = data.name;
  }
  if (data.chartType !== undefined) {
    updates.chartType = data.chartType;
  }
  if (data.configuration !== undefined) {
    updates.configuration = JSON.stringify(data.configuration);
  }

  const db = getDb();
  await db.update(charts).set(updates).where(eq(charts.id, id));
  const [row] = await db.select().from(charts).where(eq(charts.id, id)).limit(1);
  return [row];
}

export async function deleteChart(id) {
  await getDb().delete(charts).where(eq(charts.id, id));
  return [];
}

export async function reorderCharts(chartIds) {
  const db = getDb();

  return db.transaction(async (tx) => {
    for (let index = 0; index < chartIds.length; index += 1) {
      await tx.update(charts).set({ displayOrder: index }).where(eq(charts.id, chartIds[index]));
    }

    return tx.select().from(charts).orderBy(asc(charts.displayOrder), asc(charts.id));
  });
}

export async function parseChartConfiguration(chart) {
  try {
    return {
      ...chart,
      configuration:
        typeof chart.configuration === 'string'
          ? JSON.parse(chart.configuration)
          : chart.configuration
    };
  } catch (err) {
    throw new Error(`Invalid chart configuration for chart "${chart.name}": ${err.message}`);
  }
}
