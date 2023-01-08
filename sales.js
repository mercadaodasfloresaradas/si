const sales = {};

sales.init = (app, dbManager, salesCS) => {
    if(process.isSeller){
        sales.buildRequests(app, dbManager, salesCS);
    }
}

sales.getSalesbyRoute = async(app, dbManager, res, route) => {
    const path = process.env.PURCHASES_ROUTE + route + "/";
    let allSales = [];

    const data = await dbManager.readFilesPath(path);

    data.files.forEach((file)=>{
        allSales.push(file);
    });

    console.log(route, ' : ', allSales)

    res.send({sales : allSales});
}

sales.buildRequests = (app, dbManager, salesCS) =>{

    /**
     "code":""
     */
    app.post('/sales/newpurchases', async(req, res)=> {
        
        const result = JSON.parse(req.body || {});
        const expectedKeys = ["code"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{

            sales.getSalesbyRoute(app, dbManager, res, process.env.NEW_PURCHASES_ROUTE);

        }

    });

    /**
     "code":""
     */
    app.post('/sales/finalized', async(req, res)=> {
        
        const result = JSON.parse(req.body || {});
        const expectedKeys = ["code"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{

            sales.getSalesbyRoute(app, dbManager, res, process.env.FINALIZED_ROUTE);

        }

    });

    /**
     "code":""
     */
    app.post('/sales/old', async(req, res)=> {
        
        const result = JSON.parse(req.body || {});
        const expectedKeys = ["code"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{

            sales.getSalesbyRoute(app, dbManager, res, process.env.OLD_ROUTE);

        }

    });

    /**
     "code":"",
     "id":"",
     "state":"", newPurchases\finilized\old
     "info": "" d - details\ c - conversations \ p - products
     */
     app.post('/sales/purchase', async(req, res)=> { 

        const result = JSON.parse(req.body || {});
        const expectedKeys = ["code", "id", "state", "info"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{
            const subPath = process.getSalesRouteByState(result.state);
            let info; 

            switch(result.info){
                case "d":
                    info = "details.json";
                    break;
                case "c":
                    info = "conversations.json";
                    break;
                case "p":
                    info = "purchased-products.json";
                    break;
                default:
                    info = "_";
            }

            const path =  process.env.PURCHASES_ROUTE + subPath + result.id;

            if(!dbManager.checkIfFolder(path)){
                res.send({error: "Purchase does not exist!"});
            }else{
                const fullPath = path + "/" + info;

                if(!dbManager.checkIfFileExists(fullPath)){
                    res.send({error: "Purchase does not exist!"});
                }else{
                    const file = await dbManager.readFile(path + "/", info, true);

                    res.send({info: file});
                }
            }
        }

     });


     /**
        "code":"",
        "id":"",
        "state":""
     */
     app.patch('/sales/changestate', async(req, res)=> {
        const result = JSON.parse(req.body || {});
        const expectedKeys = ["code", "id", "state"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{
            let subPath = process.getSalesRouteByState(result.state);
            const path =  process.env.PURCHASES_ROUTE + subPath + result.id;

            if(!dbManager.checkIfFolder(path)){
                res.send({error: "Purchase does not exist!"});
            }else{
                let data = await dbManager.readFile(path + "/", "details.json", true);
                const stateIndex = process.salesStates.indexOf(data.state);
                const stateLength = process.salesStates.length;
                let finalPath = "";

                if(data.state == result.state){
                    data.state = process.salesStates[ ((stateIndex + 1) >= stateLength) ? 0 : stateIndex + 1];

                    if(dbManager.writeFile(path + "/", "details.json", data)){
                        subPath = process.getSalesRouteByState(data.state);

                        finalPath = process.env.PURCHASES_ROUTE + subPath + result.id;

                        if(path != finalPath){
                            await dbManager.moveFile(path, finalPath);
                        }

                        salesCS.writeCache(result.id, data.state, dbManager);

                        res.send({success: "Purchase state changed!", state: data.state});
                    }else{
                        res.send({error: "Purchase error saving state!"});
                    } 
                }else{
                    res.send({error: "Purchase error saving state!"});
                }
            }
        }
     });


     /**
        "code":"",
        "id":"",
        "state":""
     */
    app.delete('/sales/remove', async(req, res)=> {
        const result = JSON.parse(req.body || {});
        const expectedKeys = ["code", "id", "state"];
        const hasCode = await process.checkCode(result.code);

        if(process.checkBody(expectedKeys, result) || !hasCode){
            res.send({error: "Data structure not compactible!"});
        }else{
            let subPath = process.getSalesRouteByState(result.state);
            const path =  process.env.PURCHASES_ROUTE + subPath + result.id;

            if(!dbManager.checkIfFolder(path)){
                res.send({error: "Purchase does not exist!"});
            }else{
                if(dbManager.deleteFolder(path)){
                    salesCS.deleteCache(result.id, dbManager);
                    res.send({success: "Purchase deleted!"}); 
                }else{
                    res.send({error: "Purchase error deleting!"});
                }
            }
        }
    });


    /**
        "code":"",
        "id":"",
        "state":"",
        "comment":""
     */
        app.post('/sales/comment', async(req, res)=> {
            const result = JSON.parse(req.body || {});
            const expectedKeys = ["code", "id", "state", "comment"];
            const hasCode = await process.checkCode(result.code);
    
            if(process.checkBody(expectedKeys, result) || !hasCode || !(typeof result.comment === 'string')){
                res.send({error: "Data structure not compactible!"});
            }else{
                let subPath = process.getSalesRouteByState(result.state);
                const path =  process.env.PURCHASES_ROUTE + subPath + result.id;
    
                if(!dbManager.checkIfFolder(path)){
                    res.send({error: "Purchase does not exist!"});
                }else{
                    let data = await dbManager.readFile(path + "/", "conversations.json", true);

                    data.messages.push({sender: "s", message: result.comment});

                    if(dbManager.writeFile(path + "/", "conversations.json", data)){

                        res.send({success: "Purchase conversation updated!", conversations: data.messages}); 
                    }else{
                        res.send({error: "Purchase error updating conversation!"});
                    }
                }
            }
        });

    /**
        "code":"",
        "id":"",
        "state":"",
     */
        app.post('/sales/notifications', async(req, res)=> {
            const result = JSON.parse(req.body || {});
            const expectedKeys = ["code", "id", "state"];
            const hasCode = await process.checkCode(result.code);

            console.log(result);

            if(process.checkBody(expectedKeys, result) || !hasCode){
                res.send({error: "Data structure not compactible!"});
            }else{
                let subPath = process.getSalesRouteByState(result.state);
                const path =  process.env.PURCHASES_ROUTE + subPath + result.id;
    
                if(!dbManager.checkIfFolder(path)){
                    res.send({error: "Purchase does not exist!"});
                }else{
                    let data = await dbManager.readFile(path + "/", "details.json", true);

                    if(data.hasNotifications){
                        data.hasNotifications = false;
                        if(dbManager.writeFile(path + "/", "details.json", data)){
    
                            res.send({success: "Notifications updated!"}); 
                        }else{
                            res.send({error: "Purchase error updating notifications!"});
                        }
                    }else{
                        res.send({warning: "Purchase already updated notifications!"});
                    }
                }
            }
        });

}



export default sales;