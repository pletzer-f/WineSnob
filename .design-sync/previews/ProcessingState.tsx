import { ProcessingState } from 'winesnob-design-system';

export const Reading = () => (
  <div
    style={{
      maxWidth: 420,
      background: 'var(--ws-surface)',
      border: '0.5px solid var(--ws-border)',
      borderRadius: 'var(--ws-radius-lg)',
    }}
  >
    <ProcessingState current={12} total={18} />
  </div>
);
