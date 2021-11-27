var admin = require("firebase-admin");
var MessageConstants = require("../models/messageConstants");

var serviceAccount = {
    "project_id": process.env.FIREBASE_PROJECT_ID,
    // "private_key_id": process.env.,
    "private_key": process.env.FIREBASE_PRIVATE_KEY,
    "client_email": process.env.FIREBASE_CLIENT_EMAIL
    // "client_id": process.env.firebase_client_id,
    // "auth_uri": process.env.firebase_auth_uri,
    // "token_uri": process.env.firebase_token_uri,
    // "auth_provider_x509_cert_url": process.env.firebase_auth_provider_x509_cert_url,
    // "client_x509_cert_url": process.env.firebase_client_x509_cert_url
}

// let serviceAccount = {
//     "type": "service_account",
//     "project_id": "chat21-mqtt-push",
//     "private_key_id": "83690e5f5a9b7ba5ab736bf3cedb325df77cf8b3",
//     "private_key": "[REDACTED_PRIVATE_KEY]\n",
//     "client_email": "redacted@example.invalid",
//     "client_id": "106987821009523266084",
//     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
//     "token_uri": "https://oauth2.googleapis.com/token",
//     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
//     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-2zopd%40chat21-mqtt-push.iam.gserviceaccount.com"
//   }

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/* 
    ver 0.1
    Andrea Sponziello - (c) Tiledesk.com
*/

/**
 * Chat21Api for NodeJS
 */
// const winston = require("../winston");
const logger = require('../tiledesk-logger').logger;
var MessageConstants = require("../models/messageConstants");

var amqp = require('amqplib/callback_api');
const { uuid } = require('uuidv4');
const { JsonWebTokenError } = require('jsonwebtoken');

class Chat21Push {
    
    /**
     * Constructor
     * @example
     * const { Chat21Push } = require('./sendpush/index.js');
     * const chatpush = new Chat21Push({database: db});
     * 
     */
    constructor(options) {
        if (!options.database) {
            throw new Error('database option can NOT be empty.');
        }
        this.chatdb = options.database
    }

    saveAppInstance(
        instance,
        callback) {
        this.chatdb.saveAppInstance(instance, (err) => {
            if (err) {
                logger.error("Error while saving instance:", err);
                callback(err);
            }
            else {
                callback(null);
            }
        });
    }

    sendNotification(app_id, message, sender_id, recipient_id) {
        // = db.ref('/apps/{app_id}/users/{sender_id}/messages/{recipient_id}/{message_id}').onCreate((data, context) => {
        // const message_id = context.params.message_id;
        // const sender_id = context.params.sender_id; 
        // const recipient_id = context.params.recipient_id;
        // const app_id = context.params.app_id;
        // const message = data.val();

        let webClickAction = "http://localhost:4200/";

        console.log("sending notification");
        console.log("app_id:", app_id);
        console.log("message:", message);
        console.log("sender_id:", sender_id);
        console.log("recipient_id:", recipient_id);

        let forcenotification = false;
        if (message.attributes && message.attributes.forcenotification) {
            forcenotification = message.attributes.forcenotification;
            console.log('forcenotification', forcenotification);
        }
        if (message.status != MessageConstants.CHAT_MESSAGE_STATUS_CODE.SENT) {
            console.log('message.status != MessageConstants.CHAT_MESSAGE_STATUS_CODE.SENT');
            return 0;
        }
        if (sender_id == "system") {
            console.log('do not send push notification if "system" is the sender');
            return 0;
        }
        if (sender_id == recipient_id) {
            console.log('do not send push notification to the sender itself');
            return 0;
        }
        if (forcenotification == false) {
            if (message.sender == "system"){
                console.log('do not send push notification for message with system as sender');
                return 0;
            }
        
            if (message.attributes && message.attributes.sendnotification == false) {
                console.log('do not send push notification because sendnotification is false');
                return 0;
            }
        
            if (recipient_id == "general_group" ) {
                console.log('dont send push notification for mute recipient');
                //if sender is receiver, don't send notification
                return 0;
            }
        } else {
            console.log('forcenotification is enabled');
        }
        const text = message.text;
        const messageTimestamp = JSON.stringify(message.timestamp);
        this.chatdb.allInstancesOf(app_id, sender_id, (err, instances) => {
            console.log('instances ', instances);
            /*
            [
                {
                    _id: new ObjectId("61979dbacad78ce3fdea761c"),
                    instance_id: 'eIHQegUYdfGMWpgBBWQvPz:APA91bGZNT3kq31EhSpNr-_IZTUjNN3QyHgz40MjE_sNkl48eir5wkEihi4kIBWgCu7rZ3gXs62F3nCBCoVcSjvDbUKyn0-CGqRl2jWQAH7sQNUw0uTTdzOhOXOlZVNdKbCvM0VFRGkp',
                    app_id: 'tilechat',
                    device_model: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
                    language: 'it',
                    platform: 'ionic',
                    platform_version: '3.0.68',
                    user_id: '6d011n62ir097c0143cc42dc'
                },
                ...
            ]
            */
            // Check if there are any device tokens.
            if (!instances || (instances && instances.length == 0)) {
                return console.log('There are no notification instances for', user_id);
            }
            for (let i = 0; i < instances.length; i++) {
                const token = instances[i].instance_id;
                console.log("FCM token:", token)
                var instance = instances[i];
                const platform = instance.platform;
                var clickAction = "NEW_MESSAGE";
                var icon = "ic_notification_small";
                if (platform=="ionic" || platform.indexOf("web/") >- 1){
                    clickAction = webClickAction;
                    icon = "/chat/assets/img/icon.png"
                }
                const payload = {
                    notification: {
                        title: message.sender_fullname,
                        body: text,
                        icon: icon,
                        sound: "default",
                        click_action: clickAction,
                        "content_available": "true",
                        badge: "1"
                    },
                    data: {
                        recipient: message.recipient,
                        recipient_fullname: message.recipient_fullname,
                        sender: message.sender,
                        sender_fullname: message.sender_fullname,
                        channel_type: message.channel_type,
                        text: text,
                        timestamp: new Date().getTime().toString()
                    }
                };
                console.log("payload:", payload)
                //getMessaging().send(payload)
                admin.messaging().sendToDevice(token, payload)
                .then((response) => {
                    console.log("Push notification for message "+ JSON.stringify(message) + " with payload "+ JSON.stringify(payload) +" for token "+token+" and platform "+platform+" sent with response ",  JSON.stringify(response));
                    response.results.forEach((result, index) => {
                        const error = result.error;
                        if (error) {
                            console.error('Failure sending notification to', token, error);
                            if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
                                var tokenToRemove = path+'/'+token;
                                console.error('Invalid regid. Removing it', token, ' from ',tokenToRemove,error);
                                // TODO
                                // admin.database().ref(tokenToRemove).remove().then(function () {
                                //     console.log('tokenToRemove removed',tokenToRemove);
                                // });
                            }
                        }
                        return error;
                    })
                })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });
            }
        });
    }

}

module.exports = { Chat21Push };
