export function providerToSource(form) {
  switch (form.provider) {
    case 'google_forms':
      return 'Google Forms';
    case 'local':
      return 'Local' + (form?.schema?.source ? ` (${form.schema.source})` : '');
    default:
      return form.provider || 'Unknown';
  }
}

export function buildSurveyRows(forms) {
  return forms.map((form) => ({
    id: form.id,
    name: form.name,
    event: form.eventName || '',
    source: providerToSource(form),
    ResponseCount: form.responseCount || 0,
    webViewLink: form.baseLink || ''
  }));
}
