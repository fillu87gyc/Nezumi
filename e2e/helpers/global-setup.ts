import { rmSync } from 'node:fs'
import { ARTIFACTS_DIR } from './report'

// 前回実行のアーティファクトを消して、今回の実行分だけでギャラリーを作る
export default function globalSetup(): void {
  rmSync(ARTIFACTS_DIR, { recursive: true, force: true })
}
