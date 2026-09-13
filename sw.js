/************************************************
 * BONNIE FARM PWA SERVICE WORKER
 ************************************************/

const CACHE_NAME =
  "bonnie-farm-pwa-v2";


const FILES_TO_CACHE = [

  "./",

  "./index.html",

  "./app.js",

  "./manifest.json"

];


/************************************************
 * INSTALL
 ************************************************/

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )
        .then(
          cache => {

            return cache.addAll(
              FILES_TO_CACHE
            );

          }
        )

    );


    /*
     * Activate the new service worker immediately.
     */

    self.skipWaiting();

  }
);


/************************************************
 * ACTIVATE
 ************************************************/

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(
          keys => {

            return Promise.all(

              keys
                .filter(
                  key =>
                    key !==
                    CACHE_NAME
                )
                .map(
                  key =>
                    caches.delete(
                      key
                    )
                )

            );

          }
        )

    );


    /*
     * Take control of all open PWA pages.
     */

    self.clients.claim();

  }
);


/************************************************
 * FETCH
 ************************************************/

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;


    /*
     * Only intercept GET requests.
     */

    if (
      request.method !==
      "GET"
    ) {

      return;

    }


    const url =
      new URL(
        request.url
      );


    /**********************************************
     * VERY IMPORTANT
     *
     * NEVER CACHE GOOGLE APPS SCRIPT REQUESTS.
     *
     * The Bonnie Farm PWA uses GET/JSONP to send
     * sales and expenses to Google Apps Script.
     **********************************************/

    if (

      url.hostname ===
      "script.google.com"

      ||

      url.hostname ===
      "script.googleusercontent.com"

    ) {

      event.respondWith(

        fetch(
          request,
          {
            cache: "no-store"
          }
        )

      );

      return;

    }


    /**********************************************
     * DO NOT CACHE NON-HTTP REQUESTS
     **********************************************/

    if (
      url.protocol !==
      "http:" &&
      url.protocol !==
      "https:"
    ) {

      return;

    }


    /**********************************************
     * PWA CACHE STRATEGY
     *
     * 1. Look in cache first.
     * 2. If not cached, go to network.
     * 3. Cache successful local application
     *    resources.
     * 4. If network fails, return index.html.
     **********************************************/

    event.respondWith(

      caches
        .match(
          request
        )
        .then(
          cachedResponse => {

            if (
              cachedResponse
            ) {

              return cachedResponse;

            }


            return fetch(
              request
            )
            .then(
              response => {

                /*
                 * Only cache valid responses.
                 */

                if (
                  !response ||
                  response.status !== 200 ||
                  response.type !==
                    "basic"
                ) {

                  return response;

                }


                const copy =
                  response.clone();


                caches
                  .open(
                    CACHE_NAME
                  )
                  .then(
                    cache => {

                      cache.put(
                        request,
                        copy
                      );

                    }
                  )
                  .catch(
                    error => {

                      console.warn(
                        "Unable to cache resource:",
                        error
                      );

                    }
                  );


                return response;

              }
            )
            .catch(
              () => {

                /*
                 * When offline, return the cached
                 * application shell.
                 */

                return caches.match(
                  "./index.html"
                );

              }
            );

          }
        )

    );

  }
);
