CREATE DATABASE  IF NOT EXISTS `chatapp` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `chatapp`;
-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: chatapp
-- ------------------------------------------------------
-- Server version	9.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `images`
--

DROP TABLE IF EXISTS `images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `images` (
  `image_id` varchar(100) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `content_type` varchar(100) DEFAULT NULL,
  `size` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `images`
--

LOCK TABLES `images` WRITE;
/*!40000 ALTER TABLE `images` DISABLE KEYS */;
/*!40000 ALTER TABLE `images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `uss_session_id` bigint DEFAULT NULL,
  `content` varchar(2048) DEFAULT NULL,
  `delivered` bit(1) NOT NULL,
  `receiver` varchar(255) DEFAULT NULL,
  `sender` varchar(255) DEFAULT NULL,
  `timestamp` datetime(6) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `mode` enum('NORMAL','ULTRA','STEALTH') DEFAULT 'NORMAL',
  `msg_no` bigint DEFAULT NULL,
  `iv` varchar(64) DEFAULT NULL,
  `auth_tag` varchar(64) DEFAULT NULL,
  `iv2` varchar(64) DEFAULT NULL,
  `outer_tag` varchar(64) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `signature` text,
  `verified` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_uss_session` (`uss_session_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`uss_session_id`) REFERENCES `ultra_secure_sessions` (`session_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,NULL,'GGt74ND5br+VvA4ZZSuR0hUEcECDpCZ0018Jj8Uj4Bnb',_binary '','nike','hp','2025-12-18 17:56:34.000000','text','NORMAL',1766060794584,NULL,NULL,NULL,NULL,NULL,'IKaw2SGEEm7wgS1HOWwlhTnEDH6eMS5WRAyZwOrVqaJpeNB1oIwKIWkaRPrP1c6ErRDNmp1cpP9z26Fh0RDKGQ==',1),(2,NULL,'R0zSyyYYlCtBVaOY1cQzd5NTb/6lWZVtfMSLMH3IkA==',_binary '','hp','nike','2025-12-18 17:56:40.000000','text','NORMAL',1766060800278,NULL,NULL,NULL,NULL,NULL,'eV4TnumxsUJTM5Hv7scZ6dk8vNvo0dYnfD5RW7UjwPioZXJyRaE7egJv90kuNb75HOCY5OrqFLh6PcTN9aF+PA==',1),(3,NULL,'nBDYKBXgiEyBlUFjTFcx4nAD107oIErcGGDumIKJ4TdKlCubjjX1rw==',_binary '','nike','hp','2026-01-22 17:38:00.000000','text','NORMAL',1769083680036,NULL,NULL,NULL,NULL,NULL,'Ur5q7SqD57Mgr9ERARM/JeJd4UtsS8bKT5BmcMT5oq29PNJAKwYCMrX+/Ul1qJ+oYH+OXsiAFCPCxdYOtftYYA==',1),(4,NULL,'t4RexmtMc4whaArAQFk5E3xlYFyUrG6V7/Lo4Rapvuz2xw==',_binary '','nike','hp','2026-01-22 17:38:01.000000','text','NORMAL',1769083681195,NULL,NULL,NULL,NULL,NULL,'rj6H3mFz4zhP08LWYRDX+cm6wv2PMBg2DTp/dmzdHQhBputNbWOkXAwIFImfNlMeIY17dTJwXFf6EfQG7PgU7g==',1);
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `security_events`
--

DROP TABLE IF EXISTS `security_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_events` (
  `event_id` bigint NOT NULL AUTO_INCREMENT,
  `event_type` enum('USS_CREATED','USS_ACCESSED','USS_ACCESS_DENIED','USS_LOCKDOWN','DECOY_ACTIVATED','BACKUP_SENT','BACKUP_FAILED','DATA_WIPED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_id` bigint DEFAULT NULL,
  `user_involved` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `details` json DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_type` (`event_type`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_user` (`user_involved`),
  CONSTRAINT `security_events_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `ultra_secure_sessions` (`session_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Security audit log for Ultra Secure Chat events';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `security_events`
--

LOCK TABLES `security_events` WRITE;
/*!40000 ALTER TABLE `security_events` DISABLE KEYS */;
INSERT INTO `security_events` VALUES (1,'USS_CREATED',17,'nike',NULL,NULL,'{\"userA\": \"nike\", \"userB\": \"hp\", \"createdAt\": \"2026-01-22T12:00:20.807Z\"}','2026-01-22 12:00:20'),(2,'USS_ACCESSED',17,NULL,NULL,NULL,'{\"timestamp\": \"2026-01-22T12:00:35.212Z\"}','2026-01-22 12:00:35'),(3,'USS_ACCESSED',17,NULL,NULL,NULL,'{\"timestamp\": \"2026-01-22T12:00:47.061Z\"}','2026-01-22 12:00:47'),(4,'USS_ACCESS_DENIED',17,NULL,NULL,NULL,'{\"attempts\": 1, \"timestamp\": \"2026-01-22T12:01:20.189Z\"}','2026-01-22 12:01:20'),(5,'USS_ACCESS_DENIED',17,NULL,NULL,NULL,'{\"attempts\": 2, \"timestamp\": \"2026-01-22T12:01:22.836Z\"}','2026-01-22 12:01:22'),(6,'USS_ACCESS_DENIED',17,NULL,NULL,NULL,'{\"attempts\": 3, \"timestamp\": \"2026-01-22T12:01:25.369Z\"}','2026-01-22 12:01:25'),(7,'BACKUP_SENT',17,NULL,NULL,NULL,'{\"timestamp\": \"2026-01-22T12:01:30.656Z\", \"emailsSent\": 2, \"totalRecipients\": 2}','2026-01-22 12:01:30'),(8,'DATA_WIPED',17,NULL,NULL,NULL,'{\"timestamp\": \"2026-01-22T12:01:30.670Z\", \"messagesDeleted\": 2}','2026-01-22 12:01:30'),(9,'USS_LOCKDOWN',17,NULL,NULL,NULL,'{\"userA\": \"nike\", \"userB\": \"hp\", \"reason\": \"Brute-force detected (3 failed attempts)\", \"timestamp\": \"2026-01-22T12:01:30.677Z\", \"emailsSent\": 2, \"messagesExported\": 2}','2026-01-22 12:01:30');
/*!40000 ALTER TABLE `security_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `security_logs`
--

DROP TABLE IF EXISTS `security_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `details` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `security_logs`
--

LOCK TABLES `security_logs` WRITE;
/*!40000 ALTER TABLE `security_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `security_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chat_id` varchar(100) NOT NULL,
  `user_a` varchar(50) NOT NULL,
  `user_b` varchar(50) NOT NULL,
  `base_key_encrypted_a` text,
  `base_key_encrypted_b` text,
  `message_counter` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `rotated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chat_id` (`chat_id`),
  KEY `idx_chat_id` (`chat_id`),
  KEY `idx_users` (`user_a`,`user_b`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ultra_secure_sessions`
--

DROP TABLE IF EXISTS `ultra_secure_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ultra_secure_sessions` (
  `session_id` bigint NOT NULL AUTO_INCREMENT,
  `user_a` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_b` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_a_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_b_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `double_encrypted_key_a` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `double_encrypted_key_b` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `passphrase_hash` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `salt` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iv_a` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iv_b` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wrong_attempts` int DEFAULT '0',
  `max_attempts` int DEFAULT '3',
  `status` enum('ACTIVE','LOCKED','DELETED') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_access` timestamp NULL DEFAULT NULL,
  `locked_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_users` (`user_a`,`user_b`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  KEY `idx_locked` (`locked_at`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ultra Secure Chat sessions with passphrase protection';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ultra_secure_sessions`
--

LOCK TABLES `ultra_secure_sessions` WRITE;
/*!40000 ALTER TABLE `ultra_secure_sessions` DISABLE KEYS */;
INSERT INTO `ultra_secure_sessions` VALUES (1,'hp','nike','hp@example.com','nike@example.com','8OhJEmOjR9fh/Xb7LAkMkUYbtExqg0s7hGV+Az5q1sIoew0ZKHbNp0TXcpE7M2ziCza8KkchKAfoMahqZrkj/yxSB8QwfgsvYxGi63ahApvyZlgaDgENafQUAoRM90Ju7E9HUPaFqfJmqcpSgE6HOpjvBaMsYIk/pvywqEC03E3MKXsNTGgJaeFKjqaBOAzkiyp/z0ZDemk/NBU4GGglRCuL1Er+QSAgOsUVmz5tiAQ0N4kacbFRz1ECtVzPjcoIILZFLmvcUpUb89YkvCh16EycFaU1ogF5JbovohvKexSZ1cOERRqaDNCx//XyANLY43qPhIGSK3NWzEOXMHaZCVMS6b1FD8BNdO86CKS8p6Y=','ueVnscU1FyqIBlw2j2yUWWDXeqRc7ksGp6Zcr1/LkDY18PnGkwbDITPkIE9h/m6dXSf9+d2tNYncRb52fTV/cwuePQY6WCTpP95/MNORcZMgiD0fajfs8mQFq0hDCXqqI0Oa0f70YcE6g7yJUVXzMVbuO7fOTiK6LwUBg3lq3yUMg7igawbl8q8sUfKFHu0PgOY38+EXtf55EddawZXSMvuy4LaLcSAt0NDR1MOegk9cRnWsmRmdaFUjRYbes7q+0QVwIuOQDfpmdxMtor/jKd6cs99bIfL6CO5y3sALfM+g4OlwmmYM6Eb3yc3zN3AdxOM6HXvebYHsALQVlJ0HqYxZNB+jP1jYGCNDc/NH3Zk=','P4tmgNJHHkX07exGqpuR3eSCMyICzPfNcvSpeGZvPoM=','lgyz5Gn+7GhrzohI3wUraXIJ0Mlh+ominDl/IX6HC9Q=','LGNCbjZ5Cci3RvD9','Ej/quR5uvkRwTcys',3,3,'LOCKED','2025-11-28 16:57:33',NULL,'2025-11-28 17:00:40',NULL),(2,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','y/J7v37rPp91bK2YFm9ri+xbvpt9xokhIzTcfGATO4+S3IsOVRKCZiIcoltGuzPY8um3yh9Jbl2DmuO/66aWydzMOUx/npTcs4lAJVL+XX+XeDjlzCEMk7i8iS7h+y7C2S5AMVeoKMQLNWgpHcWev0vaOWvfRDY1KhNWzu8novdcgobHQAYZSDBTVEhOVTtqbAUvIL44AQ3Dk22q7Qp8sDuY73I3vJevHW1RREEtQQhZ3/pH6YKnY26Ie0pFeRqG4y+a0SAqTbyJlauxogxXfI/kfIVGYT+vWrvadqLtyMSIl2hNvR1/0VFjM3TwkKVuPVNiG0cwInXsSlxvhmWzDSCRRGCLr0P0EA3+MSqeO3E=','dYZrvME00TLs3QpkzBU3TldIWbILgZk8gI083ZpzJmo6Dl8K/DzwYXOkDQP3VomsTLDTGmVNzXN3yhPE8IGIQSWvZSQbeL1yPq6rrJRAHcVFRIsdHGOgY0stnVFrX7Q0TBWF6mC3TiiW5EH98VinwICsSONsGaNXUcmK3UHyheg7p1S3U2Vu//qJ6ky3E+LByqsLJl1V1y5ExgT2Zt5+KgT+XSe0sI4071HajCuUinypcxxAjwucW7dQ3WK3S0yKRToqIeeboXq33bjouk59YYlywSNmcIK39LJBud8ubOjJFCfkFtq/0ZvyMlkRIEoMM3FDtj9xyX6W5A+++DiYubLaZiScZiAS/AfHnjLUgHU=','exoLAidQljD5f/ZcbdXZ86nEitKJHralGI50Evn4vEc=','8NVKtJxRamr+lp3FTxOK7Mlcbj4XIW3SRT3JW57dLrw=','Y+inaO9597/sWJwQ','mm+DqHrAz1rVjVzD',3,3,'LOCKED','2025-11-28 17:01:13','2025-11-28 17:02:43','2025-11-28 17:03:08',NULL),(3,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','UqebLzsyD33bANJ0KWpv7eq2bTm9pQ04aaW/QCYHiCCsXUFrfSKJfPfkwahPsrG8/Et6utk23NkYtSZ+WxaUl28nLorIipHfp31IEWmqKSO4gMCOLE+SDaZlr8YPqn/JsvotizJ/aVFsOTHRKlukS4IoDPXvCl547FNft17DHEmC6FUa91YEtCLUEUSMWSlVh3gYwPkfJkyzUxFppkDqXAtkvQk//rY33pVGEy/ZIdMnA21hh39VGnCyBsVxtE09NjRcToYvomMdI/Vku8DvWA+DhlV2YMT0BURtwkmD07qnQo+54t8XhmlWPYnJZW0R9/jZ8qt7oqBJDg2g5pOZTPNoPUQELz9T16TUR8t9lR0=','o8XjqniJuJf9BfzQxyVytuSi9pm0b4DVNCmDZajabAqX01L0+jgpv2jpQjoPos8Is4mF8qUhEXBEJSdX+KLqgYnUzDYkeAnnTyyfEmpOfBeR7v8iAhuq7n2m0fW+aI2B4E5wBK3T6R+ogz5p90XiGcXN9Hl3PhGYO1dGcOmAL7dJEAvCaXMwPKO48cQ30JnEMMjfuoerr0mfbVMGzhE9JHbfjb7HlKJi61yyGWosj5I0Q/12GxOmYc2pP4WBDV2fKta6QNV6DAFri3DXDUYC/NdAcJAOZnT+YcFpdMN+WGrjsjBIw8ePkW4DGIAgf1uEOi8YASEUfeCCMTDNqF3ojGw/Uct2+0I03Ss5KWXLRiU=','L6aCu1XITxX4iDRWV2hG9gK5mpjN/5iOMN8xRnbY034=','PSJ4sFE8Y5OVuhcb5ySt9hs348RvPkyy/0uWFvdJ4LI=','QHz723x9H6s/u+Qu','hhc2KDCEVNGzVvFG',3,3,'LOCKED','2025-11-28 17:13:38','2025-11-28 17:13:55','2025-11-28 17:14:31',NULL),(4,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','KxSADwCBgTODErguvo8FsxDJLPo0z5hkaPUTDvyKlA30Rfa7Td0ifr7BBIS9gzo4h5SUPvVFbM+in6n+N796qUnGLpgIxsS7ZjneUP77ZcG0DHS70TSMX8VKSJMZNrVMTsXDI0+tXyiyYg7Cu4fc6WNRMyo5Qwmd2cfIW8+qg6sYUSL/t4UVYDytvJQeZWmaVrlchlt2X8o4zQvQYaqx9k3iAh99hJPGEqOs3pkYRXWrVSFNEWH/AYH8EDKaCZ+/X7YA/IqAvrq408lKs20vTeESDvdVIUypka+0MKlragiYcT8WIUlcXh7SkB8gzsLBqCFLoYuI6Kcq2mfxUvKyFdqGV/qIVzddFwtmmd8X7lk=','vLXs8edjGA34LtWLzWJe7co16zqdA0TKKFoW8Mw/L4UqBepD2GR5TovTXQ/WAtrl/NWFqn9gd1zRyXeR/YLTGyudrG3IH9er2OUUOQX874V1VZ0CtOGETPF7breE75SQTxM6JgpFWAlPhVvz4y+9Raj4dHtLCWoxwX9XVZOllPHw10x5YDV48/unojiuR3sp6sdIg+Ar/HyAzzIf5wUVZkyRDSW15BdzootK+hY8Gggk76/aoVkY34otLR/LdBTTYt6zq+t2EUjTo9jYJ5UdF9XwNKzEuT5mtexE89mSRzjAjQJMxV06GAdUMPj2VrS2yDc56bEDEDLjFfMB49QGFi2pInHfUC2yTLGIF55VEbE=','H041pEQKi7sGYI/3wh/uJTbLJWReMjk0zeLDlY69vyo=','N5Z9eiEkL2oZwcYOu3fXc3a8DpLECgE+VpLD2jD14bs=','aFyybTv/vPJ/7St8','OL+130TsekVDJSK6',3,3,'LOCKED','2025-11-28 17:18:58','2025-11-28 17:19:16','2025-11-28 17:19:48',NULL),(5,'nike','hp','nikhilbarage1@gmail.com','harsh264patil@gmail.com','cmcpoWP2XLuyCexDqWzOpV0sWZLb7tZYo9mvumRi0/8XMT3B8LLhK6ybjcewyioec2g1OEEq/n0YqtY3OP7BwB2e6hT6g/7WGBKmvaVLNNnLJdY69fsRmbimZrw4P+77fy5CoDLSiei/4IwZWvuWjyh64G4BR66dK7XKupNl114yasrrkXoz/eEDatTijDkiCerx+D7oERhhIqeay7PIcivn5xeSDVXQQ/dsrg3QRmh29L42vy85hst3UqSwwSEc6PzS0YMjD60Is+9plfbRmjwwhfu8OAQThg0rbazWt9Yla2koTOfq67I9cBxub09wFoUTZ6l6LNRIBXkpJE4tdYrlmhJfIq1VXG+RVAa5M6Y=','GVskqmvuxVvN4RpJ60rYrJ7EyYilTwTZXHL/D71zKRzJVK034I6piafAA5aK/MRZYjCdCBHisvjjXiYZh9K20ExN6Oyakj/JmYCIQl8l/oOiU8PLuMub0G0cYSPevvmEH9llkIEXBUz5RLhLJL+JBhD54EEJcLs8M4i9O1AOWnQ1Ma9XqbfWa/1/y1uEkhUPRwxXIs5NfWPfWGw1+Kam1HY18sIAUIrNgxdwmZEj+aekVUAwu74l4tGqqYmfWR4cdR8lvwh6GLzabklQbNolIfGD6BLDotAszpZ1B3ZxA/lgZxybQXwGrFMYL2sYEW5aib/k8p2YFyd4FKGygHTTJZUBX4niJYTlxLrU1a/KCNU=','D8ulqwVBRHRGS82vuUJ3oJf9la8QYaB+H3djsF98sNY=','atVDvAOOfPX12++I2AIX/rUjZWbFxaCUyYI/hOMnm98=','kmMbe8v36Hu0H7/p','tTFpccGnIGsdmhY9',3,3,'LOCKED','2025-11-28 17:22:09','2025-11-28 17:22:35','2025-11-28 17:23:07',NULL),(6,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','H0WXP39IBRHQP6jlpyOMqMhbzdP37xhNzHGH5DbuoHhPcXMbHcUuI7NA996lZurhRyw/b8vwNBmb6MWuY5GfcNYNWGNy3FMDqSFNoReUdv8UvOq4RgmJKPaxAcsOriTlWsj/KesXCIxCegGNQvOKQdVcqF3KXkTs7ud/QnoS1o2OyJRc8zKTs54FtMaWBcbvedKJ9RgBWhqkxUF7aGcNAx2knSPll6A3uiMQdVWEiwqKdxkAy2GdENIui5/bXAawemya9xj6XLuHU5X9+5992CFMQohxQgU0vgw7dE8liNvFRj6BenPZPtz20xgnO6f/tfjP0xvxBMiMkkGp+8Pz0i82unWmDR5YaYwUTbnXIkA=','fns0bCYUMH2Tdsu5sOnWfrALH1jryprMIzjZht8k3hlpepO3fnRH7v9c5Z127fmCTOa7QlQd/sTbrncs7Q+KD3V0H+JZK8YY/Jp+Xd9sifoaZumAkQQE5xtKSIltooC91Dwg9nmUtcQFDYQWab5ZK9BBa9kAv8uBEwZfEh3Z0jBDEqzI+xHc0daJjWTxmDPK+LuCSR6TrB0tG2WZ/glJWYLxuh98hkSC/Z56WV7tqtAAbISLlcU/2BVeBUntxaZewzsMCSKYSTaDzcSMGCzswaRqBTDUyo8nrimAFUxobjTT6JjnkJF0Z3pvwDWlfihHdBw3kItWtF92tY3sxTS8otKSbHV3iGXen2rTkygmP9s=','qlljfk9bNbX9gnJk8uffDY1/sL4xeEi3EY18tcMgokU=','R3ABti9QyVqHRk5Yz2cUMgrXSNI0SofEjy9LMWRSKQ0=','+AGEgKx3+4L3tSOT','LyfA/sU9Sa3d1lGS',3,3,'LOCKED','2025-11-28 17:26:41','2025-11-28 17:27:01','2025-11-28 17:27:29',NULL),(7,'nike','hp','nikhilbarage1@gmail.com','harsh264patil@gmail.com','0HbdHu8yjU2jq9MvTOK2M+VXowjJ/q7VWTganpXes7hcoSiVMORKXSj1mZ/2U3ze8IMEmoEtaw+riVD0G4wrE8ROLF6gpb6uLv53tNLheq4vyIzgY+amKftv8rm4rF6Ee++JCSycBltQTR4egZAyhdczsXJN7KdPObl0vA0OVnR+IVhbkigNPF5O5yujrO2gfj7kftAKLuuZEsnxjwVzqMhdpwpSBnDpNddZbVTEYCeHv+v2qHyDhVr4wB0AgKNqBXZDU4mELxoTCtJ0Q8BHyAe8/Rke3Lv0WSwyOwI/a1J3HGsMCgs2NNXqtQs5carnB4zS/7YDIMleQa53byPhbFOMu0puwbl0dbmdwwQWfFo=','hzYOlEkQWTag/zxKNiVhalI8fMhymTdGJBrc8vpxxQbOt0gYlRRuKzh6w5EPNln2dKlckeVmQFdQ4eKHuj9iuFGoINumsXinyVZFkDPTa6OFnOEKrkUeblMfL/N6orA6JurWx4GZVgH3/nI/Djvue9uLVAtZxSaoGC72spPT/cn3yG2QUYMOl9InPgWJl9o+UMX5iOA3ZZnWFltv3eeGPyjdFVzic2CBv+3qWUQ+PhzC+FAdbpMGDIV4hTJtTPDyqRSh0MX0wHYIvoOos7+sAbgIY8YHd46Tf6foAmCGebQXjQg2OO3p7zvMNMsqsN6mieUNXfwoLc837WaEexTZgQy6yBqUmNY2gGCi00vgu0U=','ydf6bTcZtiIUTmu2k4n1M9Vy0Tl6Svl/OOFdh6sBNmU=','5BQn8wHcl+xwNaw1BgdwtaVYYuVw935raCU5orQMTk4=','pz7P0UeMcKgEqZNk','YScspSoDGWCrYZps',3,3,'LOCKED','2025-11-28 17:37:05','2025-11-28 17:37:53','2025-11-28 17:58:47',NULL),(8,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','Vp2fjQywwarEEQsGfBgAuvRxukpuHjmfDMHVIrv0e7zyUp1Ajc8qK+k5egtMs8Q/xgRimkBzavI1HNPgByc4OiqIV12eUODYKGz+LaH7b3kf48uaztVRd6wFMlU5uYfhrwcJyqnFojKyhZrnEhUh6jkGk2nVa1wY9OQmEzTaoVMB0J/R81lbyEk2/WOmnjDn7NDetnzYsJTpekWlOt20vw/pcSp0YySQVipzNl1SEuj379Ixe4ST5KI4suuU7uchq9wGW+SPdG03Hl5uE7wPEDDqdV5qQP17PslAcJq1iSwfhEmVz9LddAxsX0MkbLLzyVNMjy5R5dRvcLmzFqz6jNuh7u8Il32recFBnhT49XM=','PDyCUqEJ8KmKZ4fFLND8468PHA58rPlnqVtJDxkiDZaLzF/N5n3222+7+X4YAbpm/BTqsJj6P9NZ9U/xn+tAk75k2UwaM3stzQF+g66umxit41dkY7GIH9IdD2ON7WiLapt1xPCB+zWKmLRbbA44ko3dZlKzS3fu3gzdp8KH8yDDYYGdw8++ezUq/BfPWTrG4lqVKlMkZ8iIi1CHwDeNSIChuJ3lMCtBf8+PgKkgGfa0M5svXS84ZyjwjQKejfN0Cyf4Pm9jsMn8U4j0zk5xZ7jtf9gj9u8UhWn1DZp3z9gqc20pGqkx1zsA3ALchZCDHuZeY0nVtlgPaL9uGdhT5NlY+X8Fu17WgW6V0uyZQq0=','BSmdfJdQWjmyUvdujO1af8RaVrlFztydGYT88p2SJrc=','yHhkfd9krUj52aDj3ntSfaX3mfxD5uHzRnYYMteQmDQ=','A3Tdla1t5/etJdIZ','rS4FotDbF+wfKqyg',4,3,'LOCKED','2025-11-28 17:59:51','2025-11-28 18:05:48','2025-11-28 18:18:36',NULL),(9,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','oLS2vhez8iVAw3ppSQ/MhYzMwGnS77Sl4iHEpyQrkNazsZ+rothX75yu7giTSgMAeW/3f+ceKHPSBykSH9TApeQ6qCVdPiZeAq4ncnqh9gK5WVgDkk4cVLK2LQ1IX6PWZ8e/PDTBukzdgdEGU8bZc+IFc7ggvhfMGZDv6tI9Cl0TYJ8a/8nYj2UldTscWJ9+mqTfoJEEqA7Yo9Y+bYG+yf6tmLKOvJ8egV8tJ3H+wU7A0k3EhipgCnblFSPsc4+1vGj3yvx6xodG0WdelSh/C74Qg7n/xYOzWjPH9JLXTBb0FGcbcF1rRG0MzFMIqByZmdrpNvPw2IS+Yycl5RGLC2Nc6j2NUUXvAmtUfkhlAUw=','WH81gWErsKemFbLEG78NncakU55gELMqFNEpmDV8gG8uwlIr9VLykYydUoiFWEPujMQyNGqcupHjionQlYkwZeMx7w6va4xWaE/BPj0E/qb1+fZvZMZYRYQCH2VeZhvOVU90/no32CKmW2SqzmQNGOj0hVm4zsldGRVLhddFd9X6XEHYK+GxMKeIjwhyIbvbtIfgjOiN4/BEb5yEIzGgqo2QUAHFVGvrfFzK0CdiUoDcCPl2dtTcgvEh37YMojhRKdb2bpEYpjBo0WLjrqM99qpAZWIJ1dDVTBb/CGbqQ+RJi3SVXXMQ9ZNqwqt8+b/BDSUcLp5KTTcqr1sv8tGPkIAgIsUA6FHrKTqH3u8kHnI=','pswB2r18sKGP/Jj+LpaMcWigrhQPYyiS3XBOKsoocWg=','NYv2CESKO4sIvY/7keZI2SWqvzz6fp/7+esU7YV/Ssc=','a6QUmwhO+/91Z+mw','PmVN74Z8RK18pvGk',3,3,'LOCKED','2025-11-28 18:06:35',NULL,'2025-11-28 18:07:18',NULL),(10,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','uGZxT/I5awWa5QG5JLXl9tSpNo7cHboi/q0Sl0XFSXxo6pq4/ySJsVBWSHY0DATl7Yzc8GfRfuOcRHDbtGGdn+QnKenUF+ofDJZj0mAvhqlJOOCRmuu+rzfc1+IAkFHmDmgdTmjumkcK62d6mUCxnKWNlgWFcatKgHcc1z2Qe3uDyFGUpymDsmxkyYtmgP0SsT1XcBSGajBvmCUUuu3IHju3GIu1/DQioWs2SDIgdp9wXr5gypURrRRKHBfyXKiWqoUq+okKH4AMiIvDZYrfrZU6Xora3AQL7ef/VEgBaMDM20ob+qpL8ES6i9e9J6G1HCaHelm0/iM2ANbmfRIPvCM9yji62Ql1rKbrGjqxKSs=','Wrr1KAQ217Xp1QfxOwyxcGlwrE7JmXZstnu3eSnOQtdzzBRxCzofY6AvLJ1zYHbM3SFOvgrYcW50wayiGRfme4Y9Mo53yYA05O0HJEdcZaC4y3mcIcbvlFu3D08Pf+U6KU0n/J1xjYXeZQxz+n2N7SG0I5vyUvFQKmukz2uVwX3E3Gs1KeM+M357GBY/fkO5mJ9aXuXEALbxP/nrjjWiwyifv7ZE9R5ew1NgJlbFXCKd7+hG0qggC6EJe4d3DCVNlm2PhyL1WG5RjdZ6J+u6i6+1AiYTZ1xg2Nmzc/SxeWLgvtzgVTnEyrakI1bfPjkeizrJDEVF41Y1Is1fDOp/HQZTFsX4zc0z/H5waVv9zUQ=','bNtV4SKZ2sKnIiD1mWx70S2+v7cv4eSRYDbyCF6SiD0=','5TMH/x1PYIxuFB7oc9SjYLyYAHHqIZpgTfEM7RPT/as=','2b07jJDy24xChi/o','WNplm6mefh8nLzwR',3,3,'LOCKED','2025-11-28 18:08:18',NULL,'2025-11-28 18:17:33',NULL),(11,'nike','hp','nikhilbarage1@gmail.com','harsh264patil@gmail.com','BmZMBye20l6BXJoL+4yIs2O/QI71hcw9n6rZjRQ7zzuDlb0y1Sgjgti9GqJ1yAxZqcHuic2zsxro2ak6g6gcxzYeO5bDsRiWbMHAHSO35YG+CixIye+PjxQLniSNVYfMInk3uFltEB+vc8KK8ADnjFxIoBLw987BaJ++3BX4Jexs+ErGrP+L1VRol4eR4raa2zn/z+/q8PIQiuY3d4JTFWemjQFg2tvM32OEJyipGl1it7LmEN8nyDpL3py7n4AwZKgJ7EOX294wA84CqOci63uP3OhyQfDpgSnFlMoiyh1kZqUh0IDxsAw0Hm9pKxqe5jQFdSWlkFe+Ph5QI1SV53+2SToKlwlPVCgpkVboUn4=','AZqlzd7sNgyi1lLj8S2LWtdCdwz1DnFHNWM0yKx0XMGrFXJrvl7jvHOKX+Rywit4E32oBE84WdkvjnnYmmmkQrntMJV3zLuBW40+amFPinU+pDd+PAVQ7Bv8kW9Sfr8xQH9aG3ptBT2l0Y9+6czOrZVN8SH6Wnex1KypjYH29jVbY90BJ0+gOnWKqqDly+57rSITcjqYHfMPGtMkx/Yxs3FtiIc3uVnTJPDR+wDNMpReYeQ44E6pd7Xi6RLznsVWM2IkA1q9kNdRxgqPxH9aG7LvUap782txdo+wIq0m28qo0olYkOKue2ZwLgk55kjYZwGZY0Y5BSBkUhGGN4bLy46K7ZpL9TY8sYC0sebrz9U=','z06RyahZlK+1BhWEs6gNzaHWTE/9kO5HL5GpHZhmCP4=','YJs1hSPEBB9AmCVThXAJPRvuaJgfCLMZ486alTnM9OY=','k2qDpJKy0fNzcYBd','AFpqTPZUBbxWhKAu',3,3,'LOCKED','2025-11-28 18:12:24','2025-11-28 18:13:09','2025-11-28 18:13:35',NULL),(12,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','Ktt2Xi/eoVnMRU/ZT0/BRCyNT8M4hH5sGmgdHJxTot54L5OWoOxVBRBTsdICwlXIEOHw/iMAA2j+SlQhVRUxnKEwo2/IXGXo/9jo2VZ38i8sL/BDsC1ij/r6R9bLKDwmpHO8tapn2Jn1VtVGl7yWajKMgLF5aG35fq5Ha56H2pCpFFeiisrkslL9pZKdVbLtsivUA81jv0Ce1xd8kRAD56g1nq5tDCKUtm3XKq4oOGlLFBGq7cBBO5ZmxMJvVQUvSiYFs444Xqv01tDG4yIZ+FSTRsPiypZFjQE+xU8wt+ZqLDBOiWmCQI5KoLL38ZpVQrd4wscL07/IildcOH0fZSURfZSS/Ub0Ro5YhEZgH5E=','rVyVcblxbSgqgz79BLa7XuQIt4U8wrM9u1/9yUjVkjTyMaYWMiwOg3ilcU4R0GHTJHN7yg9YE+f8KtDI1LGnJRYhsrnOxsLXna9HmUXSKKOePh17COVhqqGgRyxGpKNHimFqC6az1uMhZV91si6itU0uEj7tEw6rNJoccGIVVhmZSkVSTQqP0ri8GoGD6bEEqNgSzdehfSIf85fHrS8IIERx0kFCQfYI/zzkZqrxA9P8BFi1Zy1Lp8BGZ/W5jO0K2pbVRlcPSIYgAURMhRKR9L4avFOHeT6wOC7QhsYvIHoWQ0Sua6kcLmGuIwfpmS1AP2sBHY4dx26U1tm3PlroUPzIk03oLE2ZYuimOVNlxXU=','R1XJ823oQwmuJX8J0Q6nKL8DfWQXP4vpjEFM+csUglI=','gPHN8+nJKQzJdTauWX0baartnsfAGLLGmc8l0d03Xgk=','Ri8KBWN5k05/3MDF','lvVqqDkPLvG6NyMt',3,3,'LOCKED','2025-11-28 18:18:59','2025-11-28 18:19:51','2025-11-28 18:20:19',NULL),(13,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','apcHWTG9tDbdYJ401ChbAx2Jsv4sMeNHwwDVlU56HZqExxn700yCbZHRY4O/8lSMpzTIG2ClQWdlBy2v9prPqCKrip+zil3Q2ApXDFhez/IdEkOoC3FDViTPoSvGdU1ixo8xe0FH16/xTywb0yj5HvRNI4HIThph3dJwJC8Eqhb6ukvjQmJCipyJUS2D+i+jcYOLUtuAW2I6Nw6IYWc9yxa2bgtHezZSlrpYK6ALNN61UH44w9n5j1n/8MdDOv6+90dFaPFKWL7Q5Nodxy7JMa9iplZcsDLcsJ4B5s6zRrYR0QI2/X4/zjGe8QpcYnSKsz57B8g0LmicGE328Lps5twdziZe73f5YgbGbC2ASKk=','uvtWj+Y0/rhokWUTC92r3upYxYTI+CjPYTcWapTMwUM59T3NdRQ4Ul49D6t+Vvm0A2J0NpdSEDbPEeefNDlaun9sXcNeGwYf6KCsETbcq/6K5hhcg1IQ6wF/jEcqeSvOiQszPl1JuShvkk4k8oTeYcaqdNvcPHVbmedzIoulPDH6Wx4K1/LlHefm5P5AMOQeIhaKfunvJYKVBQzGNna513H86BXLvo8dIK9JBu1wfyMY1TiGHe/QOzbq8icnBBd+8QDOkDz+ItIxLG35NuadWNMbsNL4rPY3QkCKzJ155VuTKvhsgKPMOwdwnypureMOy1CDCNH78cb/4IHTqzTSXj7SRpiC2f8ZabV7J6ETAQ4=','I8DrPuT1dnU9oTOwg8Lr8XIjXYSSsrM8jy5O8xaByos=','j3xASn0wTj1Fi0xw8YlDFaBmwm2yg5qaBq6FFRCRCfE=','hVAzYHdGSPKRumAb','HEkEJvyz6jfx9Mwa',3,3,'LOCKED','2025-11-28 18:23:53',NULL,'2025-11-28 18:24:15',NULL),(14,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','quzq9sUq3BZcg1iz/nEyMxyjqQRjeRht0/qIKUvCZdvciAZ/BvrzroeXi+MwTAXkzKCoujtlcOX44toDPYj/ULFD/22H6S0fwj8kPlCfcV5x4XTWeV9/uJSzFGYiJ2tIgxcjLf64FLcVb2VcD1d1ZRj9DBuzSZNMcfnD68tpfPNcaMIw/f9y7VSkP9ciMFFgDc1P6GFRZvfHc4hIKcRAzG3tGPrNS9mA7ZXqR+MEm0cEQapEa7GGfRzYmJMSpYk2Ges7POygIaz7X+Up+f7ttjtBdYs4916BPKaVlbh//yF8TimhlV2kfpzVSUKdyz45VZQknO0XCuS/4QtH7/pNf7JUE3bIsY9xrApzkSWLKpc=','llloAqAAVaAWggaGAoxV+OBlbZzBfExS5QjdyqHjOTz556QWe32CPo0k/uMMTBztPFoeZTaZXGZIbMGO2FISskGYiTkz0ABNEyzI6O3RE9FNZS42b5MJ49JotSUdrel0hET4tvB0PrIB7OFXpl9QM0ylFcJXDOLiBBtMuKpxd805ZtKPgg3krDiKDkkqHWdOpVBvKdNCA8N6rmLR/Ut+vqpJRGMzKSxzm+Vi0GgyqHuwx4J0QeV/U6yoOlL89VxDO5UodQZmg1Q02hCY+dxO2GG+ecuEpTElMmwr/UIerOHqYhJyO6fkgECvQOD6xHfM34IJwqmoMJlhFPwS4iKrXN3MvIuef7KKRWWsZ9v8rmU=','u4J7dbnNECqC2F11yhGYVR/FdkbJrDI6i0ZuNsq6l00=','0zic6VHtj1tIiKfrjYmYx+JSGawgrMF2pwpeB/2dEGc=','0tkyOjH/8qVIll3L','1rpCBERXHmu1xLwB',3,3,'LOCKED','2025-11-28 18:25:13',NULL,'2025-11-28 18:25:28',NULL),(15,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','jiylnZQzambjBIU2JIeR/5Z5NSUDZ8i9U+w4rOOYxTaVGov+eQb6De4S2Sp5bDC0EQ8TGl/f0p1QpOr61VgYgOadRdMnRgvuXDKl7pPd0MxM949VzF8kRmwJ+Girws9o5Zyc94nMdlqSM5QEZnuT7BpCS+zruEO5UOSVRHCsGC+P/VWhZ2OmkaazHBA2uR+qGC5/6+LIXXyXpYaphk4bTnK0Mk85+lAdriDXm5oRgSMotwDCdgRWu+uryXxMQTkKw0BCdZBdc7H7KgK7ykDFm1/dLD9HkM4W+Gdxgb91e/n1dHbZ/8MGHJWrH5MVPWqG3hGTA9ecWxuFUWmQtc+g/88eX8rT0pXvoE0NvShQixo=','bDfkcR2/cdq27GgDdHTaoV992kL3nKjkccmO9KZxXD7psGLGmgegC9r8SDMIXCjVMarFxORzEf+h8YImEdRnGzHV74pNKeyOuHZo0y8OF9G0gnOrPnMgXAqmcO0RtcGv58wTecqL6bmRkh1v/8i8dc29ni3TUSzbomkt6MAKGgl33TCLPaUHz3/ztSDwjAsHFo2NtfArnSZ+1Tv8stwAsm2EvsBkoYoXoSFHR5DkdJCqjFsBSpk5btwljIcZu+pVC5b6jJ0wpUcwnixdiGUy9c2OJD2+t1l6Lpml3Aq2EGAob8plq2t2XjXyGJ0+TnCYordQBqfbMmoTrl2NDnQq2ilCSJVJ0LduRkUzl7vwRfc=','n+baLS4pjSS2unw6zdGoIziicivbfMbvv9MiTr6Wgkk=','lWhzCQL/JW+PBbigVtGt2o6mYZrgbdgCiLjaeAfWh7E=','oemJOO6luo4t7G65','B4NxeXPrxJcIcwUm',3,3,'LOCKED','2025-11-28 18:39:11','2025-11-28 18:42:01','2025-11-28 18:43:05',NULL),(16,'hp','nike','harsh264patil@gmail.com','nikhilbarage1@gmail.com','mHel5ISSopcew9Epq1/k5UEsGncSmRMXpfKU+XloM/0uZPI6jeLT8sJGnzM1WSx2n+0w7gZXflrdieZYS1LmcFfbAu4c4l9y5/BPi72nOSO23B8zopnVxtaZBlqAsPTP0Qada7k+gkNb0xVnO4EHictKTCy5w+Mmzwo5VhcAe5vWxfXAjWmEc+u662Tqu5VZnzKSq5ur/tf1/S3DkZTUjJjPCnnsibuGlLSwD+PcxK+AIPbR4+ELLVv5GsclrIptW56LXb/afp7ciRzpNaRCshouQ3s5Jol6CKYj1EGYrsy4h0XiUsmXGF/CupM84XW4YVbHexavCcfe+LGYG5J/mKuyb04OTK7E/vq3JmWRXsc=','iQGjWu+qKyRRAKtoNB1F/UpF2kY5bjsvtkKfWHq5rTOMD/5e4uQeob9SLyY20UHI33mqkQIEHXX1JXQy1+S1rJ43d7cIOXHw0qDYnOnsKIJPUihs8ERgnmoSxDU7rjq61nUec2+RuP19zJzPFVaUR67JqPDE61RUVFjxJsXSGVT0QykRSbEoF/jA+7ljqNGIxaENrZBI93wGsqlPbHfcKdwAl44Eq1na6yj8P46/b3bqohTjmQTa3cypqC10d/l7ez5CclA5WQjlw9xeaz+mS2RLfXOh50UWZVsunRznC0vqBcRrSo+OfPXqyw0I7x+LadHb6qdiN7L6zppKaDFEakJL1Z7N6dPcHiuD7i+Bw9E=','fnE48ZPo40iiEL+t8NWbLrow3DezgldFDZ6k4Fy552k=','cGhOnzQJnK16qS4BVNlRCEwgcShZLpa0515EGILdAig=','X/TGdJ8cvvxCHj7v','pxfa1Xn6ZldlcUWr',3,3,'LOCKED','2025-11-28 18:44:08','2025-11-28 18:44:16','2025-11-28 18:46:14',NULL),(17,'nike','hp','nikhilbarage1@gmail.com','harsh264patil@gmail.com','2MYbOYtcI2bXLbCyfD7BSrKYobR3q3poXLujlokfT8tixY7lCalGNjKI758NGClYTprhClQv1AJFPUZ3GOrM0lRV09iwKWgDxIddZRzzKw0kxqLDAcAPY9dvGXANiq++EdQtnH0JlUWxXbII4gbg3p6K0dWvAu0kHx7R3vplnnclw7RNJUVb4NrYA7FO3gIsFtrftk7Tv0+ZNoWifUSViqTEVhMl2SsOkmW3dxyy9c3qvw5JQLu7YDh63aGNQkiCkNu6o8BSEOMEBQ2x8GGcyTwVRqdzJsRBWacrnZkW6h6Zf3793nxlZG+bTTJ3TzgsIESwAUCAWiP1lLtK9Fhy6mroZ8OuYYc4EWKooJVC4jc=','AoJBVNG/svGRaxTrGqPgXCnI83chd/K3kuPUamjvpX2irfhcXLtwT92gC2Ktxj229Clw3QQ95gJU7xmiy41C1EqSgQj2y34FQEHOHKbux471/pQn6DmqNzXJ1hb2MR3zfhnjJ3Rx/jsglP3bN79xWYIammzZYifV0FkMwExU9VDtJmrJ8udMLhPw2ipZfw5vu2t82p590F//z7Z9jAmeGjzMyYwUjhb3csFb8PooXkS2KGgxq1IbO7ilBjANytYs/iewo7ASDyi0LKuxioub5QT+uwY+9Lu6Ol7Nw1O9GPkYMntmUpbfIVZwV4oBAjbU8/wHECYiw+zxqHlwY9mpKV9m7rl7EVrxLyxN7k0CI+w=','znf5AtNzco1m9vjZv6ZTsCKp1vadtLat9HwtGtf2Yg4=','DSX7B6jmKy1dbg44RizSqLWybprZL14HP8krQ672+Y8=','F/c3AKYrySd6iIbX','erl3GzSmNWYDy2vJ',3,3,'LOCKED','2026-01-22 12:00:20','2026-01-22 12:00:47','2026-01-22 12:01:30',NULL);
/*!40000 ALTER TABLE `ultra_secure_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_public_keys`
--

DROP TABLE IF EXISTS `user_public_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_public_keys` (
  `username` varchar(100) NOT NULL,
  `public_key_pem` text NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_public_keys`
--

LOCK TABLES `user_public_keys` WRITE;
/*!40000 ALTER TABLE `user_public_keys` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_public_keys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `username` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `totp_secret` varchar(255) DEFAULT NULL,
  `public_key_pem` text,
  `rsa_public_key` text,
  `rsa_private_key_encrypted` text,
  `signature_key_public` text,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('hp','harsh264patil@gmail.com','$2a$10$1CaFDU0506Nuq/9SnE0qsukCs2Ea42Qo.hieWlRhmeZcNDbDhm.R.',NULL,NULL,'-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwywX5WrXYU0C9u13ySoR\nNlJgh91GhWFh+fxgB5enlbVj1JRDEftOJR+nnAIJziLGKKQbvoOWrNbe58wyG/O4\nVcyljQ1J0Q0dySEaKpOWKB/ek48JqhJ4s8EwFhyqGcW1bugwp2k4guPKzoLJjuKb\nZWYQMmzgdAA3DJfDHESF4jsq7AsIQfQnCrDZO5BsQmz/RAhcfDxWZiRwfytoDtHY\nqFmhxjnsCQUS5SowBMhXY6hUC3e2SdntYIdjiQEA0z+N4j9KB8UU+7Ay0iLVaV0P\nJIoskWbGBjQEXFtAmh7OPOImFi3gkXU9I0zP8PTfJeuvK8Sd8n5cWfQWIQT5y7My\nuQIDAQAB\n-----END PUBLIC KEY-----',NULL,'-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEnqB4LVWZ59Y/aZzktYKweirdOP8M\nyi8/9NxEGZ9aX2oobjIu50cdViT8paP5cJMzfqRcdEXHp19Dtrq1fWLQ+g==\n-----END PUBLIC KEY-----'),('nike','nikhilbarage1@gmail.com','$2a$10$yfq8mBoMN0qNPPXNFLkpJ.VgGOskLT3P71Fz0OgvolTUynOu4usxm',NULL,NULL,'-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2TP1kTqx03O1p3/5+Qne\nqcF8GxzVIcyPZ6lioA8WyrDSPEm8qnqPRUn2efFZH6J7qvp7LgSW4KEvHSIpi8Ov\nZvIuX1cf9N6fZY4DuFZkvt6XottCaION3sTIBZ8TMgYzJygpvzw8wEbWE0pXg8Mw\n5BW/1yQL0ksmEFlEW6gwxSvX2UkFJ0QqFu5RhYIvE5gnpjmSstHSGVzQA+dTogcP\nbw0U3vaDefluGCgCSJxN+P536zCyx7mcyXsGmSKotrBJtbSpI4SEcdskPa5khqaQ\nGJ3X18NVyKj3Ttw1uJJANKAVQObpqvdiyKh1Q7tQErn8VfGBEZ0q80btUvJ/gqjQ\n1QIDAQAB\n-----END PUBLIC KEY-----',NULL,'-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEnqB4LVWZ59Y/aZzktYKweirdOP8M\nyi8/9NxEGZ9aX2oobjIu50cdViT8paP5cJMzfqRcdEXHp19Dtrq1fWLQ+g==\n-----END PUBLIC KEY-----'),('test','harsh264patil@gmail.comm','$2a$10$sIg36kW5YgJhgcL3TwFaBuMDFehx7BQn6MS19uPRSAx1nLRod.f0S',NULL,NULL,'-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApRPgFuzBmmmokBCA53Tl\nvjwfwgZ5mXLrx+qubeP5slTsw15fs6qsBEj4/6zJr+1i1qGt48EX17z1Ky6W48vu\nVXpG/At5p237TnlbRodVllBMuT+x3Snz2BO0FB0DZaFvQdP4ePyYiMLcMp9ystAb\ny/N5u6rv9QG2lDvvWGPTHXWTzV3YfP79rZX6lBV/qSFsshjDkEsBHTYWbVMYnqyh\nsoSPIck0K2Ir9lGWZMKJV1XgldhLrUsFrkS7i6mqwfiIsMc/7LuqwWjGlRwKWRTz\n15hIX/0fB+pmOQJpsACwjW71Zst8UVh8/xG92nQ/pgHeBrXZ2R2PJNzt1L07rJja\nIQIDAQAB\n-----END PUBLIC KEY-----',NULL,'-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEnqB4LVWZ59Y/aZzktYKweirdOP8M\nyi8/9NxEGZ9aX2oobjIu50cdViT8paP5cJMzfqRcdEXHp19Dtrq1fWLQ+g==\n-----END PUBLIC KEY-----');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `uss_messages`
--

DROP TABLE IF EXISTS `uss_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uss_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uss_session_id` int NOT NULL,
  `sender` varchar(255) NOT NULL,
  `receiver` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `msg_no` bigint DEFAULT NULL,
  `signature` text,
  `verified` tinyint(1) DEFAULT '0',
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session` (`uss_session_id`),
  KEY `idx_users` (`sender`,`receiver`),
  KEY `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `uss_messages`
--

LOCK TABLES `uss_messages` WRITE;
/*!40000 ALTER TABLE `uss_messages` DISABLE KEYS */;
INSERT INTO `uss_messages` VALUES (1,2,'nike','hp','S4o785vanDuEJPfVoqqP+4e7cZJkpGXB2VURomEhGCdb',1764349326130,'Z32YnltO9rBiMnCSi+fxm0dJmDxtIt03WPVcHEBWKuNQzI3toDeIBCm19fRK2o6uXqR9yoOHPSDHQDwcCGjscw==',1,'2025-11-28 22:32:06'),(2,2,'hp','nike','Y9EP6bg9h6ZNSbJWCqAKfJGnoBZIIL4kuah2ITwP8XQx',1764349339063,'7HX5QBJ90KZFRhQvGX3ielylZ7mPc+ZDT/yLYdDMPYFI7rirIO4hcYiNgHsH1tWE7A9XOdHoUXSpFdrv8VZw2g==',1,'2025-11-28 22:32:19'),(3,2,'nike','hp','UhboLCUKM7YOmM/rCB8Kdnc0rcTc1YF2flLk73ifGZ+RBw==',1764349346682,'dLNknZncOFt7xMSNXbXkRASW/yOAtRPlzRLXo/pbSyO/mE9nhsbIOyyIFbW8X4qhmyNk3KRXshZlcZfF6mVchA==',1,'2025-11-28 22:32:26'),(4,2,'hp','nike','P5hLy2sukaI5N3gRxb7+a4kLP2ph11jS5L37n/o0uzkmKXw=',1764349350843,'Qz4jEMpVZuwiTxULeV1Zdts+SXWsqzL+rXUiyWYFIrJ9ZVX7ysOV2wPLtQ/BXD2nfWa0rK3kA91+/LzkSoJz2Q==',1,'2025-11-28 22:32:30'),(5,3,'nike','hp','5Ai/dLXBiHhacCimu0YgJJCgnz+rArAaOCXNeHhEvg==',1764350030098,'ZAKHb6hjm9PF8+fOWiSMeNOhJsZaKvJTUi7ffWGSAnF+cHDM8zopJ3g1C44zXKm9cEows4mfPqxlvVlB9ItcMQ==',1,'2025-11-28 22:43:50'),(6,3,'hp','nike','JpBfXmVfx1KFJuDAtNXOORyMNHCQY16PimE4zoxk446u',1764350038072,'Za+u3TtLVv0bVhtxjhaq/itOLz+dt4r3SBlCoCoUZPm4Elt7Zr0fCe+vWCEw4npSUX6zx4vGpyNHMvJaQXaBCw==',1,'2025-11-28 22:43:58'),(7,3,'hp','nike','IC63e6IKdsLTNyTWuN/vb6h3RrJIbLblACVPwWPpjw==',1764350040797,'sTWiY7Q+85f7AlgCkd9soKA/klv80cwRG0xChO0ZALgFAfTjn5pLMcnZTk4/IppwQ8ufQZi4HjAo4QkUHxsXoA==',1,'2025-11-28 22:44:00'),(8,3,'nike','hp','BrZX3k+LmWjzMhwntmghdPhEcPStJmAmu19wkKs9LQ==',1764350045492,'Frp/INvqipWUYPHTeQNNSK0aEDC2AEDnkrBFK3Uf/cU0cNvDzRnOdp6V3o4rnQgtGSmSA3wEpi0RM/y5TAmApw==',1,'2025-11-28 22:44:05');
/*!40000 ALTER TABLE `uss_messages` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-26 23:12:28
