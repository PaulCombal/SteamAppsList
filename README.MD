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

When using the `HARD_UPDATE` flag, you can safely stop and resume the dump without losing progress. To restart the `HARD_UPDATE` manually, you need to clear the `./dumps` folder and delete `previous_run.lock`.

### Environment Variables
Use the environment variable `WEBSERVER=true` to run a webserver with that, bound on port PORT or by default 3000.
The webserver will start indexing everytime you visit it. Only one job at at time.

Use `NO_PUSH=TRUE` if you don't want to commit & push the results.

Use `HARD_UPDATE=TRUE` to update existing games with 'null' achievements, instead of just pulling new entries. **This will take many hours due to the volume of requests.**

### Validation

Run `diff_dumps.js` and observe the output (you may want to `tee` or pipe to a file). A dump is valid if:
1. No previous integer entries have been overwritten (e.g. achievement amount becomes null, games become junk, etc)
1. No previous integer entries were removed (this implies something has gone wrong with the `index.js` script)
1. No other spurious behavior is observed

## LICENSE

All the files under this repo are free and open-source, and should always be distributed as such,
free meaning both costless and open.
You may not copyright this work as your own.
