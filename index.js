const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.all('/', (req, res) => {
    if (is_processing) {
        res.send('Job in progress')
    } else {
        res.send('Starting jobs..');
        main();
    }
});

if (process.env.WEBSERVER)
    app.listen(port, () => console.log(`Example app listening on port ${port}!`));

const git_credentials = require('./git_credentials.json');
const fetch = require('node-fetch');
const run = require('child_process').execSync;
const fs = require('fs');
const refresh_rate = 1000 * 60 * 60 * 24;
const local_dump_path = './dumps';
const local_dump_name = './app_list.json';
const local_dump_name_not_games = './not_games.json';
const local_dump_name_games = './game_list.json';
const local_dump_name_games_achievements = './game_achievements_list.json';
const data_url = 'https://store.steampowered.com/api/appdetails/?filters=basic,achievements&appids=';
const git_dumps_url = 'https://' + (git_credentials.login || process.env.GITUSERNAME) + ':' + (git_credentials.password || process.env.GITPASSWORD) + '@github.com/PaulCombal/SteamAppsListDumps.git';
const all_apps_list_endpoint = "https://api.steampowered.com/ISteamApps/GetAppList/v2/";
const startDir = process.cwd();
const is_dev = !process.env.PORT;
let is_processing = false;

function millisToDiffStr(millis) {
    let seconds = millis / 1000;
    const hours = Math.floor(seconds / 3600); // 3,600 seconds in 1 hour
    seconds = seconds % 3600; // seconds remaining after extracting hours
    const minutes = Math.floor(seconds / 60); // 60 seconds in 1 minute
    seconds = Math.floor(seconds % 60);

    return hours + 'h ' + minutes + 'm ' + seconds + 's';
}

function timeOutPromise(millis) {
    return new Promise((resolve) => {
        setTimeout(resolve, millis);
    })
}


async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

function saveList(list) {
    console.log("Saving list..");
    console.log("Sorting..");

    fs.writeFileSync(local_dump_name, JSON.stringify(list));

    list.applist.apps.sort((a, b) => {
        if (a.appid < b.appid) return -1;
        return 1;
    });

    console.log("Filtering..");

    const not_games_list = {
        applist: {
            apps: list.applist.apps.filter(app => app.type !== 'game').map(app => ({appid: app.appid, name: app.name}))
        }
    };
    fs.writeFileSync(local_dump_name_not_games, JSON.stringify(not_games_list));
    not_games_list.applist.apps = null; // free

    const games_only = {
        applist: {
            apps: list.applist.apps.filter(app => app.type === 'game').map(app => ({appid: app.appid, name: app.name}))
        }
    };
    fs.writeFileSync(local_dump_name_games, JSON.stringify(games_only));
    games_only.applist.apps = null; // free

    const achievements_only = {
        applist: {
            apps: list.applist.apps.filter(app => app.type === 'game' && app.achievements > 0).map(app => ({
                appid: app.appid,
                name: app.name
            }))
        }
    };
    fs.writeFileSync(local_dump_name_games_achievements, JSON.stringify(achievements_only));
    achievements_only.applist.apps = null; // free
}

