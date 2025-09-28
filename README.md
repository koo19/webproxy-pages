# Web Proxy for Cloudflare Pages

This project creates a simple but effective web proxy using Cloudflare Pages and a single Cloudflare Function. It allows you to access any website by appending its URL to the proxy's path.

## ✨ Features

- **Dynamic Proxy**: Proxies requests to any public website on the internet.
- **Serverless**: Runs entirely on the Cloudflare serverless infrastructure.
- **Easy Deployment**: Zero-configuration deployment through Cloudflare Pages.
- **Static Homepage**: A simple `index.html` provides usage instructions if the root URL is accessed.

## 🚀 Usage

Once deployed, simply append the website you want to visit to your Cloudflare Pages URL.

**Syntax**: `https://<your-project>.pages.dev/<target-url>`

### Examples:

- To visit `google.com`, navigate to:
  `https://<your-project>.pages.dev/google.com`

- To perform a search on Google, you can use:
  `https://<your-project>.pages.dev/google.com/search?q=cloudflare+pages`

## 🛠️ How It Works

This project uses a "catch-all" Cloudflare Function located at `functions/[[path]].js`.

1.  Any request that doesn't match a static file (like `index.html`) is intercepted by this function.
2.  The function captures the requested path (e.g., `google.com/search`).
3.  It constructs a full target URL (`https://google.com/search`) and forwards the original request (including method, headers, and body).
4.  Before returning the response from the target server, it modifies the HTTP headers to ensure the content can be correctly displayed in the browser, primarily by setting `Access-Control-Allow-Origin` to `*`.

## 📂 Project Structure

```
/
├── index.html         # The static homepage with usage instructions.
└── functions/
    └── [[path]].js    # The core serverless function for proxying requests.
```

## 部署 (Deployment)

1.  Push this repository to your own GitHub/GitLab account.
2.  Log in to the **Cloudflare Dashboard**.
3.  Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
4.  Select your repository.
5.  Cloudflare will automatically detect the settings. No build configuration is needed.
6.  Click **Save and Deploy**.
