import { Toast } from 'winesnob-design-system'
import { useStore } from '@/store/store'

export function Toaster() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 60 }}>
      <Toast message={toast} tone="success" />
    </div>
  )
}
