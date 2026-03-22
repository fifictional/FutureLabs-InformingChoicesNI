import XLSX from 'xlsx';
import * as eventService from '../db/services/eventService.js';
import * as formService from '../db/services/formService.js';
import * as questionService from '../db/services/questionService.js';
import * as submissionService from '../db/services/submissionService.js';
import * as responseService from '../db/services/responseService.js';


export function parseExcelImport(bufferLike) {
  let buffer;
  if (!bufferLike) throw new Error('No file data');
  if (Buffer.isBuffer(bufferLike)) buffer = bufferLike;
  else if (bufferLike instanceof ArrayBuffer) buffer = Buffer.from(bufferLike);
  else if (ArrayBuffer.isView(bufferLike)) {
    buffer = Buffer.from(bufferLike.buffer, bufferLike.byteOffset, bufferLike.byteLength);
  } else throw new Error('Unsupported file data');

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rows.length) throw new Error('Empty sheet');
  const headerRow = rows[0].map((c) => String(c ?? '').trim());
  const formCol = headerRow.findIndex((h) => /^(form name|survey name|form)$/i.test(h));
  const eventCol = headerRow.findIndex((h) => /^(event name|event)$/i.test(h));
  const timeCol = headerRow.findIndex((h) => /^(timestamp|submitted at|date|submitted)$/i.test(h));
  const questionIndices = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (i !== formCol && i !== eventCol && i !== timeCol && headerRow[i] !== '') questionIndices.push(i);
  }
  const headers = questionIndices.map((i) => headerRow[i] || `Column ${i + 1}`);
  let suggestedFormName = '';
  let suggestedEventName = '';
  if (rows.length > 1) {
    const r1 = rows[1];
    if (formCol >= 0 && r1[formCol] != null && String(r1[formCol]).trim()) {
      suggestedFormName = String(r1[formCol]).trim();
    }
    if (eventCol >= 0 && r1[eventCol] != null && String(r1[eventCol]).trim()) {
      suggestedEventName = String(r1[eventCol]).trim();
    }
  }
  const dataRows = rows.slice(1);

  return {
    suggestedFormName,
    suggestedEventName,
    questionHeaders: headers,
    rowCount: dataRows.length,
    hasPerRowEvent: eventCol >= 0
  };
}

export async function commitExcelImport(bufferLike, { formName, eventName, eventDescription }) {
  let buffer;
  if (!bufferLike) throw new Error('No file data');
  if (Buffer.isBuffer(bufferLike)) buffer = bufferLike;
  else if (bufferLike instanceof ArrayBuffer) buffer = Buffer.from(bufferLike);
  else if (ArrayBuffer.isView(bufferLike)) {
    buffer = Buffer.from(bufferLike.buffer, bufferLike.byteOffset, bufferLike.byteLength);
  } else throw new Error('Unsupported file data');

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rows.length) throw new Error('Empty sheet');
  const headerRow = rows[0].map((c) => String(c ?? '').trim());
  const formCol = headerRow.findIndex((h) => /^(form name|survey name|form)$/i.test(h));
  const eventCol = headerRow.findIndex((h) => /^(event name|event)$/i.test(h));
  const timeCol = headerRow.findIndex((h) => /^(timestamp|submitted at|date|submitted)$/i.test(h));
  const questionIndices = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (i !== formCol && i !== eventCol && i !== timeCol && headerRow[i] !== '') questionIndices.push(i);
  }
  const dataRows = rows.slice(1);

  const dialogForm = (formName || '').trim();
  const dialogEvent = (eventName || '').trim();
  if (!dialogForm) throw new Error('Form name is required');
  if (eventCol < 0 && !dialogEvent) throw new Error('Event name is required');
  if (questionIndices.length === 0) throw new Error('No question columns found');

  async function importForRows(targetEventName, rowsForForm, nameForForm) {
    const nameTrim = (targetEventName || '').trim();
    if (!nameTrim) throw new Error('Event name is required');
    const all = await eventService.listEvents();
    let ev = all.find((e) => e.name === nameTrim);
    if (!ev) {
      ev = (await eventService.createEvent({ name: nameTrim, description: eventDescription || null }))[0];
    }

    const existing = await formService.listForms();
    const taken = new Set(existing.map((f) => f.name));
    let base = (nameForForm || 'Imported Survey').trim() || 'Imported Survey';
    let fname = base;
    let n = 2;
    while (taken.has(fname)) {
      fname = `${base} (${n})`;
      n++;
    }

    const extId = `excel-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const schema = JSON.stringify({
      source: 'excel',
      questionHeaders: questionIndices.map((i) => headerRow[i] || `Column ${i + 1}`)
    });
    const [form] = await formService.createForm({
      name: fname,
      provider: 'google_forms',
      baseLink: 'https://invalid.invalid/excel-import',
      externalId: extId,
      eventId: ev.id,
      schema
    });

    const qs = [];
    for (let i = 0; i < questionIndices.length; i++) {
      qs.push((await questionService.createQuestion(form.id))[0]);
    }

    let rowIdx = 0;
    for (const row of rowsForForm) {
      rowIdx++;
      let submittedAt = new Date();
      if (timeCol >= 0) {
        const cell = row[timeCol];
        if (cell instanceof Date && !Number.isNaN(cell.getTime())) submittedAt = cell;
        else if (typeof cell === 'number') {
          const d = new Date((cell - 25569) * 86400 * 1000);
          if (!Number.isNaN(d.getTime())) submittedAt = d;
        } else {
          const d = new Date(cell);
          if (!Number.isNaN(d.getTime())) submittedAt = d;
        }
      }

      const [sub] = await submissionService.createSubmission({
        formId: form.id,
        submittedAt,
        externalId: `excel-row-${form.id}-${rowIdx}`
      });

      for (let i = 0; i < qs.length; i++) {
        const colIdx = questionIndices[i];
        const cell = row[colIdx];
        let valueText = '';
        let valueNumber = null;
        const valueChoice = null;
        if (cell !== null && cell !== undefined && cell !== '') {
          if (typeof cell === 'number') {
            valueText = String(cell);
            valueNumber = cell;
          } else {
            const s = String(cell).trim();
            const num = Number(s);
            if (s !== '' && !Number.isNaN(num) && Number.isFinite(num) && s === String(num)) {
              valueText = s;
              valueNumber = num;
            } else {
              valueText = s;
            }
          }
        }
        await responseService.upsertResponse({
          submissionId: sub.id,
          questionId: qs[i].id,
          valueText,
          valueNumber,
          valueChoice
        });
      }
    }
    return form;
  }

  const createdIds = [];
  if (eventCol < 0) {
    createdIds.push((await importForRows(dialogEvent, dataRows, dialogForm)).id);
  } else {
    const groups = new Map();
    for (const row of dataRows) {
      const fromCell =
        row[eventCol] != null && String(row[eventCol]).trim()
          ? String(row[eventCol]).trim()
          : dialogEvent;
      if (!fromCell) {
        throw new Error('Event name missing for a row: fill the Event column or the default event below');
      }
      if (!groups.has(fromCell)) groups.set(fromCell, []);
      groups.get(fromCell).push(row);
    }
    if (groups.size === 1) {
      const onlyName = [...groups.keys()][0];
      createdIds.push((await importForRows(onlyName, dataRows, dialogForm)).id);
    } else {
      for (const [en, gRows] of groups) {
        createdIds.push((await importForRows(en, gRows, `${dialogForm} (${en})`)).id);
      }
    }
  }

  return { formIds: createdIds };
}
