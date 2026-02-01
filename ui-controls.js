(function () {
    'use strict';

    // =========================================================================
    // RESUMEN PLEGABLE — sincronizar icono ▼/▶ cuando se toggle la clase
    // =========================================================================
    new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.target.classList && m.target.classList.contains('summary-wrapper')) {
                var icon = m.target.querySelector('.toggle-icon');
                if (icon) {
                    icon.textContent = m.target.classList.contains('collapsed') ? '▶' : '▼';
                }
            }
        });
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

    // =========================================================================
    // SIDEBAR TOGGLE — colapsar / expandir panel de filtros
    // =========================================================================
    document.querySelectorAll('.sidebar-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var panel = btn.closest('.panel-filtros');
            var grid  = btn.closest('.desktop-grid');
            var collapsed = panel.classList.toggle('collapsed');
            grid.classList.toggle('sidebar-collapsed', collapsed);
            btn.textContent = collapsed ? '▶' : '◀';
            btn.title       = collapsed ? 'Mostrar filtros' : 'Ocultar filtros';
        });
    });

    // =========================================================================
    // BARRA DE NAVEGACIÓN SCROLL — mini scrollbar clickable sobre cada tabla
    // =========================================================================
    function initScrollNav(containerId, navId) {
        var container = document.getElementById(containerId);
        var nav       = document.getElementById(navId);
        if (!container || !nav) return;
        var thumb = nav.querySelector('.scroll-nav-thumb');

        function update() {
            var maxScroll = container.scrollWidth - container.clientWidth;
            if (maxScroll < 8) { nav.classList.add('hidden'); return; }
            nav.classList.remove('hidden');

            var ratio   = container.clientWidth / container.scrollWidth;
            var thumbW  = Math.max(36, nav.clientWidth * ratio);
            var maxLeft = nav.clientWidth - thumbW;
            var pct     = container.scrollLeft / maxScroll;

            thumb.style.width = thumbW + 'px';
            thumb.style.left  = (pct * maxLeft) + 'px';
        }

        container.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);

        nav.addEventListener('click', function (e) {
            e.stopPropagation();
            var rect      = nav.getBoundingClientRect();
            var pct       = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            var maxScroll = container.scrollWidth - container.clientWidth;
            container.scrollTo({ left: pct * maxScroll, behavior: 'smooth' });
        });

        // Re-calcular cuando el JS regenera el contenido (filtrar / agrupar)
        new MutationObserver(function () { requestAnimationFrame(update); })
            .observe(container, { childList: true, subtree: true });

        setTimeout(update, 100);
    }

    initScrollNav('table',              'scrollNav1');
    initScrollNav('mm_tablaMultiples',  'scrollNav2');
    initScrollNav('scTable',            'scrollNav3');

    // =========================================================================
    // COPIAR KEYWORDS AL PORTAPAPELES
    // =========================================================================

    /**
     * Recopila las keywords seleccionadas (checkboxes marcados) dentro de un
     * contenedor dado. Si ninguno está marcado, devuelve todas las keywords
     * visibles en ese contenedor.
     *
     * @param {string} containerSelector  — selector del contenedor de la tabla
     * @param {string} cbClass            — clase de los checkboxes individuales
     * @returns {string[]}
     */
    function getKeywords(containerSelector, cbClass) {
        var container = document.querySelector(containerSelector);
        if (!container) return [];

        // Intentar con solo los marcados
        var checked = container.querySelectorAll('.' + cbClass + ':checked');
        if (checked.length > 0) {
            return Array.prototype.map.call(checked, function (cb) {
                return cb.getAttribute('data-keyword');
            });
        }

        // Si ninguno marcado, coger todos los checkboxes que existan
        var all = container.querySelectorAll('.' + cbClass);
        if (all.length > 0) {
            return Array.prototype.map.call(all, function (cb) {
                return cb.getAttribute('data-keyword');
            });
        }

        return [];
    }

    /**
     * Copia un array de keywords al portapapeles, una por línea.
     * Muestra feedback visual en el botón durante 1.5 s.
     */
    function copyToClipboard(btn, keywords) {
        if (keywords.length === 0) {
            btn.textContent = '⚠️ Sin keywords';
            btn.style.background = 'linear-gradient(135deg, #e53e3e, #c53030)';
            setTimeout(function () { resetBtn(btn); }, 1800);
            return;
        }

        var text = keywords.join('\n');

        // Usar Clipboard API (con fallback textarea para contextos sin HTTPS)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function () {
                showCopied(btn, keywords.length);
            }).catch(function () {
                fallbackCopy(text);
                showCopied(btn, keywords.length);
            });
        } else {
            fallbackCopy(text);
            showCopied(btn, keywords.length);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top  = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    function showCopied(btn, count) {
        btn.textContent = '✓ Copiadas (' + count + ')';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        setTimeout(function () { resetBtn(btn); }, 1800);
    }

    function resetBtn(btn) {
        btn.textContent = '📋 Copiar keywords';
        btn.style.background = '';
    }

    // --- Sección 1: Un archivo ---
    var btnCopy1 = document.getElementById('btnCopiarKeywords');
    if (btnCopy1) {
        btnCopy1.addEventListener('click', function () {
            // Buscar en tabla normal o en acordeones
            var kw = getKeywords('#table', 'keyword-checkbox');
            copyToClipboard(btnCopy1, kw);
        });
    }

    // --- Sección 2: Varios archivos ---
    var btnCopy2 = document.getElementById('mm_btnCopiarKeywords');
    if (btnCopy2) {
        btnCopy2.addEventListener('click', function () {
            var kw = getKeywords('#mm_tablaMultiples', 'mm-keyword-checkbox');
            copyToClipboard(btnCopy2, kw);
        });
    }

    // --- Sección 3: Search Console ---
    var btnCopy3 = document.getElementById('sc_btnCopiarKeywords');
    if (btnCopy3) {
        btnCopy3.addEventListener('click', function () {
            // Search Console no tiene checkboxes: coger todos los textos de la
            // primera columna de datos (tras el header)
            var rows = document.querySelectorAll('#scTable table tbody tr');
            var kw = Array.prototype.map.call(rows, function (tr) {
                var firstTd = tr.querySelector('td:first-child');
                return firstTd ? firstTd.textContent.trim() : '';
            }).filter(Boolean);
            copyToClipboard(btnCopy3, kw);
        });
    }

})();
