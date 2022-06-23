Overview

The program is designed to be able to assist with admin functionality in plex. This initial goal is to allow a better way to manage recording Live TV content from a TV antenna. Currently it is very cumbersome to navigate through Movies & TV shows on a daily or weekly basis only to find the handful that should be recorded. The primary objective is to improve that, with future goals being run via docker in unraid, email lists of new upcoming content, allow reordering DVR priority (difficult when you have many items), verifying content is being recorded properly (detecting any silent bugs), and possibly predicting what content you like.

Universal Startup Steps
1. Popuplate .env file (sample file provided)

Local Startup Steps
1. run "npm i"
2. run "npm run start:dev".

Deploy Startup Steps (Docker)
1. run "docker compose build"
2. run "docker compose up".