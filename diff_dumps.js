const fs = require('fs');
const run = require('child_process').execSync;

const local_dump_path = "./dumps/app_list.json"
const old_dump_dir = "./validation"
const old_dump_path = "./validation/app_list.json"
const master = "https://raw.githubusercontent.com/PaulCombal/SteamAppsListDumps/refs/heads/master/app_list.json"

function diffDumps(){
    console.log("Comparing dumps")
    old_dump_string = fs.readFileSync(old_dump_path, encoding='UTF-8');
    old_dump = JSON.parse(old_dump_string);
    new_dump_string = fs.readFileSync(local_dump_path, encoding='UTF-8');
    new_dump = JSON.parse(new_dump_string);
    for (i = 0; i < old_dump.applist.apps.length; i++){
        match = null;
        for (j = 0; j < new_dump.applist.apps.length; j++){
            // Find the entry in the new dump with the same appid
            if (new_dump.applist.apps[j].appid == old_dump.applist.apps[i].appid){
                match = j;
                break;
            }
        }
        if (match != null){
            if (new_dump.applist.apps[match].achievements != old_dump.applist.apps[i].achievements){
                if(old_dump.applist.apps[i].achievements != null && new_dump.applist.apps[i].achievements == null)
                {
                    console.error(`${old_dump.applist.apps[i].name}: ${old_dump.applist.apps[i].achievements} => ${new_dump.applist.apps[match].achievements}`);
                } else {
                    console.log(`${old_dump.applist.apps[i].name}: ${old_dump.applist.apps[i].achievements} => ${new_dump.applist.apps[match].achievements}`);
                }
                new_dump.applist.apps.splice(match, 1); // Remove the entry from the list
            }
        } else {
            if(old_dump.applist.apps[i].achievements != null)
            {
                console.error(`${old_dump.applist.apps[i].name}: ${old_dump.applist.apps[i].achievements} => Removed`)
            } else {
                console.log(`${old_dump.applist.apps[i].name}: ${old_dump.applist.apps[i].achievements} => Removed`)
            }
        }
    }
    if(new_dump.applist.apps.length > 0){
        for (j = 0; j < new_dump.applist.apps.length; j++){
            // console.log(`${new_dump.applist.apps[j].name}: New entry => ${new_dump.applist.apps[match].achievements}`);
        }
    }
}

function getOldDump(){
    console.log("Checking for previous dump");
    if(!fs.existsSync(old_dump_path)){
        console.log(`Previous dump not found, downloading from master (${master})`);
        if (!fs.existsSync(old_dump_dir)) fs.mkdirSync(old_dump_dir);
        wd = process.cwd();
        process.chdir(old_dump_dir);
        run(`curl -o app_list.json ${master}`);
        process.chdir(wd);
    } else {
        console.log(`Found previous dump at ${old_dump_path}`);
    }
}

getOldDump();
diffDumps();