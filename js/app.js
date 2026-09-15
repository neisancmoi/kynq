// ============================================
// Chef d'orchestre de l'application.
// Il branche les morceaux, décide quoi calculer,
// et demande à la vue d'afficher le résultat.
// ============================================

import { comparer } from "./core/projection.js";
import { sauvegarder, lire } from "./core/storage.js";
import {
    coutParKmTheorique,
    kmParAn,
    prixMoyenLitre,
    dernierSegment,
    segmentsFiables,
    nombreAnomalies,
    totalDepense,
    totalLitres,
    prixPlausible
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

if (config.inflation === undefined) {
    config.inflation = 0;
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
champInflation.value = config.inflation;


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
    champDate.scrollIntoView({ behavior: "smooth", block: "center" });
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

    config.inflation = valeur;
    sauvegarder("config", config);
    afficher();
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


// ---------- Calcule tout et demande l'affichage ----------

function afficher() {
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

    const prixMoyen = prixMoyenLitre(pleins);
    // Les deux branches doivent tourner sur le MÊME prix au litre,
    // sinon le rapport entre les projections ne reflète plus l'écart de conso.
    const coutKmActuel = coutParKmTheorique(segment.conso, prixMoyen);
    const coutKmObjectif = coutParKmTheorique(config.objectifConso, prixMoyen);
    const resultat = comparer(coutKmActuel, coutKmObjectif, kmAn, 5, config.inflation);
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
            const compare = comparer(coutKmActuel, coutKmMeilleur, kmAn, 5, config.inflation);
            potentiel = { conso: meilleure, ecart: compare.ecart };
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
        anomalies: nombreAnomalies(pleins),
        objectifAtteint: objectifAtteint,
        inflation: config.inflation,
        potentiel: potentiel
    });
}


// ---------- Au démarrage ----------

afficher();