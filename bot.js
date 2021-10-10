
const admin = require("firebase-admin");
const axios = require('axios').default;

const serviceAccount = require("./dbKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://roulette-12812-default-rtdb.firebaseio.com"
});

const db = admin.database();
const bucket = admin.storage().bucket("gs://roulette-12812.appspot.com");
const apiSchemeAndDomain = "https://ruletas.web.app"; //"http://localhost:5000";

const comandos = {
    help: "help",
    listarRuletas: "ruletas",
    agregarRuleta: "ruletas.agregar",
    eliminarRuleta: "ruletas.eliminar",
    listarItems: "ver",
    agregarItem: "agregar",
    eliminarItem: "eliminar",
    info: "info",
    girarAutomatico: "girar",
    girarManual: "girar.manual"
}


const commandRegexp =  /^\! ?(?<name>[\w\.]+) *(?<args>[\wÁÉÍÓÚÑáéíóúñ\d ,\.;'":]+)?$/;


module.exports.newQuotedTextMessage  = (async message => {
    if(!isCommand(message.body)){
        return;
    }

    var command = getCommandNameWithArgs(message.body);
    console.log('command: ', command);
    console.log('quoted: ', message.quoted);

    if(command.name === 'burlar') {
        message.reply(burlar(message.quoted));
    } else {
        message.reply("Comando no reconocido");
    }
});


function burlar(msg){
    return msg.replace(/[aeiouáéíóúAEIOUÁÉÍÓÚ]/gmi, "i");
}

module.exports.newTextMessage = (async message => {
    if(!isCommand(message.body)){
        return;
    }

    var command = getCommandNameWithArgs(message.body);
    console.log('command: ', command);

    if(command.name === 'ping') {
        message.reply('pong');
    } else if(command.name === comandos.help){
        message.reply(getHelpMessage());
    } else if(command.name === comandos.listarRuletas){
        message.reply(await getRuletas());
    } else if(command.name === comandos.agregarRuleta && command.args[0] != ''){
        message.reply(await addRuleta(command.args[0]));
    } else if(command.name === comandos.eliminarRuleta && command.args[0] != ''){
        message.reply(await removeRuleta(command.args[0]));
    } else if(command.name === comandos.listarItems && command.args[0] != ''){
        message.reply(await getItemsOfRuleta(command.args[0]));
    } else if(command.name === comandos.agregarItem && command.args[0] != '' && command.args[1] != ''){
        message.reply(await addItemInRuleta(command.args[0], command.args[1]));
    } else if(command.name === comandos.eliminarItem && command.args[0] != '' && command.args[1] != ''){
        message.reply(await removeItemInRuleta(command.args[0], command.args[1]));
    } else if(command.name === comandos.girarManual && command.args[0] != ''){
        message.reply(await girarManualRuleta(command.args[0]));
    } else if(command.name === comandos.girarAutomatico && command.args[0] != ''){
        message.replyVideo(await girarAutomaticoRuleta(command.args[0]));
    } else {
        message.reply("Comando no reconocido");
    }
});

function isCommand(msg){
    return commandRegexp.test(msg);
}

function getCommandNameWithArgs(msg){
    if(isCommand(msg)){
        let command = commandRegexp.exec(msg).groups;
        command.args = command.args ? getArgsList(command.args) : [''];

        return command;
    }

    return {name: '', args: ['']};
}

function getArgsList(argsString){
    return argsString.split(";").map(e => e.trim());
}

function getHelpMessage(){
    return  "Hola, yo soy el bot de las ruletas :v\n\n" + 
            "Puedo responder a los siguientes comandos:\n" +
            "* *!" + comandos.help + "*: Muesta este menú de ayuda.\n" +
            "* *!" + comandos.listarRuletas + "*: Lista todas las ruletas y sus ids.\n" +
            "* *!" + comandos.agregarRuleta + " _ruleta_*: Agrega la ruleta con nombre _ruleta_.\n" +
            "* *!" + comandos.eliminarRuleta + " _ruleta_*: Elimina la ruleta _ruleta_.\n" +
            "* *!" + comandos.listarItems + " _ruleta_*: Muesta todos los items y sus ids de la ruleta _ruleta_.\n" +
            "* *!" + comandos.agregarItem + " _ruleta_ ; _item_*: Agrega el item _item_ a la ruleta _ruleta_.\n" +
            "* *!" + comandos.eliminarItem + " _ruleta_ ; _item_*: Elimina el item _item_ de la ruleta _ruleta_.\n" +
            "* ~*!" + comandos.info + " _ruleta_ ; _item_*: Ver información de la película/serie _item_ de la ruleta _ruleta_.~\n" +
            "* *!" + comandos.girarAutomatico + " _ruleta_*: Envía un vídeo de la ruleta _ruleta_ girándose.\n" +
            "* *!" + comandos.girarManual + " _ruleta_*: Muestra un enlace para girar la ruleta _ruleta_.\n\n\n" +
            "*Importante*: Al momento de especificar un _item_ o una _ruleta_ se puede poner tanto su id como su nombre."
}

async function getRuletas(){
    const ref = db.ref("ruletas");
    var msg = "";

    try {
        const snapshot = await ref.once("value");
        const data = snapshot.val();

        for(let id in data){
            if(data[id] && data[id].name){
                msg += id + ") *" + data[id].name + "*\n";
            }
        }

        return msg;
    } catch (e) {
        return "Error inesperado";
    }
}

async function getItemsOfRuleta(ruleta){
    var data = await searchRuleta(ruleta);
    var msg = "";

    if(data){
        data = data.items;

        for(let itemId in data){
            if(data[itemId]){
                msg += itemId + ") *" + data[itemId] + "*\n";
            }
        }

        return msg;
    }

    return "Ruleta \"" + ruleta + "\" no encontrada.";
}

async function searchRuleta(ruleta){
    var data;

    if(isNaN(ruleta)){
        data = await searchRuletaByName(ruleta);
    } else {
        data = await searchRuletaById(ruleta);
    }

    return data;
}

async function searchRuletaById(ruletaId){
    const ref = db.ref("ruletas/" + ruletaId);
    try {
        const snapshot = await ref.once("value");
        const data = snapshot.val()
        data.id = ruletaId;
        return data;
    } catch (e) {
        return null;
    }
}

async function searchRuletaByName(ruletaName){
    const ref = db.ref("ruletas");
    try {
        const snapshot = await ref.once("value");
        const data = snapshot.val();

        for(let id in data){
            if(areStringsSimilar(data[id].name, ruletaName)){
                data[id].id = id;
                return data[id];
            }
        }
        
        return null;
    } catch (e) {
        return null;
    }
}

function areStringsSimilar(string1, string2){
    string1 = string1.replace(/á/g, 'a').replace(/ó/g, 'o').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ú/g, 'u');
    string2 = string2.replace(/á/g, 'a').replace(/ó/g, 'o').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ú/g, 'u');

    return string1.toLowerCase().replace(/[ s]/g, "") == string2.toLowerCase().replace(/[ s]/g, "");
}


