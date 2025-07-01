import LogoCohere from '@/assets/icons/model-logo-cohere.svg?component'
import LogoCohereSvg from '@/assets/icons/model-logo-cohere.svg?raw'
import LogoDeepseek from '@/assets/icons/model-logo-deepseek.svg?component'
import LogoDeepseekSvg from '@/assets/icons/model-logo-deepseek.svg?raw'
import LogoFallback from '@/assets/icons/model-logo-fallback.svg?component'
import LogoFallbackSvg from '@/assets/icons/model-logo-fallback.svg?raw'
import LogoGemma from '@/assets/icons/model-logo-gemma.svg?component'
import LogoGemmaSvg from '@/assets/icons/model-logo-gemma.svg?raw'
import LogoLlama from '@/assets/icons/model-logo-llama.svg?component'
import LogoLlamaSvg from '@/assets/icons/model-logo-llama.svg?raw'
import LogoLlava from '@/assets/icons/model-logo-llava.svg?component'
import LogoLlavaSvg from '@/assets/icons/model-logo-llava.svg?raw'
import LogoMistral from '@/assets/icons/model-logo-mistral.svg?component'
import LogoMistralSvg from '@/assets/icons/model-logo-mistral.svg?raw'
import LogoPhi from '@/assets/icons/model-logo-phi.svg?component'
import LogoPhiSvg from '@/assets/icons/model-logo-phi.svg?raw'
import LogoQwen from '@/assets/icons/model-logo-qwen.svg?component'
import LogoQwenSvg from '@/assets/icons/model-logo-qwen.svg?raw'

const matcher = [
  {
    match: /deepseek/i,
    component: LogoDeepseek,
    svg: LogoDeepseekSvg,
  },
  {
    match: /gemma/i,
    component: LogoGemma,
    svg: LogoGemmaSvg,
  },
  {
    match: /qwen/i,
    component: LogoQwen,
    svg: LogoQwenSvg,
  },
  {
    match: /llama/i,
    component: LogoLlama,
    svg: LogoLlamaSvg,
  },
  {
    match: /mistral/i,
    component: LogoMistral,
    svg: LogoMistralSvg,
  },
  {
    match: /llava/i,
    component: LogoLlava,
    svg: LogoLlavaSvg,
  },
  {
    match: /phi/i,
    component: LogoPhi,
    svg: LogoPhiSvg,
  },
  {
    match: /command|aya/i,
    component: LogoCohere,
    svg: LogoCohereSvg,
  },
]

export function getModelLogoComponent(modelName: string) {
  const matched = matcher.find((m) => m.match.test(modelName))
  if (matched) {
    return matched.component
  }
  return LogoFallback
}

export function getModelLogoSvg(modelName: string) {
  const matched = matcher.find((m) => m.match.test(modelName))
  if (matched) {
    return matched.svg
  }
  return LogoFallbackSvg
}
