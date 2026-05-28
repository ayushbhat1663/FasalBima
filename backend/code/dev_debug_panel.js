(function(){
    'use strict';
    if (!window.DEV_MODE) {
        window.devDebugPanel = {
            show() { return; },
            ensure() { return null; }
        };
        return;
    }
    window.devDebugPanel = {
        panel: null,
        ensure() {
            if (this.panel) return this.panel;
            const p = document.createElement('div');
            p.id = 'dev-debug-panel';
            p.style.position = 'fixed';
            p.style.right = '12px';
            p.style.bottom = '12px';
            p.style.zIndex = '99999';
            p.style.maxWidth = '420px';
            p.style.maxHeight = '60vh';
            p.style.overflow = 'auto';
            p.style.background = 'rgba(0,0,0,0.85)';
            p.style.color = '#fff';
            p.style.padding = '10px';
            p.style.fontSize = '12px';
            p.style.borderRadius = '8px';
            p.style.boxShadow = '0 6px 24px rgba(0,0,0,0.4)';
            p.innerHTML = '<div style="font-weight:800; margin-bottom:6px;">Dev Panel</div><pre id="dev-debug-pre" style="white-space:pre-wrap; font-size:11px;"></pre>';
            document.body.appendChild(p);
            this.panel = p;
            return p;
        },
        show(data) {
            try {
                const p = this.ensure();
                const pre = p.querySelector('#dev-debug-pre');
                pre.textContent = JSON.stringify(data, null, 2);
            } catch (e) { }
        }
    };
})();
