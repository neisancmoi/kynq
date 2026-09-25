// ============================================
// Logique métier du carburant.
// Transforme les données brutes en chiffres exploitables.
// ============================================

// ---------- Bornes de plausibilité ----------
// Les prix varient beaucoup selon le carburant : l'E85 tourne autour de 0,90 €
// et le SP98 autour de 2 €. Une fourchette unique ne détecterait rien.
// Les clés sont les mêmes que dans l'API des prix (sp95_prix, e10_prix...).
export const BORNES_PRIX = {
  sp95: { min: 1.00, max: 3.00 },
  e10: { min: 1.00, max: 3.00 },
  sp98: { min: 1.10, max: 3.20 },
  gazole: { min: 1.00, max: 3.00 },
  e85: { min: 0.50, max: 1.80 },
  gplc: { min: 0.60, max: 2.00 }
};

export const CONSO_MIN = 3;
export const CONSO_MAX = 25;

export function prixPlausible(prix, carburant) {
  const bornes = BORNES_PRIX[carburant] || BORNES_PRIX.sp95;
  return prix >= bornes.min && prix <= bornes.max;
}

export function consoPlausible(conso) {
  return conso >= CONSO_MIN && conso <= CONSO_MAX;
}


// ---------- Calculs de base ----------

export function distanceParcourue(kmActuel, kmPrecedent) {
  return kmActuel - kmPrecedent;
}

export function consommation(litres, distance) {
  return (litres / distance) * 100;
}

export function coutParKm(montant, distance) {
  return montant / distance;
}

export function prixDuLitre(montant, litres) {
  return montant / litres;
}

export function coutParKmTheorique(consoObjectif, prixLitre) {
  return (consoObjectif / 100) * prixLitre;
}


// ---------- Segments ----------
// Un segment va d'un plein complet au suivant.
// Les pleins partiels entre les deux sont cumulés dedans.

export function tousLesSegments(pleins) {
  const segments = [];
  let indexDebut = -1;

  for (let i = 0; i < pleins.length; i++) {
    if (!pleins[i].complet) {
      continue;
    }

    if (indexDebut === -1) {
      indexDebut = i;
      continue;
    }

    const distance = pleins[i].km - pleins[indexDebut].km;
    let litres = 0;
    let montant = 0;

    for (let j = indexDebut + 1; j <= i; j++) {
      litres = litres + pleins[j].litres;
      montant = montant + pleins[j].montant;
    }

    segments.push({
      distance: distance,
      litres: litres,
      montant: montant,
      conso: (litres / distance) * 100,
      coutParKm: montant / distance,
      date: pleins[i].date,
      km: pleins[i].km
    });

    indexDebut = i;
  }

  return segments;
}


// ---------- Détection des anomalies ----------

// Médiane : valeur du milieu, insensible aux valeurs aberrantes
export function consoMediane(segments) {
  if (segments.length === 0) {
    return null;
  }

  const valeurs = [];
  for (let i = 0; i < segments.length; i++) {
    valeurs.push(segments[i].conso);
  }
  valeurs.sort(function (a, b) { return a - b; });

  const milieu = Math.floor(valeurs.length / 2);

  if (valeurs.length % 2 === 1) {
    return valeurs[milieu];
  }
  return (valeurs[milieu - 1] + valeurs[milieu]) / 2;
}

// Deux niveaux de détection :
// 1. bornes absolues, valables dès le premier calcul
// 2. écart à la médiane, dans les deux sens, quand on a un historique
export function estSuspect(conso, mediane) {
  if (!consoPlausible(conso)) {
    return true;
  }
  if (mediane === null) {
    return false;
  }
  return conso < mediane * 0.6 || conso > mediane * 1.3;
}

export function segmentsFiables(pleins) {
  const tous = tousLesSegments(pleins);
  const mediane = consoMediane(tous);

  const fiables = tous.filter(function (s) {
    return !estSuspect(s.conso, mediane);
  });

  // Si tout est suspect, on ne garde que ce qui passe les bornes absolues.
  // Mieux vaut peu de données sûres que beaucoup de douteuses.
  if (fiables.length === 0) {
    return tous.filter(function (s) {
      return consoPlausible(s.conso);
    });
  }

  return fiables;
}

