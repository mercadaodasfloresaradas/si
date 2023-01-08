const salesCS = {};
salesCS.salesCache = {};
salesCS.hasCacheUpdatedInternal = false;

salesCS.init = (app, dbManager) => {
    salesCS.cacheSetup(dbManager);
    salesCS.buildRequests(app, dbManager);

    
}

salesCS.cacheSetup = async(dbManager) => {

    let finalCache = {};
    
    if(!dbManager.checkIfFileExists(process.env.CACHE_SALES_FILE)){
        dbManager.writeFile("", process.env.CACHE_SALES_FILE, finalCache);
    }else{
        finalCache = await dbManager.readFile("", process.env.CACHE_SALES_FILE, true);
    }

    salesCS.salesCache = finalCache;

    dbManager.watchFile(process.env.CACHE_SALES_FILE, async()=>{
        if(!salesCS.hasCacheUpdatedInternal){
            console.log("Cache sales updated!"); 
            salesCS.salesCache = await dbManager.readFile("", process.env.CACHE_SALES_FILE, true);
        }
        salesCS.hasCacheUpdatedInternal = false;
    });

}

salesCS.uuid = (length) =>{
    let initial = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    let final = initial.substring(0, (length >= initial.length) ? initial.length : length);
    const id = final.replace(/[xy]/g, function(c) {
        let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });

    return salesCS.salesCache[id] != "" ? id : salesCS.uuid(length + 1);
}

/**
 
    products: [{
        id: '',
        category: '', 
        name: '', 
        price: 0
    }]
 */
salesCS.calcTotalWithDecimalsPrecise = (products) =>{

    function intAndDec(inte){
        const sides =  inte.toString().split('.');
        let decimal = 0;
        if(sides[1]){
           decimal = sides[1].substring(0, 2);
           decimal = decimal.length === 1 ? `${decimal}0` : decimal;
        }
        
        return { full: +sides[0], deci: +decimal };
    } 

    let total = 0;
    let total2 = 0;
    
    products.forEach((product)=>{
        const temp = intAndDec(+product.price);
        total += temp.full;
        total2 += temp.deci;
    });

    const floatSide = total2.toString();

    let plusInt = 0;
    let inDecimal = 0;

    if(floatSide.length > 2){
        plusInt = +floatSide.substring(0, floatSide.length - 2);
        inDecimal = +floatSide.substring(floatSide.length - 2);
    
    }else{
        inDecimal= +floatSide;
    }

    total += plusInt;

    return +`${total}.${inDecimal}`;
}

salesCS.writeCache = (id, state, dbManager, isInternal = false) =>{
    salesCS.salesCache[id] = state;
    salesCS.hasCacheUpdatedInternal = isInternal;
    dbManager.writeFile("", process.env.CACHE_SALES_FILE, salesCS.salesCache);
}

salesCS.deleteCache = (id, dbManager) => {
    delete salesCS.salesCache[id];
    dbManager.writeFile("", process.env.CACHE_SALES_FILE, salesCS.salesCache);
}