function generateList(exclude_list = []) {
    return new Promise(async (resolve) => {
        const number_simultaneous_process = 1; // For now we query them 1 by 1, let's see of they fix their API

        //const all_apps_list = {"applist":{"apps":[{"appid":216938,"name":"Pieterw test app76 ( 216938 )"},{"appid":660010,"name":"test2"},{"appid":660130,"name":"test3"},{"appid":397950,"name":"Clustertruck"},{"appid":397960,"name":"Mystery Expedition: Prisoners of Ice"},{"appid":397970,"name":"Abandoned: Chestnut Lodge Asylum"},{"appid":397980,"name":"Invasion"},{"appid":397990,"name":"Woof Blaster"},{"appid":398000,"name":"Little Big Adventure 2"},{"appid":398020,"name":"Colony Assault"},{"appid":398070,"name":"Protoshift"}]}};
        const all_apps_list = await fetch(all_apps_list_endpoint).then(r => r.json());
        const known_app_ids = exclude_list.map(app => app.appid);
        const apps_to_process = all_apps_list.applist.apps.filter(app => !known_app_ids.includes(app.appid));
        const arranged_list = {
            applist: {
                apps: exclude_list
            }
        };

        const app_batches = [];
        for (let index = 0; index < apps_to_process.length; index += number_simultaneous_process) {
            app_batches.push(apps_to_process.slice(index, index + number_simultaneous_process));
        }

        const batches_count = app_batches.length;
        const start_date = new Date();

        console.log('Starting list generation for ' + apps_to_process.length + ' out of ' + all_apps_list.applist.apps.length + ' Steam apps.');

        // Let's not query too fast and wait for the previous request to finish, we can get codes 429 too many requests
        await asyncForEach(app_batches, async (batch, index) => {
            const now = new Date();
            const ids = batch.map(a => a.appid).join(',');

            console.log('Starting batch ' + index + ' of ' + batches_count + ' - ' + Math.round(100 * index / batches_count) + '%');
            console.log('Processing appids: ' + ids + ' - Estimated time needed: ' + millisToDiffStr((now - start_date) / (index / batches_count)));
            console.log('ETA: ' + millisToDiffStr(((now - start_date) / (index / batches_count) - (now - start_date))));
            console.log('------------------');

            let response = await fetch(data_url + ids);
            while (!response.ok) {
                console.warn('Batch failed, we have to take a break and retry. Code: ' + response.status);
                console.warn('Url: ', data_url + ids);
                let timeout = 1000 * 60 * 2; // Too many requests, any random error, wait 2 minutes
                if (response.status === 502) { // Bad getaway, sometimes occur randomly
                    timeout = 1000;
                }
                await timeOutPromise(timeout);
                response = await fetch(data_url + ids);
            }

            const data = await response.json();
            batch.forEach((app) => {
                let achievements = null;
                if (data[app.appid].success && data[app.appid].data.achievements) { // Some apps don't have the key for some reason, eg Dota 2, 570
                    achievements = data[app.appid].data.achievements.total;
                }

                arranged_list.applist.apps.push({
                    appid: app.appid,
                    name: app.name,
                    type: data[app.appid].success ? data[app.appid].data.type : "junk",
                    achievements
                });
            });
        });

        resolve(arranged_list);
    });
}

function isOldList() {
    if (is_dev) {
        return true;
    }

    try {
        const out = run('git log -n 1 --pretty=format:%ad').toString();
        const lastDate = new Date(out);
        const now = new Date();
        const millis = now - lastDate;
        return millis > refresh_rate;
    } catch (e) {
        console.warn('An error occurred ensuring old list');
        console.log(e);
    }
    return false;
}

async function fullUpdate() {
    if (is_processing) {
        console.warn('Could not start because a job is already in progress');
        return;
    }
    is_processing = true;
    console.log('Working directory: ', process.cwd());
    let exclude_list = [];

    if (fs.existsSync(local_dump_path)) {
        process.chdir(local_dump_path);
        run('git pull origin master');
    } else {
        run('git clone ' + git_dumps_url + ' ' + local_dump_path);
        process.chdir(local_dump_path);
    }

    if (!isOldList()) {
        console.log('The list isn\'t old enough to be refreshed');
        return;
    }

    if (fs.existsSync(local_dump_name)) {
        exclude_list = JSON.parse(fs.readFileSync(local_dump_name).toString()).applist.apps;
    }

    const list = await generateList(exclude_list);
    saveList(list);
    printCoolStats(list);

    if (process.env.NO_PUSH !== 'TRUE') {
        console.log('Pushing new data to repo..');
        run('git add -A');
        run('git commit -m "Auto commit"');
        run('git push origin master');
    }


    console.log('Finished.');
    process.chdir(startDir);
    is_processing = false;
}

function printCoolStats(list) {
    const counts = {};
    list.applist.apps.map(app => app.type).forEach(type => counts[type] = (counts[type] || 0) + 1);
    const total_apps = list.applist.apps.length;
    const total_achievements = list.applist.apps.filter(app => app.achievements > 0).length;

    console.log('Count by app type: \n', counts);
    console.log('Total apps: ', total_apps);
    console.log('Apps with achievements: ', total_achievements);
}

async function main() {
    console.log('Starting with following environment: ', process.env);
    await fullUpdate();
}

main();
