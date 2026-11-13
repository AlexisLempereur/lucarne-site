/*
 * Les animations de l'accueil de lucarne.eu.
 *
 * La page est complète sans ce fichier : il ne fait qu'animer ce qui est
 * déjà affiché. Rien ne tourne pour qui a demandé à réduire les animations,
 * et sans GSAP, seuls les effets de survol restent.
 */
(function () {
  'use strict';

  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let finePointer = window.matchMedia('(pointer: fine)').matches;

  if (reduceMotion) {
    return;
  }

  document.documentElement.classList.add('motion');

  /* ---------------------------------------------------------------------- */
  /* Le téléphone fait défiler trois écrans de l'app                          */
  /* ---------------------------------------------------------------------- */

  let screens = Array.prototype.slice.call(document.querySelectorAll('.phone-hero .screen'));
  let current = 0;

  /*
   * Le nouvel écran se pose par-dessus l'ancien, qui reste affiché dessous
   * jusqu'à la fin du fondu : deux images à moitié transparentes sur le noir
   * du téléphone faisaient un écran sombre. Et on attend qu'il soit décodé.
   */
  let showNext = function () {
    let previous = screens[current];
    current = (current + 1) % screens.length;
    let next = screens[current];

    previous.classList.add('is-leaving');
    previous.classList.remove('is-active');
    next.classList.add('is-active');
    window.setTimeout(function () {
      previous.classList.remove('is-leaving');
    }, 1000);
  };

  if (screens.length > 1) {
    window.setInterval(function () {
      let next = screens[(current + 1) % screens.length];

      if (document.hidden || !next.complete) {
        return;
      }

      if (next.decode) {
        next.decode().then(showNext, showNext);
      } else {
        showNext();
      }
    }, 3400);
  }

  let gsap = window.gsap;
  let ScrollTrigger = window.ScrollTrigger;

  if (!gsap || !ScrollTrigger) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  let lang = document.documentElement.lang || 'fr';

  function formatRating(value) {
    let text = value.toFixed(1);
    return lang === 'en' ? text : text.replace('.', ',');
  }

  /* ---------------------------------------------------------------------- */
  /* Le titre se révèle mot à mot                                            */
  /* ---------------------------------------------------------------------- */

  /**
   * Coupe le titre en mots, chacun dans un masque. Un mot suivi d'une espace
   * insécable reste collé au suivant : la règle des dictionnaires, qui évite
   * un mot seul en bout de ligne, tient aussi pendant l'animation.
   */
  function splitWords(element) {
    let units = [];
    let pending = null;

    Array.prototype.slice.call(element.childNodes).forEach(function (node) {
      // Une coupure de ligne reste telle quelle, hors des masques.
      if (node.nodeName === 'BR') {
        if (pending) {
          units.push(pending);
          pending = null;
        }
        units.push(node);
        return;
      }

      let pieces =
        node.nodeType === Node.TEXT_NODE
          ? node.textContent.split(' ').filter(function (piece) {
              return piece.length > 0;
            })
          : [node];

      pieces.forEach(function (piece) {
        let content = typeof piece === 'string' ? document.createTextNode(piece) : piece;

        if (pending) {
          pending.appendChild(content);
        } else {
          pending = document.createElement('span');
          pending.className = 'word-inner';
          pending.appendChild(content);
        }

        let text = typeof piece === 'string' ? piece : piece.textContent;

        if (text.slice(-1) !== ' ') {
          units.push(pending);
          pending = null;
        }
      });
    });

    if (pending) {
      units.push(pending);
    }

    element.textContent = '';
    units.forEach(function (unit, index) {
      if (unit.nodeName === 'BR') {
        element.appendChild(unit);
        element.appendChild(document.createTextNode(' '));
        return;
      }

      let mask = document.createElement('span');
      mask.className = 'word';
      mask.appendChild(unit);
      element.appendChild(mask);

      let next = units[index + 1];
      if (next && next.nodeName !== 'BR') {
        element.appendChild(document.createTextNode(' '));
      }
    });

    return element.querySelectorAll('.word-inner');
  }

  let headline = document.querySelector('[data-split]');
  let intro = gsap.timeline({ defaults: { ease: 'expo.out' } });

  if (headline) {
    intro.from(splitWords(headline), {
      yPercent: 115,
      rotate: 6,
      duration: 1.1,
      stagger: 0.07,
      onComplete: function () {
        // Le masque a fini son travail : il couperait la lueur du mot vert.
        headline.classList.add('is-revealed');
      },
    });
  }

  intro.from('[data-intro]', { y: 28, autoAlpha: 0, duration: 0.9, stagger: 0.12 }, '-=0.7');

  /* ---------------------------------------------------------------------- */
  /* Le téléphone en 3D                                                      */
  /* ---------------------------------------------------------------------- */

  let stage = document.querySelector('[data-stage]');
  let phone3d = document.querySelector('[data-phone]');
  let floats = Array.prototype.slice.call(document.querySelectorAll('[data-float]'));

  function drawLines(container, timeline, position) {
    let shapes = container.querySelectorAll('.pitch g > *');
    shapes.forEach(function (shape) {
      if (typeof shape.getTotalLength !== 'function') {
        return;
      }

      let length = shape.getTotalLength();
      shape.style.strokeDasharray = length;
      shape.style.strokeDashoffset = length;
    });
    timeline.to(
      shapes,
      { strokeDashoffset: 0, duration: 1.6, stagger: 0.08, ease: 'power2.inOut' },
      position,
    );
  }

  if (stage && phone3d) {
    // La pose de repos, la même que la feuille de style, mais tenue par GSAP
    // pour que l'inclinaison sous la souris parte de là.
    gsap.set(phone3d, { rotationY: -16, rotationX: 8, rotationZ: 2 });
    drawLines(stage, intro, 0.1);

    intro.from(
      phone3d,
      { y: 120, rotateY: 55, rotateX: 18, scale: 0.86, autoAlpha: 0, duration: 1.6 },
      0.15,
    );
    intro.from(
      floats,
      { scale: 0.4, autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: 'back.out(1.8)' },
      0.9,
    );

    let ratingCount = document.querySelector('[data-rating-count]');

    if (ratingCount) {
      let counter = { value: 1 };
      intro.to(
        counter,
        {
          value: parseFloat(ratingCount.getAttribute('data-rating-count')),
          duration: 1.4,
          ease: 'power3.out',
          onUpdate: function () {
            ratingCount.textContent = formatRating(Math.round(counter.value * 2) / 2);
          },
        },
        1.1,
      );
    }

    // Il flotte, doucement, une fois arrivé.
    gsap.to(phone3d, {
      y: -14,
      duration: 3.2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 1.8,
    });
    floats.forEach(function (element, index) {
      gsap.to(element, {
        y: index % 2 === 0 ? -10 : 10,
        duration: 2.6 + index * 0.4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 2,
      });
    });

    // Il suit la souris, et les objets autour suivent à leur profondeur.
    if (finePointer) {
      let tiltX = gsap.quickTo(phone3d, 'rotationX', { duration: 0.8, ease: 'power3.out' });
      let tiltY = gsap.quickTo(phone3d, 'rotationY', { duration: 0.8, ease: 'power3.out' });
      let floatMoves = floats.map(function (element) {
        return {
          depth: parseFloat(element.getAttribute('data-depth')) || 40,
          x: gsap.quickTo(element, 'x', { duration: 1, ease: 'power3.out' }),
        };
      });

      window.addEventListener('pointermove', function (event) {
        let px = event.clientX / window.innerWidth - 0.5;
        let py = event.clientY / window.innerHeight - 0.5;
        tiltY(-16 + px * 24);
        tiltX(8 - py * 16);
        phone3d.style.setProperty('--glare-x', 50 + px * 60 + '%');
        floatMoves.forEach(function (move) {
          move.x(px * move.depth);
        });
      });
    }

    // La lueur du haut de page descend moins vite que la page.
    gsap.to('.hero-glow', {
      yPercent: 30,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Apparitions au défilement                                               */
  /* ---------------------------------------------------------------------- */

  gsap.utils.toArray('[data-reveal]').forEach(function (group) {
    let items = group.querySelectorAll('[data-reveal-item]');
    gsap.from(items.length ? items : group, {
      y: 48,
      autoAlpha: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 85%' },
    });
  });

  gsap.utils.toArray('[data-reveal-single]').forEach(function (element) {
    gsap.from(element, {
      y: 40,
      autoAlpha: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 88%' },
    });
  });

  // Les chiffres comptent en entrant.
  gsap.utils.toArray('[data-count]').forEach(function (element) {
    let target = parseFloat(element.getAttribute('data-count'));
    let from = parseFloat(element.getAttribute('data-from')) || 0;
    let finalText = element.getAttribute('data-final');
    let state = { value: from };
    let format = new Intl.NumberFormat(lang);

    gsap.to(state, {
      value: target,
      duration: 2,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 90%' },
      onUpdate: function () {
        element.textContent =
          format.format(Math.round(state.value)) + (finalText.slice(-1) === '+' ? '+' : '');
      },
      onComplete: function () {
        element.textContent = finalText;
      },
    });
  });

  /* ---------------------------------------------------------------------- */
  /* La note grimpe de 1 à 10 avec le défilement                             */
  /* ---------------------------------------------------------------------- */

  let meterSection = document.querySelector('[data-meter-section]');

  if (meterSection) {
    let valueEl = meterSection.querySelector('[data-meter-value]');
    let fill = meterSection.querySelector('[data-meter-fill]');
    let thumb = meterSection.querySelector('[data-meter-thumb]');
    let anchors = meterSection.querySelectorAll('[data-anchor]');
    let supporters = meterSection.querySelectorAll('.supporter');
    let meter = meterSection.querySelector('.meter');
    let last = null;

    /*
     * À 10, la note explose : une onde, des éclats verts et blancs, le
     * chiffre qui bondit. Les éclats sont créés à la volée, puis retirés.
     */
    let explode = function () {
      let burst = document.createElement('span');
      burst.className = 'meter-burst';
      meter.appendChild(burst);
      gsap.fromTo(
        burst,
        { scale: 0.2, opacity: 1 },
        {
          scale: 3.2,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          onComplete: burst.remove.bind(burst),
        },
      );

      for (let index = 0; index < 56; index += 1) {
        let shard = document.createElement('span');
        let size = 8 + Math.random() * 10;
        let round = index % 4 === 0;
        shard.className =
          'meter-shard' + (index % 3 === 0 ? ' is-light' : '') + (round ? ' is-round' : '');
        shard.style.width = size + 'px';
        shard.style.height = size * (round ? 1 : 1.5) + 'px';
        meter.appendChild(shard);
        let angle = Math.random() * Math.PI * 2;
        let distance = 180 + Math.random() * 320;
        let duration = 1.2 + Math.random() * 0.7;
        gsap.fromTo(
          shard,
          { x: 0, y: 0, rotation: 0, opacity: 1 },
          {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance + 60,
            rotation: Math.random() * 720 - 360,
            duration: duration,
            ease: 'power3.out',
            onComplete: shard.remove.bind(shard),
          },
        );
        gsap.to(shard, { opacity: 0, delay: duration * 0.55, duration: duration * 0.45 });
      }

      // Un flash vert sur toute la carte.
      gsap.fromTo(
        meter,
        { backgroundColor: 'rgba(57, 255, 20, 0.45)' },
        {
          backgroundColor: 'rgba(22, 22, 26, 0.75)',
          duration: 0.9,
          ease: 'power2.out',
          clearProps: 'backgroundColor',
        },
      );

      gsap.fromTo(
        valueEl,
        { scale: 1.6 },
        { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.4)' },
      );
    };

    let render = function (progress) {
      // 10 est atteint avant la fin de l'épinglage : la foule a le temps d'exulter.
      let rating = Math.round((1 + Math.min(1, progress / 0.85) * 9) * 2) / 2;

      if (rating === last) {
        return;
      }

      last = rating;
      let share = (rating - 1) / 9;
      valueEl.textContent = formatRating(rating);
      fill.style.transform = 'scaleX(' + share + ')';
      thumb.style.left = share * 100 + '%';

      let anchor = rating < 4 ? 0 : rating < 7.5 ? 1 : 2;
      anchors.forEach(function (element, index) {
        element.classList.toggle('is-on', index === anchor);
      });

      let lit = Math.round(share * supporters.length);
      supporters.forEach(function (element, index) {
        element.classList.toggle('lit', index < lit);
      });
      meterSection.style.setProperty('--heat', share);

      // La carte tremble de plus en plus à partir de 8, et explose à 10.
      let heat = rating >= 8 ? (rating - 8) * 2 + 1 : 0;
      if (heat) {
        meter.setAttribute('data-heat', heat);
      } else {
        meter.removeAttribute('data-heat');
      }

      let wasMax = meter.classList.contains('is-max');
      meter.classList.toggle('is-max', rating === 10);
      if (rating === 10 && !wasMax) {
        explode();
      }
    };

    render(0);

    ScrollTrigger.create({
      trigger: meterSection,
      start: 'top top',
      end: '+=130%',
      pin: true,
      scrub: 0.8,
      onUpdate: function (self) {
        render(self.progress);
      },
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Les trois écrans s'ouvrent en éventail                                  */
  /* ---------------------------------------------------------------------- */

  let fan = document.querySelector('[data-fan]');

  if (fan) {
    let fanTimeline = gsap.timeline({
      scrollTrigger: { trigger: fan, start: 'top 85%', end: 'center 55%', scrub: 1 },
    });
    fanTimeline
      .from('.fan-left', { xPercent: 100, rotate: 0, y: 40 }, 0)
      .from('.fan-right', { xPercent: -100, rotate: 0, y: 40 }, 0)
      .from('.fan-center', { y: 80, scale: 0.92 }, 0);
  }

  /* ---------------------------------------------------------------------- */
  /* Les fonctionnalités : le téléphone suit le récit                         */
  /* ---------------------------------------------------------------------- */

  let story = document.querySelector('[data-story]');

  if (story) {
    let steps = Array.prototype.slice.call(story.querySelectorAll('.story-step'));
    let storyScreens = Array.prototype.slice.call(story.querySelectorAll('.phone-story .screen'));
    let activeStep = 0;

    // Le nouvel écran se pose sur l'ancien, comme dans le haut de page.
    let showStep = function (index) {
      if (index === activeStep) {
        return;
      }

      let previous = storyScreens[activeStep];
      let next = storyScreens[index];
      activeStep = index;
      story.setAttribute('data-active', index);
      steps.forEach(function (step, position) {
        step.classList.toggle('is-active', position === index);
      });
      storyScreens.forEach(function (screen) {
        screen.classList.remove('is-leaving');
      });
      previous.classList.add('is-leaving');
      previous.classList.remove('is-active');
      next.classList.add('is-active');
      window.setTimeout(function () {
        previous.classList.remove('is-leaving');
      }, 1000);
    };

    steps.forEach(function (step, index) {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: function (self) {
          if (self.isActive) {
            showStep(index);
          }
        },
      });
    });

    let stepsList = story.querySelector('.story-steps');
    ScrollTrigger.create({
      trigger: stepsList,
      start: 'top 55%',
      end: 'bottom 55%',
      onUpdate: function (self) {
        stepsList.style.setProperty('--progress', self.progress.toFixed(3));
      },
    });

    // Le téléphone pivote doucement pendant tout le récit.
    gsap.fromTo(
      '[data-story-phone]',
      { rotationY: -14, rotationX: 6 },
      {
        rotationY: 10,
        rotationX: -2,
        ease: 'none',
        scrollTrigger: { trigger: story, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      },
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Le dernier appel                                                        */
  /* ---------------------------------------------------------------------- */

  let finalBlock = document.querySelector('[data-final]');

  if (finalBlock) {
    let finalTimeline = gsap.timeline({
      scrollTrigger: { trigger: finalBlock, start: 'top 80%' },
    });
    drawLines(finalBlock, finalTimeline, 0);
    gsap.fromTo(
      '.final-glow',
      { scale: 0.6, autoAlpha: 0.3 },
      {
        scale: 1.15,
        autoAlpha: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: finalBlock,
          start: 'top bottom',
          end: 'bottom center',
          scrub: true,
        },
      },
    );
  }

  // Les boutons aimantés suivent un peu le curseur.
  if (finePointer) {
    document.querySelectorAll('.magnetic').forEach(function (button) {
      let moveX = gsap.quickTo(button, 'x', { duration: 0.5, ease: 'power3.out' });
      let moveY = gsap.quickTo(button, 'y', { duration: 0.5, ease: 'power3.out' });

      button.addEventListener('pointermove', function (event) {
        let box = button.getBoundingClientRect();
        moveX((event.clientX - box.left - box.width / 2) * 0.25);
        moveY((event.clientY - box.top - box.height / 2) * 0.35);
      });
      button.addEventListener('pointerleave', function () {
        moveX(0);
        moveY(0);
      });
    });
  }

  // Les polices et les images changent les hauteurs : on recalcule.
  window.addEventListener('load', function () {
    ScrollTrigger.refresh();
  });
})();
