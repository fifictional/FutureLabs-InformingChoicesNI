import XLSX from 'xlsx';
import * as eventService from '../db/services/eventService.js';
import * as formService from '../db/services/formService.js';
import * as questionService from '../db/services/questionService.js';
import * as submissionService from '../db/services/submissionService.js';
import * as responseService from '../db/services/responseService.js';

function toTrimmedString(value) {
  return String(value ?? '').trim();
}

function normalizeAnswerType(value) {
  const t = toTrimmedString(value).toLowerCase();
  if (!t) return null;
  if (t === 'text' || t === 'string') return 'text';
  if (t === 'number' || t === 'numeric' || t === 'float' || t === 'integer' || t === 'int') {
    return 'number';
  }
  if (t === 'choice' || t === 'select' || t === 'radio' || t === 'dropdown' || t === 'enum') {
    return 'choice';
  }
  return null;
}

function parseChoiceValues(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((v) => toTrimmedString(v)).filter(Boolean);

  const text = toTrimmedString(raw);
  if (!text) return [];

  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((v) => toTrimmedString(v)).filter(Boolean);
    } catch {
      // Fall back to delimiter parsing.
    }
  }

  return text
    .split(/[|;,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function dedupeChoices(values) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const text = toTrimmedString(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function extractQuestionMetadataFromWorkbook(wb, headerRow, questionIndices) {
  const sheetNames = wb.SheetNames || [];
  if (sheetNames.length <= 1) return { metadataByHeader: new Map(), metadataSheetName: null };

  const headerByLookupKey = new Map();
  for (const colIdx of questionIndices) {
    const questionText = toTrimmedString(headerRow[colIdx] || `Column ${colIdx + 1}`);
    if (!questionText) continue;
    headerByLookupKey.set(questionText.toLowerCase(), questionText);
    headerByLookupKey.set(String(colIdx + 1), questionText);
  }

  for (const sheetName of sheetNames.slice(1)) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows.length) continue;

    const metaHeader = rows[0].map((c) => toTrimmedString(c));
    const questionCol = metaHeader.findIndex((h) =>
      /^(question|question text|question header|column|column name|field)$/i.test(h)
    );
    const answerTypeCol = metaHeader.findIndex((h) => /^(answer type|answertype|type)$/i.test(h));
    const choicesCol = metaHeader.findIndex((h) => /^(choices|choice|options|option)$/i.test(h));

    if (questionCol < 0 || (answerTypeCol < 0 && choicesCol < 0)) continue;

    const metadataByHeader = new Map();
    for (const row of rows.slice(1)) {
      const rawQuestionRef = toTrimmedString(row[questionCol]);
      if (!rawQuestionRef) continue;

      const targetHeader =
        headerByLookupKey.get(rawQuestionRef) ||
        headerByLookupKey.get(rawQuestionRef.toLowerCase());
      if (!targetHeader) continue;

      const key = targetHeader.toLowerCase();
      const existing = metadataByHeader.get(key) || { answerType: null, options: [] };

      const answerType = answerTypeCol >= 0 ? normalizeAnswerType(row[answerTypeCol]) : null;
      const parsedChoices =
        choicesCol >= 0 ? dedupeChoices(parseChoiceValues(row[choicesCol])) : [];

      if (answerType) existing.answerType = answerType;
      if (parsedChoices.length > 0) existing.options = parsedChoices;

      metadataByHeader.set(key, existing);
    }

    if (metadataByHeader.size > 0) {
      return { metadataByHeader, metadataSheetName: sheetName };
    }
  }

  return { metadataByHeader: new Map(), metadataSheetName: null };
}

function buildQuestionDefinitions(rowsForForm, questionIndices, headerRow, metadataByHeader) {
  return questionIndices.map((colIdx) => {
    const text = toTrimmedString(headerRow[colIdx] || `Column ${colIdx + 1}`);
    const inferred = inferQuestionDefinition(rowsForForm, colIdx, text);
    const metadata = metadataByHeader.get(text.toLowerCase());

    const answerType = metadata?.answerType || inferred.answerType;
    let options = [];
    if (answerType === 'choice') {
      options = dedupeChoices(metadata?.options?.length ? metadata.options : inferred.options);
    }

    return { text, answerType, options };
  });
}

function inferQuestionDefinition(rowsForForm, colIdx, fallbackTitle) {
  const values = [];
  const normalizedOptions = new Map();
  let allNumeric = true;

  for (const row of rowsForForm) {
    const cell = row[colIdx];
    if (cell == null || cell === '') continue;

    const text = String(cell).trim();
    if (!text) continue;

    values.push(text);
    const key = text.toLowerCase();
    if (!normalizedOptions.has(key)) normalizedOptions.set(key, text);

    const num = Number(text);
    if (Number.isNaN(num) || !Number.isFinite(num) || text !== String(num)) {
      allNumeric = false;
    }
  }

  if (values.length === 0) {
    return {
      text: fallbackTitle,
      answerType: 'text',
      options: []
    };
  }

  if (allNumeric) {
    return {
      text: fallbackTitle,
      answerType: 'number',
      options: []
    };
  }

  const options = [...normalizedOptions.values()];
  const hasRepeatedValues = options.length < values.length;
  const shouldTreatAsChoice = options.length >= 2 && options.length <= 12 && hasRepeatedValues;

  return {
    text: fallbackTitle,
    answerType: shouldTreatAsChoice ? 'choice' : 'text',
    options: shouldTreatAsChoice ? options : []
  };
}

function formatPreviewCellValue(cell) {
  if (cell == null) return '';
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime()) ? '' : cell.toISOString();
  }
  return String(cell);
}

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
    if (i !== formCol && i !== eventCol && i !== timeCol && headerRow[i] !== '')
      questionIndices.push(i);
  }
  const headers = questionIndices.map((i) => headerRow[i] || `Column ${i + 1}`);
  const { metadataByHeader, metadataSheetName } = extractQuestionMetadataFromWorkbook(
    wb,
    headerRow,
    questionIndices
  );
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
  const questionDefinitions = buildQuestionDefinitions(
    dataRows,
    questionIndices,
    headerRow,
    metadataByHeader
  );

  const previewColumns = headerRow.map((header, colIdx) => ({
    field: `c_${colIdx}`,
    headerName: header || `Column ${colIdx + 1}`,
    width: 180
  }));
  const previewLimit = 200;
  const previewRows = dataRows.slice(0, previewLimit).map((row, idx) => {
    const out = { id: idx + 1 };
    for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
      out[`c_${colIdx}`] = formatPreviewCellValue(row[colIdx]);
    }
    return out;
  });

  const questionDefinitionsPreview = questionDefinitions.map((qDef, idx) => {
    const hasMetadata = Boolean(metadataByHeader.get(qDef.text.toLowerCase()));
    return {
      id: idx + 1,
      questionIndex: idx,
      question: qDef.text,
      answerType: qDef.answerType,
      choiceCount: Array.isArray(qDef.options) ? qDef.options.length : 0,
      choices: Array.isArray(qDef.options) ? qDef.options.join(' | ') : '',
      source: hasMetadata ? 'metadata' : 'inferred'
    };
  });

  return {
    suggestedFormName,
    suggestedEventName,
    questionHeaders: headers,
    rowCount: dataRows.length,
    hasPerRowEvent: eventCol >= 0,
    questionMetadataSheet: metadataSheetName,
    hasQuestionMetadata: Boolean(metadataSheetName),
    previewColumns,
    previewRows,
    previewLimit,
    previewTruncated: dataRows.length > previewLimit,
    questionDefinitions: questionDefinitionsPreview
  };
}

