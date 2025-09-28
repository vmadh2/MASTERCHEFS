<template>
    <div class="container">
        <section v-for="section in sections" :key="section.key" class="section">
            <h2 class="section-title">{{ section.label }}</h2>

            <!-- List from "database" -->
            <ul class="list">
                <li v-for="item in section.items" :key="item.id" class="list-item">
                    <div class="item-title">{{ item.title }}</div>
                    <div class="item-time">{{ formatTime(item.time) }}</div>
                </li>
                <li v-if="section.items.length === 0" class="empty">No items</li>
            </ul>

            <!-- basic loader / refresh control -->
            <div class="controls">
                <button @click="refreshSection(section.key)">Refresh</button>
                <span v-if="loading[section.key]" class="loading">Loading…</span>
            </div>
        </section>
    </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'

/*
    Boilerplate for 4 sections that display lists (title + time).
    Replace the mockFetch function with real API calls (fetch/axios).
*/

const sections = reactive([
    { key: 'news', label: 'News', items: [] },
    { key: 'events', label: 'Events', items: [] },
    { key: 'articles', label: 'Articles', items: [] },
    { key: 'announcements', label: 'Announcements', items: [] }
])

const loading = reactive({
    news: false,
    events: false,
    articles: false,
    announcements: false
})

// Mock "database" fetch — replace this with an actual API call.
async function mockFetch(key) {
    // simulate network delay
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400))
    const now = Date.now()
    return Array.from({ length: 4 }).map((_, i) => ({
        id: `${key}-${i}`,
        title: `${key.charAt(0).toUpperCase() + key.slice(1)} item ${i + 1}`,
        time: new Date(now - i * 1000 * 60 * 60).toISOString()
    }))
}

async function loadSection(key) {
    loading[key] = true
    try {
        let data
        if (key === 'news') {
            // load first-five from server (firestore)
            try {
                const res = await fetch('/api/first-five')
                if (!res.ok) throw new Error('Network response was not ok')
                data = await res.json()
            } catch (err) {
                console.error('Failed to fetch /api/first-five:', err)
                data = []
            }

            // normalize firestore documents into { id, title, time }
            data = data.map(doc => {
                const id = doc.id || doc._id || ''
                const title = doc.name || doc.title || doc.message || doc.email || id
                let time = ''
                if (doc.timestamp) {
                    // handle Firestore Timestamp shape { _seconds, _nanoseconds }
                    if (typeof doc.timestamp === 'object' && doc.timestamp._seconds) {
                        time = new Date(doc.timestamp._seconds * 1000).toISOString()
                    } else if (typeof doc.timestamp === 'string') {
                        time = doc.timestamp
                    }
                } else if (doc.time) {
                    time = doc.time
                }
                return { id, title, time }
            })
            const target = sections.find(s => s.key === key)
            if (target) target.items = data
        } else {
            // Example of a real fetch for other sections (not yet wired):
            // const res = await fetch(`/api/${key}`)
            // const data = await res.json()
            const dataMock = await mockFetch(key) // replace with real data
            const target = sections.find(s => s.key === key)
            if (target) target.items = dataMock
        }
    } finally {
        loading[key] = false
    }
}

async function refreshSection(key) {
    await loadSection(key)
}

async function loadAll() {
    await Promise.all(sections.map(s => loadSection(s.key)))
}

onMounted(() => {
    loadAll()
})

function formatTime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString()
}
</script>

<style scoped>
.container {
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
    box-shadow: 0 0 0 1px rgba(0,0,0,0.02) inset;
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