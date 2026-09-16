// ============================================
// Affichage du module carburant.
// Ce fichier ne décide rien et ne sauvegarde rien.
// Il reçoit des données et les met à l'écran.
// ============================================

import {
    tousLesSegments,
    consoMediane,
    estSuspect,
    segmentsFiables,
    prixPlausible
} from "./calculs.js";


// ---------- Formatage français ----------

function nb(valeur, decimales = 2) {
    return valeur.toLocaleString("fr-FR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

function ent(valeur) {
    return Math.round(valeur).toLocaleString("fr-FR");
}


// ---------- Les éléments de la page ----------

const messageAttente = document.getElementById("message-attente");
const zoneAccueil = document.getElementById("accueil");
const zoneResultats = document.getElementById("resultats");
const elemActuelle = document.getElementById("projection-actuelle");
const elemObjectif = document.getElementById("projection-objectif");
const elemEcart = document.getElementById("ecart");
const elemLabelEcart = document.getElementById("label-ecart");
const elemConsoReelle = document.getElementById("conso-reelle");
const elemTendance = document.getElementById("tendance");
const elemPhraseEcart = document.getElementById("phrase-ecart");
const elemObjectifInline = document.getElementById("objectif-inline");
const elemLabelObjectif = document.getElementById("label-objectif");
const elemBaseCalcul = document.getElementById("base-calcul");
const elemNoteHypothese = document.getElementById("note-hypothese");
const elemNoteAnomalies = document.getElementById("note-anomalies");
const elemEquivActuelle = document.getElementById("equiv-actuelle");
const elemEquivObjectif = document.getElementById("equiv-objectif");
const elemEquivEcart = document.getElementById("equiv-ecart");
const elemLabelPotentiel = document.getElementById("label-potentiel");
const elemPotentiel = document.getElementById("potentiel");
const elemEquivPotentiel = document.getElementById("equiv-potentiel");
const elemPhrasePotentiel = document.getElementById("phrase-potentiel");
const elemTotalDepense = document.getElementById("total-depense");
const elemTotalDetail = document.getElementById("total-detail");
const elemCoutKm = document.getElementById("cout-km");
const elemConseilObjectif = document.getElementById("conseil-objectif");
const elemLegendePrix = document.getElementById("legende-prix");
const listePleins = document.getElementById("liste-pleins");
const historiqueVide = document.getElementById("historique-vide");
const zoneGraphique = document.getElementById("zone-graphique");
const graphiqueVide = document.getElementById("graphique-vide");


// ---------- Messages ----------

export function afficherMessage(texte, montrerAccueil) {
    messageAttente.hidden = false;
    messageAttente.textContent = texte;
    zoneResultats.hidden = true;
    zoneAccueil.hidden = !montrerAccueil;
}


// ---------- Tableau de bord ----------

export function afficherResultats(donnees) {
    messageAttente.hidden = true;
    zoneAccueil.hidden = true;
    zoneResultats.hidden = false;

    elemActuelle.textContent = ent(donnees.projectionActuelle) + " €";
    elemObjectif.textContent = ent(donnees.projectionObjectif) + " €";
    elemConsoReelle.textContent = nb(donnees.conso, 2) + " L/100";
    elemObjectifInline.textContent = nb(donnees.objectifConso, 2) + " L/100";

    elemEquivActuelle.textContent = ent(donnees.projectionActuelle / 60) + " € par mois";
    elemEquivObjectif.textContent = ent(donnees.projectionObjectif / 60) + " € par mois";
    // Quand l'objectif est atteint, la ligne "si tu descends à" n'a plus de sens
    elemLabelObjectif.hidden = donnees.objectifAtteint;
    elemObjectif.hidden = donnees.objectifAtteint;
    elemEquivObjectif.hidden = donnees.objectifAtteint;

    if (donnees.objectifAtteint) {
        elemLabelEcart.textContent = "Objectif atteint";
        elemEcart.textContent = "✓";
        elemEquivEcart.textContent = "";
        elemPhraseEcart.textContent = "Tu es exactement à ton objectif de " + nb(donnees.objectifConso, 2) + " L/100. Descends-le pour te fixer un nouveau cap.";
    } else if (donnees.ecart > 0) {
        elemLabelEcart.textContent = "Écart récupérable";
        elemEcart.textContent = ent(Math.abs(donnees.ecart)) + " €";
        elemEquivEcart.textContent = ent(donnees.ecart / 60) + " € par mois récupérés";
        elemPhraseEcart.textContent = "C'est ce que tu économiserais sur 5 ans en descendant à " + nb(donnees.objectifConso, 2) + " L/100.";
    } else {
        elemLabelEcart.textContent = "Avance sur ton objectif";
        elemEcart.textContent = ent(Math.abs(donnees.ecart)) + " €";
        elemEquivEcart.textContent = ent(Math.abs(donnees.ecart) / 60) + " € par mois d'avance";
        elemPhraseEcart.textContent = "Tu es déjà sous ton objectif. C'est ce que tu gagnes par rapport à ta cible.";
    }

    // Scénario ambitieux : basé sur le meilleur segment déjà réalisé.
    // Ce n'est pas une promesse, c'est la borne de ce qui est atteignable.
    if (donnees.potentiel !== null) {
        elemLabelPotentiel.hidden = false;
        elemPotentiel.hidden = false;
        elemEquivPotentiel.hidden = false;
        elemPhrasePotentiel.hidden = false;

        elemLabelPotentiel.textContent = "Si tu tenais ton meilleur plein";
        elemPotentiel.textContent = ent(donnees.potentiel.ecart) + " €";
        elemEquivPotentiel.textContent = ent(donnees.potentiel.ecart / 60) + " € par mois";
        elemPhrasePotentiel.textContent =
            "Tu as déjà fait " + nb(donnees.potentiel.conso, 2) + " L/100 au moins une fois. Si c'était ton rythme habituel, voilà ce que tu récupérerais.";
    } else {
        elemLabelPotentiel.hidden = true;
        elemPotentiel.hidden = true;
        elemEquivPotentiel.hidden = true;
        elemPhrasePotentiel.hidden = true;
    }

    elemBaseCalcul.textContent =
        "Basé sur " + ent(donnees.kmAn) + " km/an (estimés sur " +
        donnees.joursSuivis + " jours de suivi) et un prix moyen de " + nb(donnees.prixMoyen, 2) + " €/L.";

    if (donnees.inflation > 0) {
        elemNoteHypothese.textContent = "Projection avec une hausse du carburant de " + nb(donnees.inflation, 1) + " % par an.";
    } else {
        elemNoteHypothese.textContent = "Projection au prix actuel du carburant, sans tenir compte d'une éventuelle hausse.";
    }

    if (donnees.anomalies > 0) {
        elemNoteAnomalies.hidden = false;
        if (donnees.anomalies === 1) {
            elemNoteAnomalies.textContent = "Un plein aux données douteuses a été écarté de ces calculs. Il est signalé en rouge dans ton historique.";
        } else {
            elemNoteAnomalies.textContent = donnees.anomalies + " pleins aux données douteuses ont été écartés de ces calculs. Ils sont signalés en rouge dans ton historique.";
        }
    } else {
        elemNoteAnomalies.hidden = true;
    }

    elemTotalDepense.textContent = nb(donnees.totalDepense, 2) + " €";
    elemTotalDetail.textContent = nb(donnees.totalLitres, 1) + " L sur " + ent(donnees.kmTotal) + " km parcourus";
    elemCoutKm.textContent = nb(donnees.coutKm, 3) + " €/km";

    afficherTendance(donnees.variation);
}


function afficherTendance(variation) {
    elemEcart.classList.remove("positif", "negatif");
    elemTendance.classList.remove("positif", "negatif");
    elemTendance.textContent = "";

    if (variation === null) {
        return;
    }

    if (variation < 0) {
        elemTendance.classList.add("positif");
        elemTendance.textContent = "↓ En baisse de " + nb(Math.abs(variation), 2) + " L depuis ton dernier plein complet";
    } else if (variation > 0) {
        elemTendance.classList.add("negatif");
        elemTendance.textContent = "↑ En hausse de " + nb(variation, 2) + " L depuis ton dernier plein complet";
    } else {
        elemTendance.textContent = "Stable depuis ton dernier plein complet";
    }
}


// ---------- Historique ----------

export function afficherHistorique(pleins) {
    listePleins.innerHTML = "";
    historiqueVide.hidden = pleins.length > 0;

    const mediane = consoMediane(tousLesSegments(pleins));
    // On repère d'abord les pleins suspects, avant tout calcul de moyenne
    for (let i = 0; i < pleins.length; i++) {
        pleins[i].suspect = false;
    }
    for (let i = 0; i < pleins.length; i++) {
        if (!pleins[i].complet) { continue; }
        let indexPrec = -1;
        for (let j = i - 1; j >= 0; j--) {
            if (pleins[j].complet) { indexPrec = j; break; }
        }
        if (indexPrec === -1) { continue; }

        const dist = pleins[i].km - pleins[indexPrec].km;
        let lit = 0;
        for (let j = indexPrec + 1; j <= i; j++) {
            lit = lit + pleins[j].litres;
        }
        if (estSuspect((lit / dist) * 100, mediane)) {
            pleins[i].suspect = true;
        }
    }

    // Prix moyen pondéré. On écarte les pleins dont la conso est suspecte :
    // si les litres sont douteux, le prix au litre l'est aussi.
    let prixMoyen = null;
    let pleinsEcartes = 0;
    if (pleins.length > 0) {
        let totalM = 0;
        let totalL = 0;
        for (let i = 0; i < pleins.length; i++) {
            if (pleins[i].suspect) {
                pleinsEcartes = pleinsEcartes + 1;
                continue;
            }
            totalM = totalM + pleins[i].montant;
            totalL = totalL + pleins[i].litres;
        }
        if (totalL > 0) {
            prixMoyen = totalM / totalL;
        }
    }

    if (prixMoyen !== null) {
        elemLegendePrix.hidden = false;
        let texte = "Ta moyenne : <strong>" + nb(prixMoyen, 3) +
            " €/L</strong>. Les prix sont comparés à elle : <span class='prix-bas'>↓</span> moins cher, <span class='prix-cher'>↑</span> plus cher.";
        if (pleinsEcartes > 0) {
            texte = texte + " Les pleins signalés en rouge ne sont pas comptés dans cette moyenne.";
        }
        elemLegendePrix.innerHTML = texte;
    } else {
        elemLegendePrix.hidden = true;
    }

    for (let i = pleins.length - 1; i >= 0; i--) {
        const p = pleins[i];
        const ligne = document.createElement("li");

        const dateLisible = new Date(p.date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

        const prixLitre = p.montant / p.litres;
        let classePrix = "prix-neutre";
        let signePrix = "";

        if (!prixPlausible(prixLitre)) {
            classePrix = "prix-aberrant";
            signePrix = "⚠ ";
        } else if (p.suspect) {
            classePrix = "prix-aberrant";
        } else if (prixMoyen !== null) {
            if (prixLitre > prixMoyen) {
                classePrix = "prix-cher";
                signePrix = "↑ ";
            } else if (prixLitre < prixMoyen) {
                classePrix = "prix-bas";
                signePrix = "↓ ";
            }
        }

        let noteAnomalie = "";
        let texteConso = "";

        if (!p.complet) {
            texteConso = "Plein partiel";
        } else {
            let indexPrecedent = -1;
            for (let j = i - 1; j >= 0; j--) {
                if (pleins[j].complet) {
                    indexPrecedent = j;
                    break;
                }
            }

            if (indexPrecedent === -1) {
                texteConso = "Premier plein";
            } else {
                const distance = p.km - pleins[indexPrecedent].km;
                let litres = 0;
                for (let j = indexPrecedent + 1; j <= i; j++) {
                    litres = litres + pleins[j].litres;
                }
                const consoCalculee = (litres / distance) * 100;
                texteConso = nb(consoCalculee, 2) + " L/100";

                if (estSuspect(consoCalculee, mediane)) {
                    p.suspect = true;
                    let cause = "Vérifie les litres et le kilométrage.";
                    if (mediane !== null && consoCalculee < mediane) {
                        cause = "Il manque peut-être un plein avant celui-ci.";
                    }
                    noteAnomalie = "<span class='histo-anomalie'>⚠ Consommation inhabituelle. " + cause + "</span>";
                }
            }
        }

        let noteExplicative = "";
        if (!p.complet) {
            noteExplicative = "<span class='histo-note'>Conso calculée au prochain plein complet</span>";
        }

        ligne.innerHTML =
            "<span class='histo-date'>" + dateLisible + "</span>" +
            "<span class='histo-conso'>" + texteConso + "</span>" +
            "<span class='histo-detail'>" + ent(p.km) + " km, " +
            nb(p.litres, 2) + " L, " + nb(p.montant, 2) + " €, " +
            "<span class='" + classePrix + "'>" + signePrix + nb(prixLitre, 3) + " €/L</span></span>" +
            noteExplicative +
            noteAnomalie +
            "<span class='histo-actions'>" +
            "<button class='btn-icone btn-modif' data-id='" + p.id + "' title='Modifier ce plein' aria-label='Modifier ce plein'>✎</button>" +
            "<button class='btn-icone btn-suppr' data-id='" + p.id + "' title='Supprimer ce plein' aria-label='Supprimer ce plein'>🗑</button>" +
            "</span>";

        listePleins.appendChild(ligne);
    }
}


// ---------- Conseil sur l'objectif ----------

export function afficherConseilObjectif(pleins, objectifActuel) {
    const segments = segmentsFiables(pleins);

    if (segments.length < 2) {
        elemConseilObjectif.textContent = "Vise un chiffre atteignable. Kynq te proposera mieux dès que tu auras deux pleins complets.";
        return;
    }

    // La médiane est plus stable que le meilleur plein, qui peut être
    // faussé par un seul long trajet autoroute.
    const mediane = consoMediane(segments);

    let meilleure = segments[0].conso;
    for (let i = 0; i < segments.length; i++) {
        if (segments[i].conso < meilleure) { meilleure = segments[i].conso; }
    }

    // Objectif suggéré : entre ton habitude et ton meilleur.
    let suggestion = mediane - (mediane - meilleure) * 0.6;
    if (suggestion >= meilleure) {
        suggestion = meilleure - 0.1;
    }
    // Arrondi vers le bas : on ne suggère jamais plus que ce qu'on a calculé
    suggestion = Math.floor(suggestion * 10) / 10;

    if (objectifActuel >= mediane) {
        elemConseilObjectif.textContent =
            "Tu consommes " + nb(mediane, 2) + " L/100 en général. Ton objectif à " +
            nb(objectifActuel, 2) + " est déjà atteint, il ne te tire vers rien. Essaie " + nb(suggestion, 1) + ".";
    } else if (objectifActuel >= meilleure) {
        elemConseilObjectif.textContent =
            "Tu as déjà fait " + nb(meilleure, 2) + " L/100 au moins une fois. Descends ton objectif sous ce chiffre, " +
            nb(suggestion, 1) + " par exemple.";
    } else if (objectifActuel < meilleure - 1) {
        elemConseilObjectif.textContent =
            "Ton meilleur plein est à " + nb(meilleure, 2) + " L/100. Un objectif à " +
            nb(objectifActuel, 2) + " sera dur à tenir. " + nb(suggestion, 1) + " serait plus réaliste.";
    } else {
        elemConseilObjectif.textContent =
            "Tu consommes " + nb(mediane, 2) + " L/100 en général, et ton meilleur plein est à " +
            nb(meilleure, 2) + ". Ton objectif à " + nb(objectifActuel, 2) + " est bien placé.";
    }
}


// ---------- Graphique ----------

export function afficherGraphique(pleins, objectifConso) {
    const segments = segmentsFiables(pleins);

    if (segments.length < 2) {
        zoneGraphique.innerHTML = "";
        graphiqueVide.hidden = false;
        if (pleins.length === 0) {
            graphiqueVide.textContent = "Ta courbe apparaîtra ici après tes trois premiers pleins.";
        } else if (segments.length === 1) {
            graphiqueVide.textContent = "Encore un plein complet et ta courbe démarre.";
        } else {
            graphiqueVide.textContent = "Il faut trois pleins complets pour tracer une courbe.";
        }
        return;
    }

    graphiqueVide.hidden = true;

    const largeur = 320;
    const hauteur = 160;
    const margeGauche = 34;
    const margeBas = 20;
    const zoneLargeur = largeur - margeGauche;
    const zoneHauteur = hauteur - margeBas;

    let min = segments[0].conso;
    let max = segments[0].conso;
    for (let i = 0; i < segments.length; i++) {
        if (segments[i].conso < min) { min = segments[i].conso; }
        if (segments[i].conso > max) { max = segments[i].conso; }
    }

    const marge = (max - min) * 0.2 || 0.5;
    min = min - marge;
    max = max + marge;

    function versY(valeur) {
        return zoneHauteur - ((valeur - min) / (max - min)) * zoneHauteur;
    }

    function versX(index) {
        if (segments.length === 1) { return margeGauche + zoneLargeur / 2; }
        return margeGauche + (index / (segments.length - 1)) * zoneLargeur;
    }

    let grille = "";
    for (let i = 0; i <= 3; i++) {
        const y = (i / 3) * zoneHauteur;
        const valeur = max - (i / 3) * (max - min);
        grille = grille +
            "<line x1='" + margeGauche + "' y1='" + y + "' x2='" + largeur + "' y2='" + y +
            "' stroke='#2a2e3a' stroke-width='1' />" +
            "<text x='0' y='" + (y + 3) + "' fill='#8b90a0' font-size='9'>" + nb(valeur, 2) + "</text>";
    }

    let points = "";
    let cercles = "";
    for (let i = 0; i < segments.length; i++) {
        const x = versX(i);
        const y = versY(segments[i].conso);
        points = points + x + "," + y + " ";
        cercles = cercles + "<circle cx='" + x + "' cy='" + y + "' r='3' fill='#4f8cff' />";
    }

    const premierX = versX(0);
    const dernierX = versX(segments.length - 1);
    const remplissage = "<polygon points='" + premierX + "," + zoneHauteur + " " + points +
        dernierX + "," + zoneHauteur + "' fill='url(#degrade)' />";

    const dernierY = versY(segments[segments.length - 1].conso);
    const pointFinal =
        "<circle cx='" + dernierX + "' cy='" + dernierY + "' r='6' fill='#4f8cff' opacity='0.25' />" +
        "<circle cx='" + dernierX + "' cy='" + dernierY + "' r='3.5' fill='#4f8cff' />" +
        "<text x='" + dernierX + "' y='" + (dernierY - 12) + "' fill='#f2f3f5' font-size='11' font-weight='600' text-anchor='end'>" +
        nb(segments[segments.length - 1].conso, 2) + "</text>";

    let etiquettes = "";
    const indexAffiches = [0, segments.length - 1];
    if (segments.length >= 5) {
        indexAffiches.push(Math.floor((segments.length - 1) / 2));
    }

    for (let i = 0; i < indexAffiches.length; i++) {
        const idx = indexAffiches[i];
        const x = versX(idx);
        const d = new Date(segments[idx].date);
        const texte = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

        let ancrage = "middle";
        if (idx === 0) { ancrage = "start"; }
        if (idx === segments.length - 1) { ancrage = "end"; }

        etiquettes = etiquettes +
            "<text x='" + x + "' y='" + (hauteur - 4) + "' fill='#8b90a0' font-size='9' text-anchor='" + ancrage + "'>" +
            texte + "</text>";
    }

    const objectifY = versY(objectifConso);
    let ligneObjectif = "";
    if (objectifConso > min && objectifConso < max) {
        ligneObjectif =
            "<line x1='" + margeGauche + "' y1='" + objectifY + "' x2='" + largeur + "' y2='" + objectifY +
            "' stroke='#3ddc84' stroke-width='1' stroke-dasharray='4 4' />" +
            "<rect x='" + (margeGauche + 2) + "' y='" + (objectifY - 16) + "' width='44' height='12' fill='#12141a' rx='3' />" +
            "<text x='" + (margeGauche + 6) + "' y='" + (objectifY - 7) + "' fill='#3ddc84' font-size='9'>objectif</text>";
    }

    zoneGraphique.innerHTML =
        "<svg viewBox='0 0 " + largeur + " " + hauteur + "' width='100%' role='img' aria-label='Courbe d’évolution de ta consommation'>" +
        "<defs>" +
        "<linearGradient id='degrade' x1='0' y1='0' x2='0' y2='1'>" +
        "<stop offset='0%' stop-color='#4f8cff' stop-opacity='0.28' />" +
        "<stop offset='100%' stop-color='#4f8cff' stop-opacity='0' />" +
        "</linearGradient>" +
        "</defs>" +
        grille +
        ligneObjectif +
        remplissage +
        "<polyline points='" + points + "' fill='none' stroke='#4f8cff' stroke-width='2' stroke-linejoin='round' />" +
        cercles +
        pointFinal +
        etiquettes +
        "</svg>";
}