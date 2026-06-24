import { SettingsRow, Switch } from 'winesnob-design-system';

export const Settings = () => (
  <div
    style={{
      maxWidth: 480,
      background: 'var(--ws-surface)',
      border: '0.5px solid var(--ws-border)',
      borderRadius: 'var(--ws-radius-lg)',
      padding: '4px 16px',
    }}
  >
    <SettingsRow
      label="Drink-window reminders"
      description="Notify me when a wine enters its window"
      control={<Switch defaultChecked />}
    />
    <SettingsRow
      label="Currency"
      description="Used for valuations"
      control={<span style={{ color: 'var(--ws-muted)', fontSize: 14 }}>EUR €</span>}
    />
    <SettingsRow
      label="Share my cellar"
      description="Let household members view it"
      control={<Switch />}
    />
  </div>
);
