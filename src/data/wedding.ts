/**
 * 婚禮內容設定 — 之後可依實際資訊調整。
 */
export const wedding = {
  couple: {
    partnerA: 'William',
    partnerB: 'Jill',
  },
  date: {
    iso: '2026-10-04',
    display: '2026 / 10 / 04',
    weekday: '星期日',
  },
  venue: {
    name: '台北文華東方酒店',
    address: '台北市松山區敦化北路 158 號',
    url: 'https://www.motpenews.com/',
  },
  message: '三生三世，四個時代，我們始終走向彼此。',
  ceremony: {
    name: '證婚儀式',
    location: '8F 文華閣',
    time: '10:00',
    note: '開放入場觀禮',
  },
  banquet: {
    name: '結婚宴',
    location: 'B2 大宴會廳',
    time: '12:00',
  },
} as const

/**
 * 婚禮當日流程，供序章喜帖 popup 與其他資訊元件共用。
 */
export const invitationSchedule = [
  {
    time: '09:50',
    description: '開放入場',
    icon: 'entry',
  },
  {
    time: '10:00',
    description: '證婚儀式',
    icon: 'rings',
  },
  {
    time: '10:30–11:00',
    description: '拍照時間',
    icon: 'camera',
  },
  {
    time: '12:00',
    description: '開放入席',
    icon: 'banquet',
  },
  {
    time: '12:30',
    description: '午宴開始',
    icon: 'meal',
  },
] as const

export type DepthScene = {
  id: string
  eyebrow: string
  title: string
  text: string
  era: 'ancient' | 'european' | 'republic' | 'contemporary' | 'ceremony' | 'banquet'
  tone: 'dawn' | 'grove' | 'gold' | 'dusk' | 'ember' | 'moon'
  background: {
    src: string
    alt: string
    position?: string
  }
  image?: {
    src: string
    alt: string
    position?: string
  }
}

/**
 * 依部署 base path 產生圖片 URL，兼容本地 Vite 與 GitHub Pages project site。
 */
const imagePath = (filename: string) =>
  `${import.meta.env.BASE_URL}images/${filename}`

/**
 * 三生三世主敘事與婚禮資訊場景。
 */
export const depthScenes: DepthScene[] = [
  {
    id: 'ancient',
    eyebrow: '第一世｜唐',
    title: '一見長安',
    text: '那一世，我們以唐裝相逢。燈影入長街，袖口拂過，便記住了彼此。',
    era: 'ancient',
    tone: 'dawn',
    background: {
      src: imagePath('background-zhishan-garden.jpg'),
      alt: '至善園仿宋明庭園，水池、樹影與古典亭廊',
      position: 'center',
    },
    image: {
      src: imagePath('ancient-tang.png'),
      alt: '兩人身穿唐裝，在至善園古典廊亭相望',
      position: 'center',
    },
  },
  {
    id: 'european',
    eyebrow: '第二世｜近代',
    title: '玫瑰與遠方',
    text: '換了時代與衣裳，我們在歐風光影裡重逢。浪漫不是偶然，是每一世都認得你。',
    era: 'european',
    tone: 'grove',
    background: {
      src: imagePath('background-european-staircase.webp'),
      alt: '義大利卡塞塔王宮的高解析榮譽大階梯與古典拱廊',
      position: 'center',
    },
    image: {
      src: imagePath('modern-european.png'),
      alt: '兩人身穿歐風禮服，在古典樓梯間相視而笑',
      position: 'center 58%',
    },
  },
  {
    id: 'republic',
    eyebrow: '第三世｜民國',
    title: '風華正好',
    text: '那一世，西裝與旗袍寫下鄭重的約定。人海再大，我仍然一眼找到你。',
    era: 'republic',
    tone: 'gold',
    background: {
      src: imagePath('background-republic-room.webp'),
      alt: '1914 年西雅圖 L. C. Smith Building 的中式室內，木雕牆面與東方陳設',
      position: 'center',
    },
    image: {
      src: imagePath('republic.png'),
      alt: '兩人身穿民國風服飾，在花鳥屏風前相視',
      position: 'center',
    },
  },
  {
    id: 'contemporary',
    eyebrow: '第四世｜今生',
    title: '此刻相愛',
    text: '這一世，我們走過所有等待，終於把故事帶到今天。',
    era: 'contemporary',
    tone: 'dusk',
    background: {
      src: imagePath('background-contemporary-music-room.webp'),
      alt: '高解析古典音樂室，提供奶油色牆面、雕花、窗光與水晶燈的今生建築氛圍',
      position: 'center',
    },
    image: {
      src: imagePath('contemporary.png'),
      alt: '兩人身穿現代婚禮服，在奶油色窗光室內交換戒指',
      position: 'center',
    },
  },
  {
    id: 'ceremony',
    eyebrow: '證婚儀式',
    title: '在文華閣相見',
    text: '2026 / 10 / 04・星期日\n8F 文華閣・10:00\n開放入場觀禮',
    era: 'ceremony',
    tone: 'ember',
    background: {
      src: imagePath('wenhua-pavilion.png'),
      alt: '文華閣證婚儀式場地，拱頂與綠色座椅正對著窗邊禮服',
      position: 'center',
    },
  },
  {
    id: 'banquet',
    eyebrow: '結婚宴',
    title: '共赴一席',
    text: '12:00・B2 大宴會廳\n台北文華東方酒店\n期待與您共度這一日。',
    era: 'banquet',
    tone: 'moon',
    background: {
      src: imagePath('banquet-hall.png'),
      alt: '文華東方大宴會廳，設有圓桌、吊燈與華麗天花板',
      position: 'center',
    },
  },
]
