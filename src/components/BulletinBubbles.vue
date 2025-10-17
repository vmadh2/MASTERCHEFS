<template>
    <div class="page">
      <!-- Top bar -->
      <div class="topbar">
        <div class="brand">Huddle Up</div>
  
        <input v-model="filter" class="input" placeholder="Search events, categories…" />
  
        <label class="chip">
          <input type="checkbox" v-model="remoteOnly" />
          <span>Remote-friendly only</span>
        </label>
  
        <!-- public / private switch -->
        <div class="chip">
          <span class="chip__label">{{ privateOnly ? "Private" : "Public" }}</span>
          <button
            class="switch"
            :aria-checked="privateOnly"
            role="switch"
            @click="privateOnly = !privateOnly"
          >
            <span class="switch__thumb" :class="{ on: privateOnly }"></span>
          </button>
        </div>
  

        
        <button class="btn btn--primary" type="button" @click="openCreate">+ Add Event</button>
        <button class="btn" @click="resetDemo">Reset</button>
      </div>
  
      <!-- Private sub-tabs -->
      <div v-if="privateOnly" class="subtabs">
        <button class="tab" :class="{ active: privateTab === 'my' }" @click="privateTab = 'my'">My Posts</button>
        <button class="tab" :class="{ active: privateTab === 'liked' }" @click="privateTab = 'liked'">Liked</button>
        <button class="tab" :class="{ active: privateTab === 'joined' }" @click="privateTab = 'joined'">Joined</button>
      </div>
  
      <!-- Legend -->
      <div class="legend">
        <div v-for="c in CATEGORIES" :key="c.key" class="legend__item">
          <span class="legend__swatch" :style="{ background: c.color }"></span>
          <span>{{ c.label }}</span>
        </div>
      </div>
  
      <!-- Bubble field -->
      <div class="field" ref="fieldEl">
        <button
          v-for="b in view"
          :key="b.id"
          class="bubble"
          :class="{
            joined: (b.joinedBy || []).includes(currentUser),
            liked:  !(b.joinedBy || []).includes(currentUser) && (b.likedBy || []).includes(currentUser),
          }"
          :style="bubbleStyle(b)"
          :title="b.title"
          @click="selectedId = b.id"
        >
          <div class="bubble__inner">
            <div v-if="(b.joinedBy || []).includes(currentUser)" class="pill">JOINED</div>
  
            <div
              class="bubble__title"
              :style="{
                fontSize: titleSize(b) + 'px',
                marginTop: (b.joinedBy || []).includes(currentUser) ? '16px' : '0'
              }"
            >
              {{ b.title }}
            </div>
  
            <div class="bubble__meta">{{ b.attendees }} going</div>
            <div v-if="b.remoteFriendly" class="bubble__meta bubble__meta--sub">remote-friendly</div>
  
            <div class="likes">
              <span class="likes__badge" :class="{ on: (b.likedBy || []).includes(currentUser) }">
                <span>{{ (b.likedBy || []).includes(currentUser) ? "❤️" : "🤍" }}</span>
                <span>{{ b.likes || 0 }}</span>
              </span>
            </div>
          </div>
        </button>
      </div>
  
      <!-- Details modal -->
      <div v-if="selected" class="modal" @click.self="selectedId = null">
        <div class="card" @click.stop>
          <div class="card__top">
            <div class="avatar" :style="{ background: selected.color }"></div>
            <div class="card__meta">
              <h2>{{ selected.title }}</h2>
              <p class="muted">{{ selected.desc || "No description provided." }}</p>
              <div class="tags">
                <span class="tag">{{ categoryLabel(selected.category) }}</span>
                <span v-if="selected.remoteFriendly" class="tag tag--remote">remote</span>
              </div>
            </div>
          </div>
  
          <div class="card__actions">
            <div class="muted">{{ selected.attendees }} going • {{ selected.likes || 0 }} likes</div>
            <div class="btnrow">
              <button class="btn" :class="{ 'btn--pink': isLiked(selected) }" @click="toggleLike(selected.id)">
                {{ isLiked(selected) ? "♥ Liked" : "♡ Like" }}
              </button>
  
              <button
                class="btn"
                :class="{ 'btn--green': isJoined(selected), 'btn--primary': !isJoined(selected) }"
                @click="toggleJoin(selected.id)"
              >
                {{ isJoined(selected) ? "Unjoin" : "Join" }}
              </button>
  
              <button v-if="selected.owner === currentUser" class="btn btn--danger" @click="confirmDelete(selected.id)">Delete</button>
              <button class="btn" @click="selectedId = null">Close</button>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Create modal (inline, always works) -->
      <div v-if="creating" class="modal" @click.self="closeCreate">
        <div class="card" @click.stop>
          <h3>Add Event</h3>
  
          <div class="form">
            <input class="input" placeholder="Title" v-model="createForm.title" />
            <textarea class="textarea" placeholder="Description" v-model="createForm.desc"></textarea>
  
            <label class="row">
              <span>Category</span>
              <select class="select" v-model="createForm.category">
                <option v-for="c in CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
            </label>
  
            <label class="row">
              <span>Event Date</span>
              <input class="input" type="datetime-local" v-model="createForm.eventDate" />
            </label>

            <div class="row">
              <label class="chip">
                <input type="checkbox" v-model="createForm.remoteFriendly" />
                <span>Remote-friendly</span>
              </label>
              <label class="row">
                <span>Attendees</span>
                <input class="input small" type="number" min="1" max="200" v-model.number="createForm.attendees" />
              </label>
            </div>
          </div>
  
          <div class="btnrow end">
            <button class="btn" @click="closeCreate">Cancel</button>
            <button class="btn btn--primary" @click="saveCreate">Save</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from "vue";
  import { db, bubblesCollection, Timestamp } from '../firebase.js';
  import { addDoc, onSnapshot, getDocs, query, orderBy } from 'firebase/firestore';
  
  /* ===== Category palette ===== */
  const CATEGORIES = [
    { key: "question", label: "Question", color: "#3b82f6" },
    { key: "favour", label: "Favour", color: "#22c55e" },
    { key: "announcement", label: "Announcement", color: "#8b5cf6" },
  ];
  const categoryMeta = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));
  const categoryLabel = key => categoryMeta[key]?.label ?? "Other";
  const categoryColor = key => categoryMeta[key]?.color ?? categoryMeta.other.color;
  
  /* utilities */
  const rand = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const radiusFromAttendees = (n) => 36 + Math.sqrt(Math.max(0, n)) * 10;
  
  // Calculate urgency-based size multiplier
  const getUrgencyMultiplier = (eventDate) => {
    if (!eventDate) return 1;
    
    const now = new Date();
    const event = eventDate.toDate ? eventDate.toDate() : new Date(eventDate);
    const timeDiff = event.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    // Size based on proximity: larger when closer to event
    if (daysDiff < 0) return 0.8; // Past events smaller
    if (daysDiff < 1) return 1.5; // Less than 1 day - very large
    if (daysDiff < 3) return 1.3; // Less than 3 days - large  
    if (daysDiff < 7) return 1.1; // Less than 1 week - slightly larger
    return 1; // Default size for distant events
  };
  
  /* seeds */
  const sample = [
    { title: "Friday Coffee Run ☕", desc: "Mid-morning break at the lobby cafe.", category: "social", attendees: 7, remoteFriendly: false, owner: "me", likes: 2, likedBy: ["alice","bob"], joinedBy: [] },
    { title: "Lunch & Learn — Figma Tips", desc: "Rapid prototyping tricks.", category: "learning", attendees: 18, remoteFriendly: true, owner: "alice", likes: 1, likedBy: ["me"], joinedBy: [] },
    { title: "5-a-side Soccer", desc: "Casual game at the park.", category: "sport", attendees: 12, remoteFriendly: false, owner: "bob", likes: 0, likedBy: [], joinedBy: [] },
    { title: "Book Club: Creative Confidence", desc: "30-min chat + notes.", category: "reading", attendees: 9, remoteFriendly: true, owner: "me", likes: 3, likedBy: ["sara","bob","alice"], joinedBy: [] },
    { title: "Friday ‘Wins’ Wall", desc: "Drop your weekly win!", category: "kudos", attendees: 22, remoteFriendly: true, owner: "sara", likes: 0, likedBy: [], joinedBy: [] },
  ];
  
  /* Firebase integration */
  function resetDemo() { 
    // For demo purposes, could add sample data to Firebase
    console.log('Reset demo - you could implement this to add sample data to Firebase');
  }
  
  /* state */
  const fieldEl = ref(null);
  const bubbles = ref([]);
  
  // Firebase listeners
  function setupFirebaseListeners() {
    console.log('Setting up Firebase listeners...');
    
    // Listen to bubbles collection
    const bubblesQuery = bubblesCollection;
    console.log('Creating onSnapshot listener for bubbles collection');
    
    onSnapshot(bubblesQuery, 
      (snapshot) => {
        const newBubbles = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Skip inactive bubbles
          if (!data.bubble_active) {
            return;
          }
          
          // Map your Firebase fields to component fields
          const attendees = data.event_attend?.length || 3;
          const baseRadius = radiusFromAttendees(attendees);
          
          // Map event_type to our category system
          const categoryMap = {
            'question': 'question',
            'favour': 'favour',
            'announcement': 'announcement'
          };
          const category = categoryMap[data.event_type?.toLowerCase()] || 'question';
          const eventDate = data.event_when || data.eventDate;
          
          // Apply urgency-based sizing
          const urgencyMultiplier = getUrgencyMultiplier(eventDate);
          const finalRadius = baseRadius * urgencyMultiplier;
          
          newBubbles.push({
            id: doc.id,
            title: data.event_title || 'Untitled Event',
            desc: data.description || '',
            category: category,
            attendees: attendees,
            remoteFriendly: data.remoteFriendly || false,
            owner: data.author_name || 'unknown',
            likes: data.likes || 0,
            likedBy: data.likedBy || [],
            joinedBy: data.joinedBy || [],
            x: data.x || rand(finalRadius + 4, 1000 - finalRadius - 4),
            y: data.y || rand(finalRadius + 4, 700 - finalRadius - 4),
            vx: data.vx || rand(-0.3, 0.3),
            vy: data.vy || rand(-0.3, 0.3),
            r: finalRadius,
            color: categoryColor(category),
            eventDate: eventDate
        });
        });
      
      bubbles.value = newBubbles;
    },
    (error) => {
      console.error('❌ Firebase snapshot error:', error);
      console.error('❌ Error details:', error.message, error.code);
    });
  }
  
  const filter = ref("");
  const remoteOnly = ref(false);
  const privateOnly = ref(false);
  const privateTab = ref("my");
  const currentUser = "me";
  const selectedId = ref("");
  const creating = ref(false);
  
  const selected = computed(() => bubbles.value.find(b => b.id === selectedId.value));
  
  /* physics */
  let raf = 0;
  let lastTime = 0;
  function step(currentTime) {
  const el = fieldEl.value;
  if (!el) { raf = requestAnimationFrame(step); return; }
  
  // Throttle to ~30fps to improve performance
  if (currentTime - lastTime < 33) {
    raf = requestAnimationFrame(step);
    return;
  }
  lastTime = currentTime;
  
  const W = el.clientWidth, H = el.clientHeight;

  bubbles.value = bubbles.value.map(b => ({ ...b }));

  // move + walls
  for (const b of bubbles.value) {
    b.x += b.vx * 0.4;
    b.y += b.vy * 0.4;
    wallBounce(b, W, H);
  }

  // bubble-bubble collisions
  resolveCollisions(bubbles.value);

  raf = requestAnimationFrame(step);
}
  onMounted(() => {
    console.log('🚀 Component mounted, setting up Firebase listeners...');
    setupFirebaseListeners();
    console.log('🎬 Starting animation loop...');
    raf = requestAnimationFrame(step);
  });
  onBeforeUnmount(() => cancelAnimationFrame(raf));
  /* filters */
  const view = computed(() => {
    const now = new Date();
    
    return bubbles.value
      .filter(b => {
        // Filter out expired events
        if (b.eventDate && b.eventDate.toDate) {
          const eventDate = b.eventDate.toDate();
          return eventDate >= now;
        }
        return true; // Show events without dates
      })
      .filter(b =>
        filter.value
          ? (b.title + " " + b.desc + " " + categoryLabel(b.category))
              .toLowerCase()
              .includes(filter.value.toLowerCase())
          : true
      )
      .filter(b => (remoteOnly.value ? b.remoteFriendly : true))
      .filter(b => {
        if (!privateOnly.value) return true;
        if (privateTab.value === "liked") return (b.likedBy || []).includes(currentUser);
        if (privateTab.value === "joined") return (b.joinedBy || []).includes(currentUser);
        return b.owner === currentUser;
      });
  });
  
  /* actions */
  function toggleJoin(id) {
    bubbles.value = bubbles.value.map(b => {
      if (b.id !== id) return b;
      const joinedBy = b.joinedBy || [];
      const amJoined = joinedBy.includes(currentUser);
      if (amJoined) {
        const newJoined = joinedBy.filter(u => u !== currentUser);
        const newAtt = Math.max(0, b.attendees - 1);
        return { ...b, joinedBy: newJoined, attendees: newAtt, r: radiusFromAttendees(newAtt) };
      } else {
        const newJoined = [...joinedBy, currentUser];
        const newAtt = b.attendees + 1;
        return { ...b, joinedBy: newJoined, attendees: newAtt, r: radiusFromAttendees(newAtt) };
      }
    });
  }
  function toggleLike(id) {
    bubbles.value = bubbles.value.map(b => {
      if (b.id !== id) return b;
      const likedBy = b.likedBy || [];
      const hasLiked = likedBy.includes(currentUser);
      if (hasLiked) return { ...b, likedBy: likedBy.filter(u => u !== currentUser), likes: Math.max(0, b.likes - 1) };
      return { ...b, likedBy: [...likedBy, currentUser], likes: b.likes + 1 };
    });
  }
  function confirmDelete(id) {
    if (!confirm("Delete this post?")) return;
    bubbles.value = bubbles.value.filter(b => b.id !== id);
    selectedId.value = "";
  }
  
  /* create modal logic */
  const createForm = reactive({ title: "", desc: "", category: "question", attendees: 3, remoteFriendly: true, eventDate: "" });
  function openCreate() {
    createForm.title = "";
    createForm.desc = "";
    createForm.category = "question";
    createForm.attendees = 3;
    createForm.remoteFriendly = true;
    // Set default event date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    createForm.eventDate = tomorrow.toISOString().slice(0, 16);
    creating.value = true;
  }
  function closeCreate() { creating.value = false; }
  async function saveCreate() {
    const el = fieldEl.value;
    const W = el?.clientWidth ?? 1000;
    const H = el?.clientHeight ?? 700;
    const n = clamp(createForm.attendees || 1, 1, 200);
    const r = radiusFromAttendees(n);
    const cat = createForm.category || "question";
    
    try {
      const bubbleData = {
        title: createForm.title.trim() || "Untitled",
        description: createForm.desc.trim(),
        category: cat,
        attendees: n,
        remoteFriendly: !!createForm.remoteFriendly,
        owner: currentUser,
        likes: 0, 
        likedBy: [], 
        joinedBy: [],
        x: rand(r + 4, Math.max(r + 5, W - r - 5)),
        y: rand(r + 4, Math.max(r + 5, H - r - 5)),
        vx: rand(-1, 1) || 0.4,
        vy: rand(-1, 1) || -0.3,
        r,
        color: categoryColor(cat),
        timestamp: Timestamp.now(),
        eventDate: createForm.eventDate ? Timestamp.fromDate(new Date(createForm.eventDate)) : Timestamp.now()
      };
      
      await addDoc(bubblesCollection, bubbleData);
      creating.value = false;
    } catch (error) {
      console.error('Error adding bubble:', error);
    }
  }
  
  /* helpers */
  function bubbleStyle(b) {
    return {
      width: b.r * 2 + "px",
      height: b.r * 2 + "px",
      transform: `translate(${b.x - b.r}px, ${b.y - b.r}px)`,
      borderRadius: "9999px",
      background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%), ${b.color}`,
      boxShadow: `0 18px 50px ${b.color}40, inset 0 1px 8px #ffffff55`,
    };
  }
  const titleSize = b => Math.max(12, Math.min(22, b.r / 4));
  const isJoined = b => (b.joinedBy || []).includes(currentUser);
  const isLiked = b => (b.likedBy || []).includes(currentUser);

  // --- collision + walls helpers ---
