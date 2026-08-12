-- «Город Сейчас» — initial schema (MVP subset of the full spec's entities)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  language TEXT DEFAULT 'ru',
  role TEXT DEFAULT 'user', -- user, contributor, moderator, editor, admin, super_admin
  notifications_daily BOOLEAN DEFAULT false,
  notifications_events BOOLEAN DEFAULT true,
  reputation INT DEFAULT 0,
  xp INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS places (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id INT REFERENCES categories(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  price_level SMALLINT DEFAULT 2, -- 1..4 (€..€€€€)
  phone TEXT,
  website TEXT,
  instagram TEXT,
  photo_file_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, hidden
  hidden_gem BOOLEAN DEFAULT false,
  is_demo BOOLEAN DEFAULT false,
  added_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_places_status ON places(status);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category_id);
CREATE INDEX IF NOT EXISTS idx_places_coords ON places(latitude, longitude);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  place_id INT REFERENCES places(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_place ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  place_id INT REFERENCES places(id),
  address TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  price TEXT,
  url TEXT,
  category_id INT REFERENCES categories(id),
  status TEXT DEFAULT 'pending',
  is_demo BOOLEAN DEFAULT false,
  added_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_status_start ON events(status, start_at);

CREATE TABLE IF NOT EXISTS favorites (
  user_id BIGINT NOT NULL,
  place_id INT REFERENCES places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, place_id)
);

CREATE TABLE IF NOT EXISTS event_favorites (
  user_id BIGINT NOT NULL,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  entity_type TEXT NOT NULL, -- place, review, event
  entity_id INT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'open', -- open, resolved, dismissed
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_telegram_id BIGINT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
