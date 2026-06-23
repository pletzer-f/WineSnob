import { CaptureBar } from 'winesnob-design-system';

export const SnapLabel = () => (
  <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
    <CaptureBar mode="label" />
  </div>
);

export const VoiceMode = () => (
  <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
    <CaptureBar mode="voice" />
  </div>
);
