import {
  type GenerationConfig,
  GoogleGenerativeAI,
} from '@google/generative-ai'

type ExtractTitleParams = {
  env: Env
  input: string
  systemInstruction: string
  generationConfig: GenerationConfig
}

export async function extractTitleWithGemini({
  env,
  input,
  systemInstruction,
  generationConfig,
}: ExtractTitleParams) {
  const GEMINI_API_KEY = await env.DANMAKU_GEMINI_API_KEY.get()
  const DA_AI_GATEWAY_NAME = await env.DA_AI_GATEWAY_NAME.get()
  const DA_AI_GATEWAY_ID = await env.DA_AI_GATEWAY_ID.get()
  const modelName = env.GEMINI_MODEL
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

  const model = genAI.getGenerativeModel(
    {
      model: modelName,
      systemInstruction,
    },
    {
      baseUrl: `https://gateway.ai.cloudflare.com/v1/${DA_AI_GATEWAY_ID}/${DA_AI_GATEWAY_NAME}/google-ai-studio`,
    }
  )

  const session = model.startChat({
    generationConfig,
    history: [],
  })

  const result = await session.sendMessage(input)

  return JSON.parse(result.response.text())
}
