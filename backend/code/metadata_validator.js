(function(){
    'use strict';
    // metadata_validator: extract and validate metadata from AI payload or image info
    window.metadataValidator = {
        extractExif(payload) {
            // If payload contains exif, return it; else null.
            try {
                return payload.exif || payload.metadata || null;
            } catch (e) { return null; }
        },
        hasGps(exif) {
            try { return !!(exif && (exif.gps || exif.GPS || exif.latitude || exif.longitude)); } catch (e) { return false; }
        },
        getImageDate(exif) {
            try { return exif && (exif.DateTimeOriginal || exif.date || exif.timestamp) ? new Date(exif.DateTimeOriginal || exif.date || exif.timestamp).toISOString() : null; } catch (e) { return null; }
        },
        isFutureDate(dateIso) {
            try { return dateIso ? (new Date(dateIso).getTime() > Date.now()) : false; } catch (e) { return false; }
        },
        validate(payload) {
            const exif = this.extractExif(payload);
            const gps = this.hasGps(exif);
            const date = this.getImageDate(exif);
            const future = this.isFutureDate(date);
            return {
                exif, gps, date, future, missingMetadata: !exif
            };
        }
    };
})();
