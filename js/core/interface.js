// ============================================
// Interface : sous-onglets, bouton +, feuille d'ajout,
// historique repliable et animations.
// Ce fichier ne calcule rien et ne touche à aucune donnée :
// il se contente d'observer la page et de montrer ou cacher des blocs.
// ============================================


// ---------- Petits outils ----------

// Les choix d'affichage (sous-onglet ouvert) sont de simples préférences :
// si le stockage est bloqué, l'app marche quand même.
function lireChoix(cle, defaut) {
    try {
        return localStorage.getItem("ui-" + cle) || defaut;
    } catch (e) {
        return defaut;
    }
}

function ecrireChoix(cle, valeur) {
    try {
        localStorage.setItem("ui-" + cle, valeur);
    } catch (e) {
        // Pas grave, on ne retiendra juste pas le choix
    }
}

const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


// ---------- Écran actif ----------
// On lit l'onglet surligné par navigation.js, sans toucher à son code.

function ecranActif() {
    const onglet = document.querySelector("#onglets .onglet.actif");
    return onglet ? onglet.dataset.ecran : "total";
}

function suivreEcranActif() {
    function maj() {
        document.body.dataset.ecranActif = ecranActif();
    }
    new MutationObserver(maj).observe(document.getElementById("onglets"), {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
    });
    maj();
}


// ---------- Sous-onglets ----------

const panneauxOuverts = {};

function montrerPanneau(ecran, nom) {
    const barre = document.querySelector('.segments[data-sous-ecran="' + ecran + '"]');
    if (!barre) { return; }

    const boutons = barre.querySelectorAll("button");
    for (let i = 0; i < boutons.length; i++) {
        const actif = boutons[i].dataset.panneau === nom;
        boutons[i].classList.toggle("actif", actif);
        boutons[i].setAttribute("aria-selected", actif ? "true" : "false");
    }

    const panneaux = document.querySelectorAll('.panneau[data-sous-ecran="' + ecran + '"]');
    for (let i = 0; i < panneaux.length; i++) {
        panneaux[i].hidden = panneaux[i].dataset.panneau !== nom;
    }

    // La pastille glisse sous le bouton actif
    const index = Array.prototype.findIndex.call(boutons, function (b) { return b.dataset.panneau === nom; });
    barre.style.setProperty("--index", Math.max(index, 0));
    barre.style.setProperty("--nombre", boutons.length);

    panneauxOuverts[ecran] = nom;
    ecrireChoix("panneau-" + ecran, nom);
    // Le style s'en sert, par exemple pour cacher le bouton + sur le simulateur
    document.body.setAttribute("data-panneau-" + ecran, nom);
}

function initSegments() {
    const barres = document.querySelectorAll(".segments");

    for (let i = 0; i < barres.length; i++) {
        const barre = barres[i];
        const ecran = barre.dataset.sousEcran;
        const boutons = barre.querySelectorAll("button");

        for (let j = 0; j < boutons.length; j++) {
            boutons[j].addEventListener("click", function () {
                montrerPanneau(ecran, boutons[j].dataset.panneau);
                // Si on était descendu, on remonte au début du sous-onglet, juste sous la barre
                const conteneur = barre.closest(".ecran");
                const panneau = document.querySelector('.panneau[data-sous-ecran="' + ecran + '"]:not([hidden])');
                const cible = conteneur.scrollTop + panneau.getBoundingClientRect().top -
                    conteneur.getBoundingClientRect().top - barre.offsetHeight - 16;
                if (conteneur.scrollTop > cible) {
                    conteneur.scrollTo({ top: Math.max(cible, 0), behavior: mouvementReduit ? "auto" : "smooth" });
                }
            });
        }

        // Au démarrage, on rouvre le dernier sous-onglet utilisé
        const memorise = lireChoix("panneau-" + ecran, boutons[0].dataset.panneau);
        const existe = Array.prototype.some.call(boutons, function (b) { return b.dataset.panneau === memorise; });
        montrerPanneau(ecran, existe ? memorise : boutons[0].dataset.panneau);
    }
}


// ---------- Feuille d'ajout ----------

const feuille = document.getElementById("feuille");
const boite = feuille.querySelector(".feuille-boite");
const fab = document.getElementById("fab");
const toast = document.getElementById("toast");

// Pour chaque formulaire : le champ qui se vide quand app.js a bien enregistré,
// son bouton d'annulation, et le message de confirmation
const FORMULAIRES = {
    plein: { champ: "km", bouton: "btn-enregistrer", annuler: "btn-annuler", message: "Plein enregistré" },
    abonnement: { champ: "abo-nom", bouton: "abo-btn-enregistrer", annuler: "abo-btn-annuler", message: "Abonnement enregistré" },
    frais: { champ: "frais-nom", bouton: "frais-btn-enregistrer", annuler: "frais-btn-annuler", message: "Frais enregistré" }
};

