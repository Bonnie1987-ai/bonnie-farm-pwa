const CACHE_NAME =
  "bonnie-farm-pwa-v1";


const FILES_TO_CACHE = [

  "./",
  "./index.html",
  "./app.js",
  "./manifest.json"

];


self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(
          cache =>
            cache.addAll(
              FILES_TO_CACHE
            )
        )

    );

    self.skipWaiting();

  }
);


self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(
          keys =>
            Promise.all(

              keys
                .filter(
                  key =>
                    key !==
                    CACHE_NAME
                )
                .map(
                  key =>
                    caches.delete(key)
                )
            )
        )

    );

    self.clients.claim();

  }
);


self.addEventListener(
  "fetch",
  event => {

    /*
     * Only handle normal GET requests.
     * The Google Apps Script synchronisation
     * requests are not cached.
     */

    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }


    event.respondWith(

      caches
        .match(
          event.request
        )
        .then(
          cachedResponse => {

            if (
              cachedResponse
            ) {

              return cachedResponse;

            }


            return fetch(
              event.request
            )
            .then(
              response => {

                const copy =
                  response.clone();

                caches
                  .open(
                    CACHE_NAME
                  )
                  .then(
                    cache =>
                      cache.put(
                        event.request,
                        copy
                      )
                  );

                return response;

              }
            )
            .catch(
              () =>
                caches.match(
                  "./index.html"
                )
            );

          }
        )

    );

  }
);
