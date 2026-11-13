/*
 * La liste d'attente de lucarne.eu, tant que l'app n'est pas sortie.
 *
 * Une adresse part vers `join_waitlist`, avec la langue de la page et le
 * réseau d'où l'on vient (`utm_source` du lien suivi), jamais rien d'autre.
 * La fonction ne dit pas si l'adresse était déjà inscrite : on répond pareil.
 * Ce fichier ne dépend pas des animations, il tourne aussi pour qui les a
 * réduites.
 */
(function () {
  'use strict';

  let forms = document.querySelectorAll('[data-waitlist]');
  if (!forms.length || !window.fetch) {
    return;
  }

  let EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  let source = null;
  try {
    source = new URLSearchParams(window.location.search).get('utm_source');
  } catch (error) {
    source = null;
  }

  let reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Le gros bouton cache la pilule tant qu'on ne l'a pas touché. Sans ce
  // script, il reste caché et le champ visible.
  let open = function (form) {
    let opener = form.querySelector('.waitlist-open');
    if (!opener || form.dataset.collapsed !== 'true') {
      return;
    }
    delete form.dataset.collapsed;
    form.dataset.opened = 'true';
    opener.setAttribute('aria-expanded', 'true');
    form.querySelector('input[type="email"]').focus({ preventScroll: true });
  };

  forms.forEach(function (form) {
    let input = form.querySelector('input[type="email"]');
    let trap = form.querySelector('.waitlist-trap input');
    let button = form.querySelector('button[type="submit"]');
    let status = form.querySelector('.waitlist-status');
    let opener = form.querySelector('.waitlist-open');

    if (opener) {
      form.dataset.collapsed = 'true';
      opener.setAttribute('aria-expanded', 'false');
      opener.addEventListener('click', function () {
        open(form);
      });
    }

    let say = function (state, text) {
      form.dataset.state = state;
      status.textContent = text || '';
      if (state === 'invalid') {
        input.setAttribute('aria-invalid', 'true');
      } else {
        input.removeAttribute('aria-invalid');
      }
    };

    let done = function () {
      say('done', form.dataset.done);
      input.value = '';
      button.disabled = true;
      input.disabled = true;
    };

    // Une adresse mal tapée se signale en quittant le champ, pas à chaque lettre.
    input.addEventListener('blur', function () {
      let value = input.value.trim();
      if (value && !EMAIL.test(value)) {
        say('invalid', form.dataset.invalid);
      }
    });

    input.addEventListener('input', function () {
      if (form.dataset.state === 'invalid' || form.dataset.state === 'error') {
        say('', '');
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (form.dataset.state === 'sending' || form.dataset.state === 'done') {
        return;
      }

      let email = input.value.trim().toLowerCase();
      if (!EMAIL.test(email) || email.length > 254) {
        say('invalid', form.dataset.invalid);
        input.focus();
        return;
      }

      // Un robot a rempli le champ invisible : on le remercie sans rien écrire.
      if (trap && trap.value) {
        done();
        return;
      }

      button.disabled = true;
      say('sending', form.dataset.sending);

      fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: form.dataset.key,
          Authorization: 'Bearer ' + form.dataset.key,
        },
        body: JSON.stringify({
          p_email: email,
          p_locale: document.documentElement.lang || 'fr',
          p_source: source,
        }),
      })
        .then(function (response) {
          if (response.ok) {
            done();
            return;
          }
          button.disabled = false;
          say(
            response.status === 400 ? 'invalid' : 'error',
            response.status === 400 ? form.dataset.invalid : form.dataset.error,
          );
        })
        .catch(function () {
          button.disabled = false;
          say('error', form.dataset.error);
        });
    });
  });

  // Le bouton de l'en-tête : sur l'accueil, il ouvre la liste du haut de page
  // sans recharger ; depuis une page légale, il y revient avec `#liste-attente`.
  let hero = document.getElementById('liste-attente');
  if (!hero) {
    return;
  }

  let reach = function (smooth) {
    hero.scrollIntoView({ behavior: smooth && !reduceMotion ? 'smooth' : 'auto', block: 'center' });
    open(hero);
  };

  document.querySelectorAll('[data-waitlist-jump]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      reach(true);
    });
  });

  // Polices, images et sections épinglées changent les hauteurs jusqu'au
  // chargement complet : on ne vise le formulaire qu'une fois tout posé.
  if (window.location.hash === '#liste-attente') {
    window.addEventListener('load', function () {
      window.setTimeout(function () {
        reach(false);
      }, 150);
    });
  }
})();
