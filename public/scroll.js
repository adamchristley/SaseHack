(function () {
    'use strict';

    /* Scroll reveal */
    function reveal(){
        let items = document.querySelectorAll('.reveal, .reveal-scale');
        if (!items.length) return;
    

    let io = new IntersectionObserver(function (entries){
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in');
            io.unobserve(entry.target);
        });
    }, {threshold: 0.15, rootMargin: '0px 0px -10% 0px'});

    items.forEach(function (del) {
        let step = parseInt(del.getAttribute('data-delay'), 10);
        if (step) del.style.transitionDelay = (step * 80) + 'ms';
        io.observe(del);
    });
}

/* Beginning Wall */
    function home(){
        let wall = document.querySelector('.begin-back');
        if (!wall) return;

        let ticking = false;
        function update(){
            let y = window.scrollY;
            if (y < 900) wall.style.transform = 'translate3d(0,' + (y * 0.22) + 'px,0)';
            ticking = false;
        }
        window.addEventListener('scroll', function() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }, {passive: true});
        update();
    }

    /* Count up*/
    function countUp(del){
        let target = parseFloat(del.getAttribute('data-countup'));
        if (isNaN(target)) return;
        let prefix = del.getAttribute('data-prefix') || '';
        let duration = parseInt(del.getAttribute('data-duration'), 10) || 1100;

        
        var start = null;
        function frame(now) {
            if (start === null) start = now;
            let t = Math.min((now-start) / duration, 1);
            let eased = 1 - Math.pow(1 - t, 3);
            del.textContent = prefix + Math.round(target * eased).toLocaleString('en-US');
            if (t < 1) window.requestAnimationFrame(frame);
        }
        window.requestAnimationFrame(frame);
    }

    function countUps() {
        var nums = document.querySelectorAll('[data-countup]');
        if (!nums.length) return;

        if (!('IntersectionObserver' in window)){
            nums.forEach(countUp);
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                countUp(entry.target);
                io.unobserve(entry.target);
            });
        }, {threshold: 0.4});
        nums.forEach(function (del) { io.observe(del);});
    }

    /* Mobile */
    function nav(){
        var toggle = document.querySelector('.nav-toggle');
        var nav = document.querySelector('.site-nav');
        if (!toggle || !nav) return;
        toggle.addEventListener('click', function () {
            var open = nav.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    /* Filter (Dashboard) */
    function filters(){
        var pills = document.querySelectorAll('.filer');
        pills.forEach(function (pill) {
            pill.addEventListener('click', function () {
                pills.forEach(function (p) {p.setAttribute('aria-pressed','false');});
                pills.setAttribute('aria-pressed', 'true');
            });
        });
    }


    function init(){
        reveal();
        home();
        
        countUps();
        nav();
        filters();
    }

    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
