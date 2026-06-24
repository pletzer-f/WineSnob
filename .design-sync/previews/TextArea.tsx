import { TextArea } from 'winesnob-design-system';

export const Notes = () => (
  <div style={{ maxWidth: 420, padding: 12 }}>
    <TextArea
      label="Tasting notes"
      placeholder="Cassis, violet, graphite…"
      defaultValue="Opulent yet precise — a landmark vintage that won’t quit."
    />
  </div>
);
