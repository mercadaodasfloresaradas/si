const dbFoldersIntegrity = {};

dbFoldersIntegrity.scheme = {};

dbFoldersIntegrity.init = async (dbManager, finishAppSetup) =>{
    dbFoldersIntegrity.setupScheme();
    const rootAllFiles = await dbFoldersIntegrity.processScheme(dbManager, dbFoldersIntegrity.scheme, "");
    dbFoldersIntegrity.registerNativeAppCheckFile(dbManager, rootAllFiles);

    finishAppSetup();
}

dbFoldersIntegrity.setupScheme = () =>{
    dbFoldersIntegrity.scheme = {
        purchases: {
            dir: process.env.PURCHASES_ROUTE,
            checked: false,
            inner: {
                new:{
                    dir: process.env.NEW_PURCHASES_ROUTE,
                    checked: false
                },
                final:{
                    dir: process.env.FINALIZED_ROUTE,
                    checked: false
                },
                old:{
                    dir: process.env.OLD_ROUTE,
                    checked: false
                },
            }
        },
        products: {
            dir: process.env.PRODUCTS_ROUTE,
            checked: false,
            inner: {
                sale:{
                    dir: process.env.SALE_ROUTE,
                    checked: false
                },
                out:{
                    dir: process.env.OUT_OF_SALE_ROUTE,
                    checked: false
                },
            }
        },
        configs: {
            dir: process.env.CONFIGS_ROUTE,
            checked: false
        }
    };
}

dbFoldersIntegrity.processScheme = async (dbManager, scheme, folderTree, firstAllFiles = [])=>{
  
    let allFiles=[];
    
    let result = await dbManager.readFilesPath(folderTree);

    allFiles = (result && result.files)? result.files : [];

    if(firstAllFiles.length == 0){
        firstAllFiles = allFiles;
    }

    for(const route in scheme){
        let hasFolder = allFiles.includes(scheme[route].dir.replace("/", ""));
        let folderIndex = allFiles.indexOf(scheme[route].dir.replace("/", ""))
        if(!hasFolder){
            dbManager.createFolder(folderTree, scheme[route].dir.replace("/", ""));
            console.log("Created folder:",scheme[route].dir);
        }
        scheme[route].checked = true;

        allFiles = (hasFolder) ? allFiles.filter((ele, index) => index != folderIndex) : allFiles;
        
        if(scheme[route].inner){
           dbFoldersIntegrity.processScheme(dbManager, scheme[route].inner, folderTree + scheme[route].dir, firstAllFiles);
        }
    }

    allFiles.forEach((element)=>{
        if(dbManager.checkIfFolder(folderTree + element)){
            dbManager.deleteFolder(folderTree + element);
            console.log("Deleted folder:", folderTree + element);
        }
    });

    return firstAllFiles;

}

dbFoldersIntegrity.registerNativeAppCheckFile = async (dbManager, allFiles) =>{
    let hasFindFile = false;
    
    allFiles.forEach((element)=>{
        if(element == process.env.NATIVE_APP_FILE_REGISTER){
            hasFindFile = true;
        }
    });

    if(!hasFindFile){
        console.log("Created register file...");
        dbManager.writeFile("", process.env.NATIVE_APP_FILE_REGISTER, {codes:[]});
    }

}


export default dbFoldersIntegrity;