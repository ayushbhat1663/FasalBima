(function(){
    'use strict';
    // image_integrity: simple heuristics for duplicate/reuse/screenshot detection
    window.imageIntegrity = {
        // compute a simple fingerprint from provided hash or filename or base64 prefix
        fingerprint(payload) {
            try {
                if (!payload) return null;
                if (payload.hash) return String(payload.hash);
                if (payload.fileName) return String(payload.fileName) + '::' + (payload.size || '0');
                if (payload.base64) return String(payload.base64).slice(0,64);
                return null;
            } catch (e) { return null; }
        },
        isDuplicate(fingerprint, crops) {
            try {
                if (!fingerprint || !crops) return false;
                for (const c of crops) {
                    if (c.ai_result && c.ai_result.raw) {
                        const otherFp = this.fingerprint(c.ai_result.raw);
                        if (otherFp && otherFp === fingerprint) return true;
                    }
                }
                return false;
            } catch (e) { return false; }
        },
        detectSuspiciousEdits(payload) {
            // Placeholder: in production integrate with forensic libs
            try {
                if (!payload) return { suspicious: false, reasons: [] };
                const reasons = [];
                // If payload indicates 'screenshot' flag
                if (payload.isScreenshot) reasons.push('screenshot');
                // If heavy compression flagged
                if (payload.compression && payload.compression > 90) reasons.push('high_compression');
                return { suspicious: reasons.length > 0, reasons };
            } catch (e) { return { suspicious: false, reasons: [] }; }
        }
    };
})();
