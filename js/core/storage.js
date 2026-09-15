// Sauvegarde des données pour un module donné
export function sauvegarder(module, donnees) {
  localStorage.setItem(`kynq_${module}`, JSON.stringify(donnees));
}

// Lit les données d'un module. Renvoie la valeur par défaut si rien n'est stocké.
export function lire(module, valeurParDefaut = []) {
  const texte = localStorage.getItem(`kynq_${module}`);
  if (texte === null) {
    return valeurParDefaut;
  }
  return JSON.parse(texte);
}

// Efface les données d'un module
export function effacer(module) {
  localStorage.removeItem(`kynq_${module}`);
}