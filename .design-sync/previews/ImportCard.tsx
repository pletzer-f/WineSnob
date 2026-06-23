import { ImportCard } from 'winesnob-design-system';

export const Sources = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
    <ImportCard badge="CSV" title="From a spreadsheet" hint="CSV, Excel, or a CellarTracker export" />
    <ImportCard badge="PDF" title="From a merchant list" hint="An invoice or storage-facility manifest" />
    <ImportCard badge="JPG" title="From a photo of a list" hint="Snap a printed inventory and we read it" />
  </div>
);
