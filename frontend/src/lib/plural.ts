/** Devuelve "1 granja" / "3 granjas". Para plurales irregulares, pasar `plural`. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
