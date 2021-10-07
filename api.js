const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const fs = require('fs');

const SESSION_FILE_PATH = './session.json';

let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

global.client = new Client({
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--unhandled-rejections=strict'
    ]},
    session: sessionCfg
});


client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('authenticated', (session) => {
    console.log("AUTH!");

    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', () => {
    console.log("AUTH Failed!");
    process.exit()
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();

const bot = require('./bot');
bot.run();
