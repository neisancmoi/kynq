const CACHE = "kynq-v10";

const FICHIERS = [
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/core/projection.js",
  "./js/core/storage.js",
  "./js/core/navigation.js",
  "./js/core/total.js",
  "./js/modules/carburant/calculs.js",
  "./js/modules/carburant/vue.js",
  "./js/modules/abonnements/calculs.js",
  "./js/modules/abonnements/vue.js",
  "./manifest.json",
  "./icone-192.png",
  "./icone-512.png"
];

// À l'installation : on met tous les fichiers en cache
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FICHIERS);
    })
  );
});

// À chaque requête : on sert le cache si on l'a, sinon le réseau
self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (reponse) {
      return reponse || fetch(event.request);
    })
  );
});

// À l'activation : on supprime les vieux caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cles) {
      return Promise.all(
        cles.map(function (cle) {
          if (cle !== CACHE) {
            return caches.delete(cle);
          }
        })
      );
    })
  );
});