import type { Env, FilterSettings } from '../types'

export async function getUserFilterSettings(userId: string, env: Env): Promise<FilterSettings> {
  try {
    const ngWordsResult = await env.DB.prepare(
      'SELECT word, match_type, target FROM ng_words WHERE user_id = ?'
    )
      .bind(userId)
      .all()

    const userResult = await env.DB.prepare(
      'SELECT settings FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<{ settings: string }>()

    const settings = userResult?.settings ? JSON.parse(userResult.settings) : {}

    return {
      ngWords: (ngWordsResult.results as { word: string; match_type: string; target: string }[]).map(
        (row) => ({
          word: row.word,
          matchType: row.match_type as 'contains' | 'exact' | 'regex',
          target: row.target as 'all' | 'title' | 'body',
        })
      ),
      minScore: settings.minScore ?? 0,
      minComments: settings.minComments ?? 0,
      filterNsfw: settings.filterNsfw ?? false,
    }
  } catch {
    return { ngWords: [], minScore: 0, minComments: 0, filterNsfw: false }
  }
}
