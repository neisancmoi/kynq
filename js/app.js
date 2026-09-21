// ============================================
// Chef d'orchestre de l'application.
// Il branche les morceaux, décide quoi calculer,
// et demande à la vue d'afficher le résultat.
// ============================================

import { comparer, projeter } from "./core/projection.js";
import { sauvegarder, lire } from "./core/storage.js";
import { initNavigation, allerVers } from "./core/navigation.js";
import { afficherTotal } from "./core/total.js";
import { totalMensuel } from "./modules/abonnements/calculs.js";
import {
    afficherResultats as afficherAboResultats,
    afficherListe as afficherAboListe
} from "./modules/abonnements/vue.js";
import {
    coutParKmTheorique,
    kmParAn,
    prixMoyenLitre,
    dernierSegment,
    segmentsFiables,
    nombreAnomalies,
    totalDepense,
    totalLitres,
    prixPlausible,
    pleinPeutEtreOublie,
    prixMoyenFiable
} from "./modules/carburant/calculs.js";
import {
    afficherMessage,
    afficherResultats,
    afficherHistorique,
    afficherGraphique,
    afficherConseilObjectif
} from "./modules/carburant/vue.js";


// ---------- Les données ----------

let config = lire("config", { objectifConso: 5.6, inflation: 0 });
let pleins = lire("carburant");
let abonnements = lire("abonnements");

// Migration : l'inflation était partagée, elle devient propre à chaque module
if (config.inflationCarburant === undefined) {
    config.inflationCarburant = config.inflation !== undefined ? config.inflation : 0;
}
if (config.inflationAbonnements === undefined) {
    config.inflationAbonnements = 0;
}

// Rattrapage des anciennes données
let besoinSauvegarde = false;
for (let i = 0; i < pleins.length; i++) {
    if (!pleins[i].id) {
        pleins[i].id = pleins[i].date + i;
        besoinSauvegarde = true;
    }
    if (pleins[i].complet === undefined) {
        pleins[i].complet = true;
        besoinSauvegarde = true;
    }
}
if (besoinSauvegarde) {
    sauvegarder("carburant", pleins);
}


// ---------- Les éléments de la page ----------

const champDate = document.getElementById("date-plein");
const champKm = document.getElementById("km");
const champLitres = document.getElementById("litres");
const champMontant = document.getElementById("montant");
const champComplet = document.getElementById("plein-complet");
const bouton = document.getElementById("btn-enregistrer");
const boutonAnnuler = document.getElementById("btn-annuler");

const champObjectif = document.getElementById("objectif");
const boutonObjectif = document.getElementById("btn-objectif");
const champInflation = document.getElementById("inflation");
const boutonInflation = document.getElementById("btn-inflation");
const boutonExport = document.getElementById("btn-export");
const champImport = document.getElementById("fichier-import");
const elemRappelExport = document.getElementById("rappel-export");
const listePleins = document.getElementById("liste-pleins");
const aboNom = document.getElementById("abo-nom");
const aboMontant = document.getElementById("abo-montant");
const aboPeriodicite = document.getElementById("abo-periodicite");
const aboBouton = document.getElementById("abo-btn-enregistrer");
const aboBoutonAnnuler = document.getElementById("abo-btn-annuler");
const aboTitreSaisie = document.getElementById("abo-titre-saisie");
const aboListe = document.getElementById("abo-liste");
const rappelPlein = document.getElementById("rappel-plein");
const rappelPleinTexte = document.getElementById("rappel-plein-texte");
const rappelPleinAjouter = document.getElementById("rappel-plein-ajouter");
const rappelPleinMasquer = document.getElementById("rappel-plein-masquer");
const aboChampInflation = document.getElementById("abo-inflation");
const aboBoutonInflation = document.getElementById("abo-btn-inflation");

// Id de l'abonnement en cours de modification
let aboIdEnEdition = null;

