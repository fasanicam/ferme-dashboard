<template>
  <div class="rounded-2xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col h-full">
    
    <!-- Header -->
    <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
      <div class="flex items-center space-x-2.5">
        <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
          <Radio :size="16" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Flux MQTT en direct
            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-normal">
              {{ store.messages.length }} msgs
            </span>
          </h3>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-1">
        <button
          @click="isPaused = !isPaused"
          class="p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
          :class="isPaused ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'"
          :title="isPaused ? 'Reprendre le défilement' : 'Mettre en pause le flux'"
        >
          <Pause v-if="!isPaused" :size="14" />
          <Play v-else :size="14" />
          <span class="text-[11px]">{{ isPaused ? 'En pause' : 'Pause' }}</span>
        </button>

        <button
          @click="clearMessages"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Effacer l'affichage"
        >
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <!-- Messages Log List -->
    <div
      ref="feedContainer"
      class="p-3 overflow-y-auto flex-1 space-y-2 font-mono text-xs max-h-[380px]"
      style="scrollbar-width: thin;"
    >
      <div v-if="displayedMessages.length === 0" class="py-12 text-center text-slate-400 font-sans text-sm">
        En attente de messages MQTT...
      </div>

      <div
        v-for="(msg, idx) in displayedMessages"
        :key="idx"
        class="p-2.5 rounded-xl border transition-all flex flex-col gap-1.5"
        :class="msg.is_compliant !== false
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
          : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 hover:border-rose-300'"
      >
        <div class="flex items-center justify-between gap-2">
          <!-- Topic -->
          <span class="font-semibold truncate" :class="msg.is_compliant !== false ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'" :title="msg.topic">
            {{ msg.topic }}
          </span>

          <!-- Timestamp -->
          <span class="text-[10px] text-slate-400 flex-shrink-0">
            {{ formatTimeAgo(msg.timestamp) }}
          </span>
        </div>

        <div class="flex items-center justify-between gap-2">
          <!-- Payload -->
          <div class="flex items-center space-x-1.5 overflow-hidden">
            <span class="text-[10px] uppercase text-slate-400 select-none">val:</span>
            <span class="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 truncate">
              {{ msg.payload }}
            </span>
          </div>

          <!-- Compliance tag -->
          <span
            v-if="msg.is_compliant === false"
            class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex-shrink-0"
          >
            Non conforme
          </span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { Radio, Pause, Play, Trash2 } from 'lucide-vue-next'
import { useDashboardStore } from '../stores/dashboard'
import { useTimeAgo } from '../composables/useTimeAgo'

const store = useDashboardStore()
const { formatTimeAgo } = useTimeAgo()

const isPaused = ref(false)
const pausedSnapshot = ref<any[]>([])

const displayedMessages = computed(() => {
  if (isPaused.value) {
    return pausedSnapshot.value
  }
  return store.messages
})

watch(isPaused, (paused) => {
  if (paused) {
    pausedSnapshot.value = [...store.messages]
  }
})

function clearMessages() {
  store.messages = []
  pausedSnapshot.value = []
}
</script>
