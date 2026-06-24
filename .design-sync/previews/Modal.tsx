import { Modal, Button } from 'winesnob-design-system';

export const Confirm = () => (
  <div
    style={{
      position: 'relative',
      transform: 'translateZ(0)',
      width: '100%',
      maxWidth: 540,
      height: 380,
      borderRadius: 'var(--ws-radius-lg)',
      overflow: 'hidden',
    }}
  >
    <Modal
      open
      title="Remove from the cellar?"
      footer={
        <>
          <Button variant="ghost">Keep it</Button>
          <Button variant="primary">Remove</Button>
        </>
      }
    >
      This removes the last bottle of Château Margaux 2015 from your cellar. Your tasting notes stay.
    </Modal>
  </div>
);
