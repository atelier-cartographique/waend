
BEGIN;

-- Table: entities

DROP TABLE IF EXISTS entities;

CREATE TABLE entities
(
  id char(36) PRIMARY KEY,
  layer_id char(36) NOT NULL,
  user_id char(36) NOT NULL,
  properties json NOT NULL,
  geom geometry(Point,4326) NOT NULL
);

-- Table: paths

DROP TABLE IF EXISTS paths;

CREATE TABLE paths
(
  id char(36) PRIMARY KEY,
  layer_id char(36) NOT NULL,
  user_id char(36) NOT NULL,
  properties json NOT NULL,
  geom geometry(LineString,4326) NOT NULL
);

-- Table: spreads

DROP TABLE IF EXISTS spreads;

CREATE TABLE spreads
(
  id char(36) PRIMARY KEY,
  layer_id char(36) NOT NULL,
  user_id char(36) NOT NULL,
  properties json NOT NULL,
  geom geometry(Polygon,4326) NOT NULL
);

-- Table: layers

DROP TABLE IF EXISTS layers;

CREATE TABLE layers
(
  id char(36) PRIMARY KEY,
  user_id char(36) NOT NULL,
  properties json NOT NULL
);


-- Table: users

DROP TABLE IF EXISTS users;

CREATE TABLE users
(
  id char(36) PRIMARY KEY,
  auth_id char(36) NOT NULL,
  properties json NOT NULL
);

-- Table: subscriptions

DROP TABLE IF EXISTS subscriptions;

CREATE TABLE subscriptions
(
  id char(36) PRIMARY KEY,
  user_id char(36) NOT NULL,
  group_id char(36) NOT NULL
);


-- Table: compositions

DROP TABLE IF EXISTS compositions;

CREATE TABLE compositions
(
  id char(36) PRIMARY KEY,
  layer_id char(36) NOT NULL,
  group_id char(36) NOT NULL
);


-- Table: groups
-- status_flag 0 => public; 1 => private; 2 => user

DROP TABLE IF EXISTS groups;

CREATE TABLE groups
(
  id char(36) PRIMARY KEY,
  user_id char(36) NOT NULL,
  status_flag integer NOT NULL,
  properties json NOT NULL
);


-- Table: auth

DROP TABLE IF EXISTS auth;

CREATE TABLE auth
(
  id char(36) PRIMARY KEY,
  email char(256) NOT NULL UNIQUE,
  password char(60) NOT NULL
);


COMMIT;
