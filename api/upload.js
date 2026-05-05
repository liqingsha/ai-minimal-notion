import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export const config = {
  api: { bodyParser: false } // Vercel 需要关闭默认解析才能处理文件流
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  // 这里为了演示简化处理，实际开发建议配合 multer 处理 form-data
  // 我们假设前端直接发送的是文件的 ArrayBuffer
  const fileName = `${Date.now()}.png`
  const fileBody = req.body 

  const { data, error } = await supabase.storage
    .from('note-images')
    .upload(fileName, fileBody, { contentType: 'image/png' })

  if (error) return res.status(500).json({ error: error.message })

  // 获取图片的公开访问链接
  const { data: { publicUrl } } = supabase.storage
    .from('note-images')
    .getPublicUrl(fileName)

  return res.status(200).json({ url: publicUrl })
}