salesCS.buildRequests = (app, dbManager) =>{ 

    /**
        "name": "",
        "phone": "",
        "address": "",
        "NIF": "",
        "products": [{"id": "", "category": ""}],
        "hasToSave": true
     */
    app.post('/sales/new', async(req, res)=> {
        const result = JSON.parse(req.body || {name: "", phone: "", address: "", "NIF": "", products: []});
        const expectedKeys = ["name", "phone", "address", "products", "NIF", "hasToSave"];

        console.log('sales/new', result);

        if(process.checkBody(expectedKeys, result)){
            res.send({error: "Data structure not compactible!"});
        }else if(typeof result.name === "string" && result.name.replaceAll(" ", "") != "" &&
                    typeof result.phone === "string" && result.phone.replaceAll(" ", "") != "" &&
                    typeof result.address === "string" && result.address.replaceAll(" ", "") != "" && 
                    typeof result.NIF === "string" && result.NIF.replaceAll(" ", "") != "" && 
                    Array.isArray(result.products) && result.products.length > 0 &&
                   result.products.length <= process.getConfigs().limitProducts){

            const basePathProduct = process.env.PRODUCTS_ROUTE + process.env.SALE_ROUTE;
            const basePathPurchase = process.env.PURCHASES_ROUTE + process.env.NEW_PURCHASES_ROUTE + "/";
            const expectedProductKeys = ["id", "category"];
            let hasProblemProduct = false;
            let productsToRemove = [];
            let priceTotal = 0; 
            let productsPurchased = [];
            let details = {
                name: result.name,
                phone: result.phone,
                address: result.address,
                NIF: result.NIF,
            };
            
            for(const product of result.products){
                const fullPath = basePathProduct + product.category + "/";
                const productFileName = product.id + ".json";
                let data;
                let hasIdFromThisLoop = false;
                const toRemoveData = {id: product.id, category: product.category};

                if(process.checkBody(expectedProductKeys, product) ||
                    !dbManager.checkIfFileExists(fullPath + productFileName)){
                        
                        if(result.hasToSave){
                            hasProblemProduct = true;
                            break;
                        }else if(!hasIdFromThisLoop){
                            hasIdFromThisLoop = true;
                            productsToRemove.push(toRemoveData);
                        }
                }

                try{
                    data = await dbManager.readFile(fullPath, productFileName, true);
                }catch{
                    console.log('Product not found: ', fullPath, productFileName);
                    if(result.hasToSave){
                        hasProblemProduct = true;
                        break;
                    }else if(!hasIdFromThisLoop){
                        hasIdFromThisLoop = true;
                        productsToRemove.push(toRemoveData);
                    }
                }

                if(!data){
                    if(result.hasToSave){
                        hasProblemProduct = true;
                        break;
                    }else if(!hasIdFromThisLoop){
                        hasIdFromThisLoop = true;
                        productsToRemove.push(toRemoveData);
                    }
                }

                if(!hasIdFromThisLoop){
                    productsPurchased.push({
                        id: data.id,
                        category: data.category, 
                        name: data.name, 
                        price: data.price,
                        description: data.description
                    });
                }
            }

            if(hasProblemProduct){
                res.send({error: "Data structure not compactible!"});
            }else{
                priceTotal = salesCS.calcTotalWithDecimalsPrecise(productsPurchased);
                console.log('Products Calculated: ');
                console.log(productsPurchased);
                console.log('Total price: ' + priceTotal);
                if(result.hasToSave){
                    const newID = salesCS.uuid(6);
                    const finalPath = basePathPurchase + newID + "/";
    
                    details.id = newID;
                    details.priceTotal = priceTotal;
                    details.date = (new Date()).toISOString();
                    details.state = "toPay";
                    details.hasNotifications = false;
    
                    dbManager.createFolder(basePathPurchase, newID);
    
                    await dbManager.writeFile(finalPath, "details.json" , details);
                    await dbManager.writeFile(finalPath, "purchased-products.json" , {products: productsPurchased});
                    await dbManager.writeFile(finalPath, "conversations.json" , { messages: []});
    
                    salesCS.writeCache(newID, details.state, dbManager, true);
    
                    res.send({success: "Successful purchase!", id: newID, total: priceTotal});
                }else{
                    res.send({total: priceTotal, productsToRemove});
                }
            }


        }else{
            res.send({error: "Data structure not compactible!"});
        }
    });

    
    /**
        "id": "",
        "comment": ""
     */
    app.post('/sales/mycomment', async(req, res)=> {
        const result = JSON.parse(req.body || {});
        const expectedKeys = ["id", "comment"];

        if(process.checkBody(expectedKeys, result) || !(typeof result.comment === 'string') || !(salesCS.salesCache[result.id])){
            res.send({error: "Data structure not compactible!"});
        }else{
            let subPath = process.getSalesRouteByState(salesCS.salesCache[result.id], true);
            const path =  process.env.PURCHASES_ROUTE + subPath + result.id;
            const doesPathExists = dbManager.checkIfFolder(path);

            if(doesPathExists){
                let data = await dbManager.readFile(path + "/", "conversations.json", true);
                let details = await dbManager.readFile(path + "/", "details.json", true);
                
                let countClientMessages = 0;
                let allowedMessages = parseInt(process.env.ALLOWED_CLIENT_MESSAGES_COUNT);
                const lastIndex = data.messages.length - 1;

                for(let i = 0; i < allowedMessages ; i++){
                    if ((lastIndex - i) < 0) {
                      break;  
                    }else if(data.messages[lastIndex - i].sender == "c"){
                        countClientMessages++;
                        
                    }
                }
                
                if(countClientMessages < allowedMessages){
                    data.messages.push({sender: "c", message: result.comment});
                    details.hasNotifications = true;

                    if(dbManager.writeFile(path + "/", "conversations.json", data) && dbManager.writeFile(path + "/", "details.json", details)){

                        res.send({success: "Purchase conversation updated!", conversations: data.messages}); 
                    }else{
                        res.send({error: "Purchase error updating conversation!"});
                    }
                }else{
                    res.send({error: "Client cannot post more messages!"});
                }
            }else{
                res.send({error: "Data structure not compactible!"});
            }
        }
    });

    /**
        "id": ""
     */
    app.post('/sales/showpurchase', async(req, res)=> {
        const result = JSON.parse(req.body || {});
        const expectedKeys = ["id"];

        if(process.checkBody(expectedKeys, result) || !(salesCS.salesCache[result.id])){
            res.send({error: "Data structure not compactible!"});
        }else{
            let subPath = process.getSalesRouteByState(salesCS.salesCache[result.id], true);
            const path =  process.env.PURCHASES_ROUTE + subPath + result.id;
            const doesPathExists = dbManager.checkIfFolder(path);

            if(doesPathExists){
                let conversations = await dbManager.readFile(path + "/", "conversations.json", true);
                let details = await dbManager.readFile(path + "/", "details.json", true);
                let products = await dbManager.readFile(path + "/", "purchased-products.json", true);

                res.send({conversations, details, products});
            }else{
                res.send({error: "Client cannot post more messages!"});
            }
        }
    });
}


export default salesCS;