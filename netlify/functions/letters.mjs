// 할머니의 오븐: 모인 편지를 '오븐 속 들여다보기'에 보내 주는 작은 서버 기능
// Netlify에 저장된 편지(oven-letters 폼)를 읽어서,
// 공개에 동의한 편지만 내용을 담고, 비공개 편지는 쿠키와 닉네임만 보내요.
//
// Netlify 사이트 설정 > Environment variables 에 두 값을 넣어야 해요.
//   OVEN_API_TOKEN : Netlify 개인 액세스 토큰 (User settings > Applications > Personal access tokens)
//   OVEN_SITE_ID   : 이 사이트의 Site ID (Site configuration > General > Site details)
// 선택: OVEN_HIDDEN_IDS : 숨기고 싶은 편지의 letterId를 쉼표로 (예: abc,def)

const FORM_NAME = 'oven-letters';
const COOKIES = ['heart', 'ginger', 'tree', 'snow', 'star', 'round'];

export default async () => {
  const token = process.env.OVEN_API_TOKEN;
  const site = process.env.OVEN_SITE_ID;
  if (!token || !site) {
    return json({ letters: [], error: 'not-configured' }, 500);
  }
  const hidden = new Set((process.env.OVEN_HIDDEN_IDS || '').split(',').map(s => s.trim()).filter(Boolean));
  const letters = [];
  try {
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`https://api.netlify.com/api/v1/sites/${site}/submissions?per_page=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'halmoni-oven (ad campaign class project)' }
      });
      if (!res.ok) return json({ letters: [], error: 'api-' + res.status }, 502);
      const items = await res.json();
      if (!Array.isArray(items) || !items.length) break;
      for (const it of items) {
        if (it.form_name !== FORM_NAME) continue;
        const d = it.data || {};
        const id = String(d.letterId || it.id);
        if (hidden.has(id)) continue;
        const isPublic = d.isPublic === '공개 동의';
        letters.push({
          id,
          cookie: COOKIES.includes(d.cookieType) ? d.cookieType : 'round',
          nickname: String(d.nickname || '익명').slice(0, 8),
          content: isPublic ? String(d.content || '').slice(0, 150) : '',
          isPublic,
          time: it.created_at
        });
      }
      if (items.length < 100) break;
    }
  } catch (e) {
    return json({ letters: [], error: 'fetch-failed' }, 502);
  }
  return json({ letters });
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=30'
    }
  });
}

export const config = { path: '/api/letters' };
