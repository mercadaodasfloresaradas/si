import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dbManager from './dbManager.js';
import dbFoldersIntegrity from "./dbFoldersIntegrity.js";
import configRequest from './configRequests.js';
import productsCS from './productsCS.js';
import products from './products.js';
import sales from './sales.js';
import salesCS from './salesCS.js';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
app.use(cors());
const portType = process.env.SERVER_TYPE;
const isSeller = portType === 'lena';
const port = isSeller ? 1668 : 1669;

process.isSeller = isSeller;
process.salesStates = ['toPay', 'payed', 'finalized', 'old'];
process.checkCode = async (code) =>{
    var result = await dbManager.readFile("", process.env.NATIVE_APP_FILE_REGISTER, true);
    return result.codes.indexOf(code) != -1;
};

process.checkBody = (expectedKeys, result) =>{
    let hasFoundNoMatch = false;

    expectedKeys.forEach((element)=>{
        if(Object.keys(result).indexOf(element) == -1){
            console.log('key missing: ', element);
            hasFoundNoMatch = true;
        }
    });

    return (hasFoundNoMatch || Object.keys(result).length != expectedKeys.length);
}

process.getSalesRouteByState = (state, isClient = false) =>{
    switch(state){
        case "newPurchases":
        case "toPay":
        case "payed":
            return process.env.NEW_PURCHASES_ROUTE + "/";
        
        case "finilized":
        case "finalized":
            return process.env.FINALIZED_ROUTE + "/";
        
        case "old":
            return isClient ? "_" : (process.env.OLD_ROUTE + "/");
        default:
           return "_";
    }
}

console.log("Server Type:", portType, port);

app.use(express.raw({
                        inflate: true,
                        limit: '50mb',
                        type: () => true, // this matches all content types
                    }));

app.use(bodyParser.json({limit: '50mb'}));
app.listen(port);

//sequence of inits important
dbManager.init();
dbFoldersIntegrity.init(dbManager, ()=>{
    configRequest.init(app, dbManager);
    productsCS.init(app, dbManager);
    products.init(app, dbManager, productsCS);
    sales.init(app, dbManager, salesCS);
    salesCS.init(app, dbManager);
});

/***
 * 
 * {
 *      "inner": "code"
 * }
 */
app.post('/', async (req, res)=> {
    const result = JSON.parse(req.body || {});
    console.log("main route ", req.headers['store-origin']);
    
    if(result.inner){
        const hasCode = await process.checkCode(result.inner);
        console.log("Resgiter App with code: ", result.inner, " \n And result is: ", hasCode);
        res.send(hasCode);
    }else{
        res.send("Home");
    }
    
});

app.get('/', (req, res)=> {
    console.log("main route");
    res.send("Home");
});



