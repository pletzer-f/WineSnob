import { SignIn } from 'winesnob-design-system';

export const Welcome = () => (
  <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
    <SignIn
      mode="signin"
      footer={
        <span>
          New here? <span style={{ color: 'var(--ws-bordeaux)' }}>Create a cellar</span>
        </span>
      }
    />
  </div>
);
