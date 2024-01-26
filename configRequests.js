const configRequests = {};

configRequests.configs = {};
configRequests.configFileName = "Configs.json";

process.getConfigs  = () => configRequests.configs;

configRequests.init = (app, dbManager)=>{
    configRequests.app = app;

    configRequests.configIntegrityProcess(dbManager);

    configRequests.buildRequests(app, dbManager);

}

configRequests.configIntegrityProcess = async (dbManager)=>{

   let data = await dbManager.readFilesPath(process.env.CONFIGS_ROUTE);

   if(!(data.files) ||
        data.files.length <= 0 ||
        data.files.indexOf(configRequests.configFileName) == -1){
        configRequests.configs = {
            //welcome
            storeName: "Mercadão das Flores",
            welcome: "Seja bem vindo á nossa loja!",
            noService: "Serviço em baixo, lamentamos o incoveniente...",
            //products
            delivery: "Entregas feitas em 48 horas após verificação de pagamento.",
            support: "Ligar para 911111111 em caso de dúvidas!",
            returns: "Devolvemos o dinheiro, até ao dia antes da entrega.",
            //basket
            limitProducts: 20,
            limitDaily: 10,
            //placed order
            warnings: `Pagar valor do/s producto/s para dar o seguimento inicial
Posteriormente será enviada uma mensagem com o custo do envio
Mensagens são enviadas na página de seguimento de encomenda
Nos pagamentos deve meter o seu ID de compra ou enviar sms para nr 913555666 ex -'pagamento 123456ABC'`,
            contacts: "911111111",
            payMethods: `MBWAY: 913555666
Alternativo MBWAY: 963555666
Paypal: helena@hotmail.com`,
            //follow purchase
            toPay: `Pagar a sua encomenda em:
MBWAY: 913555666
Alternativo MBWAY: 963555666
Paypal: helena@hotmail.com,`,
            payed: "Se não defeniu a sua morada como verdadeiramente queria, por favor envie uma mensagem a vendedora com a nova morada.",
            finalized: "Concluio a sua compra com sucesso!",
            //footer
            facebook: 'www.facebook.com',
            instagram: 'www.instragram.com',
            //contacts page
            contactsPage: `
            Horários
            Seg:
            Ter:
            Qua:
            Qui:
            Sex:
            Contacto
            Rua do buragal nº 218 Aradas-Aveiro
            3810-382
            TLF: 234427229
            TLM:963928334
            hsilva.maria@gmail.com
            `
        };

        dbManager.writeFile(process.env.CONFIGS_ROUTE + "/",
                                configRequests.configFileName,
                                configRequests.configs);

        console.log("Created Configs File with:", configRequests.configs);
   }else{
        configRequests.configs = await dbManager.readFile(process.env.CONFIGS_ROUTE + "/",
                                                            configRequests.configFileName,
                                                            true);

        console.log("Read Configs File it has:", configRequests.configs);
   }

}

configRequests.buildRequests = (app, dbManager) =>{
    /* 
    storeName: "Mercadão das Flores",
            welcome: "Seja bem vindo á nossa loja!",
            noService
    */

    const updateConfigs = async () =>{
        configRequests.configs = await dbManager.readFile(process.env.CONFIGS_ROUTE + "/",
                                                            configRequests.configFileName,
                                                            true);
    }

    //welcome
    //save cookies
    app.get('/config/storename', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.storeName 
        });
    });

    app.get('/config/welcome', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.welcome 
        });
    });

    //save cookies
    app.get('/config/noservice', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.noService 
        });
    });



    //products
    app.get('/config/delivery', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.delivery 
        });
    });
    
    app.get('/config/support', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.support 
        });
    });

    app.get('/config/returns', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.returns 
        });
    });



    //basket
    app.get('/config/limit', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.limitProducts 
        });
    });



    //placed order
    app.get('/config/warnings', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.warnings
        });
    });

    app.get('/config/paymethods', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.payMethods 
        });
    });

    app.get('/config/contacts', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.contacts 
        });
    });

    

    //follow purchase
    app.get('/config/pay', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.toPay
        });
    });

    app.get('/config/payed', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.payed
        });
    });

    app.get('/config/finalized', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.finalized 
        });
    });



    //footer
    app.get('/config/facebook', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.facebook
        });
    });

    app.get('/config/instagram', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.instagram 
        });
    });

    //contacts page
    app.get('/config/contacts/page', async (req, res)=>{
        await updateConfigs();
        res.send({
            config: configRequests.configs.contactsPage 
        });
    });

    if(process.isSeller){

        /*
            {
                "code" : "test",
                "data" : {
                    "contacts": "test",
                    "payMethods": "test",
                    "noService": "test",
                    "welcome": "test",
                    "storeName": "test",
                    "warnings": "test",
                    "delivery": "test",
                    "support": "test",
                    "returns": "test"
                    "toPay": "test"
                    "payed": "test"
                    "finalized": "test"
                    "limitProducts": 0,
                    "limitDaily": 0,
                    "facebook": "test",
                    "instagram": "test",
                    "contactsPage": "test",
                }
            }
        */
        app.post('/config', async (req, res) =>{
            const result = JSON.parse(req.body || {code: "", data: {}});
            const hasCode = await process.checkCode(result.code);
            if(hasCode){
                let hasFoundNoMatch = false;
                const currentConfigKeys = Object.keys(configRequests.configs);
                const newConfigKeys = Object.keys(result.data);
                
                if(currentConfigKeys.length != newConfigKeys.length){
                    res.send({error: "Data structure not compactible!"});
                }else{

                    currentConfigKeys.forEach((element)=>{
                        if(newConfigKeys.indexOf(element) == -1){
                            hasFoundNoMatch = true;
                        }
                    });

                    if(hasFoundNoMatch || typeof result.data.limitProducts != 'number' || typeof result.data.limitDaily != 'number'){
                        res.send({error: "Data structure not compactible!"});
                    }else{
                        configRequests.configs = result.data;
                        console.log('Saved Configs: ');
                        console.log(configRequests.configs);
                        dbManager.writeFile(process.env.CONFIGS_ROUTE + "/",
                                configRequests.configFileName,
                                configRequests.configs);
                        res.send({info: "Saved correctly!"});
                    }
                }

            }else{
                res.send({error: "Code missing or worng!"});
            }
        });

        /*
        */
        app.get('/config/all', (req, res)=>{
            res.send({
                config: configRequests.configs
            });
        });
    }
    
}



export default configRequests;