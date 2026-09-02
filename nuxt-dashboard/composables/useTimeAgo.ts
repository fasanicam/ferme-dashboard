// composables/useTimeAgo.ts
export function useTimeAgo() {
  const now = ref(Date.now())
  let timer: any = null

  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 5000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  function formatTimeAgo(timestampIso?: string | null): string {
    if (!timestampIso) return 'inconnu'
    try {
      const date = new Date(timestampIso)
      const diffSec = Math.max(0, Math.floor((now.value - date.getTime()) / 1000))

      if (diffSec < 5) return "à l'instant"
      if (diffSec < 60) return `il y a ${diffSec}s`
      const min = Math.floor(diffSec / 60)
      if (min < 60) return `il y a ${min} min`
      const hours = Math.floor(min / 60)
      if (hours < 24) return `il y a ${hours}h`
      const days = Math.floor(hours / 24)
      if (days < 7) return `il y a ${days}j`
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    } catch {
      return String(timestampIso)
    }
  }

  return { formatTimeAgo, now }
}
