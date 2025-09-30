<template>
  <div class="test-page container">
    <section v-for="section in sections" :key="section.key" class="section">
      <h2 class="section-title">{{ section.label }}</h2>

      <ul class="list">
        <li v-for="item in section.items" :key="item.id" class="list-item">
          <div class="item-title">{{ item.title }}</div>
          <div class="item-time">{{ formatTime(item.time) }}</div>
        </li>
        <li v-if="section.items.length === 0" class="empty">No items</li>
      </ul>

      <div class="controls">
        <button @click="refreshSection(section.key)">Refresh</button>
        <span v-if="loading[section.key]" class="loading">Loading…</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'

const sections = reactive([
  { key: 'news', label: 'Food', items: [] },
  { key: 'events', label: 'Sports', items: [] },
  { key: 'articles', label: 'Hobby', items: [] },
])

const loading = reactive({ news: false, events: false, articles: false })

function normalizeWhen(value) {
  if (!value) return ''
  if (typeof value === 'object') {
    if (value._seconds) return new Date(value._seconds * 1000).toISOString()
    if (typeof value.toDate === 'function') return value.toDate().toISOString()
  }
  if (typeof value === 'string') return value
  try {
    return new Date(value).toISOString()
  } catch {
    return ''
  }
}

async function fetchBubbles() {
  loading.news = loading.events = loading.articles = true
  try {
    const res = await fetch('/api/first-five')
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
    const docs = await res.json()

    sections.forEach((s) => (s.items = []))

    docs.forEach((doc) => {
      const type = (doc.event_type || doc.raw?.event_type || 'misc').toString().toLowerCase()
      const item = {
        id: doc.id,
        title:
          doc.event_title || doc.title || doc.raw?.event_title || doc.raw?.title || doc.raw?.name || doc.id,
        time: normalizeWhen(
          doc.event_when || doc.bubble_created || doc.raw?.event_when || doc.raw?.bubble_created
        ),
      }

      if (type.includes('food')) sections[0].items.push(item)
      else if (type.includes('sport')) sections[1].items.push(item)
      else sections[2].items.push(item)
    })
  } catch (err) {
    console.error('Failed to fetch bubbles for TEST page:', err)
  } finally {
    loading.news = loading.events = loading.articles = false
  }
}

async function loadSection(_key) {
  await fetchBubbles()
}

async function refreshSection(_key) {
  await loadSection(_key)
}

onMounted(() => fetchBubbles())

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString()
}
</script>

<style scoped>
.test-page.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  padding: 16px;
  box-sizing: border-box;
}

.section {
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 160px;
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 1.05rem;
  color: #222;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  padding: 8px;
  border-radius: 6px;
  background: #fafafa;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.02) inset;
}

.item-title {
  font-weight: 600;
  color: #111;
}

.item-time {
  font-size: 0.85rem;
  color: #666;
  margin-top: 4px;
}

.controls {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.loading {
  color: #0078d7;
}

.empty {
  color: #888;
  font-style: italic;
}
</style>