(function(){
    'use strict';
    // ai_adapter: normalize different AI payload shapes to a unified structure
    window.aiAdapter = {
        normalizePayload(raw) {
            try {
                if (!raw) return null;
                const r = (typeof raw === 'string') ? JSON.parse(raw) : raw;
                // Accept nested common fields
                const payload = r.payload || r.data || r.result || r.analysis || r || {};

                const damagePercentage = payload.damagePercentage || payload.damage_percent || payload.damagePercent || payload.damage || payload.percent || null;
                const severity = payload.severity || payload.severity_level || payload.severityLabel || null;
                const cause = payload.cause || payload.cause_of_damage || payload.event || null;
                const disease = payload.disease || payload.pest || null;
                const verification = payload.verification || payload.verification_status || payload.verified || null;
                const fraudCheck = (payload.fraudCheck !== undefined) ? payload.fraudCheck : (payload.fraud || false);
                const weatherValidation = payload.weatherValidation || payload.weather_check || null;
                const location = payload.location || payload.latlng || payload.gps || payload.coords || null;
                const analysisDate = payload.analysisDate || payload.date || payload.timestamp || new Date().toISOString();
                const confidenceScore = payload.confidenceScore || payload.confidence || payload.confidence_level || null;
                const damageSummary = payload.damageSummary || payload.summary || payload.reason || null;

                return {
                    damagePercentage: damagePercentage != null ? Number(damagePercentage) : null,
                    severity: severity || null,
                    cause: cause || null,
                    disease: disease || null,
                    verification: verification || null,
                    fraudCheck: !!fraudCheck,
                    weatherValidation: weatherValidation || null,
                    location: location || null,
                    analysisDate: analysisDate,
                    confidenceScore: confidenceScore != null ? Number(confidenceScore) : null,
                    damageSummary: damageSummary || null,
                    raw: r
                };
            } catch (err) {
                console.error('aiAdapter.normalizePayload failed', err);
                return null;
            }
        }
    };
})();
