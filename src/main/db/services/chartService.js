import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '../client.js';
import { charts } from '../schema.js';

export async function listCharts() {
  return getDb().select().from(charts).orderBy(asc(charts.displayOrder), asc(charts.id));
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

  return getDb()
    .insert(charts)
    .values({
      name: data.name,
      chartType: data.chartType,
      configuration: JSON.stringify(data.configuration),
      displayOrder: Number(maxOrderRow?.maxDisplayOrder ?? -1) + 1,
      createdAt: now,
      updatedAt: now
    })
    .returning();
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

  return getDb().update(charts).set(updates).where(eq(charts.id, id)).returning();
}

export async function deleteChart(id) {
  return getDb().delete(charts).where(eq(charts.id, id)).returning();
}

export async function reorderCharts(chartIds) {
  const db = getDb();

  return db.transaction((tx) => {
    for (let index = 0; index < chartIds.length; index += 1) {
      tx.update(charts).set({ displayOrder: index }).where(eq(charts.id, chartIds[index])).run();
    }

    return tx.select().from(charts).orderBy(asc(charts.displayOrder), asc(charts.id)).all();
  });
}

export async function parseChartConfiguration(chart) {
  return {
    ...chart,
    configuration: JSON.parse(chart.configuration)
  };
}
