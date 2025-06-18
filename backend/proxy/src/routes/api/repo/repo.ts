import { factory } from '../../../factory'

export const repo = factory.createApp()

repo.get('/kazumi/:file', async (c) => {
  const { file } = c.req.param()
  return await fetch(
    `https://raw.githubusercontent.com/Predidit/KazumiRules/main/${file}`
  )
})
