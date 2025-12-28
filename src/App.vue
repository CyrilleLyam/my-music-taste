<script setup lang="ts">
import { useMediaControls } from '@vueuse/core'
import { computed, nextTick, ref } from 'vue'

interface Track {
  src: string
  title: string
  subtitle?: string
  fileName: string
}

const audioRef = ref<HTMLAudioElement | null>(null)
const audioModules = import.meta.glob('./assets/audio/*.mp3', { eager: true, as: 'url' })

const tracks = computed<Track[]>(() => {
  const entries = Object.entries(audioModules) as [string, string][]
  return entries
    .map(([path, src]) => {
      const fileName = decodeURIComponent(path.split('/').pop() ?? 'Untitled.mp3')
      const cleanName = fileName.replace(/\.mp3$/i, '')
      const [artist, title] = cleanName.split(' - ').map(part => part?.trim())

      return {
        src,
        fileName,
        title: title || cleanName,
        subtitle: artist || 'Unknown artist',
      }
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base' }))
})

const currentIndex = ref(0)
const currentTrack = computed(() => tracks.value[currentIndex.value] ?? tracks.value[0])

const {
  playing,
  currentTime,
  duration,
  buffered,
  volume,
  muted,
} = useMediaControls(audioRef, {
  src: computed(() => currentTrack.value?.src ?? ''),
})

const progress = computed(() => {
  if (!duration.value)
    return 0
  return Math.min(100, (currentTime.value / duration.value) * 100)
})

const bufferedPercent = computed(() => {
  if (!duration.value || !buffered.value.length)
    return 0
  const lastBufferedEnd = buffered.value[buffered.value.length - 1]?.[1] ?? 0
  return Math.min(100, (lastBufferedEnd / duration.value) * 100)
})

const volumePercent = computed(() => Math.round(volume.value * 100))

const timeLabel = computed(() => ({
  current: formatTime(currentTime.value),
  total: formatTime(duration.value),
}))

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0)
    return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function onSeek(event: Event) {
  if (!duration.value)
    return
  const target = event.target as HTMLInputElement
  const percent = Math.min(100, Math.max(0, Number(target.value)))
  if (Number.isNaN(percent))
    return
  currentTime.value = (percent / 100) * duration.value
}

function onVolume(event: Event) {
  const target = event.target as HTMLInputElement
  const percent = Math.min(100, Math.max(0, Number(target.value)))
  if (Number.isNaN(percent))
    return
  volume.value = percent / 100
  muted.value = percent === 0
}

async function setTrack(index: number, autoplay = true) {
  if (!tracks.value.length)
    return

  const normalized = (index + tracks.value.length) % tracks.value.length
  currentIndex.value = normalized
  await nextTick()

  if (autoplay && audioRef.value) {
    await audioRef.value.play()
  }
}

function togglePlay() {
  if (!tracks.value.length)
    return
  playing.value = !playing.value
}

function setMuted(value: boolean) {
  muted.value = value
}

const playNext = () => setTrack(currentIndex.value + 1)
const playPrev = () => setTrack(currentIndex.value - 1)
const isActive = (index: number) => index === currentIndex.value
</script>

<template>
  <main
    relative
    min-h-screen
    flex
    items-stretch
    overflow-hidden
    font="sans"
    text="white"
    bg="gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800"
  >
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute top-10 h-80 w-80 bg-white/10 blur-[140px] -left-10" />
      <div class="absolute bottom-0 right-4 h-72 w-72 bg-white/5 blur-[130px]" />
      <div class="absolute inset-0 from-white/5 to-transparent bg-gradient-to-b" />
    </div>

    <div class="relative mx-auto max-w-5xl min-h-screen flex flex-1 items-stretch px-6 py-12">
      <div class="grid h-full flex-1 gap-6 md:grid-cols-[1.65fr_1fr]">
        <section
          class="h-full flex flex-col overflow-hidden border border-white/10 rounded-3xl bg-white/5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur-lg"
        >
          <div class="flex flex-1 flex-col gap-6 p-6 sm:p-8">
            <div flex="~ items-center justify-between gap-4">
              <div flex="~ items-center gap-4">
                <div
                  class="h-14 w-14 flex items-center justify-center border border-white/20 rounded-2xl bg-white/10 text-white/80 shadow-inner shadow-white/10"
                >
                  <span class="i-lucide-music-3 text-2xl" />
                </div>
                <div class="space-y-1">
                  <p class="text-xs text-white/60 tracking-[0.2em] uppercase">
                    Now playing
                  </p>
                  <p class="text-lg font-semibold leading-tight">
                    {{ currentTrack?.title || 'Nothing queued' }}
                  </p>
                  <p class="text-sm text-white/60">
                    {{ currentTrack?.subtitle || '' }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs text-white/60 tracking-[0.2em] uppercase">
                  Queue
                </p>
                <p class="text-lg font-mono">
                  {{ tracks.length ? `${currentIndex + 1}/${tracks.length}` : '--/--' }}
                </p>
              </div>
            </div>

            <div class="space-y-3">
              <div class="relative h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  class="absolute inset-y-0 left-0 bg-white/10 transition-all duration-300"
                  :style="{ width: `${bufferedPercent}%` }"
                />
                <div
                  class="absolute inset-y-0 left-0 from-white via-white/70 to-white/40 bg-gradient-to-r shadow-[0_0_18px_rgba(255,255,255,0.25)] transition-all duration-300"
                  :style="{ width: `${progress}%` }"
                />
                <input
                  class="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent"
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  :value="progress"
                  aria-label="Seek through track"
                  @input="onSeek"
                >
              </div>
              <div class="flex items-center justify-between text-sm text-white/70 font-mono">
                <span>{{ timeLabel.current }}</span>
                <span>{{ timeLabel.total }}</span>
              </div>
            </div>

            <div flex="~ wrap items-center justify-between gap-4">
              <div flex="~ items-center gap-3">
                <button
                  class="h-12 w-12 flex items-center justify-center border border-white/10 rounded-2xl bg-white/10 text-white/80 transition active:translate-y-0 hover:border-white/30 hover:text-white hover:-translate-y-0.5"
                  type="button"
                  aria-label="Previous track"
                  @click="playPrev"
                >
                  <span class="i-lucide-skip-back" />
                </button>

                <button
                  class="h-14 w-14 flex items-center justify-center border border-white/60 rounded-2xl bg-white text-neutral-900 font-semibold shadow-lg shadow-white/20 transition active:translate-y-0 hover:-translate-y-0.5"
                  type="button"
                  aria-label="Play or pause"
                  @click="togglePlay"
                >
                  <span :class="playing ? 'i-lucide-pause' : 'i-lucide-play'" class="text-xl" />
                </button>

                <button
                  class="h-12 w-12 flex items-center justify-center border border-white/10 rounded-2xl bg-white/10 text-white/80 transition active:translate-y-0 hover:border-white/30 hover:text-white hover:-translate-y-0.5"
                  type="button"
                  aria-label="Next track"
                  @click="playNext"
                >
                  <span class="i-lucide-skip-forward" />
                </button>
              </div>

              <div class="min-w-[220px] flex flex-1 items-center justify-end gap-3">
                <button
                  class="h-10 w-10 flex items-center justify-center border border-white/10 rounded-xl bg-white/10 text-white/80 transition hover:border-white/30 hover:text-white"
                  type="button"
                  :aria-pressed="muted"
                  aria-label="Mute or unmute"
                  @click="setMuted(!muted)"
                >
                  <span :class="muted ? 'i-lucide-volume-x' : 'i-lucide-volume-2'" />
                </button>

                <div class="flex flex-1 flex-col gap-1">
                  <input
                    class="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    :value="muted ? 0 : volumePercent"
                    aria-label="Volume"
                    @input="onVolume"
                  >
                  <div class="flex items-center justify-between text-[11px] text-white/60 font-mono">
                    <span>Volume</span>
                    <span>{{ muted ? 'Muted' : `${volumePercent}%` }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          class="h-full flex flex-col border border-white/10 rounded-3xl bg-white/5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur-lg"
        >
          <div flex="~ items-center justify-between" class="px-6 pt-6">
            <h2 class="text-lg font-semibold">
              Playlist
            </h2>
            <p class="text-xs text-white/60 tracking-[0.2em] uppercase">
              Tap to jump
            </p>
          </div>

          <div class="px-4 pb-5 pt-3">
            <div v-if="tracks.length" class="space-y-2">
              <button
                v-for="(track, index) in tracks"
                :key="track.fileName"
                class="group w-full flex items-center gap-4 border border-white/5 rounded-2xl bg-white/5 px-4 py-3 text-left transition active:translate-y-0 hover:border-white/30 hover:bg-white/10 hover:-translate-y-0.5"
                :class="isActive(index) ? 'border-white/60 bg-white/10 text-white' : ''"
                type="button"
                @click="setTrack(index)"
              >
                <div
                  class="h-10 w-10 flex items-center justify-center border border-white/10 rounded-2xl bg-white/10 transition group-hover:border-white/40"
                  :class="isActive(index) ? 'border-white/50 bg-white/20 text-white' : 'text-white/70'"
                >
                  <span :class="isActive(index) ? 'i-lucide-waveform' : 'i-lucide-play'" />
                </div>
                <div class="flex-1 space-y-1">
                  <p class="font-medium leading-tight">
                    {{ track.title }}
                  </p>
                  <p class="text-xs text-white/60">
                    {{ track.subtitle }}
                  </p>
                </div>
                <div class="text-xs text-white/60 font-mono opacity-80 group-hover:opacity-100">
                  {{ index === currentIndex ? 'Now' : `#${index + 1}` }}
                </div>
              </button>
            </div>

            <div
              v-else
              class="flex items-center justify-center border border-white/20 rounded-2xl border-dashed bg-white/5 px-4 py-8 text-white/60"
            >
              Drop some .mp3 files in <code class="mx-1 rounded bg-white/10 px-1 py-0.5">src/assets/audio/</code> to
              start listening.
            </div>
          </div>
        </section>
      </div>
    </div>

    <audio
      ref="audioRef"
      class="hidden"
      preload="metadata"
      :src="currentTrack?.src"
      @ended="playNext"
    />
  </main>
</template>
