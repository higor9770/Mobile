const HOSTNAME_WHITELIST = [
  self.location.hostname,
  'fonts.gstatic.com',
  'fonts.googleapis.com',
  'cdn.jsdelivr.net'
]

// The Util Function to hack URLs of intercepted requests
const getFixedUrl = (req) => {
  var now = Date.now()
  var url = new URL(req.url)


  url.protocol = self.location.protocol


  if (url.hostname === self.location.hostname) {
      url.search += (url.search ? '&' : '?') + 'cache-bust=' + now
  }
  return url.href
}

/**
*  @Lifecycle Activate
*  New one activated when old isnt being used.
*
*  waitUntil(): activating ====> activated
*/
self.addEventListener('activate', event => {
event.waitUntil(self.clients.claim())
})

/**
*  @Functional Fetch
*  All network requests are being intercepted here.
*
*  void respondWith(Promise<Response> r)
*/
self.addEventListener('fetch', event => {
// Skip some of cross-origin requests, like those for Google Analytics.
if (HOSTNAME_WHITELIST.indexOf(new URL(event.request.url).hostname) > -1) {
  // Stale-while-revalidate
  // similar to HTTP's stale-while-revalidate: https://www.mnot.net/blog/2007/12/12/stale
  // Upgrade from Jake's to Surma's: https://gist.github.com/surma/eb441223daaedf880801ad80006389f1
  const cached = caches.match(event.request)
  const fixedUrl = getFixedUrl(event.request)
  const fetched = fetch(fixedUrl, { cache: 'no-store' })
  const fetchedCopy = fetched.then(resp => resp.clone())


  event.respondWith(
  Promise.race([fetched.catch(_ => cached), cached])
      .then(resp => resp || fetched)
      .catch(_ => { /* eat any errors */ })
  )

  // Update the cache with the version we fetched (only for ok status)
  event.waitUntil(
  Promise.all([fetchedCopy, caches.open("pwa-cache")])
      .then(([response, cache]) => response.ok && cache.put(event.request, response))
      .catch(_ => { /* eat any errors */ })
  )
 }
})

window.addEventListener('DOMContentLoaded', () => {
  const parsedUrl = new URL(window.location);
  // searchParams.get() will properly handle decoding the values.
  console.log('Title shared: ' + parsedUrl.searchParams.get('title'));
  console.log('Text shared: ' + parsedUrl.searchParams.get('text'));
  console.log('URL shared: ' + parsedUrl.searchParams.get('url'));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // If this is an incoming POST request for the
  // registered "action" URL, respond to it.
  if (event.request.method === 'POST' &&
      url.pathname === '/bookmark') {
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const link = formData.get('link') || '';
      const responseUrl = await saveBookmark(link);
      return Response.redirect(responseUrl, 303);
    })());
  }
});