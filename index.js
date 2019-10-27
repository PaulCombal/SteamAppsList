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
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

const git_credentials = require('./git_credentials.json');
const fetch = require('node-fetch');
const run = require('child_process').execSync;
const fs = require('fs');
const PS = require('promise-stack');
const promise_stack = new PS();
const refresh_rate = 1000 * 60 * 60 * 24;
const local_dump_path = './dumps';
const local_dump_name = './app_list.json';
const data_url = 'https://store.steampowered.com/api/appdetails/?filters=basic&appids=';
const git_dumps_url = 'https://' + (git_credentials.login || process.env.GITUSERNAME) + ':' + (git_credentials.password || process.env.GITPASSWORD) + '@github.com/PaulCombal/SteamAppsListDumps.git';
const all_apps_list = "https://api.steampowered.com/ISteamApps/GetAppList/v2/";
const startDir = process.cwd();
const is_dev = !process.env.PORT;
let is_processing = false;


function generateList() {
    return new Promise(async (resolve, reject) => {
        const number_simultaneous_process = 1; // For now we query them 1 by 1, let's see of they fix their API

        const list = await fetch(all_apps_list).then(r => r.json());
        //const list = {"applist":{"apps":[{"appid":216938,"name":"Pieterw test app76 ( 216938 )"},{"appid":660010,"name":"test2"},{"appid":660130,"name":"test3"},{"appid":397950,"name":"Clustertruck"},{"appid":397960,"name":"Mystery Expedition: Prisoners of Ice"},{"appid":397970,"name":"Abandoned: Chestnut Lodge Asylum"},{"appid":397980,"name":"Invasion"},{"appid":397990,"name":"Woof Blaster"},{"appid":398000,"name":"Little Big Adventure 2"},{"appid":398020,"name":"Colony Assault"},{"appid":398070,"name":"Protoshift"}]}};

        let processed = 0;
        const apps_count = list.applist.apps.length;

        const arranged_list = {
            applist: {
                apps: []
            }
        };

        const app_batches = [];
        for (let index = 0; index < apps_count; index += number_simultaneous_process) {
            app_batches.push(list.applist.apps.slice(index, index + number_simultaneous_process));
        }

        // Let's not query too fast and wait for the previous request to finish, better safe than sorry, and performance isn't an issue
        app_batches.forEach((batch) => {
            const ids = batch.map(a => a.appid).join(',');
            const promise = () => {
                return new Promise((resolve, reject) => {
                    fetch(data_url + ids)
                        .then(r => r.json())
                        .then((data) => {
                            batch.forEach((app) => {
                                arranged_list.applist.apps.push({
                                    appid: app.appid,
                                    name: app.name,
                                    type: data[app.appid].success ? data[app.appid].data.type : "junk"
                                })
                            });
                            processed += number_simultaneous_process;
                            console.log('fetched ' + processed + ' / ' + apps_count);
                            resolve();
                        })
                        .catch(reject)
                    ;
                })
            };

            promise_stack.set(promise);
        });

        promise_stack.on('empty', () => {
            console.log('Download finished');
            resolve(arranged_list);
        })
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

    if (fs.existsSync(local_dump_path)) {
        process.chdir(local_dump_path);
        try {
            run('git pull origin master');
        } catch (e) {
            console.warn('Could not git pull');
            console.log(e);
            return;
        }
    }
    else {
        try {
            run('git clone ' + git_dumps_url + ' ' + local_dump_path);
            process.chdir(local_dump_path);
        }
        catch (e) {
            console.warn('Unable to clone dumps repo.');
            console.log(e);
            return;
        }
    }

    if(!isOldList()) {
        console.log('The list isn\'t old enough to be refreshed');
        return;
    }

    try {
        const list = await generateList();
        fs.writeFileSync(local_dump_name, JSON.stringify(list));
    } catch (e) {
        console.warn('An error occurred generating list');
        console.log(e);
        return;
    }

    try {
        run('git add ' + local_dump_name);
        run('git commit -m "Auto commit"');
        run('git push origin master');
    } catch (e) {
        console.log('An error occurred pushing the new list');
        console.log(e);
    }
}

async function main() {
    await fullUpdate();
    process.chdir(startDir);
    is_processing = false;
}

main();
