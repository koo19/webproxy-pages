
// functions/[[path]].js

// 定义异步函数 onRequest，用于处理所有进入此路径的请求
export async function onRequest(context) {
  // 从上下文中解构 request, env, params, 和 next
  const { request, env, params, next } = context;

  // 如果路径参数数组为空, 说明是访问根目录
  // 调用 next() 将请求传递给静态资源处理器, 以便渲染 index.html
  if (params.path.length === 0) {
    return next();
  }

  // 获取 URL 路径参数，并用 "/" 连接成字符串
  // 例如, /google.com/search -> ["google.com", "search"] -> "google.com/search"
  let path = params.path.join('/');

  // 获取原始请求 URL 的查询字符串
  // 例如, /google.com/search?q=workers -> "?q=workers"
  const search = new URL(request.url).search;

  // 拼接成完整的后端目标 URL
  const url = `https://${path}${search}`;

  // 创建一个新的 Headers 对象，复制原始请求的 headers
  const newHeaders = new Headers(request.headers);
  // 设置 Host 为目标 URL 的主机名
  newHeaders.set('Host', new URL(url).hostname);
  // 设置 Referer 为目标 URL
  newHeaders.set('Referer', url);

  // 使用 fetch API 向目标 URL 发起请求
  // 我们创建一个新的 Request 对象以确保能够转发 body 内容 (适用于 POST, PUT 等请求)
  const newRequest = new Request(url, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: 'manual', // 手动处理重定向，防止 fetch 自动跟随
  });

  // 等待 fetch 请求完成
  const response = await fetch(newRequest);

  // 创建一个新的 Headers 对象，用于构建返回给客户端的响应
  const responseHeaders = new Headers(response.headers);

  // 设置 CORS (跨源资源共享) header，允许任何来源访问
  // 这对于在浏览器中正确显示代理内容至关重要
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 删除可能会阻止内容在 iframe 或其他上下文中显示的 CSP (内容安全策略) header
  responseHeaders.delete('Content-Security-Policy');
  responseHeaders.delete('X-Frame-Options');

  // 使用从目标服务器获取的响应 (body, status, statusText) 和我们修改过的 headers
  // 创建并返回一个新的 Response 对象给原始客户端
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