const modale = document.getElementById("modale");
const modaleTitre = document.getElementById("modale-titre");
const modaleDetail = document.getElementById("modale-detail");
const modaleAnnuler = document.getElementById("modale-annuler");
const modaleConfirmer = document.getElementById("modale-confirmer");
const titreSaisie = document.getElementById("titre-saisie");

// Id du plein en cours de modification (null = création)
let idEnEdition = null;
// Fonction à exécuter si l'utilisateur confirme dans la modale
let actionEnAttente = null;


// ---------- Utilitaires ----------

function dateAujourdhui() {
    const maintenant = new Date();
    const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
    const jour = String(maintenant.getDate()).padStart(2, "0");
    return maintenant.getFullYear() + "-" + mois + "-" + jour;
}

function fr(valeur, decimales = 2) {
    return valeur.toLocaleString("fr-FR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

champDate.value = dateAujourdhui();
champObjectif.value = config.objectifConso;
champInflation.value = config.inflationCarburant;
aboChampInflation.value = config.inflationAbonnements;


// ---------- Modale générique ----------

// Un message, un seul bouton
function alerte(titre, detail) {
    modaleTitre.textContent = titre;
    modaleDetail.textContent = detail || "";
    modaleDetail.hidden = !detail;
    modaleAnnuler.hidden = true;
    modaleConfirmer.textContent = "J'ai compris";
    modaleConfirmer.className = "";
    modaleAnnuler.className = "btn-secondaire";
    actionEnAttente = null;
    modale.hidden = false;
}

// Deux boutons, l'action ne s'exécute que si l'utilisateur confirme
function demander(titre, detail, libelleConfirmer, action, danger) {
    modaleTitre.textContent = titre;
    modaleDetail.textContent = detail || "";
    modaleDetail.hidden = !detail;
    modaleAnnuler.hidden = false;
    modaleConfirmer.textContent = libelleConfirmer;
    // Sur un avertissement, l'action prudente doit dominer.
    // Le bouton de confirmation devient discret, sauf pour une suppression.
    modaleConfirmer.className = danger ? "btn-danger" : "btn-secondaire";
    modaleAnnuler.className = danger ? "btn-secondaire" : "";
    actionEnAttente = action;
    modale.hidden = false;
}

function fermerModale() {
    actionEnAttente = null;
    modale.hidden = true;
}

modaleAnnuler.addEventListener("click", fermerModale);

modale.addEventListener("click", function (event) {
    if (event.target === modale) { fermerModale(); }
});

modaleConfirmer.addEventListener("click", function () {
    const action = actionEnAttente;
    fermerModale();
    if (action !== null) { action(); }
});


// ---------- Mode édition ----------

function passerEnEdition(id) {
    const plein = pleins.find(function (p) { return p.id === id; });
    if (!plein) { return; }

    idEnEdition = id;

    const d = new Date(plein.date);
    const mois = String(d.getMonth() + 1).padStart(2, "0");
    const jour = String(d.getDate()).padStart(2, "0");
    champDate.value = d.getFullYear() + "-" + mois + "-" + jour;

    champKm.value = plein.km;
    champLitres.value = plein.litres;
    champMontant.value = plein.montant;
    champComplet.checked = plein.complet;

    bouton.textContent = "Mettre à jour";
    titreSaisie.textContent = "Modifier le plein";
    boutonAnnuler.hidden = false;
    document.getElementById("ecran-saisie").scrollIntoView({ behavior: "smooth", block: "start" });
}

function quitterEdition() {
    idEnEdition = null;
    champKm.value = "";
    champLitres.value = "";
    champMontant.value = "";
    champDate.value = dateAujourdhui();
    champComplet.checked = true;
    bouton.textContent = "Enregistrer";
    titreSaisie.textContent = "Nouveau plein";
    boutonAnnuler.hidden = true;
}

boutonAnnuler.addEventListener("click", quitterEdition);


// ---------- Enregistrer un plein ----------

bouton.addEventListener("click", function () {
    const km = Number(champKm.value);
    const litres = Number(champLitres.value);
    const montant = Number(champMontant.value);
    const dateSaisie = new Date(champDate.value).getTime();

    if (isNaN(dateSaisie)) {
        alerte("Date invalide", "Choisis une date valide pour ce plein.");
        return;
    }

    if (km <= 0 || litres <= 0 || montant <= 0) {
        alerte("Champs incomplets", "Remplis les trois champs avec des valeurs positives.");
        return;
    }

    // En modification, on exclut le plein lui-même des comparaisons
    const autres = pleins.filter(function (p) { return p.id !== idEnEdition; });
    const avant = autres.filter(function (p) { return p.date <= dateSaisie; });
    const apres = autres.filter(function (p) { return p.date > dateSaisie; });

    if (avant.length > 0) {
        const kmAvant = avant[avant.length - 1].km;
        if (km <= kmAvant) {
            alerte("Kilométrage incohérent", "Ce plein est postérieur à un plein à " + kmAvant.toLocaleString("fr-FR") + " km. Son kilométrage doit être supérieur.");
            return;
        }
    }

    if (apres.length > 0) {
        const kmApres = apres[0].km;
        if (km >= kmApres) {
            alerte("Kilométrage incohérent", "Ce plein est antérieur à un plein à " + kmApres.toLocaleString("fr-FR") + " km. Son kilométrage doit être inférieur.");
            return;
        }
    }

    if (litres > 150) {
        alerte("Volume inhabituel", "Vérifie le nombre de litres, ça semble trop élevé.");
        return;
    }

    // Le prix au litre est dérivé de deux champs : c'est là que les inversions se voient
    const prixSaisi = montant / litres;
    if (!prixPlausible(prixSaisi)) {
        alerte("Prix au litre improbable", "Ça ferait " + fr(prixSaisi, 2) + " € le litre. Vérifie les litres et le montant, ils sont peut-être inversés.");
        return;
    }

    // Cohérence entre la date et la distance parcourue
    if (avant.length > 0) {
        const precedent = avant[avant.length - 1];
        const joursEcoules = (dateSaisie - precedent.date) / 86400000;
        const kmParcourus = km - precedent.km;
        let messageDate = null;

        if (joursEcoules < 1 && kmParcourus > 300) {
            messageDate = kmParcourus.toLocaleString("fr-FR") + " km parcourus le même jour que le plein précédent.";
        } else if (joursEcoules > 0 && kmParcourus / joursEcoules > 1500) {
            messageDate = "Plus de 1 500 km par jour sur cette période.";
        }

        if (messageDate !== null) {
            demander("Vérifie la date", messageDate + " C'est possible, mais assure-toi que la date est bonne.", "Enregistrer quand même", function () {
                enregistrerPlein(km, litres, montant, dateSaisie);
            }, false);
            return;
        }
    }

    enregistrerPlein(km, litres, montant, dateSaisie);
});


function enregistrerPlein(km, litres, montant, dateSaisie) {
    if (idEnEdition !== null) {
        const plein = pleins.find(function (p) { return p.id === idEnEdition; });
        plein.km = km;
        plein.litres = litres;
        plein.montant = montant;
        plein.date = dateSaisie;
        plein.complet = champComplet.checked;
    } else {
        pleins.push({
            id: Date.now(),
            km: km,
            litres: litres,
            montant: montant,
            date: dateSaisie,
            complet: champComplet.checked
        });
    }

    pleins.sort(function (a, b) {
        return a.date - b.date;
    });

    sauvegarder("carburant", pleins);
    quitterEdition();
    afficher();
}


// ---------- Réglages ----------

boutonObjectif.addEventListener("click", function () {
    const valeur = Number(champObjectif.value);

    if (valeur <= 0 || valeur > 30) {
        alerte("Valeur invalide", "Saisis un objectif de consommation réaliste, entre 1 et 30 L/100.");
        return;
    }

    config.objectifConso = valeur;
    sauvegarder("config", config);
    afficher();
});

boutonInflation.addEventListener("click", function () {
    const valeur = Number(champInflation.value);

    if (valeur < 0 || valeur > 20) {
        alerte("Valeur invalide", "Saisis une hausse entre 0 et 20 %.");
        return;
    }

    config.inflationCarburant = valeur;
    sauvegarder("config", config);
    afficher();
});
aboBoutonInflation.addEventListener("click", function () {
    const valeur = Number(aboChampInflation.value);

    if (valeur < 0 || valeur > 20) {
        alerte("Valeur invalide", "Saisis une hausse entre 0 et 20 %.");
        return;
    }

    config.inflationAbonnements = valeur;
    sauvegarder("config", config);
    afficherAbonnements();
});


// ---------- Modifier ou supprimer un plein ----------

listePleins.addEventListener("click", function (event) {
    const id = Number(event.target.dataset.id);

    if (event.target.classList.contains("btn-modif")) {
        passerEnEdition(id);
        return;
    }

    if (event.target.classList.contains("btn-suppr")) {
        const plein = pleins.find(function (p) { return p.id === id; });
        if (!plein) { return; }

        const d = new Date(plein.date).toLocaleDateString("fr-FR", {
            day: "numeric", month: "short", year: "numeric"
        });
        const detail = d + ", " + plein.km.toLocaleString("fr-FR") + " km, " +
            fr(plein.litres, 2) + " L, " + fr(plein.montant, 2) + " €";

        demander("Supprimer ce plein ?", detail, "Supprimer", function () {
            pleins = pleins.filter(function (p) { return p.id !== id; });
            sauvegarder("carburant", pleins);
            if (idEnEdition === id) { quitterEdition(); }
            afficher();
        }, true);
    }
});


// ---------- Export et import ----------

boutonExport.addEventListener("click", function () {
    const donnees = {
        version: 1,
        exporteLe: new Date().toISOString(),
        carburant: pleins,
        config: config
    };

    const texte = JSON.stringify(donnees, null, 2);
    const fichier = new Blob([texte], { type: "application/json" });
    const url = URL.createObjectURL(fichier);

    const lien = document.createElement("a");
    lien.href = url;
    lien.download = "kynq-" + dateAujourdhui() + ".json";
    lien.click();

    URL.revokeObjectURL(url);

    config.dernierExport = Date.now();
    config.pleinsAuDernierExport = pleins.length;
    sauvegarder("config", config);
    afficherRappelExport();
});

champImport.addEventListener("change", function (event) {
    const fichier = event.target.files[0];
    if (!fichier) {
        return;
    }

    const lecteur = new FileReader();

    lecteur.onload = function () {
        try {
            const donnees = JSON.parse(lecteur.result);

            if (!donnees.carburant) {
                alerte("Fichier non reconnu", "Ce fichier ne contient pas de données Kynq.");
                return;
            }

            demander(
                "Importer ces données ?",
                "Tes " + pleins.length + " pleins actuels seront remplacés par les " + donnees.carburant.length + " pleins du fichier.",
                "Importer",
                function () {
                    pleins = donnees.carburant;
                    sauvegarder("carburant", pleins);

                    if (donnees.config) {
                        config = donnees.config;
                        if (config.inflation === undefined) { config.inflation = 0; }
                        sauvegarder("config", config);
                        champObjectif.value = config.objectifConso;
                        champInflation.value = config.inflation;
                    }

                    afficher();
                },
                false
            );
        } catch (erreur) {
            alerte("Fichier illisible", "Ce fichier ne peut pas être lu. Vérifie qu'il s'agit bien d'un export Kynq.");
        }
    };

    lecteur.readAsText(fichier);
    champImport.value = "";
});


// ---------- Rappel de sauvegarde ----------

function afficherRappelExport() {
    if (pleins.length === 0) {
        elemRappelExport.textContent = "";
        elemRappelExport.className = "";
        return;
    }

    if (config.dernierExport === undefined) {
        elemRappelExport.textContent = "Tes données ne sont enregistrées que sur cet appareil. Exporte-les pour ne rien perdre.";
        elemRappelExport.className = "rappel-urgent";
        return;
    }

    const depuis = pleins.length - config.pleinsAuDernierExport;
    const jours = Math.round((Date.now() - config.dernierExport) / 86400000);

    if (depuis >= 5) {
        elemRappelExport.textContent = depuis + " pleins ajoutés depuis ta dernière sauvegarde. Pense à exporter.";
        elemRappelExport.className = "rappel-urgent";
    } else {
        let texte = "Dernière sauvegarde ";
        if (jours === 0) { texte = texte + "aujourd'hui"; }
        else if (jours === 1) { texte = texte + "hier"; }
        else { texte = texte + "il y a " + jours + " jours"; }
        elemRappelExport.textContent = texte + ".";
        elemRappelExport.className = "rappel-ok";
    }
}

// ---------- Abonnements ----------

function aboQuitterEdition() {
    aboIdEnEdition = null;
    aboNom.value = "";
    aboMontant.value = "";
    aboPeriodicite.value = "mensuel";
    aboBouton.textContent = "Ajouter";
    aboBoutonAnnuler.hidden = true;
    aboTitreSaisie.textContent = "Nouvel abonnement";
}

function aboPasserEnEdition(id) {
    const a = abonnements.find(function (x) { return x.id === id; });
    if (!a) { return; }

    aboIdEnEdition = id;
    aboNom.value = a.nom;
    aboMontant.value = a.montant;
    aboPeriodicite.value = a.periodicite;
    aboBouton.textContent = "Mettre à jour";
    aboBoutonAnnuler.hidden = false;
    aboTitreSaisie.textContent = "Modifier l'abonnement";
    document.getElementById("abo-saisie").scrollIntoView({ behavior: "smooth", block: "start" });
}

aboBoutonAnnuler.addEventListener("click", aboQuitterEdition);

aboBouton.addEventListener("click", function () {
    const nom = aboNom.value.trim();
    const montant = Number(aboMontant.value);

    if (nom === "") {
        alerte("Nom manquant", "Donne un nom à cet abonnement.");
        return;
    }

    if (montant <= 0) {
        alerte("Montant invalide", "Saisis un montant supérieur à zéro.");
        return;
    }

    if (montant > 10000) {
        alerte("Montant inhabituel", "Vérifie le montant, il semble très élevé.");
        return;
    }

    if (aboIdEnEdition !== null) {
        const a = abonnements.find(function (x) { return x.id === aboIdEnEdition; });
        a.nom = nom;
        a.montant = montant;
        a.periodicite = aboPeriodicite.value;
    } else {
        abonnements.push({
            id: Date.now(),
            nom: nom,
            montant: montant,
            periodicite: aboPeriodicite.value
        });
    }

    sauvegarder("abonnements", abonnements);
    aboQuitterEdition();
    afficherAbonnements();
});

aboListe.addEventListener("click", function (event) {
    const id = Number(event.target.dataset.id);

    if (event.target.classList.contains("abo-btn-modif")) {
        aboPasserEnEdition(id);
        return;
    }

    if (event.target.classList.contains("abo-btn-suppr")) {
        const a = abonnements.find(function (x) { return x.id === id; });
        if (!a) { return; }

        demander("Supprimer cet abonnement ?", a.nom + ", " + fr(a.montant, 2) + " €", "Supprimer", function () {
            abonnements = abonnements.filter(function (x) { return x.id !== id; });
            sauvegarder("abonnements", abonnements);
            if (aboIdEnEdition === id) { aboQuitterEdition(); }
            afficherAbonnements();
        }, true);
    }
});

function afficherAbonnements() {
    // L'unité est le mois, donc 12 unités par an. Le moteur ne change pas.
    function projeterMensuel(coutParMois) {
        return projeter(coutParMois, 12, 5, config.inflationAbonnements);
    }

    afficherAboListe(abonnements, projeterMensuel);
    afficherVueTotale();

    if (abonnements.length === 0) {
        afficherAboResultats(null);
        return;
    }

    const mensuel = totalMensuel(abonnements);

    afficherAboResultats({
        mensuel: mensuel,
        projection: projeterMensuel(mensuel),
        nombre: abonnements.length,
        inflation: config.inflationAbonnements
    });
}
// ---------- Coût d'un trajet ----------

const trajetIndispo = document.getElementById("trajet-indispo");
const trajetOutil = document.getElementById("trajet-outil");
const trajetDistance = document.getElementById("trajet-distance");
const trajetAr = document.getElementById("trajet-ar");
const trajetResultat = document.getElementById("trajet-resultat");
const trajetBase = document.getElementById("trajet-base");

// Calcul jetable : rien n'est enregistré, le résultat suit la saisie en direct.
// Mêmes valeurs que la projection, sinon l'écran se contredit.
function afficherTrajet() {
    const segment = dernierSegment(pleins);

    if (segment === null) {
        trajetIndispo.hidden = false;
        trajetOutil.hidden = true;
        return;
    }

    trajetIndispo.hidden = true;
    trajetOutil.hidden = false;

    const conso = segment.conso;
    const prix = prixMoyenFiable(pleins);
    const base = "À " + fr(conso, 2) + " L/100 et " + fr(prix, 2) + " €/L.";

    // Un Français tape 42,5 : on remplace la virgule avant de convertir
    const distance = parseFloat(trajetDistance.value.replace(",", "."));

    if (isNaN(distance) || distance <= 0) {
        trajetResultat.textContent = "";
        trajetBase.textContent = base;
        return;
    }

    const km = trajetAr.checked ? distance * 2 : distance;
    const litres = (km * conso) / 100;
    const cout = litres * prix;

    trajetResultat.textContent = fr(cout, 2) + " €";
    trajetBase.textContent = "Soit " + fr(litres, 1) + " L sur " + fr(km, 0) + " km. " + base;
}

trajetDistance.addEventListener("input", afficherTrajet);
trajetAr.addEventListener("change", afficherTrajet);
// ---------- Rappel de plein oublié ----------

function afficherRappelPlein() {
    const oubli = pleinPeutEtreOublie(pleins);

    // Masqué par l'utilisateur tant qu'aucun nouveau plein n'a été saisi
    const dernier = pleins.length > 0 ? pleins[pleins.length - 1].date : null;
    const masque = config.rappelMasque !== undefined && config.rappelMasque === dernier;

    if (oubli === null || masque) {
        rappelPlein.hidden = true;
        return;
    }

    rappelPleinTexte.textContent =
        "Ton dernier plein date de " + oubli.jours + " jours. D'habitude tu en fais un tous les " +
        oubli.habituel + " jours, tu en as peut-être oublié un.";
    rappelPlein.hidden = false;
}

rappelPleinAjouter.addEventListener("click", function () {
    allerVers("carburant");
    // On attend la fin de l'animation de la piste avant de descendre au formulaire
    setTimeout(function () {
        document.getElementById("ecran-saisie").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 320);
});

rappelPleinMasquer.addEventListener("click", function () {
    config.rappelMasque = pleins[pleins.length - 1].date;
    sauvegarder("config", config);
    rappelPlein.hidden = true;
});
// ---------- Vue totale ----------

// Chaque module fournit son coût mensuel. Le cumul ne calcule rien lui-même.
function mensuelCarburant() {
    const segment = dernierSegment(pleins);
    if (segment === null) { return 0; }

    const kmAn = kmParAn(pleins);
    if (kmAn === null) { return 0; }

    const prixMoyen = prixMoyenFiable(pleins);
    const coutKm = coutParKmTheorique(segment.conso, prixMoyen);

    // Coût annuel ramené au mois
    return (coutKm * kmAn) / 12;
}

function afficherVueTotale() {
    afficherTotal([
        { nom: "Carburant", mensuel: mensuelCarburant(), inflation: config.inflationCarburant },
        { nom: "Abonnements", mensuel: totalMensuel(abonnements), inflation: config.inflationAbonnements }
    ], nombreAnomalies(pleins));
}
// ---------- Calcule tout et demande l'affichage ----------

function afficher() {
    afficherRappelPlein();
    afficherTrajet();
    afficherVueTotale();
    afficherHistorique(pleins);
    afficherGraphique(pleins, config.objectifConso);
    afficherConseilObjectif(pleins, config.objectifConso);
    afficherRappelExport();

    const segment = dernierSegment(pleins);

    if (segment === null) {
        if (pleins.length === 0) {
            afficherMessage("", true);
        } else if (pleins.length === 1) {
            afficherMessage("Premier plein enregistré. Note le prochain pour voir ta consommation.", false);
        } else {
            afficherMessage("Il faut deux pleins complets pour calculer ta consommation.", false);
        }
        return;
    }

    const kmAn = kmParAn(pleins);

    if (kmAn === null) {
        afficherMessage("Reviens après ton prochain plein pour une projection fiable.", false);
        return;
    }

    const prixMoyen = prixMoyenFiable(pleins);
    // Les deux branches doivent tourner sur le MÊME prix au litre,
    // sinon le rapport entre les projections ne reflète plus l'écart de conso.
    const coutKmActuel = coutParKmTheorique(segment.conso, prixMoyen);
    const coutKmObjectif = coutParKmTheorique(config.objectifConso, prixMoyen);
    const resultat = comparer(coutKmActuel, coutKmObjectif, kmAn, 5, config.inflationCarburant);
    // Si l'objectif est à moins de 0,05 L de la conso réelle, il est atteint.
    // Afficher "2 € d'écart sur 5 ans" ne dit rien à personne.
    const objectifAtteint = Math.abs(segment.conso - config.objectifConso) < 0.05;
    // Scénario ambitieux : ta meilleure performance déjà réalisée
    const segmentsOk = segmentsFiables(pleins);
    let potentiel = null;

    if (segmentsOk.length >= 2) {
        let meilleure = segmentsOk[0].conso;
        for (let i = 0; i < segmentsOk.length; i++) {
            if (segmentsOk[i].conso < meilleure) { meilleure = segmentsOk[i].conso; }
        }

        // On n'affiche ce scénario que s'il apporte vraiment quelque chose
        // Le scénario n'a de sens que si le meilleur plein est à la fois
        // meilleur que l'actuel ET plus exigeant que l'objectif déjà fixé.
        if (meilleure < segment.conso - 0.1 && meilleure < config.objectifConso - 0.05) {
            const coutKmMeilleur = coutParKmTheorique(meilleure, prixMoyen);
            const compare = comparer(coutKmActuel, coutKmMeilleur, kmAn, 5, config.inflationCarburant);
        }
    }
    // Variation par rapport au segment fiable précédent
    let variation = null;
    if (segmentsOk.length >= 2) {
        variation = segment.conso - segmentsOk[segmentsOk.length - 2].conso;
    }

    afficherResultats({
        conso: segment.conso,
        coutKm: totalDepense(pleins) / (pleins[pleins.length - 1].km - pleins[0].km),
        objectifConso: config.objectifConso,
        projectionActuelle: resultat.actuelle,
        projectionObjectif: resultat.objectif,
        ecart: resultat.ecart,
        kmAn: kmAn,
        joursSuivis: Math.round((pleins[pleins.length - 1].date - pleins[0].date) / 86400000),
        prixMoyen: prixMoyen,
        totalDepense: totalDepense(pleins),
        totalLitres: totalLitres(pleins),
        kmTotal: pleins[pleins.length - 1].km - pleins[0].km,
        variation: variation,
        anomalies: nombreAnomalies(pleins),
        objectifAtteint: objectifAtteint,
        inflation: config.inflationCarburant,
        potentiel: potentiel
    });
}


// ---------- Au démarrage ----------
initNavigation();
afficher();
afficherAbonnements();