let panneauFeuille = null;
let delaiFermeture = null;

function feuilleOuverte() {
    return !feuille.hidden && feuille.classList.contains("ouverte");
}

function montrerDansFeuille(nom) {
    panneauFeuille = nom;
    const panneaux = feuille.querySelectorAll(".feuille-panneau");
    for (let i = 0; i < panneaux.length; i++) {
        panneaux[i].hidden = panneaux[i].dataset.feuille !== nom;
    }
    boite.scrollTop = 0;
}

function ouvrirFeuille(nom) {
    clearTimeout(delaiFermeture);
    montrerDansFeuille(nom || "choix");
    feuille.hidden = false;
    document.body.classList.add("feuille-active");
    // On laisse le navigateur afficher la feuille avant de lancer la glissade
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { feuille.classList.add("ouverte"); });
    });

    // Sur ordinateur, le curseur va directement dans le premier champ vide.
    // Sur téléphone on s'abstient : le clavier cacherait la moitié de la feuille.
    if (nom && nom !== "choix" && window.matchMedia("(pointer: fine)").matches) {
        setTimeout(function () {
            const champ = document.getElementById(FORMULAIRES[nom].champ);
            if (champ && champ.value === "") { champ.focus(); }
        }, 320);
    }
}

function fermerFeuille() {
    if (feuille.hidden) { return; }

    // Fermer pendant une modification revient à l'annuler,
    // sinon le formulaire resterait bloqué en mode "Modifier" à la prochaine ouverture
    if (panneauFeuille && FORMULAIRES[panneauFeuille]) {
        const annuler = document.getElementById(FORMULAIRES[panneauFeuille].annuler);
        if (annuler && !annuler.hidden) { annuler.click(); }
    }

    panneauFeuille = null;
    feuille.classList.remove("ouverte");
    document.body.classList.remove("feuille-active");
    delaiFermeture = setTimeout(function () { feuille.hidden = true; }, 300);
}

function afficherToast(texte) {
    toast.textContent = texte;
    toast.hidden = false;
    toast.classList.remove("visible");
    void toast.offsetWidth; // relance l'animation même si un toast est déjà affiché
    toast.classList.add("visible");
    clearTimeout(afficherToast.delai);
    afficherToast.delai = setTimeout(function () {
        toast.classList.remove("visible");
        setTimeout(function () { toast.hidden = true; }, 250);
    }, 2200);
}

// Le bouton + devine ce que tu veux ajouter selon l'écran où tu es
function ajoutSelonContexte() {
    const ecran = ecranActif();
    if (ecran === "abonnements") { return "abonnement"; }
    if (ecran === "carburant") {
        return panneauxOuverts.carburant === "frais" ? "frais" : "plein";
    }
    return "choix";
}

function initFeuille() {
    fab.addEventListener("click", function () {
        ouvrirFeuille(ajoutSelonContexte());
    });

    // Tous les boutons marqués data-ouvrir (dans la feuille ou dans les écrans)
    document.addEventListener("click", function (event) {
        const cible = event.target.closest("[data-ouvrir]");
        if (cible) {
            if (feuille.hidden) { ouvrirFeuille(cible.dataset.ouvrir); }
            else { montrerDansFeuille(cible.dataset.ouvrir); }
            return;
        }
        if (event.target.closest("[data-fermer]")) {
            fermerFeuille();
        }
    });

    // Les crayons de modification : app.js remplit le formulaire, nous on l'ouvre
    document.addEventListener("click", function (event) {
        const bouton = event.target.closest("button");
        if (!bouton) { return; }
        if (bouton.classList.contains("btn-modif")) { ouvrirFeuille("plein"); }
        else if (bouton.classList.contains("abo-btn-modif")) { ouvrirFeuille("abonnement"); }
        else if (bouton.classList.contains("frais-btn-modif")) { ouvrirFeuille("frais"); }
    });

    // Le rappel "tu as peut-être oublié un plein" ouvre directement le formulaire
    document.getElementById("rappel-plein-ajouter").addEventListener("click", function () {
        ouvrirFeuille("plein");
    });

    document.addEventListener("keydown", function (event) {
        const modaleOuverte = !document.getElementById("modale").hidden;
        if (event.key === "Escape" && feuilleOuverte() && !modaleOuverte) { fermerFeuille(); }
    });

    // Fermeture automatique après un enregistrement réussi.
    // On ne touche pas à app.js : on regarde juste si le champ principal
    // était rempli avant le clic et vide après. C'est le signe qu'app.js a enregistré.
    let valeurAvant = "";
    let etaitEnModif = false;

    document.addEventListener("click", function () {
        if (!feuilleOuverte() || !FORMULAIRES[panneauFeuille]) { return; }
        const f = FORMULAIRES[panneauFeuille];
        valeurAvant = document.getElementById(f.champ).value;
        etaitEnModif = !document.getElementById(f.annuler).hidden;
    }, true);

    document.addEventListener("click", function (event) {
        if (!feuilleOuverte() || !FORMULAIRES[panneauFeuille]) { return; }
        const f = FORMULAIRES[panneauFeuille];
        const cible = event.target.closest("button");
        const clicAnnuler = cible && cible.id === f.annuler;
        const avant = valeurAvant;
        const modif = etaitEnModif;

        setTimeout(function () {
            const modaleOuverte = !document.getElementById("modale").hidden;
            const champ = document.getElementById(f.champ);
            if (avant !== "" && champ.value === "" && !modaleOuverte) {
                if (!clicAnnuler) {
                    afficherToast(modif ? "Modification enregistrée" : f.message);
                }
                panneauFeuille = null; // déjà remis à zéro par app.js
                fermerFeuille();
            }
        }, 0);
    });
}


