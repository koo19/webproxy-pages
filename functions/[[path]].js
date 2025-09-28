// functions/[[path]].js

// Helper function to parse cookies from the request headers
function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) {
        return value;
      }
    }
  }
  return null;
}

export async function onRequest(context) {
  const { request, env, params, next } = context;

  // 1. 根路径处理
  if (!params.path || params.path.length === 0) {
    return next();
  }

  const pathSegments = params.path;
  const originalPath = params.path.join('/');
  const search = new URL(request.url).search;

  let targetHost;
  let targetPath = originalPath;
  let isMainPageRequest = false;

  // 2. 智能判断目标 Host
  if (pathSegments[0] && pathSegments[0].includes('.')) {
    // Case 1: Initial request like /www.google.com/search
    targetHost = pathSegments[0];
    targetPath = pathSegments.slice(1).join('/');
    isMainPageRequest = true; // This is a main request, so we should set the cookie
  } else {
    // Case 2: Relative path asset request like /assets/style.css
    // Strategy: Try Referer first, then fall back to Cookie.
    const referer = request.headers.get('Referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const hostFromReferer = refererUrl.pathname.split('/').find(s => s.includes('.'));
        if (hostFromReferer) {
          targetHost = hostFromReferer;
        }
      } catch (e) { /* Invalid Referer */ }
    }

    // If Referer didn't work, try the cookie
    if (!targetHost) {
      const hostFromCookie = getCookie(request, 'original_host');
      if (hostFromCookie) {
        targetHost = hostFromCookie;
      }
    }
  }

  if (!targetHost) {
    return new Response('Could not determine target host from path, referer, or cookie.', { status: 400 });
  }

  const url = `https://${targetHost}/${targetPath}`.replace(/([^:]\/)\/+/g, "$1") + search;

  // 3. 构造请求头
  const newHeaders = new Headers(request.headers);
  newHeaders.forEach((value, key) => {
    if (key.startsWith('cf-')) newHeaders.delete(key);
  });
  newHeaders.set('Host', targetHost);
  newHeaders.set('Referer', `https://${targetHost}/`);

  // 4. 创建请求
  const newRequest = new Request(url, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: 'follow',
  });

  // 5. 发起请求
  const response = await fetch(newRequest);
  const responseHeaders = new Headers(response.headers);

  // 6. 修改响应头 (CORS)
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', '*');
  responseHeaders.delete('Content-Security-Policy');
  responseHeaders.delete('X-Frame-Options');

  // 7. 如果是主页面请求, 设置 host cookie
  if (isMainPageRequest) {
    responseHeaders.append('Set-Cookie', `original_host=${targetHost}; Path=/; SameSite=Lax; Secure`);
  }

  // 8. 返回最终响应
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}