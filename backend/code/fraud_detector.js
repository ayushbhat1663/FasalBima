(function(){
    'use strict';
    window.fraudDetector = {
        async evaluate(analysis, crops) {
            try {
                const report = { fraud: false, reasons: [], weather: null, metadata: null, imageIntegrity: null };
                if (!analysis) return { fraud: false, reasons: ['no_analysis'] };

                // metadata checks
                const meta = window.metadataValidator ? window.metadataValidator.validate(analysis.raw || {}) : { missingMetadata: true };
                report.metadata = meta;
                if (meta.missingMetadata) report.reasons.push('missing_metadata');
                if (meta.future) report.reasons.push('future_image_date');
                if (!meta.gps) report.reasons.push('missing_gps');

                // image integrity
                const fp = window.imageIntegrity ? window.imageIntegrity.fingerprint(analysis.raw || {}) : null;
                const duplicate = window.imageIntegrity ? window.imageIntegrity.isDuplicate(fp, crops) : false;
                const edits = window.imageIntegrity ? window.imageIntegrity.detectSuspiciousEdits(analysis.raw || {}) : { suspicious: false };
                report.imageIntegrity = { fingerprint: fp, duplicate, edits };
                if (duplicate) report.reasons.push('duplicate_image');
                if (edits && edits.suspicious) report.reasons.push(...edits.reasons);

                // weather checks
                try {
                    const weather = window.weatherVerifier ? await window.weatherVerifier.verifyAll(analysis.location, analysis.analysisDate) : null;
                    report.weather = weather;
                    // simple mismatch heuristic
                    if (weather && weather.flood && weather.flood.match) report.reasons.push('weather_flood_evidence');
                } catch (e) { report.weather = null; }

                // confidence
                if (analysis.confidenceScore != null && analysis.confidenceScore < 30) report.reasons.push('low_confidence');

                // high damage but no disease
                if ((analysis.damagePercentage || 0) > 80 && (!analysis.disease || String(analysis.disease).toLowerCase() === 'none')) report.reasons.push('damage_no_disease');

                report.fraud = report.reasons.length > 0;
                return report;
            } catch (e) {
                console.error('fraudDetector.evaluate failed', e);
                return { fraud: false, reasons: ['detector_error'] };
            }
        }
    };
})();
