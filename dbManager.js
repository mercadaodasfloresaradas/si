const dbManager = {};

import path from 'path';
import fs from 'fs';

dbManager.dbRoute = "";

dbManager.init = () =>{
  dbManager.dbRoute = process.env.DB_ROUTE; 
}

dbManager.writeFile = (route, file, data) => {
    let dataToSend = "";
    let isDataString = (typeof data === "string");
    if((!isDataString && typeof data !== "object")  ||
            dbManager.checkRouteVars(route, file)){
      return false;  
    }
    
    if(isDataString){
        dataToSend = data;
    }else{
        dataToSend = JSON.stringify(data, null, 2);
    }

    try{
        fs.writeFileSync(dbManager.dbRoute + route + file, dataToSend);
        return true;
    }catch(e){
        console.error(e);
        return false;
    }
}

dbManager.readFile = (route, file, isToParse = false) => {
    return new Promise((resolve, reject) => {
        if(dbManager.checkRouteVars(route, file)){
            return reject(false);  
        }
            
        fs.readFile(dbManager.dbRoute + route + file , (err, data) => {
            if (err){
                console.error(err);
                reject(err);
            }else{
                resolve(isToParse ? JSON.parse(data) : data);
            }
            
        });
    });
    
}

dbManager.removeFile = (route, file)=>{
    try {
        fs.unlinkSync(dbManager.dbRoute + route + file)
        console.log("Removed: ", file);
        return true;
      } catch(err) {
        console.error(err)
        return false;
      }
}

dbManager.readFilesPath = (route) => {
    return new Promise((resolve, reject) => {
        if(typeof route !== "string"){
            return reject(false);
        }
        
    
        fs.readdir(dbManager.dbRoute + route, (err, files)=>{
            if(err){
                console.error(err);
                reject({result: false, error: err});
            }else{
                resolve({result: true, files, route});
            }
        });
    });
}

dbManager.deleteFolder = (route) => {
    try{
        fs.rmSync(dbManager.dbRoute + route, { recursive: true, force: true });
        console.log("Deleted Folder: ", dbManager.dbRoute + route);
        return true;
    }catch(err){
        console.error(err);
        return false;
    }
}

dbManager.createFolder = (route, newFolder) =>{
    if(dbManager.checkRouteVars(route, newFolder)){
        return false;
    }

    fs.mkdirSync(dbManager.dbRoute + route + newFolder, {recursive: true});
    return true;
}

dbManager.checkIfFolder = (route) => {
    if(typeof route !== "string"){
            return false;
    }

    try{
        return fs.lstatSync(dbManager.dbRoute + route).isDirectory(); 
    }catch(err){
        console.error(err);
        return false;
    }
}

//does not work
dbManager.folderExists = async(route) => {
    if(typeof route !== "string"){
            return false;
    }

    try{
        await fs.access(dbManager.dbRoute + route);
        return true;
    }catch{
        return false;
    }
}

dbManager.checkIfFileExists = (route) => {
    if(typeof route !== "string"){
            return false;
    }

    try{
        return fs.existsSync(dbManager.dbRoute + route); 
    }catch(err){
        console.error(err);
        return false;
    }
}

dbManager.checkRouteVars = (route, file) => {
    return typeof file !== "string" ||
            typeof route !== "string";
}

dbManager.moveFile = (oldRoute, newRoute) => {
    return new Promise((resolve, reject) => {

        if(dbManager.checkRouteVars(oldRoute, newRoute)){
            reject(false);
            return;
        }
    
        fs.rename(dbManager.dbRoute + oldRoute, dbManager.dbRoute + newRoute, (err)=>{
            if(err){
                console.error(err);
                reject(false);
                return;
            }
            console.log("Move from: ", oldRoute, " <- to -> ", newRoute);
            resolve(true);
        });

    });

}

dbManager.watchFile = (route, callback) => {
    fs.watchFile(dbManager.dbRoute + route, callback);
}



export default dbManager;