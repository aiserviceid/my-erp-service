const TAG_STYLES = {
  sparepart: 'issue-chip--part',
  jasa: 'issue-chip--service',
  garansi: 'issue-chip--warranty',
  diskon: 'issue-chip--discount',
  info: 'issue-chip--info',
};

const classifyTag = (label = '') => {
  const normalized = String(label).toLowerCase();
  if (normalized.includes('sparepart')) return TAG_STYLES.sparepart;
  if (normalized.includes('jasa')) return TAG_STYLES.jasa;
  if (normalized.includes('garansi')) return TAG_STYLES.garansi;
  if (normalized.includes('diskon')) return TAG_STYLES.diskon;
  return TAG_STYLES.info;
};

const shortLabel = (label = '') => {
  const normalized = String(label).toLowerCase();
  if (normalized.includes('sparepart')) return 'Sparepart';
  if (normalized.includes('jasa')) return 'Jasa';
  if (normalized.includes('garansi')) return 'Garansi';
  if (normalized.includes('diskon')) return 'Diskon';
  return label.trim() || 'Info';
};

export default function IssueChips({ issue = '' }) {
  const source = String(issue || '').trim();
  const tags = [];
  const bracketPattern = /\[([^:\]]+):\s*([^\]]+)\]/g;
  let match;

  while ((match = bracketPattern.exec(source)) !== null) {
    const candidate = { label: match[1].trim(), value: match[2].trim() };
    const normalizedValue = candidate.value.toLowerCase().replace(/\s+/g, ' ').trim();
    const existingIndex = tags.findIndex((tag) => tag.normalizedValue === normalizedValue);

    if (existingIndex === -1) {
      tags.push({ ...candidate, normalizedValue });
      continue;
    }

    const existing = tags[existingIndex];
    const existingLabel = existing.label.toLowerCase();
    const candidateLabel = candidate.label.toLowerCase();
    const existingIsSparepart = existingLabel.includes('sparepart');
    const candidateIsService = candidateLabel.includes('jasa') || candidateLabel.includes('servis') || candidateLabel.includes('service');

    // A legacy note can contain the same value twice (e.g. "service mainboard")
    // as both Sparepart and Jasa. Keep one chip and prefer the more specific Jasa tag.
    if (existingIsSparepart && candidateIsService) {
      tags[existingIndex] = { ...candidate, normalizedValue };
    }
  }

  const complaint = source
    .replace(bracketPattern, ' ')
    .replace(/\s*\|\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <div className="issue-chips">
      <div className="issue-complaint">
        <strong>Keluhan:</strong> <span>{complaint || '-'}</span>
      </div>
      {tags.length > 0 && (
        <div className="issue-chip-list" aria-label="Rincian servis">
          {tags.map((tag, index) => (
            <span key={`${tag.label}-${tag.value}-${index}`} className={`issue-chip ${classifyTag(tag.label)}`}>
              <strong>{shortLabel(tag.label)}:</strong> {tag.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
