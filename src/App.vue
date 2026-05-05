<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import axios from 'axios' // 👈 确保已经 npm install axios

// --- 数据层 ---
const notes = ref([])
const activeNote = ref(null)
const isAiLoading = ref(false)
const searchText = ref('')

// --- 💡 全栈核心：后端交互逻辑 ---

// 1. 从后端获取笔记列表
const fetchNotesFromBackend = async () => {
  try {
    const response = await axios.get('/api/notes')
    // 如果后端有数据，就用后端的；如果没有，保持现有数据
    if (response.data.data && response.data.data.length > 0) {
      notes.value = response.data.data
      if (!activeNote.value) activeNote.value = notes.value[0]
      console.log('✅ 已同步云端数据')
    }
  } catch (error) {
    console.error('❌ 获取后端数据失败，降级使用本地存储:', error)
  }
}

// 2. 将数据保存到后端
const saveNoteToBackend = async (note) => {
  try {
    // 每次改变都同步到后端 api/notes.js
    await axios.post('/api/notes', note)
    console.log('☁️ 数据已实时同步至云端')
  } catch (error) {
    console.warn('⚠️ 云端同步失败，数据仅保存在本地缓存')
  }
}

// --- 业务逻辑 ---

const createNewNote = () => {
  const newNote = {
    id: Date.now(),
    title: '',
    content: ''
  }
  notes.value.unshift(newNote)
  activeNote.value = newNote
}

const selectNote = (note) => {
  activeNote.value = note
}

// AI 续写逻辑保持不变...
const askAI = async () => {
  if(!activeNote.value || isAiLoading.value) return
  const prompt = `你是一个专业的写作助手。标题：${activeNote.value.title}\n内容：${activeNote.value.content}`
  isAiLoading.value = true
  try {
    const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer sk-C1hRjCgfl7ux5tk7ajPW43Gxs1GG5VfYGoKSNbJv6DJbvKe3', 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    })
    const data = await response.json()
    activeNote.value.content += '\n\n' + data.choices[0].message.content
  } catch (error) {
    alert('AI 接口调用失败')
  } finally {
    isAiLoading.value = false
  }
}

// --- 生命周期与监听 ---

onMounted(async () => {
  // 优先级：先尝试读后端数据
  await fetchNotesFromBackend()
  
  // 如果后端没拿回数据，再看本地缓存（保证离线体验）
  if (notes.value.length === 0) {
    const saved = localStorage.getItem('my-ai-notes')
    if (saved) {
      notes.value = JSON.parse(saved)
    } else {
      // 首次进入的种子数据
      notes.value = [
        { id: 1, title: '👋 欢迎使用全栈 AI 笔记', content: '现在你的笔记已经支持 Vercel Serverless 后端同步了！' }
      ]
    }
  }
  if (!activeNote.value) activeNote.value = notes.value[0]
})

// 监听数据变化：本地缓存 + 云端同步双管齐下
let saveTimer = null
watch(notes, (newNotes) => {
  // 1. 本地存储依然是实时的
  localStorage.setItem('my-ai-notes', JSON.stringify(newNotes))
  
  // 2. 云端同步增加 1 秒防抖：用户停止输入 1 秒后才发送请求
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (activeNote.value) {
      saveNoteToBackend(activeNote.value)
    }
  }, 1000) 
}, { deep: true })