export async function commitExcelImport(
  bufferLike,
  { formName, eventName, eventDescription, userReferenceQuestionIndex } = {}
) {
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
    if (i !== formCol && i !== eventCol && i !== timeCol && headerRow[i] !== '')
      questionIndices.push(i);
  }
  const dataRows = rows.slice(1);
  const { metadataByHeader, metadataSheetName } = extractQuestionMetadataFromWorkbook(
    wb,
    headerRow,
    questionIndices
  );

  const dialogForm = (formName || '').trim();
  const dialogEvent = (eventName || '').trim();
  const referenceQuestionIndex =
    typeof userReferenceQuestionIndex === 'number' && Number.isInteger(userReferenceQuestionIndex)
      ? userReferenceQuestionIndex
      : null;
  if (!dialogForm) throw new Error('Form name is required');
  if (eventCol < 0 && !dialogEvent) throw new Error('Event name is required');
  if (questionIndices.length === 0) throw new Error('No question columns found');
  if (
    referenceQuestionIndex != null &&
    (referenceQuestionIndex < 0 || referenceQuestionIndex >= questionIndices.length)
  ) {
    throw new Error('Selected user reference ID question is invalid');
  }

  async function importForRows(targetEventName, rowsForForm, nameForForm) {
    const nameTrim = (targetEventName || '').trim();
    if (!nameTrim) throw new Error('Event name is required');
    const all = await eventService.listEvents();
    let ev = all.find((e) => e.name === nameTrim);
    if (!ev) {
      ev = (
        await eventService.createEvent({ name: nameTrim, description: eventDescription || null })
      )[0];
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

    const questionDefinitions = buildQuestionDefinitions(
      rowsForForm,
      questionIndices,
      headerRow,
      metadataByHeader
    );

    const extId = `excel-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const schema = JSON.stringify({
      source: 'excel',
      metadataSheet: metadataSheetName,
      questionHeaders: questionDefinitions.map((q) => q.text),
      questions: questionDefinitions
    });
    const [form] = await formService.createForm({
      name: fname,
      provider: 'file',
      baseLink: 'https://invalid.invalid/excel-import',
      externalId: extId,
      eventId: ev.id,
      schema
    });

    const qs = [];
    for (let i = 0; i < questionIndices.length; i++) {
      const qDef = questionDefinitions[i];
      const [questionRow] = await questionService.createQuestion({
        formId: form.id,
        text: qDef.text,
        answerType: qDef.answerType
      });

      if (qDef.answerType === 'choice' && qDef.options.length > 0) {
        await questionService.createQuestionChoices(questionRow.id, qDef.options);
      }

      qs.push({
        ...questionRow,
        answerType: qDef.answerType,
        options: qDef.options,
        headerIndex: i
      });
    }

    const referenceQuestion =
      referenceQuestionIndex == null ? null : qs[referenceQuestionIndex] || null;
    if (referenceQuestion && referenceQuestion.answerType !== 'text') {
      throw new Error('Selected user reference ID question must be a text question');
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
        userReferenceId:
          referenceQuestion == null
            ? null
            : toTrimmedString(row[questionIndices[referenceQuestion.headerIndex]]),
        submittedAt,
        externalId: `excel-row-${form.id}-${rowIdx}`
      });

      for (let i = 0; i < qs.length; i++) {
        const qDef = qs[i];
        const colIdx = questionIndices[i];
        const cell = row[colIdx];
        let valueText = '';
        let valueNumber = null;
        let valueChoice = null;
        if (cell !== null && cell !== undefined && cell !== '') {
          const raw = String(cell).trim();
          if (qDef.answerType === 'choice') {
            valueChoice = raw;
            valueText = raw;
          } else if (typeof cell === 'number') {
            valueText = String(cell);
            valueNumber = cell;
          } else {
            const num = Number(raw);
            if (
              raw !== '' &&
              !Number.isNaN(num) &&
              Number.isFinite(num) &&
              raw === String(num) &&
              qDef.answerType === 'number'
            ) {
              valueText = raw;
              valueNumber = num;
            } else {
              valueText = raw;
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
        throw new Error(
          'Event name missing for a row: fill the Event column or the default event below'
        );
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
