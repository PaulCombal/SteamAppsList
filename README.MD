SteamAppsList
===

## Introduction

this tool generates the list of all the apps on the Steam store, and commits them to another repo.
It's only used by me, but if you need it feel free to ask questions and make pull requests.

## Usage

Fill in the right credentials in `git_credentials.json` BEFORE launching this even ONCE.
You can also use the environment variables `GITUSERNAME` and `GITPASSWORD`.
Or just delete the cloned repo and retry.
This is used to push the commit for the dumps repo.

Use the environment variable `WEBSERVER=true` to run a webserver with that, bound on port PORT or by default 3000.
The webserver will start indexing everytime you visit it. Only one job at at time.

Use `NO_PUSH=TRUE` if you don't want to commit & push the results

## LICENSE

All the files under this repo are free and open-source, and should always be distributed as such,
free meaning both costless and open.
You may not copyright this work as your own.
