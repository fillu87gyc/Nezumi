import { Hono } from 'hono'
import type { Env } from './types'
import { auth } from './routes/auth'
import { feed } from './routes/feed'
import { translate } from './routes/translate'
import { imageTranslate } from './routes/image-translate'
import { notify, sendPushNotifications } from './routes/notify'

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => c.text('ok'))

app.route('/auth', auth)
app.route('/api/feed', feed)
app.route('/api/translate', translate)
app.route('/api/image-translate', imageTranslate)
app.route('/api/notify', notify)

const scheduled = async (_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) => {
  await sendPushNotifications(env)
}

export default { fetch: app.fetch, scheduled }
