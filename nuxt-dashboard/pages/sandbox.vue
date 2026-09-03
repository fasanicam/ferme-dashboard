<template>
  <div class="max-w-4xl mx-auto space-y-8 pb-12">

    <!-- Header -->
    <div>
      <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
        <span>🧪</span>
        <span>Sandbox &amp; Testeur MQTT</span>
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Outil interactif pour composer, valider et publier des messages MQTT au format JSON normalisé.
      </p>
    </div>

    <!-- Tab Switcher -->
    <div class="flex gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 w-fit">
      <button
        @click="activeTab = 'dashboard'"
        :class="activeTab === 'dashboard'
          ? 'bg-white dark:bg-[#131D33] text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
      >
        📊 Dashboard
      </button>
      <button
        @click="activeTab = 'ambiance'"
        :class="activeTab === 'ambiance'
          ? 'bg-white dark:bg-[#131D33] text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
      >
        🌡️ Ambiance (partagé)
      </button>
      <button
        @click="activeTab = 'prive'"
        :class="activeTab === 'prive'
          ? 'bg-white dark:bg-[#131D33] text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
      >
        🔒 Privé
      </button>
    </div>

    <!-- ===================== TAB: DASHBOARD ===================== -->
    <div v-if="activeTab === 'dashboard'" class="space-y-6">

      <!-- Quick Presets -->
      <div class="p-6 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Modèles Rapides (Presets)</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(p, idx) in dashboardPresets"
            :key="idx"
            @click="applyDashboardPreset(p)"
            class="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center space-x-2"
          >
            <span>{{ p.icon }}</span>
            <span>{{ p.name }}</span>
            <span class="font-mono text-emerald-600 dark:text-emerald-400">({{ p.valeur }} {{ p.unite }})</span>
          </button>
        </div>
      </div>

      <!-- Dashboard Publisher Form -->
      <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Module / Nom de Projet</label>
            <input v-model="dash.project" type="text" placeholder="ex: serre, ruche, irrigation"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Nom de la Variable</label>
            <input v-model="dash.variable" type="text" placeholder="ex: temperature, humidite_sol, etat"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Valeur</label>
            <input v-model="dash.valeur" type="text" placeholder="ex: 21.4 ou ouverte"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Unité</label>
            <input v-model="dash.unite" type="text" placeholder="ex: °C, cl, kg, %"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Type</label>
            <select v-model="dash.type"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="float">float</option>
              <option value="int">int</option>
              <option value="string">string</option>
              <option value="bool">bool</option>
            </select>
          </div>
        </div>

        <!-- Dateheure -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Horodatage (ISO 8601 UTC)</label>
          <div class="flex gap-2">
            <input v-model="dash.dateheure" type="text" placeholder="2026-01-01T12:00:00Z"
              class="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button @click="dash.dateheure = nowIso()"
              class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all whitespace-nowrap"
            >
              🕐 Maintenant
            </button>
          </div>
        </div>

        <!-- Live Previews -->
        <div class="space-y-3">
          <!-- Topic -->
          <div class="p-4 rounded-2xl border transition-all"
            :class="isDashTopicValid ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'"
          >
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-bold uppercase tracking-wider"
                :class="isDashTopicValid ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'"
              >Topic dashboard</span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                :class="isDashTopicValid ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'"
              >{{ isDashTopicValid ? '✓ Conforme' : '✗ Incomplet' }}</span>
            </div>
            <div class="font-mono text-sm font-bold text-slate-900 dark:text-white break-all">{{ dashTopic }}</div>
          </div>

          <!-- JSON Payload preview -->
          <div class="p-4 rounded-2xl border transition-all"
            :class="dashPayloadError ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800' : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider"
                :class="dashPayloadError ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'"
              >Payload JSON</span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                :class="dashPayloadError ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200' : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'"
              >{{ dashPayloadError ? '✗ Invalide' : '✓ Valide' }}</span>
            </div>
            <pre class="font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all" v-html="syntaxHighlight(dashPayloadPreview)"></pre>
            <p v-if="dashPayloadError" class="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">⚠️ {{ dashPayloadError }}</p>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <button
            @click="publishDashboard"
            :disabled="dashPublishing || !!dashPayloadError || !isDashTopicValid"
            class="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            <Send :size="16" :class="{ 'animate-pulse': dashPublishing }" />
            <span>{{ dashPublishing ? 'Publication...' : 'Publier sur le broker MQTT' }}</span>
          </button>
          <span v-if="dashSuccess" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 :size="16" /><span>{{ dashSuccess }}</span>
          </span>
          <span v-if="dashError" class="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle :size="16" /><span>{{ dashError }}</span>
          </span>
        </div>
      </div>

      <!-- Guide Dashboard -->
      <div class="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400">
        <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm">📖 Guide — Dashboard (affichage public)</h4>
        <div class="space-y-1">
          <p>Topic : <code class="font-mono text-emerald-600 dark:text-emerald-400">bzh/mecatro/dashboard/&lt;PROJET&gt;/&lt;VARIABLE&gt;</code></p>
          <p>Payload <strong>JSON obligatoire</strong> avec les 4 champs :</p>
          <pre class="p-3 rounded-xl bg-white dark:bg-slate-950 font-mono text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-[11px]" v-html="syntaxHighlight(exampleDashPayload)"></pre>
        </div>
        <p>L'affichage sur le dashboard sera : <strong>"{{ dashDisplayPreview }}"</strong></p>
        <div class="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold">
          ⏱️ Fréquence max : 1 message toutes les 5 secondes <strong>par topic</strong> (c.-à-d. par couple <code class="font-mono">projet:variable</code>).
        </div>
      </div>

    </div>

    <!-- ===================== TAB: AMBIANCE ===================== -->
    <div v-if="activeTab === 'ambiance'" class="space-y-6">

      <!-- Ambiance Presets -->
      <div class="p-6 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Modèles Rapides d'Ambiance</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(p, idx) in ambiancePresets"
            :key="idx"
            @click="applyAmbiancePreset(p)"
            class="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-violet-50 dark:hover:bg-violet-950/60 border border-slate-200 dark:border-slate-800 hover:border-violet-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center space-x-2"
          >
            <span>{{ p.icon }}</span>
            <span>{{ p.name }}</span>
            <span class="font-mono text-violet-600 dark:text-violet-400">({{ p.valeur }} {{ p.unite }})</span>
          </button>
        </div>
      </div>

      <!-- Ambiance Publisher Form -->
      <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Grandeur physique</label>
            <select v-model="amb.grandeur" @change="onGrandeurChange"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option v-for="(meta, key) in grandeurs" :key="key" :value="key">{{ key }} — {{ meta.unite }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Nom du Groupe</label>
            <input v-model="amb.groupe" type="text" placeholder="ex: serre, ruche, station_meteo"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Valeur</label>
            <input v-model.number="amb.valeur" type="number" step="any" placeholder="ex: 21.4"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Unité</label>
            <input v-model="amb.unite" type="text" placeholder="°C, %, hPa..."
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Type</label>
            <select v-model="amb.type"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="float">float</option>
              <option value="int">int</option>
              <option value="bool">bool</option>
              <option value="string">string</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Horodatage (ISO 8601 UTC)</label>
          <div class="flex gap-2">
            <input v-model="amb.dateheure" type="text" placeholder="2026-01-01T12:00:00Z"
              class="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button @click="amb.dateheure = nowIso()"
              class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all whitespace-nowrap"
            >🕐 Maintenant</button>
          </div>
        </div>

        <!-- Live previews -->
        <div class="space-y-3">
          <div class="p-4 rounded-2xl border transition-all"
            :class="isAmbTopicValid ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-300 dark:border-violet-800' : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'"
          >
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-bold uppercase tracking-wider"
                :class="isAmbTopicValid ? 'text-violet-800 dark:text-violet-300' : 'text-rose-800 dark:text-rose-300'"
              >Topic ambiance</span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                :class="isAmbTopicValid ? 'bg-violet-200 text-violet-900 dark:bg-violet-900 dark:text-violet-200' : 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'"
              >{{ isAmbTopicValid ? '✓ Conforme' : '✗ Incomplet' }}</span>
            </div>
            <div class="font-mono text-sm font-bold text-slate-900 dark:text-white break-all">{{ ambTopic }}</div>
          </div>

          <div class="p-4 rounded-2xl border transition-all"
            :class="ambPayloadError ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800' : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider"
                :class="ambPayloadError ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'"
              >Payload JSON</span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                :class="ambPayloadError ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200' : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'"
              >{{ ambPayloadError ? '✗ Invalide' : '✓ Valide' }}</span>
            </div>
            <pre class="font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all" v-html="syntaxHighlight(ambPayloadPreview)"></pre>
            <p v-if="ambPayloadError" class="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">⚠️ {{ ambPayloadError }}</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <button
            @click="publishAmbiance"
            :disabled="ambPublishing || !!ambPayloadError || !isAmbTopicValid"
            class="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md shadow-violet-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            <Send :size="16" :class="{ 'animate-pulse': ambPublishing }" />
            <span>{{ ambPublishing ? 'Publication...' : 'Publier (retain=true)' }}</span>
          </button>
          <span v-if="ambSuccess" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 :size="16" /><span>{{ ambSuccess }}</span>
          </span>
          <span v-if="ambError" class="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle :size="16" /><span>{{ ambError }}</span>
          </span>
        </div>
      </div>

      <!-- Guide Ambiance -->
      <div class="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400">
        <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm">📖 Guide — Ambiance (données partagées)</h4>
        <div class="space-y-1">
          <p>Topic : <code class="font-mono text-violet-600 dark:text-violet-400">bzh/mecatro/ambiance/&lt;GROUPE&gt;/&lt;GRANDEUR&gt;</code></p>
          <p>Même format JSON que le dashboard. Flag <strong>retain=true obligatoire</strong>.</p>
        </div>
        <p class="text-amber-600 dark:text-amber-400 font-semibold">⚠️ Fréquence max : entre 0.1 et 0.2 Hz (1 message toutes les 5 à 10 s) <strong>par topic</strong> (c.-à-d. par couple <code class="font-mono">groupe:grandeur</code>).</p>
      </div>

    </div>

    <!-- ===================== TAB: PRIVE ===================== -->
    <div v-if="activeTab === 'prive'" class="space-y-6">

      <!-- Presets -->
      <div class="p-6 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Exemples Rapides</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(p, idx) in privePresets"
            :key="idx"
            @click="applyPrivePreset(p)"
            class="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-orange-50 dark:hover:bg-orange-950/60 border border-slate-200 dark:border-slate-800 hover:border-orange-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center space-x-2"
          >
            <span>{{ p.icon }}</span>
            <span>{{ p.name }}</span>
            <span class="font-mono text-orange-600 dark:text-orange-400">{{ p.canal }}/{{ p.nom }}</span>
          </button>
        </div>
      </div>

      <!-- Prive Publisher Form -->
      <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Nom du Projet</label>
            <input v-model="priv.projet" type="text" placeholder="ex: miamconnect, serre, ruche"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Canal</label>
            <select v-model="priv.canal"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="capteurs">capteurs (Pico → App)</option>
              <option value="actionneurs">actionneurs (App → Pico)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Nom du capteur / actionneur</label>
          <input v-model="priv.nom" type="text" placeholder="ex: poids, pompe, moteur, presence"
            class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Payload (libre — texte, nombre, JSON…)</label>
          <textarea v-model="priv.payload" rows="3" :placeholder="'ex: 120 ou ON ou {\'vitesse\': 80}'"
            class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        <!-- Topic Preview -->
        <div class="space-y-3">
          <div class="p-4 rounded-2xl border transition-all"
            :class="isPrivTopicValid ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800' : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'"
          >
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-bold uppercase tracking-wider"
                :class="isPrivTopicValid ? 'text-orange-800 dark:text-orange-300' : 'text-rose-800 dark:text-rose-300'"
              >Topic privé</span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                :class="isPrivTopicValid ? 'bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-200' : 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'"
              >{{ isPrivTopicValid ? '✓ Conforme' : '✗ Incomplet' }}</span>
            </div>
            <div class="font-mono text-sm font-bold text-slate-900 dark:text-white break-all">{{ privTopic }}</div>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <button
            @click="publishPrive"
            :disabled="privPublishing || !isPrivTopicValid || !priv.payload.trim()"
            class="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            <Send :size="16" :class="{ 'animate-pulse': privPublishing }" />
            <span>{{ privPublishing ? 'Publication...' : 'Publier sur le canal privé' }}</span>
          </button>
          <span v-if="privSuccess" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 :size="16" /><span>{{ privSuccess }}</span>
          </span>
          <span v-if="privError" class="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle :size="16" /><span>{{ privError }}</span>
          </span>
        </div>
      </div>

      <!-- Guide Privé -->
      <div class="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400">
        <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm">📖 Guide — Espace Privé (télécommande interne)</h4>
        <div class="space-y-1">
          <p>Capteurs (Pico → App) : <code class="font-mono text-orange-600 dark:text-orange-400">bzh/mecatro/prive/&lt;PROJET&gt;/capteurs/&lt;NOM&gt;</code></p>
          <p>Actionneurs (App → Pico) : <code class="font-mono text-orange-600 dark:text-orange-400">bzh/mecatro/prive/&lt;PROJET&gt;/actionneurs/&lt;NOM&gt;</code></p>
          <p>Payload <strong>libre</strong> — texte, nombre, JSON, ON/OFF… Format non contraint.</p>
        </div>
        <div class="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold">
          🔒 Ce canal est privé : seuls vos appareils abonnés à <code class="font-mono">bzh/mecatro/prive/&lt;PROJET&gt;/#</code> reçoivent vos messages.
        </div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { Send, CheckCircle2, AlertCircle } from 'lucide-vue-next'

// ===================== PRIVE =====================
const priv = reactive({
  projet: 'miamconnect',
  canal: 'actionneurs',
  nom: 'moteur',
  payload: 'ON'
})
const privPublishing = ref(false)
const privSuccess = ref('')
const privError = ref('')

const privePresets = [
  { icon: '🍗', name: 'Distribuer',    projet: 'miamconnect', canal: 'actionneurs', nom: 'moteur',   payload: 'ON'  },
  { icon: '💧', name: 'Remplir eau',   projet: 'miamconnect', canal: 'actionneurs', nom: 'pompe',    payload: 'ON'  },
  { icon: '⚖️', name: 'Poids',         projet: 'miamconnect', canal: 'capteurs',    nom: 'poids',    payload: '120' },
  { icon: '🚪', name: 'Trappe',        projet: 'poulailler',  canal: 'actionneurs', nom: 'trappe',   payload: 'OPEN'},
  { icon: '📡', name: 'Présence',      projet: 'miamconnect', canal: 'capteurs',    nom: 'presence', payload: '1'   },
]

function applyPrivePreset(p: any) {
  priv.projet = p.projet
  priv.canal = p.canal
  priv.nom = p.nom
  priv.payload = p.payload
  privSuccess.value = ''
  privError.value = ''
}

const privTopic = computed(() =>
  `bzh/mecatro/prive/${priv.projet.trim() || '<PROJET>'}/${priv.canal}/${priv.nom.trim() || '<NOM>'}`
)
const isPrivTopicValid = computed(() =>
  priv.projet.trim().length > 0 && priv.nom.trim().length > 0
)

async function publishPrive() {
  privPublishing.value = true
  privSuccess.value = ''
  privError.value = ''
  try {
    const res = await $fetch<{ success: boolean; topic: string }>('/api/test/publish', {
      method: 'POST',
      body: { customTopic: privTopic.value, value: priv.payload }
    })
    if (res?.success) privSuccess.value = `Publié sur ${res.topic} ✓`
  } catch (err: any) {
    privError.value = err.data?.message || err.message || 'Erreur lors de la publication'
  } finally {
    privPublishing.value = false
  }
}

function syntaxHighlight(json: string) {
  if (!json) return '';
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'text-amber-600 dark:text-amber-400'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-indigo-600 dark:text-indigo-400 font-semibold'; // key
      } else {
        cls = 'text-emerald-600 dark:text-emerald-400'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-rose-600 dark:text-rose-400 font-semibold'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-slate-500 dark:text-slate-400 italic'; // null
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

const activeTab = ref<'dashboard' | 'ambiance' | 'prive'>('dashboard')

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

// ---- Grandeurs normalisées ----
const grandeurs: Record<string, { unite: string; type: string }> = {
  temperature:  { unite: '°C',   type: 'float' },
  humidite:     { unite: '%',    type: 'float' },
  pression:     { unite: 'hPa', type: 'int'   },
  luminosite:   { unite: 'lx',  type: 'int'   },
  co2:          { unite: 'ppm', type: 'int'   },
  qualite_air:  { unite: 'IAQ', type: 'int'   },
  bruit:        { unite: 'dB',  type: 'int'   },
  pluvio:       { unite: 'mm/h',type: 'float' },
  vent_vitesse: { unite: 'km/h',type: 'float' },
}

// ===================== DASHBOARD =====================
const dash = reactive({
  project: 'serre',
  variable: 'temperature',
  valeur: '22.4',
  unite: '°C',
  type: 'float',
  dateheure: nowIso()
})
const dashPublishing = ref(false)
const dashSuccess = ref('')
const dashError = ref('')

const dashboardPresets = [
  { icon: '🌡️', name: 'Température Serre',  project: 'serre',      variable: 'temperature',  valeur: '22.8', unite: '°C',  type: 'float' },
  { icon: '💧', name: 'Humidité Sol',       project: 'serre',      variable: 'humidite_sol', valeur: '64',   unite: '%',   type: 'int'   },
  { icon: '🐝', name: 'Poids Ruche',        project: 'ruche',      variable: 'poids_kg',     valeur: '32.6', unite: 'kg',  type: 'float' },
  { icon: '🚪', name: 'Porte Poulailler',   project: 'poulailler', variable: 'trappe',       valeur: 'ouverte', unite: 'enumeration', type: 'string' },
  { icon: '⛅', name: 'Pluviométrie',       project: 'meteo',      variable: 'pluie_mm',     valeur: '4.2',  unite: 'mm/h',type: 'float' },
]

function applyDashboardPreset(p: any) {
  dash.project = p.project
  dash.variable = p.variable
  dash.valeur = p.valeur
  dash.unite = p.unite
  dash.type = p.type
  dash.dateheure = nowIso()
  dashSuccess.value = ''
  dashError.value = ''
}

const dashTopic = computed(() => {
  const p = dash.project.trim() || '<projet>'
  const v = dash.variable.trim() || '<variable>'
  return `bzh/mecatro/dashboard/${p}/${v}`
})

const isDashTopicValid = computed(() => dash.project.trim().length > 0 && dash.variable.trim().length > 0)

// Parse valeur according to declared type for preview
const parsedDashValeur = computed(() => {
  if (dash.type === 'float') return parseFloat(dash.valeur)
  if (dash.type === 'int') return parseInt(dash.valeur)
  if (dash.type === 'bool') return dash.valeur === 'true' || dash.valeur === '1'
  return dash.valeur
})

const dashPayloadPreview = computed(() => JSON.stringify({
  valeur: parsedDashValeur.value,
  unite: dash.unite,
  type: dash.type,
  dateheure: dash.dateheure
}, null, 2))

const dashDisplayPreview = computed(() => {
  if (dash.type === 'float' || dash.type === 'int') return `${parsedDashValeur.value} ${dash.unite}`
  return String(parsedDashValeur.value)
})

const exampleDashPayload = `{
  "valeur": 21.4,
  "unite": "°C",
  "type": "float",
  "dateheure": "2026-08-28T15:21:00Z"
}`

const dashPayloadError = computed<string | null>(() => {
  const v = parsedDashValeur.value
  if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) return 'Valeur invalide pour le type sélectionné'
  if (!dash.unite.trim()) return 'Champ "unite" manquant'
  if (!['float', 'int', 'bool', 'string'].includes(dash.type)) return 'Type invalide'
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
  if (!iso.test(dash.dateheure)) return 'Horodatage ISO 8601 invalide'
  return null
})

async function publishDashboard() {
  dashPublishing.value = true
  dashSuccess.value = ''
  dashError.value = ''
  try {
    const res = await $fetch<{ success: boolean; topic: string }>('/api/test/publish', {
      method: 'POST',
      body: {
        mode: 'dashboard',
        project: dash.project,
        variable: dash.variable,
        valeur: parsedDashValeur.value,
        unite: dash.unite,
        type: dash.type,
        dateheure: dash.dateheure
      }
    })
    if (res?.success) dashSuccess.value = `Publié sur ${res.topic} ✓`
  } catch (err: any) {
    dashError.value = err.data?.message || err.message || 'Erreur lors de la publication'
  } finally {
    dashPublishing.value = false
  }
}

// ===================== AMBIANCE =====================
const amb = reactive({
  grandeur: 'temperature',
  groupe: 'serre',
  valeur: 21.4,
  unite: '°C',
  type: 'float',
  dateheure: nowIso()
})
const ambPublishing = ref(false)
const ambSuccess = ref('')
const ambError = ref('')

const ambiancePresets = [
  { icon: '🌡️', name: 'Température',   grandeur: 'temperature',  groupe: 'serre',         valeur: 22.1, unite: '°C',   type: 'float' },
  { icon: '💧', name: 'Humidité',      grandeur: 'humidite',     groupe: 'ruche',         valeur: 67.3, unite: '%',    type: 'float' },
  { icon: '🌬️', name: 'Pression',      grandeur: 'pression',     groupe: 'station_meteo', valeur: 1013, unite: 'hPa',  type: 'int'   },
  { icon: '☀️', name: 'Luminosité',    grandeur: 'luminosite',   groupe: 'vigne',         valeur: 8400, unite: 'lx',   type: 'int'   },
  { icon: '🌿', name: 'CO₂',          grandeur: 'co2',          groupe: 'etable',        valeur: 820,  unite: 'ppm',  type: 'int'   },
  { icon: '💨', name: 'Vent',         grandeur: 'vent_vitesse', groupe: 'eolienne',      valeur: 14.5, unite: 'km/h', type: 'float' },
]

function onGrandeurChange() {
  const meta = grandeurs[amb.grandeur]
  if (meta) { amb.unite = meta.unite; amb.type = meta.type }
}

function applyAmbiancePreset(p: any) {
  amb.grandeur = p.grandeur; amb.groupe = p.groupe
  amb.valeur = p.valeur; amb.unite = p.unite; amb.type = p.type
  amb.dateheure = nowIso()
  ambSuccess.value = ''; ambError.value = ''
}

const ambTopic = computed(() => `bzh/mecatro/ambiance/${amb.groupe.trim() || '<GROUPE>'}/${amb.grandeur.trim() || '<GRANDEUR>'}`)
const isAmbTopicValid = computed(() => amb.grandeur.trim().length > 0 && amb.groupe.trim().length > 0 && amb.grandeur in grandeurs)

const ambPayloadPreview = computed(() => JSON.stringify({
  valeur: amb.valeur, unite: amb.unite, type: amb.type, dateheure: amb.dateheure
}, null, 2))

const ambPayloadError = computed<string | null>(() => {
  if (amb.valeur === null || amb.valeur === undefined) return 'Valeur manquante'
  if (!amb.unite?.trim()) return 'Unité manquante'
  if (!['float', 'int', 'bool', 'string'].includes(amb.type)) return 'Type invalide'
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
  if (!amb.dateheure || !iso.test(amb.dateheure)) return 'Horodatage ISO 8601 invalide'
  return null
})

async function publishAmbiance() {
  ambPublishing.value = true
  ambSuccess.value = ''; ambError.value = ''
  try {
    const res = await $fetch<{ success: boolean; topic: string }>('/api/test/publish', {
      method: 'POST',
      body: { mode: 'ambiance', grandeur: amb.grandeur, groupe: amb.groupe, valeur: amb.valeur, unite: amb.unite, type: amb.type, dateheure: amb.dateheure }
    })
    if (res?.success) ambSuccess.value = `Publié sur ${res.topic} (retain=true) ✓`
  } catch (err: any) {
    ambError.value = err.data?.message || err.message || 'Erreur'
  } finally {
    ambPublishing.value = false
  }
}
</script>
