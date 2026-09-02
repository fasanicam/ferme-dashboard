<template>
  <div class="relative overflow-hidden rounded-2xl p-5 bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all group">
    <!-- Ambient background glow -->
    <div
      class="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40"
      :class="glowColorClass"
    ></div>

    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {{ title }}
        </p>
        <h3 class="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 dark:text-white tracking-tight">
          {{ value }}
        </h3>
        <p v-if="subtitle" class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
          <span v-if="trend" :class="trendClass">{{ trend }}</span>
          <span>{{ subtitle }}</span>
        </p>
      </div>

      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner"
        :class="iconBgClass"
      >
        <component :is="icon" :size="24" :class="iconColorClass" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  value: string | number
  subtitle?: string
  trend?: string
  trendType?: 'positive' | 'negative' | 'neutral'
  icon: Component
  variant?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'blue'
}>(), {
  variant: 'emerald',
  trendType: 'positive'
})

const glowColorClass = computed(() => {
  switch (props.variant) {
    case 'emerald': return 'bg-emerald-500'
    case 'cyan': return 'bg-cyan-500'
    case 'purple': return 'bg-purple-500'
    case 'amber': return 'bg-amber-500'
    case 'blue': return 'bg-blue-500'
    default: return 'bg-emerald-500'
  }
})

const iconBgClass = computed(() => {
  switch (props.variant) {
    case 'emerald': return 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50'
    case 'cyan': return 'bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/50'
    case 'purple': return 'bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50'
    case 'amber': return 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50'
    case 'blue': return 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50'
    default: return 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50'
  }
})

const iconColorClass = computed(() => {
  switch (props.variant) {
    case 'emerald': return 'text-emerald-600 dark:text-emerald-400'
    case 'cyan': return 'text-cyan-600 dark:text-cyan-400'
    case 'purple': return 'text-purple-600 dark:text-purple-400'
    case 'amber': return 'text-amber-600 dark:text-amber-400'
    case 'blue': return 'text-blue-600 dark:text-blue-400'
    default: return 'text-emerald-600 dark:text-emerald-400'
  }
})

const trendClass = computed(() => {
  if (props.trendType === 'positive') return 'text-emerald-600 dark:text-emerald-400 font-semibold'
  if (props.trendType === 'negative') return 'text-rose-600 dark:text-rose-400 font-semibold'
  return 'text-slate-500 font-medium'
})
</script>
