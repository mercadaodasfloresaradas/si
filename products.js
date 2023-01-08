const products = {};

products.init = (app, dbManager, productsCS) => {
    if(process.isSeller){
        products.buildRequests(app, dbManager, productsCS);
    }
}

products.buildRequests = (app, dbManager, productsCS) => {


    /**
    {
        "code":"",
        "id": "",
        "name": "",
        "price": 1 ,
        "description": "",
        "category": ""
    }
     */

    app.post('/products/new', async(req, res)=> {
        const result = JSON.parse(req.body || {id: "", name: "", price: 0, description: "", category: ""});
        const expectedKeys = ["code", "id", "name", "price", "description", "category"];
        const hasCode = await process.checkCode(result.code);
        
        console.log('/products/new', result);

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else if(!result.id.includes(" ") &&
                    !result.id.includes(".") &&
                    !result.id.includes("\\") && 
                    !result.id.includes("/") &&
                    !result.id.includes("_Photo")){

            let category = result.category || "";
            console.log(category,' ' ,typeof category, process.version);
            category = category.replaceAll(".", "").replaceAll("/", "").replaceAll("\\", "");

            const outPath = process.env.PRODUCTS_ROUTE + process.env.OUT_OF_SALE_ROUTE + "/" + category;
            const fullPath = process.env.PRODUCTS_ROUTE + process.env.SALE_ROUTE + category;
            let newFile = result.id + ".json";
            let finalResultID = result.id;
        
            if(category != ""){
                if(!dbManager.checkIfFolder(fullPath)){
                    productsCS.createNewCategory(category, dbManager);
                }

                let hasFoundFile = true;
                let tentativeName = "";
                let iterator = 0; 
                while(hasFoundFile){
                   hasFoundFile = dbManager.checkIfFileExists(fullPath + "/" + finalResultID + tentativeName + ".json") ||
                                    dbManager.checkIfFileExists(outPath + "/" + finalResultID + tentativeName + ".json");

                   if(hasFoundFile){
                        iterator++;
                        tentativeName = "_" + iterator;
                   }else{
                        finalResultID = finalResultID + tentativeName;
                        result.id = finalResultID;
                   }
                }

                try{
                    delete result.code;
                    dbManager.writeFile(fullPath + "/", finalResultID + ".json", result);
                    console.log("Created new file: ", finalResultID, "\nWith:", result);
                    res.send({success: "Saved with ID: " + finalResultID, id: finalResultID, category});
                }catch(err){
                    console.log(err);
                    res.send({error: "Error saving product!"});
                }

            }else{
                res.send({error: "Parameter with wrong value!"});
            }

        }else{
            res.send({error: "Parameter with wrong value!"});
        }
    });


    /**
    {
        "code":"",
        "id": "",
        "category": "",
        "img64": "",
    }
     */

    app.post('/products/newphoto', async(req, res)=> {
        const result = JSON.parse(req.body || {id: "", category: "", img64: ""});
        const expectedKeys = ["code", "id", "category", "img64"];
        const hasCode = await process.checkCode(result.code);

        console.log('/products/newphoto', {...result, img64: 'data'});

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{
            const path = process.env.PRODUCTS_ROUTE + process.env.SALE_ROUTE + result.category + "/";

            if(dbManager.checkIfFileExists(path + result.id + ".json")){
                try{
                    dbManager.writeFile(path , result.id + "_Photo.json", {img64: result.img64});
                    console.log("Created new photo: ", result.id, "_Photo.json");
                    res.send({success: "Saved Photo: " + result.id});
                }catch(err){
                    console.log(err);
                    res.send({error: "Error saving photo!"});
                }
            }else{
                res.send({error: "Product does not exist!"});
            }
        }
    });


    /**
    {
        "code":"",
        "id": "",
        "category": "",
        "isOnSale": true
    }
     */
    app.patch('/products/changestate', async (req, res)=> { 
        const result = JSON.parse(req.body || {id: "", category: "", isOnSale: true});
        const expectedKeys = ["code", "id", "category", "isOnSale"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{
            const path = process.env.PRODUCTS_ROUTE + process.env.SALE_ROUTE + result.category + "/";
            const outPathBase = process.env.PRODUCTS_ROUTE + process.env.OUT_OF_SALE_ROUTE + "/" ;
            const outPath = outPathBase + result.category + "/";

            if((dbManager.checkIfFileExists(path + result.id + ".json") && !result.isOnSale) || 
                (dbManager.checkIfFileExists(outPath + result.id + ".json") && result.isOnSale)){
                
                let newPath = (result.isOnSale) ? (path + result.id + ".json") : (outPath + result.id + ".json");
                const newPathBase = (result.isOnSale) ? path : outPath;
                let oldPath = (result.isOnSale) ? (outPath + result.id + ".json") : (path + result.id + ".json");
                const oldPathBase = (result.isOnSale) ? outPath: path;

                if(!dbManager.checkIfFolder(newPathBase) && !result.isOnSale){
                    
                    dbManager.createFolder(outPathBase, result.category);
                }else if(!dbManager.checkIfFolder(newPathBase) && result.isOnSale){
                    
                    productsCS.createNewCategory(result.category, dbManager);
                }
                
               const hasMoved = await dbManager.moveFile(oldPath, newPath);

               if((dbManager.checkIfFileExists(path + result.id + "_Photo.json") && !result.isOnSale) || 
                (dbManager.checkIfFileExists(outPath + result.id + "_Photo.json") && result.isOnSale)){
                     newPath = (result.isOnSale) ? (path + result.id + "_Photo.json") : (outPath + result.id + "_Photo.json");
                     oldPath = (result.isOnSale) ? (outPath + result.id + "_Photo.json") : (path + result.id + "_Photo.json");

                     await dbManager.moveFile(oldPath, newPath);
                }
               
               if(hasMoved){
                    const data = await dbManager.readFilesPath(oldPathBase);

                    console.log(data, data.files);
                    if(data.files.length == 0){
                        dbManager.deleteFolder(oldPathBase);
                        productsCS.storeInMemoryData(dbManager);
                        console.log("Deleted folder: ", oldPathBase);
                    }

                    res.send({success: "Has changed state!"});
               }else{
                    res.send({error: "Has not changed state!"});
               }

            }else{
                res.send({error: "Product does not exist!"});
            }
        }
    });


    /**
    {
        "code":""
    }
     */
    app.post('/products/outofsale', async (req, res)=> {
        const result = JSON.parse(req.body || {});
        const expectedKeys = ["code"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode) {
            res.send({error: "Data structure not compactible!"});
        }else{
            const path = process.env.PRODUCTS_ROUTE + process.env.OUT_OF_SALE_ROUTE;
            const filesDir = await dbManager.readFilesPath(path);
            let files = [];

            for(let file of filesDir.files){
                const filePath = path + "/" + file;
                if(dbManager.checkIfFolder(filePath)){
                    const inDirFiles = await dbManager.readFilesPath(filePath);
                    
                    for(let fileInDir of inDirFiles.files){
                        if(fileInDir.indexOf("json") != -1 && fileInDir.indexOf("_Photo") == -1){
                            const product = await dbManager.readFile(filePath + "/", fileInDir, true);
                            files.push(product);
                        }
                    }
                }
            }

            res.send({products: files});

        }

    });


    /**
    {
        "code":"",
        "id": "",
        "category": ""
    }
     */
    app.delete('/products/remove', async (req, res)=> {
        const result = JSON.parse(req.body || {id: "", category: ""});
        const expectedKeys = ["code", "id", "category"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode) {
            res.send({error: "Data structure not compactible!"});
        }else{
            const path = process.env.PRODUCTS_ROUTE + process.env.OUT_OF_SALE_ROUTE + "/";
            const catPath = path + result.category + "/";
            const fullPathID = catPath + "/" + result.id;
            let dataFolder;
            let hasDeletedFile = false;


            if(dbManager.checkIfFileExists(fullPathID + ".json")){
                if(dbManager.removeFile(catPath, result.id + ".json")){
                    hasDeletedFile = true;
                }

                if(dbManager.checkIfFileExists(fullPathID + "_Photo.json")){
                    dbManager.removeFile(catPath, result.id + "_Photo.json");
                }

                dataFolder = await dbManager.readFilesPath(catPath);
                
                if(dataFolder && dataFolder.result && dataFolder.files.length == 0){
                    dbManager.deleteFolder(catPath);
                }
                
            }

            if (hasDeletedFile) {
                res.send({success: "Product has been deleted!"})
            }else{
                res.send({error: "Problem in deleting product!"})
            }
        }
    });


    /**
    {
        "code":"",
        "id": "",
        "name": "",
        "price": 1 ,
        "description": "",
        "category": "",
        "isOnSale": true
    }
     */

    app.patch('/products/edit', async(req, res)=> {
        const result = JSON.parse(req.body || {id: "", name: "", price: 0, description: "", category: "", isOnSale: true});
        const expectedKeys = ["code", "id", "name", "price", "description", "category", "isOnSale"];
        const hasCode = await process.checkCode(result.code);

        console.log('/products/edit');
        console.log(result);

        if(process.checkBody(expectedKeys, result) || !hasCode) {
            res.send({error: "Data structure not compactible!"});
        }else{
            const path = process.env.PRODUCTS_ROUTE + (result.isOnSale? process.env.SALE_ROUTE
                                                            : process.env.OUT_OF_SALE_ROUTE) + "/";
            const catPath = path + result.category + "/";
            const fullPathID = catPath + "/" + result.id;
            
            if(dbManager.checkIfFileExists(fullPathID + ".json")){
                delete result.code;
                delete result.isOnSale;
                dbManager.writeFile(catPath + "/", result.id + ".json", result);
                console.log("Edited file: ", result.id, "\nWith:", result);
                res.send({success: "Edit with ID: " + result.id, id: result.id, category: result.category});
            }else{
                res.send({error: "Error editing product!"});
            }
            
        }
    });


     /**
    {
        "code":"",
        "id": "",
        "category": "",
        "img64": "",
        "isOnSale": true,
    }
     */

    app.patch('/products/edit/photo', async(req, res)=> {
        const result = JSON.parse(req.body || {id: "", category: "", img64: ""});
        const expectedKeys = ["code", "id", "category", "img64", "isOnSale"];
        const hasCode = await process.checkCode(result.code);

        console.log('/products/edit/photo', {...result, img64: 'data'});

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{
            const intermidiateRoute = result.isOnSale ? 
                    process.env.SALE_ROUTE : process.env.OUT_OF_SALE_ROUTE + "/";
            const path = process.env.PRODUCTS_ROUTE + intermidiateRoute + result.category + "/";

            if(dbManager.checkIfFileExists(path + result.id + ".json")){
                try{
                    dbManager.writeFile(path , result.id + "_Photo.json", {img64: result.img64});
                    console.log("Updated photo: ", result.id, "_Photo.json");
                    res.send({success: "Saved Photo: " + result.id});
                }catch(err){
                    console.log(err);
                    res.send({error: "Error saving photo!"});
                }
            }else{
                console.log("Product does not exist! ", path + result.id + ".json");
                res.send({error: "Product does not exist!"});
            }
        }
    });


    /**
    {
        "code":"",
        "id": "",
        "name": "",
        "price": 1 ,
        "description": "",
        "category": "",
    }
     */
      app.post('/products/UI', async (req, res)=> {
        const result = JSON.parse(req.body || {id: "", name: "", price: 0, description: "", category: ""});
        const expectedKeys = ["code", "id", "name", "price", "description", "category"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode) {
            res.send({error: "Data structure not compactible!"});
        }else{
            delete result.code;
            dbManager.writeFile('', process.env.TEST_FILE, result);
            res.send({success: "Test is up!"});
        }
    });

    /**
    {
        "code":"",
        "img64": "",
    }
     */
      app.post('/products/UI/photo', async (req, res)=> {
        const result = JSON.parse(req.body || { img64: "" });
        const expectedKeys = ["code", "img64"];
        const hasCode = await process.checkCode(result.code);

        console.log('/products/UI/photo', result);

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{
            dbManager.writeFile('', process.env.TEST_PHOTO_FILE, {img64: result.img64});
            res.send({success: "Test photo is up!"});
        }
    });

}

export default products;