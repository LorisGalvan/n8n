// La prova non regge (o il sito non si apre): non parte niente, il lead va controllato a mano.
const l = $json;
return {
  json: {
    lead_id: l.lead_id,
    stato: 'DA GUARDARE',
    motivo: l.motivo || 'Prova non verificata',
    regola_id: l.regola_id || '',
    prova: l.prova || '',
  },
};
