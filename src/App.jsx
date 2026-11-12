import { useState } from 'react'
import { ConfigProvider, Card, Button, theme, Spin } from 'antd'
import { HeartFilled, LoadingOutlined } from '@ant-design/icons'
import './App.css'

// ============ DeepSeek 配置 ============
const API_URL = 'https://api.deepseek.com/chat/completions'
const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY

// 多套随机 prompt：每次许愿随机挑一种风格
// 注意：绝不出现简历/面试/笔试等可能带来压力的词，主打"一定会拿到 offer"，约一半概率温柔提到一起去台湾旅行
const COMMON_RULES = `通用要求：
1. 长度 30~70 字，直接输出这句话本身，不要任何解释、前缀或引号；
2. 最多带 1~2 个 emoji；
3. 严禁出现"简历、面试、笔试、投递、海投、考试、挂、被拒、焦虑、压力"这类可能让她有压力或联想到挫折的词，也不要提秋招流程的任何环节，只传达"一定会拿到好 offer"的笃定和开心；
4. 有大约一半的概率，可以温柔地、像画大饼一样地提到"拿到 offer 后我们一起去台湾旅行，看海、吃好吃的"；另一半概率就不提旅行；
5. 称呼在"欣懿宝宝"和"宝宝"之间任选一个即可，两种换着来。`

const PROMPTS = [
  // 幽默风趣（但轻松无压力）
  `你是宝宝的好朋友，请用俏皮幽默、逗她笑的口吻告诉她：好 offer 已经在快马加鞭赶来抱她的路上了，宇宙都盖了章。语气可以浮夸搞笑，但绝不提找工作的任何环节。`,
  // 暖心安慰
  `你是欣懿宝宝最贴心的闺蜜，她最近有点累。请说一句温柔暖心的话抱抱她：她值得世界上最好的工作，好 offer 正在飞奔向她，让她安心休息，什么都不用怕。`,
  // 元气满满
  `你是宝宝的啦啦队队长！请用元气满满、超开心的语气欢呼：她一定会拿到超棒的好 offer，幸运值已经拉满，好日子马上开始！`,
  // 向往未来
  `你是宝宝的好朋友。请用充满向往和憧憬的语气，描绘她拿到好 offer 之后我们一起去台湾旅行的画面：看海、吃夜市小吃、拍好多美美的照片，语气甜甜的、亮晶晶的。`,
  // 温柔笃定
  `你是欣懿宝宝的守护小天使。请用平静又笃定的语气告诉她：属于她的好 offer 已经在路上啦，一点都不用担心，安心吃好睡好，等着收好消息就好。`,
  // 俏皮可爱
  `你是宝宝的小猫小狗化身。请学小动物说话一样俏皮可爱地告诉她：喵喵汪汪都看到了，她的好 offer 就在前方闪闪发光，小猫咪会叼着 offer 回来找她的！`,
].map((style) => `${style}\n${COMMON_RULES}`)

const WELCOME_TEXT = '点一下下方的水晶球 🔮，让小猫小狗为你向宇宙许个愿吧～'

