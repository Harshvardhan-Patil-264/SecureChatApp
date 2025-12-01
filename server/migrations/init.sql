-- migrations/init.sql
-- Run this to create database + initial tables

CREATE DATABASE IF NOT EXISTS chatapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chatapp;

CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(100) PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  totp_secret VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_public_keys (
  username VARCHAR(100) PRIMARY KEY,
  public_key_pem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sender VARCHAR(100) NOT NULL,
  receiver VARCHAR(100) NOT NULL,
  content VARCHAR(2048),
  type VARCHAR(50),
  delivered BOOLEAN DEFAULT FALSE,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS images (
  image_id VARCHAR(100) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
