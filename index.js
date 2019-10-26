const express = require('express')
const app = express()
const port = process.env.PORT || 3000;

// We set up a webserver only to make heroku happy
app.all('/', (req, res) => res.send('Hello World!'));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

const simpleGit = require('simple-git')();
const fs = require("fs");
const localDumpPath = "./dumps";
const data_url = "https://store.steampowered.com/api/appdetails/?appids=";
const git_dumps_url = "https://github.com/PaulCombal/SteamAppsListDumps.git";
const all_apps_list = "https://api.steampowered.com/ISteamApps/GetAppList/v2/"
let promise = null;

if (fs.existsSync(localDumpPath)) {
    process.chdir(localDumpPath);
    promise = simpleGit.pull('origin', 'master');
}
else {
    promise = simpleGit
        .clone(git_dumps_url, localDumpPath)
        .exec(() => process.chdir(localDumpPath));
}

promise.exec(() => {
    const number_simultaneous_process = 10;

    // const list = await fetch(all_apps_list);
    const list = {"applist":{"apps":[{"appid":216938,"name":"Pieterw test app76 ( 216938 )"},{"appid":660010,"name":"test2"},{"appid":660130,"name":"test3"},{"appid":397950,"name":"Clustertruck"},{"appid":397960,"name":"Mystery Expedition: Prisoners of Ice"},{"appid":397970,"name":"Abandoned: Chestnut Lodge Asylum"},{"appid":397980,"name":"Invasion"},{"appid":397990,"name":"Woof Blaster"},{"appid":398000,"name":"Little Big Adventure 2"},{"appid":398020,"name":"Colony Assault"},{"appid":398070,"name":"Protoshift"}]}};

    const arranged_list = {
        applist: {
            apps: []
        }
    };

    // Let's not query too fast and wait for the previous request to finish, better safe than sorry, and performance isn't an issue
    const process_next = (from, quantity) => {
        const apps = list.applist.apps.slice(from, from + quantity);
        const ids = apps.map(a => a.appid).join(',');

        if (apps.length == 0)
            return;

        const data = await fetch(data_url + ids);
        apps.forEach((app) => {
            arranged_list.applist.apps.push({
                appid: app.appid,
                name: app.name,
                type: data[app.appid].success ? data[app.appid].data.type : "junk"
            })
        });

        process_next(from + number_simultaneous_process, number_simultaneous_process);
    };

    process_next(0, number_simultaneous_process);

    fs.writeFileSync()
});


setInterval(() => {
    console.log("good morning");
}, 1000 * 60 * 60 * 24)