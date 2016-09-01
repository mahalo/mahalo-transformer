import {statSync, readFileSync} from 'fs';
import {join, resolve, dirname} from 'path';

export default function moduleExists(context, moduleName, extension) {
    if (/^([.\/]|[a-z]:\\)/i.test(moduleName)) {
        return load(resolve(context, moduleName), extension);
    }
    
    return loadNodeModule(context, moduleName, extension);
}


//////////


function load(moduleName, extension) {
    return isFile(moduleName + extension) || loadDirectory(moduleName, extension);
}

function loadDirectory(moduleName, extension) {
    let main;

    try {
        main = JSON.parse(readFileSync(join(moduleName, 'package.json')).toString()).main;
        
        if (main && load(resolve(moduleName, main), extension)) {
            return true;
        }
    } catch(e) {}

    return isFile(join(moduleName, 'index' + extension));
}

function loadNodeModule(context, moduleName, extension) {
    let directory = join(context, 'node_modules');

    while (directory) {
        if (load(join(directory, moduleName), extension)) {
            return true;
        }
        
        if (directory === 'node_modules') {
            break;
        }

        directory = join(dirname(dirname(directory)), 'node_modules');
    }
}

function isFile(fileName) {
    try {
        let stat = statSync(fileName);

        return stat.isFile();
    } catch (e) {}

    return false;
}