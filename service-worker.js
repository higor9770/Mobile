var cacheName = 'service-worker.js';

self.addEventListener('install', event => {

  self.skipWaiting();

  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll([

        'index.html',

        'KansasCity.html',

        'Philadelphia.html',

        'SanFrancisco.html',

        './assets/css/bootstrap.min.css',

        './assets/js/bootstrap.min.js',

        './assets/js/jquery.min.js',

        './assets/js/popper.min.js',

        './assets/img/background.png',
        './assets/img/favicon.png',
        './assets/img/logo.png',
        './assets/img/icon_128.png',
        './assets/img/icon_144.png',
        './assets/img/icon_152.png',
        './assets/img/icon_167.png',
        './assets/img/icon_180.png',
        './assets/img/icon_192.png',
        './assets/img/icon_256.png',
        './assets/img/icon_512.png',
        './assets/img/formulas.JPG',
      ]))
  );
});

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function (event) {
  //Atualizacao internet
  event.respondWith(async function () {
     try {
       return await fetch(event.request);
     } catch (err) {
       return caches.match(event.request);
     }
   }());

  //Atualizacao cache
  /*event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );*/

const HOSTNAME_WHITELIST = [
  self.location.hostname,
  'fonts.gstatic.com',
  'fonts.googleapis.com',
  'cdn.jsdelivr.net'
]

  const sharedName = url.searchParams.get("name");
	const sharedDescription = url.searchParams.get("description");
	const sharedLink = url.searchParams.get("link");


  if ("serviceWorker" in navigator) {
    // declaring scope manually
    navigator.serviceWorker.register("/sw.js", { scope: "/product/" }).then(
      (registration) => {
        console.log("Service worker registration succeeded:", registration);
      },
      (error) => {
        console.error(`Service worker registration failed: ${error}`);
      }
    );
  } else {
    console.error("Service workers are not supported.");
  }


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



});