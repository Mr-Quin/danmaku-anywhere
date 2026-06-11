import { serializeError } from '@/utils/serializeError'

const AXIOM_INGEST_ORIGIN = 'https://api.axiom.co'

export async function forwardToAxiom(
  env: Env,
  events: unknown[]
): Promise<void> {
  try {
    const token = await env.AXIOM_TOKEN.get()
    const response = await fetch(
      `${AXIOM_INGEST_ORIGIN}/v1/ingest/${env.AXIOM_DATASET}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events),
      }
    )

    if (!response.ok) {
      console.error(
        'Axiom ingest failed',
        response.status,
        await response.text()
      )
    }
  } catch (error) {
    console.error('Axiom ingest error', serializeError(error))
  }
}
