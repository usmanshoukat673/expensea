-- New workspaces default to PKR (was BDT). Safe to re-run.
ALTER TABLE teams ALTER COLUMN currency SET DEFAULT 'PKR';
