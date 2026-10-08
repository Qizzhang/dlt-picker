// sw.js - Service Worker

// 缓存版本号，修改代码后改这里（v1改成v2）可以让手机强制更新
const CACHE_NAME = 'dlt-picker-v1';

// 需要离线缓存的静态文件
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. 安装阶段：把静态文件全部提前下载到本地缓存
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // 强制让新的 Service Worker 立即生效
});

// 2. 激活阶段：清理掉过去版本的旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // 立即接管页面
});

// 3. 拦截请求：优先从缓存读，没缓存再去网络请求
self.addEventListener('fetch', event => {
  // 如果请求的是 GitHub 数据接口（获取开奖历史），不缓存，直接走网络
  if (event.request.url.includes('raw.githubusercontent.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      // 如果缓存里有，直接返回缓存
      if (cached) {
        return cached;
      }
      
      // 如果缓存没有，去网络请求
      return fetch(event.request).then(response => {
        // 网络请求成功后，把这次请求的文件顺便存进缓存
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // 如果完全断网，并且请求的是页面，就返回 index.html
      return caches.match('./index.html');
    })
  );
});