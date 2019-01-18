This is a companion demo for the blog post [here](https://www.feval.ca/post/tincan-phone).

It is trying to demonstrate how to add an authorization layer over an unsecured application
through containers, using the [decorator](https://en.wikipedia.org/wiki/Decorator_pattern) and 
[ambassador](https://docs.microsoft.com/en-us/azure/architecture/patterns/ambassador) patterns.

The concept is that the legacy application gets deployed within a pod with no public endpoints. Inbound traffic goes
through the decorator, which validates that the request is properly authorized. Outbound traffic goes through ambassadors
which add authorization to the requests.

This demo is composed of three services - an order service, which calls a fulfillment service to deliver an order ; and
an authorization service which is there only to generate the access tokens.

![](./diagram.png)

The flow is the following:

1. A request is sent to the order service. It is directed to the authorization decorator which validates that request is
    authorized for audience `aud:order-service` (and could also validate individual permissions at an endpoint level).
    If it is not, the request gets rejected. If it is valid, the request is forwarded to the order service a port on 
    localhost within the pod.

2. Order service is configured to call the fulfillment service on a port on localhost. Except that the service on
    localhost is actually the ambassador to the fulfillment service. The ambassador looks for a valid token for 
    `aud:fulfillment-service` in its cache, and authenticate to the authorization service for that scope if it can't
    find one.

3. The ambassador then proceeds to send the request to the fulfillment-service, with the access_token added to the
    request. This request is effectively processed by another decorator deployed in front of the fulfillment-service.
    The same story repeats again: decorator validates the audience, and forwards to the service on a port on localhost
    for processing.

# Warnings

- **This code is meant for demo purposes only, does not include any tests, and should not be used on production.**
- An Oauth2 security scheme should never be used on an HTTP scheme. However for the purposes of this demo HTTP was
    simpler than HTTPS and therefore used. Do not use HTTP to pass on access_tokens and authenticate to an authorization service.
    Note that the same patterns (ambassador and decorator) can be used to add TLS to HTTP-only services.

# Services

All the services are node.js, and configured through environment variables. 

## Authorization service

- `PORT` lets you configure the port on which to expose the service
- `JWT_SECRET` lets you configure a customer encryption key (encryption is symmetric. IRL you would probably use asymmetric).
    Defaults to `mysupersecret`. IRL you would never, ever, ever put a default.

The authorization service also defines identities in a JSON document at the root of the service.

## Order service and Fulfillment service

Order service and fulfillment service are
both using [bounce](https://www.npmjs.com/package/bounce-server).

They need to define `BOUNCE_COMMAND` which specifies how the service runs. The order service simply forward the inbound
query to the fulfillment service to simulate inter-service communication. Instead of pointing to the fulfillment service,
this points to the localhost ambassador.

e.g.: `BOUNCE_COMMAND=-p '/api/order' -x http://127.0.0.1:$ORDER_SERVICE_FULFILLMENT_AMBASSADOR_PORT/api/fulfillment-order`

## Decorator

The decorator decorates the services with Authorization capabilities. It is configured with the following keys:

- `PROXY_TO` indicates where to forward requests once access token has been validated. This should always be a port
    on localhost (e.g. http://127.0.0.1:8080)
- `PORT` specifies the port of the public endpoint.
- `AUDIENCE` defines what is the audience that should be present in the access_token. 
- `JWT_SECRET` lets you configure a customer encryption key for validation (encryption is symmetric. IRL you would probably use asymmetric).
    Defaults to `mysupersecret`. IRL you would never, ever, ever put a default.

## Ambassador

The ambassador acts as an ambassador of another service.  It is configured with the following keys:

- `PROXY_TO` indicates where to forward requests once access token has been validated. This should point to the actual
    service being proxied and include port (e.g. http://fulfillment-service:80).
- `PORT` specifies the port of the public endpoint.
- `AUDIENCE` defines the scope being asked to the authorization service.
- `AUTHORIZATION_URL` is where to find the authorization service (e.g. `http://authorization-service:80/oauth2/v2.0/token`)
- `CLIENT_ID` is the id with which to authenticate
- `CLIENT_SECRET` is the secret used to authenticate to the authorization service.

# Run

## Locally

Launch `run-locally.sh` in a shell.

## In Kubernetes 

Create a new namespace

```sh
kubectl create namespace sidecars
```

Deploy the services

```sh
kubectl -n sidecars apply -f authorizationService/deploy.yml
kubectl -n sidecars apply -f fulfillmentService/deploy.yml
kubectl -n sidecars apply -f orderService/deploy.yml
```

Check deployment worked (everything should be running) then get the service public IP address:

```sh
kubectl -n sidecars get pods
kubectl -n sidecars get services --watch
```

## Test

Send the following query to the authorization service endpoint, in which we pretend to be
a front-end service with access rights to the order-service.

```
POST http://127.0.0.1:8010/oauth2/v2.0/token
Content-type: application/x-www-formurlencoded

grant_type=client_credentials&client_id=front-end&client_secret=1234&scope=aud:order-service
```

This should bring back a token that you can use to query to order-service (make sure to include `Bearer` in the Authorization header):

```
POST http://40.85.202.208/api/order
Content-type: text/plain
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImNsaWVudElkIjoiZnJvbnQtZW5kIiwicGVybWlzc2lvbnMiOlsiY3JlYXRlLW9yZGVyIl19LCJhdWQiOiJhdWQ6b3JkZXItc2VydmljZSIsImlhdCI6MTU0NDQ4NDUzMywiZXhwIjoxNTQ0NDg4MTMzfQ.WBfErm2i3vWICtml47T1V_4EiG06bV66JslWiT_uqAc

BODY_DOES_NOT_MATTER.
```

This should give you a 200, and a message "Order has been fulfilled" coming back from the fulfillment service.

