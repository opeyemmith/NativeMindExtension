import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing'

import { detectLanguage } from './detect'

const englishSentences = [
  'Hello, how are you?',
  'This is a test sentence.',
  'The quick brown fox jumps over the lazy dog.',
  'I love programming in JavaScript.',
  'What is your favorite color?',
  'The weather is nice today.',
  'I enjoy reading books in my free time.',
  'Can you help me with this problem?',
  'I am learning new things every day.',
]

const chineseSentences = [
  '你好，今天怎么样？',
  '我喜欢编程和学习新知识。',
  '今天天气很好，我们去散步吧。',
  '你最喜欢的食物是什么？',
  '我正在学习中文，希望能流利地说。',
  '这本书非常有趣，我很喜欢。',
  '你能帮我解决这个问题吗？',
  '你对未来有什么计划？',
]

const japaneseSentences = [
  'こんにちは、今日はどうですか？',
  '私はプログラミングと新しい知識を学ぶのが好きです。',
  '今日は天気が良いので、散歩に行きましょう。',
  'あなたの好きな食べ物は何ですか？',
  '私は日本語を勉強しています。流暢に話せるようになりたいです。',
  'この本はとても面白いです。私はそれが大好きです。',
  'この問題を解決するのを手伝ってくれますか？',
  'あなたの将来の計画は何ですか？',
]

const koreanSentences = [
  '안녕하세요, 오늘은 어때요?',
  '저는 프로그래밍과 새로운 지식을 배우는 것을 좋아합니다.',
  '오늘 날씨가 좋아서 산책하러 가요.',
  '가장 좋아하는 음식은 무엇인가요?',
  '저는 한국어를 배우고 있습니다. 유창하게 말할 수 있게 되고 싶어요.',
  '이 책은 정말 재미있어요. 저는 그것을 좋아해요.',
  '이 문제를 해결하는 데 도와줄 수 있나요?',
  '당신의 미래 계획은 무엇인가요?',
]

describe('language detector', () => {
  beforeEach(() => {
    // See https://webext-core.aklinker1.io/fake-browser/reseting-state
    fakeBrowser.reset()
  })

  it('should detect the language of input string', async () => {
    for (const sentence of englishSentences) {
      const lang = await detectLanguage(sentence)
      expect(lang).toBe('en')
    }

    for (const sentence of chineseSentences) {
      const lang = await detectLanguage(sentence)
      expect(lang).toBe('zh')
    }

    for (const sentence of japaneseSentences) {
      const lang = await detectLanguage(sentence)
      expect(lang).toBe('ja')
    }

    for (const sentence of koreanSentences) {
      const lang = await detectLanguage(sentence)
      expect(lang).toBe('ko')
    }
  })
})
