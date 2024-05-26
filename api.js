const fs = require('fs');
const { WAConnection, MessageType, Mimetype } = require('@adiwajshing/baileys');

const SESSION_FILE_PATH = './session.json';

const conn = new WAConnection();

conn.on('open', () => {
    // save credentials whenever updated
    console.log('credentials updated!');
    const authInfo = conn.base64EncodedAuthInfo();
    fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(authInfo, null, '\t'));
});


if(fs.existsSync(SESSION_FILE_PATH)) {
    conn.loadAuthInfo(SESSION_FILE_PATH); 
}

conn.connect().then(() => {
    conn.on('chat-update', chat => {
        if(chat.hasNewMessage && chat.count > 0){
            const message = chat.messages.all()[0];
            const messageContent = message.message;

            if(messageContent && !message.key.fromMe){
                const sender = getSenderFromMessageKey(message.key);
                console.log('sender: ', sender);

                if(isValidSender(sender)){
                    const messageType = Object.keys(messageContent)[0];

                    if (messageType === MessageType.text) {
                        thereIsNewTextMessage(sender, messageContent.conversation, message);
                    } else if (messageType === MessageType.extendedText) {
                        thereIsNewQuoutedTextMessage(sender, messageContent.extendedTextMessage.text, message);
                    } 
                }
            }
        }
    });
    
});


function getSenderFromMessageKey(messageKey){
    let sender = messageKey.remoteJid;
    if (messageKey.participant) {
        sender = messageKey.participant;
    }

    return sender;
}

function isValidSender(sender){
    const senderNumber = sender.split('@')[0];
    return senderNumber == 'xxxxxxxxxxxx'; // replace this with your allowed phone number
}


const bot = require('./bot');

function thereIsNewTextMessage(sender, text, originalMessage){
    bot.newTextMessage({body: text, reply: resp => {
        conn.sendMessage(sender, resp, MessageType.text, {quoted: originalMessage});
    }, replyVideo: video => {
        if(video){
            conn.sendMessage(
                sender, 
                video, // load a gif and send it
                MessageType.video, 
                { mimetype: Mimetype.gif, caption: ":P", quoted: originalMessage }
            );        
        } else {
            conn.sendMessage(sender, "Error al crear el video.", MessageType.text, {quoted: originalMessage});
        }
    }});
}


function thereIsNewQuoutedTextMessage(sender, text, originalMessage){
    bot.newQuotedTextMessage({
        body: text,
        quoted: originalMessage.message.extendedTextMessage.contextInfo.quotedMessage.conversation,
        reply: resp => {
            conn.sendMessage(sender, resp, MessageType.text);
    }});
}