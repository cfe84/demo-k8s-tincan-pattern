#/bin/bash

AUTHORIZATION_SERVICE_PORT=8010
ORDER_SERVICE_PORT=8081
ORDER_SERVICE_DECORATOR_PORT=8001
ORDER_SERVICE_FULFILLMENT_AMBASSADOR_PORT=8041
FULFILLMENT_SERVICE_PORT=8082
FULFILLMENT_SERVICE_DECORATOR_PORT=8002


# Start an authorization server
PORT=$AUTHORIZATION_SERVICE_PORT node ./authorizationService/server.js &

# Start the order service, its decorator and its fulfillment service ambassador
bounce -P $ORDER_SERVICE_PORT -p '/api/order' -x http://127.0.0.1:$ORDER_SERVICE_FULFILLMENT_AMBASSADOR_PORT/api/fulfillment-order &
PROXY_TO=http://127.0.0.1:$ORDER_SERVICE_PORT PORT=$ORDER_SERVICE_DECORATOR_PORT AUDIENCE=aud:order-service node ./authDecorator/server.js &
PROXY_TO=http://127.0.0.1:$FULFILLMENT_SERVICE_DECORATOR_PORT \
    AUTHORIZATION_URL=http://127.0.0.1:$AUTHORIZATION_SERVICE_PORT/oauth2/v2.0/token \
    AUDIENCE=aud:fulfillment-service \
    CLIENT_ID=order-service \
    CLIENT_SECRET=1234 \
    PORT=$ORDER_SERVICE_FULFILLMENT_AMBASSADOR_PORT \
    node ./authAmbassador/server.js &

# Start the fulfillment service and its decorator
bounce -P $FULFILLMENT_SERVICE_PORT -p '/api/fulfillment-order' -r 'Fulfillment created' &
PROXY_TO=http://127.0.0.1:$FULFILLMENT_SERVICE_PORT PORT=$FULFILLMENT_SERVICE_DECORATOR_PORT AUDIENCE=aud:fulfillment-service node ./authDecorator/server.js &

