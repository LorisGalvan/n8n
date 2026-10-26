-- =====================================================================
-- Network CRM · primo avvio (da eseguire UNA volta, dopo schema.sql)
--
-- Prima di eseguirlo: Authentication → Users → "Invite user" per
--   info@lorisgalvan.com, loris4386@gmail.com, enrico.berte@gmail.com
-- (ognuno riceve una mail per scegliere la password).
-- Gli account non ancora creati vengono saltati: si può rieseguire
-- in seguito senza creare doppioni.
-- =====================================================================

-- organizzazione
insert into organizzazioni (nome)
select 'Network CRM' where not exists (select 1 from organizzazioni);

-- settori (se ne aggiungono altri in qualsiasi momento con una riga in più)
insert into settori (org_id, nome, colore)
select o.id, s.nome, s.colore
from organizzazioni o,
     (values ('Nautica', '#1f5f99'), ('Immobiliare', '#7a4a9e'), ('Fornitori', '#2f7d5b'), ('Personale', '#a06a12')) s(nome, colore)
on conflict (org_id, nome) do nothing;

-- utenti: tu con due email (amministratore) ed Enrico (collaboratore)
insert into membri (org_id, user_id, nome, ruolo)
select o.id, u.id, v.nome, v.ruolo::ruolo_utente
from organizzazioni o
cross join (values
  ('info@lorisgalvan.com',   'Loris',        'admin'),
  ('loris4386@gmail.com',    'Loris (2)',    'admin'),
  ('enrico.berte@gmail.com', 'Enrico Berté', 'collaboratore')
) v(email, nome, ruolo)
join auth.users u on lower(u.email) = v.email
on conflict (org_id, user_id) do nothing;

-- settori di ciascuno: Enrico lavora su Nautica, Immobiliare e Fornitori (non vede "Personale")
insert into membri_settori (org_id, user_id, settore_id)
select m.org_id, m.user_id, s.id
from membri m
join auth.users u on u.id = m.user_id
join settori s on s.org_id = m.org_id
where m.ruolo = 'admin'
   or (lower(u.email) = 'enrico.berte@gmail.com' and s.nome in ('Nautica', 'Immobiliare', 'Fornitori'))
on conflict do nothing;

-- controllo
select u.email, m.nome, m.ruolo, string_agg(s.nome, ', ' order by s.nome) as settori
from membri m join auth.users u on u.id = m.user_id
left join membri_settori ms on ms.user_id = m.user_id
left join settori s on s.id = ms.settore_id
group by 1, 2, 3 order by 3, 2;

-- ---------------------------------------------------------------------
-- Telegram: ognuno scrive /start al bot, che risponde con un codice.
-- Poi, per ogni persona, esegui una riga come queste:
--
--   select collega_telegram('info@lorisgalvan.com', 'CODICE');
--   select collega_telegram('enrico.berte@gmail.com', 'CODICE');
--
-- Un nuovo settore, in futuro:
--   insert into settori (org_id, nome, colore) select id, 'Charter', '#0f7c86' from organizzazioni;
--   insert into membri_settori (org_id, user_id, settore_id)
--     select m.org_id, m.user_id, s.id from membri m join settori s on s.org_id = m.org_id
--     where m.ruolo = 'admin' and s.nome = 'Charter';
-- ---------------------------------------------------------------------
