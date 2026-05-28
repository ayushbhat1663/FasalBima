(function(){
    'use strict';
    window.summaryGenerator = {
        generate(analysis) {
            try {
                if (!analysis) return 'No analysis available.';
                if ((analysis.disease && String(analysis.disease).toLowerCase() === 'none') && (!analysis.cause || analysis.cause === 'None') && (!analysis.damagePercentage || analysis.damagePercentage <= 5)) {
                    return 'No major crop damage detected.';
                }
                const pct = analysis.damagePercentage != null ? analysis.damagePercentage : null;
                const sev = analysis.severity || (pct != null ? (pct <=5 ? 'healthy' : pct<=25 ? 'minor' : pct<=50 ? 'moderate' : pct<=75 ? 'severe' : 'critical') : 'unknown');
                const cause = analysis.cause || analysis.disease || 'unknown';
                if (analysis.fraudCheck) return 'Suspicious claim detected due to mismatched evidence.';
                if (pct != null) return `AI verified ${sev} ${cause}-related crop damage with ${pct}% estimated destruction.`;
                return `AI detected ${sev} ${cause}-related crop damage.`;
            } catch (e) { return 'Unable to generate summary.'; }
        }
    };
})();
