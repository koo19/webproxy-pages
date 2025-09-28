
// functions/[[path]].js

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

  // 2. 智能判断目标 Host
  // Heuristic: If the first path segment looks like a hostname (contains a dot), treat it as the target host.
  // This handles initial requests like /www.google.com/search.
  if (pathSegments[0] && pathSegments[0].includes('.')) {
    targetHost = pathSegments[0];
    targetPath = pathSegments.slice(1).join('/');
  } else {
    // This is likely a relative path asset request (e.g., /assets/style.css).
    // We need to infer the host from the Referer header.
    const referer = request.headers.get('Referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererPathSegments = refererUrl.pathname.split('/').filter(Boolean);
        
        // Find the first segment in the referer's path that looks like a hostname.
        const hostFromReferer = refererPathSegments.find(segment => segment.includes('.'));

        if (hostFromReferer) {
          targetHost = hostFromReferer;
          // The original path is the full path for the asset.
          targetPath = originalPath;
        }
      } catch (e) {
        // Invalid Referer URL, proceed with caution.
      }
    }
  }

  // If we couldn't determine a host, we can't proceed.
  if (!targetHost) {
    return new Response('Could not determine target host.', { status: 400 });
  }

  // Reconstruct the final target URL
  // Note: We ensure there's exactly one slash between host and path.
  const url = `https://${targetHost}/${targetPath}`.replace(/([^:]\/)\/+/g, "$1") + search;

  // 3. 构造请求头
  const newHeaders = new Headers(request.headers);
  newHeaders.forEach((value, key) => {
    if (key.startsWith('cf-')) {
      newHeaders.delete(key);
    }
  });
  newHeaders.set('Host', targetHost);
  newHeaders.set('Referer', `https://${targetHost}/`); // Set a generic referer

  // 4. 创建请求
  const newRequest = new Request(url, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: 'follow',
  });

  // 5. 发起请求并获取响应
  const response = await fetch(newRequest);

  // 6. 修改响应头
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  responseHeaders.delete('Content-Security-Policy');
  responseHeaders.delete('X-Frame-Options');

  // 7. 返回最终响应
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
