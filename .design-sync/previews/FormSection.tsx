import { FormSection, TextField, Select } from 'winesnob-design-system';

export const AddBottle = () => (
  <div style={{ maxWidth: 420, padding: 12, display: 'flex', flexDirection: 'column', gap: 28 }}>
    <FormSection title="Identity">
      <TextField label="Wine name" defaultValue="Château Margaux" />
      <TextField label="Producer" defaultValue="Premier Grand Cru Classé" />
    </FormSection>
    <FormSection title="Provenance">
      <Select
        label="Region"
        options={[
          { label: 'Bordeaux', value: 'bordeaux' },
          { label: 'Burgundy', value: 'burgundy' },
        ]}
      />
    </FormSection>
  </div>
);
