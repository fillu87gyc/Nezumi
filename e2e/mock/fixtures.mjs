// モック Reddit が返す投稿フィクスチャ。
// E2E シナリオはこのデータを前提に書かれている（変更時は e2e/tests を確認すること）。

export const MOCK_PORT = 9377
export const MOCK_BASE = `http://127.0.0.1:${MOCK_PORT}`

export const USERS = {
  alice: { id: 'u_alice', name: 'alice_jp' },
  bob: { id: 'u_bob', name: 'bob_en' },
}

const now = Math.floor(Date.now() / 1000)

function rawPost(p) {
  return {
    kind: 't3',
    data: {
      id: p.id,
      title: p.title,
      author: p.author ?? 'reddit_user',
      subreddit: p.subreddit ?? 'todayilearned',
      score: p.score ?? 100,
      num_comments: p.numComments ?? 10,
      url: p.url ?? `https://example.com/${p.id}`,
      permalink: `/r/${p.subreddit ?? 'todayilearned'}/comments/${p.id}/`,
      selftext: p.selftext ?? '',
      thumbnail: p.thumbnail,
      ...(p.preview ? { preview: { images: [{ source: { url: p.preview } }] } } : {}),
      is_video: false,
      link_flair_text: p.flair,
      created_utc: p.createdAt ?? now - 3600,
      over_18: p.nsfw ?? false,
      spoiler: false,
      stickied: false,
    },
  }
}

// ホームフィード 1 ページ目。
// alice には D1 シード済みフィルター（NG ワード FILTERME / minScore 5 / NSFW 非表示）が効き、
// FILTERME・lowscore・nsfwpost の 3 件がサーバーサイドで除外される。
export const HOME_PAGE1 = [
  rawPost({
    id: 'textpost1',
    title: 'TIL the Japanese word for mouse is "nezumi"',
    selftext: 'I learned this while studying Japanese. Nezumi can mean both mouse and rat.',
    author: 'wordnerd',
    subreddit: 'todayilearned',
    score: 4821,
    numComments: 312,
    flair: 'Language',
  }),
  rawPost({
    id: 'imgocr1',
    title: 'This road sign made me laugh',
    author: 'photofan',
    subreddit: 'funny',
    score: 9921,
    numComments: 845,
    preview: `${MOCK_BASE}/img/ocr-sign.png`,
  }),
  rawPost({
    id: 'imgplain1',
    title: 'Sunset over Mount Fuji',
    author: 'traveler',
    subreddit: 'japanpics',
    score: 7777,
    numComments: 230,
    preview: `${MOCK_BASE}/img/plain.png`,
  }),
  rawPost({
    id: 'ngword1',
    title: 'FILTERME free giveaway click here now',
    author: 'spammer',
    subreddit: 'deals',
    score: 999,
    numComments: 50,
  }),
  rawPost({
    id: 'lowscore1',
    title: 'A very low effort post nobody upvoted',
    author: 'lurker',
    subreddit: 'random',
    score: 1,
    numComments: 0,
  }),
  rawPost({
    id: 'nsfwpost1',
    title: 'Definitely not safe for work content',
    author: 'edgy',
    subreddit: 'nsfwsub',
    score: 5000,
    numComments: 400,
    nsfw: true,
  }),
  rawPost({
    id: 'textpost2',
    title: 'What is your favorite ramen topping?',
    author: 'foodie',
    subreddit: 'ramen',
    score: 1543,
    numComments: 892,
  }),
]

export const HOME_PAGE2 = [
  rawPost({
    id: 'page2post1',
    title: 'Second page marker post for infinite scroll',
    author: 'paginator',
    subreddit: 'todayilearned',
    score: 654,
    numComments: 32,
  }),
  rawPost({
    id: 'page2post2',
    title: 'Another post on page two',
    author: 'paginator',
    subreddit: 'funny',
    score: 321,
    numComments: 12,
  }),
]

export const SUBREDDIT_FEEDS = {
  japanlife: [
    rawPost({
      id: 'jl1',
      title: 'Best convenience store snacks in Japan',
      subreddit: 'japanlife',
      author: 'konbini_lover',
      score: 2100,
      numComments: 180,
    }),
    rawPost({
      id: 'jl2',
      title: 'FILTERME this spam should be filtered for alice',
      subreddit: 'japanlife',
      author: 'spammer',
      score: 800,
      numComments: 60,
    }),
  ],
}

export const SUBREDDITS = [
  { kind: 't5', data: { display_name: 'japanlife', title: 'Life in Japan', icon_img: `${MOCK_BASE}/img/plain.png`, community_icon: '', subscribers: 250000 } },
  { kind: 't5', data: { display_name: 'todayilearned', title: 'Today I Learned', icon_img: '', community_icon: `${MOCK_BASE}/img/plain.png`, subscribers: 31000000 } },
  { kind: 't5', data: { display_name: 'ramen', title: 'Ramen', icon_img: '', community_icon: '', subscribers: 120000 } },
]

export const COMMENTS = {
  textpost1: [
    {
      kind: 't1',
      data: {
        id: 'c1',
        author: 'linguist',
        body: 'Fun fact: "nezumi-iro" means gray color in Japanese.',
        score: 521,
        created_utc: now - 1800,
        replies: {
          data: {
            children: [
              {
                kind: 't1',
                data: {
                  id: 'c1r1',
                  author: 'wordnerd',
                  body: 'TIL twice in one thread!',
                  score: 99,
                  created_utc: now - 1200,
                  replies: '',
                },
              },
            ],
          },
        },
      },
    },
    {
      kind: 't1',
      data: {
        id: 'c2',
        author: 'skeptic',
        body: 'Source? I want to read more about this.',
        score: 87,
        created_utc: now - 900,
        replies: '',
      },
    },
    // kind: 'more' は normalizeComments で除外されることを検証するためのデータ
    { kind: 'more', data: { id: 'more1', children: ['c3', 'c4'] } },
  ],
}

export const UNREAD_MESSAGES = [
  {
    kind: 't1',
    data: {
      id: 'msg1',
      subject: 'comment reply',
      author: 'linguist',
      body: 'Replying to your comment about nezumi',
      created_utc: now - 600,
      type: 'comment_reply',
    },
  },
  {
    kind: 't4',
    data: {
      id: 'msg2',
      subject: 'Hello from E2E',
      author: 'bob_en',
      body: 'This is a direct message',
      created_utc: now - 300,
      type: 'unknown',
    },
  },
]
