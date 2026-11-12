import { useState } from 'react'
import { ConfigProvider, Card, Button, theme, Spin } from 'antd'
import { HeartFilled, LoadingOutlined } from '@ant-design/icons'
import './App.css'

// ============ DeepSeek 配置 ============
const API_URL = 'https://api.deepseek.com/chat/completions'
const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY

// 多套随机 prompt：每次许愿随机挑一种风格（简短、点到为止）
const COMMON_RULES = `要求：30~60字，直接输出句子本身，不要引号、解释或前缀；最多2个emoji；称呼在"欣懿宝宝"和"宝宝"里随机选一个；核心是笃定、开心地传达"她一定会拿到好offer"；约一半概率自然提一句"拿到offer后我们一起去台湾旅行"，另一半不提；严禁出现简历、面试、笔试、海投、挂、被拒、焦虑、压力等词，不要提找工作的任何环节。`

const PROMPTS = [
  // 幽默风趣
  `你是宝宝的好朋友，用俏皮幽默的小段子逗她笑。`,
  // 暖心安慰
  `你是欣懿宝宝的闺蜜，像抱抱她一样温柔安慰，让她安心。`,
  // 元气满满
  `你是宝宝的啦啦队队长，元气满满地欢呼打气。`,
  // 向往未来
  `你是宝宝的好朋友，甜甜地憧憬拿offer后一起玩的小日子。`,
  // 温柔笃定
  `你是欣懿宝宝的守护小天使，平静笃定地悄悄报喜。`,
  // 俏皮可爱
  `你是宝宝的小猫小狗化身，喵喵汪汪卖萌加油。`,
].map((style) => `${style}\n${COMMON_RULES}`)

const WELCOME_TEXT = '点一下下方的水晶球 🔮，让小猫小狗为你向宇宙许个愿吧～'

async function fetchCheerFromDeepSeek(lastPromptIndex, lastQuote) {
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
        { role: 'user', content: `来一句新的加油吧，用词、比喻和句式都不要和上一句雷同。上一句是：「${lastQuote}」（随机数 ${Date.now()}）` },
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
  `${BASE}pets/cheer-cat.jpg`,
  `${BASE}pets/study-pup.jpg`,
  `${BASE}pets/nap-cat.jpg`,
  `${BASE}pets/duo.jpg`,
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
      const { text, promptIndex } = await fetchCheerFromDeepSeek(lastPromptIndex, quote)
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
