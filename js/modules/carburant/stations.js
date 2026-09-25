// ============================================
// Prix des stations-service autour de toi.
// Parle aux API du gouvernement et renvoie des données propres.
// N'affiche rien et ne sauvegarde rien.
// ============================================

import { prixPlausible } from "./calculs.js";

const URL_STATIONS = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
const URL_GEOCODAGE = "https://data.geopf.fr/geocodage/search/";


// ---------- Ta position ----------

// Position donnée par le navigateur (il demande l'autorisation)
export function positionParGeoloc() {
  return new Promise(function (resoudre, rejeter) {
    if (!("geolocation" in navigator)) {
      rejeter(new Error("geoloc-indispo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        resoudre({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      function () {
        rejeter(new Error("geoloc-refusee"));
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  });
}

// Code postal converti en coordonnées par l'API de l'IGN
export async function positionParCodePostal(cp) {
  const url = URL_GEOCODAGE + "?q=" + encodeURIComponent(cp) + "&type=municipality&limit=1";
  const reponse = await fetch(url);
  if (!reponse.ok) { throw new Error("api-adresse"); }

  const donnees = await reponse.json();
  if (!donnees.features || donnees.features.length === 0) { throw new Error("cp-inconnu"); }

  // Attention, l'API donne [longitude, latitude], dans cet ordre
  const coords = donnees.features[0].geometry.coordinates;
  return { lat: coords[1], lon: coords[0] };
}


// ---------- Distance ----------

// Distance à vol d'oiseau entre deux points, en km (formule de Haversine)
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}


// ---------- Les stations ----------

export async function chercherStations(position, rayonKm, carburant) {
  // Beaucoup de stations ne vendent plus de SP95, seulement de l'E10 : on prend les deux
  const champs = carburant === "sp95" ? ["sp95", "e10"] : [carburant];

  // Le serveur filtre lui-même : seulement ton rayon, seulement ton carburant
  const conditionsPrix = champs.map(function (c) { return c + "_prix is not null"; }).join(" or ");
  const where = "within_distance(geom, geom'POINT(" + position.lon + " " + position.lat + ")', " +
    rayonKm + "km) and (" + conditionsPrix + ")";
  const url = URL_STATIONS + "?where=" + encodeURIComponent(where) + "&limit=100";

  const reponse = await fetch(url);
  if (!reponse.ok) { throw new Error("api-stations"); }
  const donnees = await reponse.json();

  const stations = [];
  for (let i = 0; i < donnees.results.length; i++) {
    const s = donnees.results[i];
    if (!s.geom) { continue; }

    // Premier carburant disponible dans l'ordre de préférence (SP95 avant E10)
    let trouve = null;
    for (let j = 0; j < champs.length; j++) {
      const prix = s[champs[j] + "_prix"];
      if (prix !== null && prix !== undefined && prixPlausible(prix, champs[j])) {
        trouve = champs[j];
        break;
      }
    }
    if (trouve === null) { continue; }

    const maj = s[trouve + "_maj"];
    stations.push({
      adresse: s.adresse,
      ville: s.ville,
      prix: s[trouve + "_prix"],
      carburant: trouve,
      maj: maj ? new Date(maj).getTime() : null,
      distance: distanceKm(position.lat, position.lon, s.geom.lat, s.geom.lon)
    });
  }

  // Moins chère d'abord, et à prix égal la plus proche
  stations.sort(function (a, b) {
    return a.prix - b.prix || a.distance - b.distance;
  });
  return stations;
}