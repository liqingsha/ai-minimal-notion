// api/notes.js
import { createClient } from '@supabase/supabase-js'

// 💡 线上环境建议使用环境变量，本地测试先直接填入你记事本里的值
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // 1. 获取所有笔记 (GET)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('id', { ascending: false })
    
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data })
  }

  // 2. 保存/更新笔记 (POST)
  if (req.method === 'POST') {
    const note = req.body
    // upsert 的意思是：如果 ID 存在就更新，不存在就插入
    const { data, error } = await supabase
      .from('notes')
      .upsert({ 
        id: note.id, 
        title: note.title, 
        content: note.content,
        updated_at: new Date() 
      })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ message: '云端同步成功', data })
  }

  return res.status(405).send('Method Not Allowed')
}