// functions/[[path]].js

export async function onRequest(context) {
  const { request, env, params, next } = context;

  // 1. 根路径处理：如果路径为空，则交由静态页面处理器显示 index.html
  if (!params.path || params.path.length === 0) {
    return next();
  }

  // 2. 拼接目标URL
  const path = params.path.join('/');
  const search = new URL(request.url).search;
  const url = `https://${path}${search}`;

  // 3. 构造请求头
  const newHeaders = new Headers(request.headers);

  // 移除 Cloudflare 特定的请求头，防止被目标网站拦截
  newHeaders.forEach((value, key) => {
    if (key.startsWith('cf-')) {
      newHeaders.delete(key);
    }
  });

  newHeaders.set('Host', new URL(url).hostname);
  newHeaders.set('Referer', url);

  // 4. 创建请求
  const newRequest = new Request(url, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: 'follow', // 自动跟随301/302重定向
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