// Annota nella scheda RICERCHE le combinazioni città × categoria cercate oggi (così non si ripetono).
return $input.all().map(({ json: r }) => ({ json: { data: oggi(), citta: r.citta, categoria: r.categoria } }));
