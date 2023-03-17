const HOSTNAME_WHITELIST = [
  self.location.hostname,
  'fonts.gstatic.com',
  'fonts.googleapis.com',
  'cdn.jsdelivr.net'
]

  const sharedName = url.searchParams.get("name");
	const sharedDescription = url.searchParams.get("description");
	const sharedLink = url.searchParams.get("link");

	self.addEventListener("fetch", (event) => {
		// Regular requests not related to Web Share Target.
		if (event.request.method !== "POST") {
		  event.respondWith(fetch(event.request));
		  return;
		}
	  
		// Requests related to Web Share Target.
		event.respondWith(
		  (async () => {
			const formData = await event.request.formData();
			const link = formData.get("link") || "";
			// Instead of the original URL `/save-bookmark/`, redirect
			// the user to a URL returned by the `saveBookmark()`
			// function, for example, `/`.
			const responseUrl = await saveBookmark(link);
			return Response.redirect(responseUrl, 303);
		  })()
		);
	  });

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