export function nombreAnomalies(pleins) {
  return tousLesSegments(pleins).length - segmentsFiables(pleins).length;
}

export function dernierSegment(pleins) {
  const fiables = segmentsFiables(pleins);
  if (fiables.length === 0) {
    return null;
  }
  return fiables[fiables.length - 1];
}


// ---------- Agrégats ----------

export function kmParAn(pleins) {
  if (pleins.length < 2) {
    return null;
  }
  const premier = pleins[0];
  const dernier = pleins[pleins.length - 1];

  const kmTotal = dernier.km - premier.km;
  const millisecondes = dernier.date - premier.date;
  const jours = millisecondes / 86400000;

  if (jours < 1) {
    return null;
  }

  return (kmTotal / jours) * 365;
}

// Prix moyen pondéré par les volumes : total dépensé / total litres
export function prixMoyenLitre(pleins) {
  let totalMontant = 0;
  let totalLitres = 0;

  for (let i = 0; i < pleins.length; i++) {
    totalMontant = totalMontant + pleins[i].montant;
    totalLitres = totalLitres + pleins[i].litres;
  }

  return totalMontant / totalLitres;
}

export function totalDepense(pleins) {
  let total = 0;
  for (let i = 0; i < pleins.length; i++) {
    total = total + pleins[i].montant;
  }
  return total;
}

export function totalLitres(pleins) {
  let total = 0;
  for (let i = 0; i < pleins.length; i++) {
    total = total + pleins[i].litres;
  }
  return total;
}

// ---------- Détection d'un plein oublié ----------

// Intervalle habituel entre deux pleins, en jours.
// Médiane plutôt que moyenne : un mois de vacances ne fausse pas tout.
export function intervalleHabituel(pleins) {
  if (pleins.length < 5) {
    return null;
  }

  const intervalles = [];
  for (let i = 1; i < pleins.length; i++) {
    intervalles.push((pleins[i].date - pleins[i - 1].date) / 86400000);
  }
  intervalles.sort(function (a, b) { return a - b; });

  const milieu = Math.floor(intervalles.length / 2);
  let mediane = intervalles[milieu];
  if (intervalles.length % 2 === 0) {
    mediane = (intervalles[milieu - 1] + intervalles[milieu]) / 2;
  }

  // Deux pleins le même jour donneraient une médiane nulle, inutilisable
  if (mediane < 1) {
    return null;
  }
  return mediane;
}

// Renvoie { jours, habituel } si le dernier plein est anormalement ancien, sinon null
export function pleinPeutEtreOublie(pleins) {
  const habituel = intervalleHabituel(pleins);
  if (habituel === null) {
    return null;
  }

  const dernier = pleins[pleins.length - 1];
  const jours = (Date.now() - dernier.date) / 86400000;

  // Seuil large volontairement : une alerte trop fréquente finit ignorée
  if (jours <= habituel * 2) {
    return null;
  }

  return { jours: Math.round(jours), habituel: Math.round(habituel) };
}

// Prix moyen hors pleins douteux.
// Si les litres d'un plein sont suspects, son prix au litre l'est aussi.
export function prixMoyenFiable(pleins) {
  const tous = tousLesSegments(pleins);
  const mediane = consoMediane(tous);

  // Le plein qui clôt un segment suspect est celui qu'on écarte
  const suspects = tous.filter(function (s) {
    return estSuspect(s.conso, mediane);
  });

  let totalMontant = 0;
  let totalLitres = 0;

  for (let i = 0; i < pleins.length; i++) {
    const p = pleins[i];
    const estDouteux = suspects.some(function (s) {
      return s.km === p.km && s.date === p.date;
    });
    if (estDouteux) { continue; }

    totalMontant = totalMontant + p.montant;
    totalLitres = totalLitres + p.litres;
  }

  // Si tout est écarté, on retombe sur la moyenne brute plutôt que rien
  if (totalLitres === 0) {
    return prixMoyenLitre(pleins);
  }
  return totalMontant / totalLitres;
}