// 搜索逻辑
const filteredNotes = computed(() => {
  if (!searchText.value.trim()) return notes.value
  return notes.value.filter(note => 
    note.title.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

const deleteNote = (id, event) => {
  event.stopPropagation()
  if (!confirm('确定要删除吗？')) return
  const index = notes.value.findIndex(n => n.id === id)
  if (index !== -1) {
    notes.value.splice(index, 1)
    if (activeNote.value?.id === id) {
      activeNote.value = notes.value[0] || null
      if (!activeNote.value) createNewNote()
    }
  }
}
</script>

<template>
   <div class="app-container">
    <!-- 这是HTML注释，不会出现在最终DOM中 -->
    <aside class="sidebar">
      <button class="new-btn" @click="createNewNote">+ 新建笔记</button>
      <div class="search-container">
        <input 
          type="text" 
          v-model="searchText" 
          placeholder="搜索笔记标题..." 
          class="search-input"
      />
  </div>
      <ul class="note-list">
        <li 
          v-for="note in filteredNotes" 
          :key="note.id" 
          class="note-item"
          :class="{ 'active': activeNote && activeNote.id === note.id }"
          @click="selectNote(note)"
        >
          <span class="note-title-text">{{ note.title || '无标题' }}</span>
  
          <button class="delete-btn" @click.stop="deleteNote(note.id, $event)">×</button>
        </li>
      </ul>
    </aside>

    <main class="editor-area" v-if="activeNote">
      <div class="ai-toolbar">
        <button class="ai-btn" @click="askAI" :disabled="isAiLoading">
          {{ isAiLoading ? '🪄 AI 正在思考...' : '✨ 让 AI 帮我续写' }}
        </button>
      </div>
      <input class="title-input" v-model="activeNote.title" placeholder="无标题" />
      <MdEditor 
        v-model="activeNote.content" 
        class="markdown-editor"
        placeholder="开始记录你的想法...支持 Markdown 语法"
      />
    </main>

  </div>
</template>
<style scoped>
/* 极简的 CSS 布局，没有花里胡哨，主打实用 */
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  color: #333;
  text-align: left; /* 👈 强制左对齐，解决居中问题 */
  background-color: #fff;
}

.sidebar {
  width: 260px;       /* 设定一个固定宽度 */
  flex-shrink: 0;    /* 👈 核心代码：禁止侧边栏被挤压 */
  background-color: #f7f7f5;
  border-right: 1px solid #e0e0e0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;   /* 笔记多了可以滚动 */
}

.new-btn {
  width: 100%;
  padding: 8px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 1rem;
}

.note-list {
  list-style: none;
  padding: 0;
}

.note-item {
  display: flex;         /* 使用 flex 让标题和删除按钮分居两列 */
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 4px;
  cursor: pointer;
  border-radius: 6px;
  white-space: nowrap;    /* 防止文字换行变成一竖列 */
  overflow: hidden;       /* 超出部分隐藏 */
  text-overflow: ellipsis; /* 超出显示省略号 */
  font-size: 14px;
  transition: 0.2s;
}

.note-title-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  background: none;
  border: none;
  color: #ff4d4f;       /* 警示红 */
  font-size: 18px;
  cursor: pointer;
  padding: 0 5px;
  opacity: 0;           /* 默认隐藏 */
  transition: opacity 0.2s;
}

.note-item:hover {
  background-color: #e8e8e5;
}

.note-item:hover .delete-btn {
  opacity: 1;           /* 悬停时显示 */
}
.delete-btn:hover {
  color: #ff7875;
  transform: scale(1.2); /* 稍微放大一点点 */
}

.title-input {
  font-size: 2.5rem;
  font-weight: bold;
  border: none;
  outline: none;
  margin-bottom: 1rem;
}

/* 👇 给新加的 Markdown 编辑器设置高度 */
.markdown-editor {
  flex: 1; /* 撑满剩余高度 */
  height: 100%;
  border-radius: 8px; /* 加点圆角更好看 */
  overflow: hidden;
}

/* 稍微调整一下右侧区域的内边距，让全屏编辑器更好看 */
.editor-area {
  flex: 1;
  padding: 2rem 3rem; /* 比之前稍微小一点，留出舒适的边距 */
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.note-item.active {
  background-color: #e8e8e5;
  font-weight: bold;
}

.ai-toolbar {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

.ai-btn {
  background: linear-gradient(135deg, #6e8efb, #a777e3); /* 渐变色，很有 AI 感 */
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.2s;
}

.ai-btn:hover {
  transform: scale(1.05);
}

.ai-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.search-container {
  margin-bottom: 15px;
}

.search-input {
  width: 235px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: #fff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #a777e3; /* 聚焦时颜色与 AI 按钮呼应 */
}
</style>