// ---------- Historique repliable ----------
// On montre les 5 derniers pleins, le reste sur demande.

function initHistorique() {
    const liste = document.getElementById("liste-pleins");
    const bouton = document.getElementById("historique-tout");
    const LIMITE = 5;
    let toutVoir = false;

    function maj() {
        const nombre = liste.children.length;
        bouton.hidden = nombre <= LIMITE;
        liste.classList.toggle("repliee", !toutVoir && nombre > LIMITE);
        bouton.textContent = toutVoir ? "Réduire" : "Voir les " + nombre + " pleins";
    }

    bouton.addEventListener("click", function () {
        toutVoir = !toutVoir;
        maj();
    });

    new MutationObserver(maj).observe(liste, { childList: true });
    maj();
}


// ---------- Curseurs et swipe ----------
// Glisser un curseur du simulateur ne doit pas faire changer d'onglet.
// On empêche simplement le geste de remonter jusqu'à la piste des écrans.

function protegerCurseurs() {
    const curseurs = document.querySelectorAll('input[type="range"]');
    const evenements = ["touchstart", "touchmove", "touchend", "pointerdown", "pointermove", "pointerup", "mousedown"];

    for (let i = 0; i < curseurs.length; i++) {
        for (let j = 0; j < evenements.length; j++) {
            curseurs[i].addEventListener(evenements[j], function (event) {
                event.stopPropagation();
            }, { passive: true });
        }
    }
}


// ---------- Chiffres qui défilent ----------
// Quand un grand montant change, il défile jusqu'à sa nouvelle valeur.

function animerChiffres() {
    if (mouvementReduit) { return; }

    const ids = ["total-5ans", "abo-projection-5ans", "ecart"];

    for (let i = 0; i < ids.length; i++) {
        const elem = document.getElementById(ids[i]);
        if (!elem) { continue; }

        let valeurAffichee = 0;
        let dernierEcrit = null;
        let animation = null;

        function surChangement() {
            const texte = elem.textContent;
            if (texte === dernierEcrit) { return; } // c'est nous qui venons d'écrire

            // On ne sait animer que les montants entiers, comme "12 345 €"
            const morceaux = texte.match(/^(-?[\d\s\u00a0\u202f]*\d)(\s*€.*)$/);
            if (!morceaux) { return; }

            const cible = Number(morceaux[1].replace(/[\s\u00a0\u202f]/g, ""));
            const suffixe = morceaux[2];
            const depart = valeurAffichee;
            if (isNaN(cible) || cible === depart) { valeurAffichee = cible; return; }

            cancelAnimationFrame(animation);
            const debut = performance.now();
            const duree = 750;

            function etape(maintenant) {
                const t = Math.min((maintenant - debut) / duree, 1);
                const adouci = 1 - Math.pow(1 - t, 3);
                valeurAffichee = Math.round(depart + (cible - depart) * adouci);
                dernierEcrit = valeurAffichee.toLocaleString("fr-FR") + suffixe;
                elem.textContent = dernierEcrit;
                if (t < 1) { animation = requestAnimationFrame(etape); }
            }
            animation = requestAnimationFrame(etape);
        }

        new MutationObserver(surChangement).observe(elem, { childList: true, characterData: true, subtree: true });
        // app.js a déjà rempli les chiffres avant nous : on lance le premier défilement depuis 0
        surChangement();
    }
}


// ---------- Démarrage ----------

suivreEcranActif();
initSegments();
initFeuille();
initHistorique();
protegerCurseurs();
animerChiffres();