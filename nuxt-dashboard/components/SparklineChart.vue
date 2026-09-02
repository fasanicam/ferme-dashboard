<template>
  <div class="w-full h-8 flex items-center">
    <svg
      v-if="points.length > 1"
      class="w-full h-full overflow-visible"
      viewBox="0 0 120 32"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#10B981" stop-opacity="0.0" />
        </linearGradient>
      </defs>

      <!-- Fill Area -->
      <path
        :d="areaPath"
        :fill="`url(#${gradientId})`"
      />

      <!-- Stroke Line -->
      <path
        :d="linePath"
        fill="none"
        stroke="#10B981"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Last point dot -->
      <circle
        v-if="lastPoint"
        :cx="lastPoint.x"
        :cy="lastPoint.y"
        r="2.5"
        fill="#10B981"
        stroke="#FFFFFF"
        stroke-width="1"
      />
    </svg>
    <div v-else class="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  data?: number[]
  id?: string
}>(), {
  data: () => [],
  id: () => `spark_${Math.random().toString(36).slice(2, 8)}`
})

const gradientId = computed(() => `grad_${props.id.replace(/[^a-zA-Z0-9]/g, '_')}`)

const points = computed(() => {
  if (!props.data || props.data.length < 2) return []

  const min = Math.min(...props.data)
  const max = Math.max(...props.data)
  const range = max - min === 0 ? 1 : max - min
  const width = 120
  const height = 28 // Leave margin for stroke
  const padding = 2

  return props.data.map((val, idx) => {
    const x = (idx / (props.data.length - 1)) * width
    const normalizedY = (val - min) / range
    // Invert y because SVG y goes downwards
    const y = height - (normalizedY * (height - padding * 2)) + padding
    return { x, y }
  })
})

const linePath = computed(() => {
  if (points.value.length === 0) return ''
  return points.value.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
  }, '')
})

const areaPath = computed(() => {
  if (points.value.length === 0) return ''
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${linePath.value} L ${last.x.toFixed(1)} 32 L ${first.x.toFixed(1)} 32 Z`
})

const lastPoint = computed(() => {
  if (points.value.length === 0) return null
  return points.value[points.value.length - 1]
})
</script>