async function fetchCheerFromDeepSeek(lastPromptIndex) {
  // 随机挑一种风格，且尽量不与上一次重复
  let promptIndex = Math.floor(Math.random() * PROMPTS.length)
  if (PROMPTS.length > 1) {
    while (promptIndex === lastPromptIndex) {
      promptIndex = Math.floor(Math.random() * PROMPTS.length)
    }
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: PROMPTS[promptIndex] },
        { role: 'user', content: `来一句新的加油吧（随机数 ${Date.now()}），要和之前的不一样哦！` },
      ],
      temperature: 1.3,
      max_tokens: 200,
      stream: false,
    }),
  })
  if (!res.ok) {
    throw new Error(`API error ${res.status}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('empty response')
  return { text, promptIndex }
}

// 使用 BASE_URL 以兼容 GitHub Pages 等子路径部署
const BASE = import.meta.env.BASE_URL
const PET_IMGS = [
  `${BASE}pets/cheer-cat.png`,
  `${BASE}pets/study-pup.png`,
  `${BASE}pets/nap-cat.png`,
  `${BASE}pets/duo.png`,
]

const PAWS = ['🐾', '🐾', '🐾', '🐾', '🐾', '🐾']
const PAW_STYLES = [
  { top: '8%', left: '5%', fontSize: 34, animationDelay: '0s' },
  { top: '18%', right: '7%', fontSize: 26, animationDelay: '1.2s' },
  { bottom: '16%', left: '9%', fontSize: 28, animationDelay: '2.1s' },
  { bottom: '9%', right: '5%', fontSize: 36, animationDelay: '0.6s' },
  { top: '55%', left: '2%', fontSize: 22, animationDelay: '1.8s' },
  { top: '70%', right: '3%', fontSize: 24, animationDelay: '2.7s' },
]

export default function App() {
  const [quote, setQuote] = useState(WELCOME_TEXT)
  const [quoteKey, setQuoteKey] = useState(0) // 每次换文案重新触发淡入动画
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastPromptIndex, setLastPromptIndex] = useState(-1)

  const makeWish = async () => {
    if (loading) return
    setHint('')
    if (!API_KEY) {
      setHint('水晶球还没充满魔法，请先在 .env 里放入钥匙哦 ✨')
      return
    }
    setLoading(true)
    try {
      const { text, promptIndex } = await fetchCheerFromDeepSeek(lastPromptIndex)
      setLastPromptIndex(promptIndex)
      setQuote(text)
      setQuoteKey((k) => k + 1)
    } catch {
      setHint('宇宙信号有点弱，再许一次愿试试吧 🔮')
    } finally {
      setLoading(false)
    }
  }

  // 顶部大图：随内容轮换
  const topPet = PET_IMGS[quote.length % PET_IMGS.length]

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#f06292',
          colorLink: '#f06292',
          borderRadius: 18,
          fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      {/* 漂浮的爪印背景 */}
      {PAWS.map((paw, i) => (
        <span key={i} className="paw-float" style={PAW_STYLES[i]}>
          {paw}
        </span>
      ))}

      <div className="page">
        <h1 className="page-title">欣懿宝宝专属加油站</h1>
        <p className="page-subtitle">—— 小猫咪和小狗狗正在为你向宇宙许愿 ——</p>

        {/* 卡片上方的小宠物 */}
        <div className="pets-row">
          <img className="pet-img small" src={PET_IMGS[2]} alt="打盹的小猫" />
          <img className="pet-img" src={PET_IMGS[0]} alt="加油小猫" />
          <img className="pet-img" src={PET_IMGS[1]} alt="学习小狗" />
          <img className="pet-img small" src={PET_IMGS[3]} alt="小分队" />
        </div>

        <Card className="cheer-card" styles={{ body: { paddingTop: 48 } }}>
          <img className="card-top-pet" src={topPet} alt="轮换小宠物" />

          {loading ? (
            <div className="cheer-quote" style={{ flexDirection: 'column', gap: 12 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#f06292' }} spin />} />
              <span style={{ fontSize: 14, color: '#d48aa0' }}>
                小猫小狗正在向宇宙许愿…
              </span>
            </div>
          ) : (
            <blockquote key={quoteKey} className="cheer-quote fade">{quote}</blockquote>
          )}

          <Button
            type="primary"
            size="large"
            icon={loading ? <LoadingOutlined /> : <span style={{ fontSize: 20 }}>🔮</span>}
            onClick={makeWish}
            loading={loading}
          >
            许愿
          </Button>

          {hint && (
            <p style={{ color: '#e08aa4', fontSize: 13, margin: '12px 0 0' }}>{hint}</p>
          )}

          <p className="footer-tip">
            <HeartFilled style={{ color: '#f06292', marginRight: 4 }} />
            愿你拿下成都的好 offer，然后我们一起去台湾快乐玩耍
            <HeartFilled style={{ color: '#f06292', marginLeft: 4 }} />
          </p>
        </Card>

        <p style={{ color: '#c98aa0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <HeartFilled style={{ color: '#f06292' }} /> Made by Aurora
        </p>
      </div>
    </ConfigProvider>
  )
}
