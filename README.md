# chat21-http-server

Chat21 native REST API server


== Send a Message ==

curl --location --request POST 'http://localhost:8004/api/tilechat/messages' \
--header 'Authorization: [REDACTED_JWT]' \
--header 'Content-Type: application/json' \
--data-raw '{
 "sender_id": "04-ANDREASPONZIELLO",
 "sender_fullname": "Andrea Sponziello",
 "recipient_id": "03-ANDREALEO",
    "recipient_fullname": "Andrea Leo",
    "text": "hello",
    "type": "text",
    "channel_type": "direct"
}'