async function addRuleta(ruletaName){
    try {
        const snapshot = await db.ref("ruletas/lessIdFree").once("value");
        const lessIdFree = snapshot.val();

        await db.ref("ruletas/" + lessIdFree).set({name: ruletaName, lessIdFree: 0});
        await db.ref("ruletas/lessIdFree").set(lessIdFree+1);

        return "Ruleta \"" + ruletaName + "\" agregada exitosamente.";
    } catch (e) {
        return "Error inesperado.";
    }
}


async function removeRuleta(ruleta){
    var ruletaFound = await searchRuleta(ruleta);

    try {
        if(ruletaFound != null){
            await db.ref("ruletas/" + ruletaFound.id).set(null);
            return "Ruleta \"" + ruletaFound.name + "\" eliminada exitosamente.";
        }

        return "Ruleta \"" + ruleta + "\" no encontrada.";
    } catch (e) {
        return "Error inesperado.";
    }
}


async function addItemInRuleta(ruleta, itemName){
    var ruletaFound = await searchRuleta(ruleta);

    try {
        if(ruletaFound != null){
            await db.ref("ruletas/" + ruletaFound.id + "/items/" + ruletaFound.lessIdFree).set(itemName);
            await db.ref("ruletas/" + ruletaFound.id + "/lessIdFree").set(ruletaFound.lessIdFree+1);
            
            return "Item \"" + itemName + "\" agregado exitosamente a la ruleta \"" + ruletaFound.name + "\".";
        }

        return "Ruleta \"" + ruleta + "\" no encontrada.";
    } catch (e) {
        return "Error inesperado.";
    }
}

async function removeItemInRuleta(ruleta, item){
    var ruletaFound = await searchRuleta(ruleta);
    var itemFound = searchItemInRuleta(ruletaFound, item);

    try {
        if(ruletaFound != null && itemFound != null){
            await db.ref("ruletas/" + ruletaFound.id + "/items/" + itemFound.id).set(null);
            
            return "Item \"" + itemFound.name + "\" eliminado exitosamente de la ruleta \"" + ruletaFound.name + "\".";
        }

        return "Ruleta \"" + ruleta + "\" o item \"" + item + "\" no encontrados.";
    } catch (e) {
        return "Error inesperado";
    }
}


function searchItemInRuleta(ruleta, item){
    if(isNaN(item)){
        if(ruleta.items){
            for(let itemId in ruleta.items){
                if(ruleta.items[itemId] && areStringsSimilar(ruleta.items[itemId], item)){
                    return {id: itemId, name: ruleta.items[itemId]};
                }
            }
        }
    } else {
        if(ruleta.items && ruleta.items[item]){
            return {id: item, name: ruleta.items[item]};
        }
    }

    return null;
}

async function getLinkToTurnRoulette(ruleta){
    var ruletaFound = await searchRuleta(ruleta);
    var itemsList = "";

    if(ruletaFound && ruletaFound.items){
        for(let id in ruletaFound.items){
            itemsList += ruletaFound.items[id] + "|"
        }

        itemsList = itemsList.substr(0, itemsList.length-1).replace(/ /g, "%20");

        return apiSchemeAndDomain + "/girar?ruleta=" + ruletaFound.name + "&items=" + itemsList
    } else {
        return null;
    }
}


async function girarManualRuleta(ruleta){
    var link = await getLinkToTurnRoulette(ruleta);

    if(link){
        return "Para girar la ruleta ingrese aquí: " + link;
    } else {
        return "La ruleta \"" + ruleta + "\" no ha sido encontrada o no tiene items.";
    }
}


async function girarAutomaticoRuleta(ruleta){
    var link = await getLinkToTurnRoulette(ruleta);

    if(link){
        var resp = await axios.post(apiSchemeAndDomain + '/getvideo', {
            key: 'wspBot11131719',
            source: link
        });

        console.log('resp.data: ', resp.data);
        var file = bucket.file(resp.data);
        var fileDownloaded = await file.download();

        return fileDownloaded[0];
    } else {
        return null;
    }
}

