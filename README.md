# Overview

### NOTE: This program is a WORK IN PROGRESS and is NOT in an MVP state yet.

### Project Goal
The program is designed to be able to assist with admin functionality in plex. This initial goal is to allow a better way to manage recording Live TV content from a TV antenna. Currently it is very cumbersome to navigate through Movies & TV shows on a daily or weekly basis only to find the handful of items that should be recorded. The primary objective is to improve that, with future goals being: email lists of new upcoming content, allow reordering DVR priority (difficult when you have many items), verifying content is being recorded properly (detecting any silent bugs from Plex), and possibly predicting what content you like.

### Why Not Use Plex API?
The plex api was not used for a couple of reasons:
1. The plex api does not give the functionality needed to manage the Live TV data, it only gives reporting information about the data you already have (aka, can not be used for monitoring upcoming content).
2. The plex api has terrible documentation. While there are some useful features, the documentation is terrible and the functionality is limited.

### Universal Startup Steps
1. Popuplate .env file (sample file provided)

#### Local Startup Steps
1. run "npm i"
2. run "npm run start:dev".

#### Deploy Startup Steps (Docker)
1. run "docker compose build"
2. run "docker compose up".
