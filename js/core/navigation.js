// ============================================
// Navigation entre les écrans.
// Générique : ne sait rien des modules qu'elle affiche.
// ============================================

const ecrans = document.querySelectorAll(".ecran");
const onglets = document.querySelectorAll(".onglet");

export function allerVers(nom) {
    for (let i = 0; i < ecrans.length; i++) {
        ecrans[i].hidden = ecrans[i].id !== "ecran-" + nom;
    }

    for (let i = 0; i < onglets.length; i++) {
        if (onglets[i].dataset.ecran === nom) {
            onglets[i].classList.add("actif");
        } else {
            onglets[i].classList.remove("actif");
        }
    }

    window.scrollTo({ top: 0, behavior: "instant" });
}

export function initNavigation() {
    for (let i = 0; i < onglets.length; i++) {
        onglets[i].addEventListener("click", function () {
            allerVers(this.dataset.ecran);
        });
    }
}