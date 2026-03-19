<script setup>
import { ref,onMounted,watch, computed } from 'vue'
import {MdEditor} from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

// 这里是数据层 (Model/ViewModel)
// 1. 所有的笔记列表（暂时放点假数据测试排版）
const notes = ref([])
// 2. 当前正在查看的笔记
const activeNote = ref(null)
const isAiLoading = ref(false) // AI 是否正在思考
const searchText = ref('') // 存储搜索框输入的文字
// 调用 AI 接口的函数
const askAI = async()=>{
  if(!activeNote.value || isAiLoading.value) return // 没有选中笔记或者 AI 正在思考时，直接返回
  // 准备给 AI 的指令（Prompt）
  const prompt = `你是一个专业的写作助手。请根据以下标题和内容，续写一段话，要求衔接自然，逻辑清晰。
  标题：${activeNote.value.title}
  当前内容：${activeNote.value.content}`
  isAiLoading.value = true // 开始调用 AI，设置加载状态
  try {
    // 这里以调用一个通用的 AI 代理接口为例
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
    const aiResult = data.choices[0].message.content

    // 2. 将 AI 的结果追加到当前内容后面
    activeNote.value.content += '\n\n' + aiResult
    
  } catch (error) {
    console.error('AI 续写失败:', error)
    alert('AI 好像断网了，请检查网络或 API Key')
  } finally {
    isAiLoading.value = false
  }
}
// 3. 新建笔记
const createNewNote = () => {
  const newNote = {
    id: Date.now(),  // 用当前时间戳作为唯一 ID
    title: '',
    content: ''
  }
  notes.value.unshift(newNote)  // 把新笔记插到列表的最前面
  activeNote.value = newNote    // 自动选中这篇新笔记
}
// 4.切换选中的笔记
const selectNote = (note) => {
  activeNote.value = note
}
// 5. 本地存储逻辑
onMounted(()=>{
  // 尝试从浏览器缓存中读取名叫 'my-ai-notes' 的数据
  const saveNotes = localStorage.getItem('my-ai-notes')
  if(saveNotes && saveNotes !== '[]'){
    // 因为 localStorage 只能存字符串，所以读取时要用 JSON.parse 转回数组
    notes.value = JSON.parse(saveNotes)
  }else{
    // 第一次使用时，给入惊艳的“种子数据”
    const demoNotes = [
      { id: 1, title: '👋 欢迎使用 AI 极简笔记', content: '这是一个基于 Vue3 纯前端实现的个人知识库...\n你可以尝试点击右侧的 AI 按钮续写本段内容。' },
      { id: 2, title: '💻 面试项目亮点总结', content: '1. 采用 MVVM 架构\n2. 零后端实现数据持久化\n3. 接入大模型 API...' }
    ]
    notes.value = demoNotes
  }
  activeNote.value = notes.value[0]
})
// 6. 监听 notes 数组的变化，只要有任何风吹草动，就自动保存！
watch(notes,(newNotes)=>{
  // 把数组用 JSON.stringify 转成字符串存进浏览器
  localStorage.setItem('my-ai-notes',JSON.stringify(newNotes))
},{deep:true}) // deep:true 表示要深度监听数组内部的变化,无论改了标题还是内容都会触发

const deleteNote = (id, event) => {
  // 阻止事件冒泡，防止触发 selectNote
  event.stopPropagation()
  
  // 确认弹窗（增强用户体验，防止误删）
  if (!confirm('确定要删除这篇笔记吗？')) return

  // 1. 找到要删除的笔记索引
  const index = notes.value.findIndex(n => n.id === id)
  
  if (index !== -1) {
    // 2. 从数组中移除
    notes.value.splice(index, 1)
    
    // 3. 核心体验逻辑：如果删掉的是当前选中的笔记
    if (activeNote.value && activeNote.value.id === id) {
      if (notes.value.length > 0) {
        // 如果还有剩余笔记，选中第一篇
        activeNote.value = notes.value[0]
      } else {
        // 如果全删光了，新建一篇空的，防止右侧报错
        createNewNote()
      }
    }
  }
}

// 核心逻辑：过滤后的笔记列表
const filteredNotes = computed(() => {
  // 如果搜索框为空，直接返回所有笔记
  if (!searchText.value.trim()) {
    return notes.value
  }
  
  // 否则，根据标题进行不区分大小写的匹配
  return notes.value.filter(note => 
    note.title.toLowerCase().includes(searchText.value.toLowerCase())
  )
})
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