function wallBounce(b, W, H) {
  if (b.x - b.r < 0) { b.x = b.r; b.vx *= -1; }
  if (b.x + b.r > W) { b.x = W - b.r; b.vx *= -1; }
  if (b.y - b.r < 0) { b.y = b.r; b.vy *= -1; }
  if (b.y + b.r > H) { b.y = H - b.r; b.vy *= -1; }
}

function resolveCollisions(list) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const minDist = a.r + b.r - 1;      // -1 for a tiny cushion
      if (dist < minDist) {
        // push them apart
        const nx = dx / dist, ny = dy / dist;
        const overlap = (minDist - dist) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;

        // simple elastic-ish bounce: swap velocities
        const tvx = a.vx, tvy = a.vy;
        a.vx = b.vx; a.vy = b.vy;
        b.vx = tvx;  b.vy = tvy;
      }
    }
  }
}

// quick separation pass so spawn/reset isn’t overlapped
function relaxPositions() {
  const el = fieldEl.value; if (!el) return;
  const W = el.clientWidth, H = el.clientHeight;

  // clamp inside walls first
  for (const b of bubbles.value) wallBounce(b, W, H);

  // iterate a bit to separate
  for (let k = 0; k < 120; k++) {
    resolveCollisions(bubbles.value);
    for (const b of bubbles.value) wallBounce(b, W, H);
  }
}

  </script>
  
  <style scoped>
  /* layout + bg */
  .page {
    position: relative; width: 100vw; height: 100vh; overflow: hidden;
    background:
      radial-gradient(1200px 800px at 20% -20%, #1f2937, transparent 60%),
      radial-gradient(1000px 700px at 80% 120%, #1f2937, transparent 55%),
      #0f172a;
    color: #fff;
  }
  .topbar { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; gap: 8px; align-items: center; padding: 12px; }
  .brand { padding: 8px 12px; border-radius: 9999px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); }
  .input { min-width: 220px; flex: 1; padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); color: #fff; outline: none; }
  .textarea { min-height: 88px; padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); color: #fff; outline: none; }
  .small { width: 80px; }
  .select { height: 36px; border-radius: 10px; padding: 6px 10px; background: rgba(255,255,255,.08); color: #fff; border: 1px solid rgba(255,255,255,.15); }
  
  .chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); cursor: pointer; }
  .chip__label { opacity: .8; font-size: 14px; }
  .switch { position: relative; width: 44px; height: 24px; border-radius: 9999px; background: rgba(255,255,255,.2); border: none; cursor: pointer; }
  .switch__thumb { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 9999px; background: #fff; transition: transform .2s; }
  .switch__thumb.on { transform: translateX(20px); }
  
  .btn { padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); color: #fff; cursor: pointer; }
  .btn--primary { background: #6366f1; border-color: transparent; }
  .btn--pink { background: #ec4899; border-color: transparent; }
  .btn--green { background: #10b981; border-color: transparent; }
  .btn--danger { background: #ef4444; border-color: transparent; }
  .btnrow { display: flex; gap: 8px; align-items: center; }
  .btnrow.end { justify-content: flex-end; }
  .row { display: flex; gap: 10px; align-items: center; }
  
  /* sub-tabs */
  .subtabs { position: absolute; top: 64px; left: 0; right: 0; z-index: 20; display: flex; justify-content: center; }
  .tab { margin: 0 4px; padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); cursor: pointer; }
  .tab.active { background: #6366f1; border-color: transparent; }
  
  /* legend */
  .legend {
    position: absolute; left: 12px; bottom: 12px; z-index: 15;
    display: flex; flex-wrap: wrap; gap: 6px 10px;
    background: rgba(15, 23, 42, .5); border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px; padding: 8px 10px; backdrop-filter: blur(4px);
  }
  .legend__item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; opacity: .95; }
  .legend__swatch { width: 12px; height: 12px; border-radius: 9999px; box-shadow: 0 0 0 1px rgba(255,255,255,.25) inset; }
  
  /* playfield */
  .field { position: absolute; top: 100px; left: 0; right: 0; bottom: 0; overflow: hidden; z-index: 1; }
  
  /* bubbles */
  .bubble { position: absolute; border: none; cursor: pointer; border-radius: 9999px; outline: none; background: transparent; padding: 0; transition: filter .12s; }
  .bubble:hover { filter: brightness(1.03); }
  .bubble.joined { box-shadow: 0 0 0 4px rgba(16,185,129,.7), 0 0 40px 8px rgba(16,185,129,.35); }
  .bubble.liked  { box-shadow: 0 0 0 4px rgba(236,72,153,.6); }
  
  .bubble__inner { width: 100%; height: 100%; border-radius: 9999px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 12px; position: relative; }
  .pill { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); background: rgba(16,185,129,.95); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 9999px; }
  .bubble__title { font-weight: 700; color: rgba(255,255,255,.96); line-height: 1.2; word-break: break-word; hyphens: auto; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .bubble__meta { margin-top: 4px; opacity: .92; font-size: 13px; }
  .bubble__meta--sub { opacity: .8; font-size: 12px; }
  .likes { margin-top: 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; }
  .likes__badge { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.1); }
  .likes__badge.on { background: rgba(236,72,153,.25); border-color: rgba(236,72,153,.6); }
  
  /* modal */
  .modal { position: absolute; inset: 0; background: rgba(0,0,0,.42); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
  @media (min-width: 640px){ .modal{ align-items: center; } }
  .card { width: min(520px, 100vw); background: #0f172a; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
  .card__top { display: flex; gap: 12px; }
  .avatar { width: 48px; height: 48px; border-radius: 9999px; flex-shrink: 0; }
  .card__meta h2 { margin: 0; font-size: 20px; }
  .muted { opacity: .82; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .tag { font-size: 11px; padding: 4px 8px; border-radius: 9999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.1); }
  .tag--remote { background: rgba(16,185,129,.2); border-color: rgba(16,185,129,.3); }
  .card__actions { margin-top: 16px; display: flex; align-items: center; justify-content: space-between; }
  .form { margin-top: 12px; display: grid; gap: 10px; }
  </style>
  
