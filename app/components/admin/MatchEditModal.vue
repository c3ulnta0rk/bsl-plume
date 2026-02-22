<script setup lang="ts">
import type { PoolMatch, KnockoutMatch } from '~/types/tournament'

const props = defineProps<{
  match: PoolMatch | KnockoutMatch | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()

const saving = ref(false)

const form = reactive({
  status: 'pending',
  court: '',
  scheduledAt: '',
  winnerId: '' as string | null
})

const editSets = ref<Array<{ id: string | null, setNumber: number, score1: number, score2: number }>>([])
const setsToDelete = ref<string[]>([])

// Sync form when match changes
watch(() => props.match, (m) => {
  if (!m) return
  form.status = m.status
  form.court = m.court ?? ''
  form.scheduledAt = m.scheduledAt ? m.scheduledAt.slice(0, 16) : ''
  form.winnerId = m.winnerId
  editSets.value = m.sets.map(s => ({
    id: s.id,
    setNumber: s.setNumber,
    score1: s.score1,
    score2: s.score2
  }))
  setsToDelete.value = []
}, { immediate: true })

const statusOptions = computed(() => [
  { label: t('matches.statuses.pending'), value: 'pending' },
  { label: t('matches.statuses.in_progress'), value: 'in_progress' },
  { label: t('matches.statuses.completed'), value: 'completed' }
])

const winnerOptions = computed(() => {
  if (!props.match) return []
  const options: Array<{ label: string, value: string | null }> = [
    { label: t('common.none'), value: null }
  ]
  if (props.match.team1Id && props.match.team1Name) {
    options.push({ label: props.match.team1Name, value: props.match.team1Id })
  }
  if (props.match.team2Id && props.match.team2Name) {
    options.push({ label: props.match.team2Name, value: props.match.team2Id })
  }
  return options
})

function addSet() {
  const nextNumber = editSets.value.length > 0
    ? Math.max(...editSets.value.map(s => s.setNumber)) + 1
    : 1
  editSets.value.push({ id: null, setNumber: nextNumber, score1: 0, score2: 0 })
}

function removeSet(index: number) {
  const removed = editSets.value.splice(index, 1)
  if (removed[0]?.id) {
    setsToDelete.value.push(removed[0].id)
  }
}

async function save() {
  if (!props.match) return
  saving.value = true

  try {
    // 1. Update match
    await $fetch(`/api/admin/matches/${props.match.id}`, {
      method: 'PUT',
      body: {
        status: form.status,
        court: form.court || null,
        scheduledAt: form.scheduledAt || null,
        winnerId: form.winnerId || null
      }
    })

    // 2. Delete removed sets
    for (const setId of setsToDelete.value) {
      await $fetch(`/api/admin/sets/${setId}`, { method: 'DELETE' })
    }

    // 3. Create/update sets
    for (const s of editSets.value) {
      if (s.id) {
        await $fetch(`/api/admin/sets/${s.id}`, {
          method: 'PUT',
          body: { score1: s.score1, score2: s.score2 }
        })
      } else {
        await $fetch('/api/admin/sets', {
          method: 'POST',
          body: {
            matchId: props.match.id,
            setNumber: s.setNumber,
            score1: s.score1,
            score2: s.score2
          }
        })
      }
    }

    open.value = false
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('matches.editMatch')"
  >
    <template #body>
      <div
        v-if="match"
        class="flex flex-col gap-4"
      >
        <!-- Teams display -->
        <div class="flex items-center justify-between text-sm font-medium bg-elevated rounded-lg px-3 py-2">
          <span>{{ match.team1Name ?? t('matches.tbd') }}</span>
          <span class="text-muted">vs</span>
          <span>{{ match.team2Name ?? t('matches.tbd') }}</span>
        </div>

        <!-- Status -->
        <UFormField :label="t('matches.fields.status')">
          <USelect
            v-model="form.status"
            :items="statusOptions"
            value-key="value"
          />
        </UFormField>

        <!-- Court -->
        <UFormField :label="t('matches.fields.court')">
          <UInput
            v-model="form.court"
            :placeholder="t('matches.fields.court')"
          />
        </UFormField>

        <!-- Scheduled time -->
        <UFormField :label="t('matches.fields.scheduledAt')">
          <UInput
            v-model="form.scheduledAt"
            type="datetime-local"
          />
        </UFormField>

        <!-- Winner (only when completed) -->
        <UFormField
          v-if="form.status === 'completed'"
          :label="t('matches.fields.winner')"
        >
          <USelect
            v-model="form.winnerId"
            :items="winnerOptions"
            value-key="value"
          />
        </UFormField>

        <!-- Sets -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">{{ t('sets.title') }}</span>
            <UButton
              variant="outline"
              size="xs"
              icon="i-lucide-plus"
              @click="addSet"
            >
              {{ t('sets.addSet') }}
            </UButton>
          </div>
          <div class="flex flex-col gap-2">
            <div
              v-for="(s, i) in editSets"
              :key="i"
              class="flex items-center gap-2"
            >
              <span class="text-xs text-muted w-12 shrink-0">{{ t('sets.set', { n: s.setNumber }) }}</span>
              <UInput
                v-model.number="s.score1"
                type="number"
                :min="0"
                size="sm"
                class="w-16"
              />
              <span class="text-muted">-</span>
              <UInput
                v-model.number="s.score2"
                type="number"
                :min="0"
                size="sm"
                class="w-16"
              />
              <UButton
                variant="ghost"
                color="error"
                size="xs"
                icon="i-lucide-trash-2"
                :aria-label="t('sets.removeSet')"
                @click="removeSet(i)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          @click="open = false"
        >
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          :loading="saving"
          @click="save"
        >
          {{ t('common.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
