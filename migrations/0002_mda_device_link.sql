ALTER TABLE pairings ADD COLUMN mda_device_hash TEXT;
CREATE INDEX IF NOT EXISTS pairings_mda_device_hash ON pairings (mda_device_hash);
