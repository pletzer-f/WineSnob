import { formatMoney } from '@/domain/currency'
import { useStore } from '@/store/store'

/** A currency-aware money formatter bound to the active settings. */
export function useMoney() {
  const currency = useStore((s) => s.settings.currency)
  return (n: number) => formatMoney(n, currency)
}
