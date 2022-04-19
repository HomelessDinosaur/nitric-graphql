---
title: Building a GraphQL API with Nitric
description: Use the Nitric framework to easily build and deploy a serverless GraphQL API for AWS, Google Cloud, or Azure
---

## What we'll be doing

[GraphQL](https://graphql.org) APIs rely on only one HTTP endpoint, which means that you want it to be reliable, scalable, and performant. By using serverless compute such as Lambda, the GraphQL endpoint can be auto-scaling, whilst maintaining performance and reliability. 

We'll be using Nitric to create a GraphQL API, that can be deployed to a cloud of your choice, gaining the benefits of serverless compute.

1. Create the GraphQL Schema
2. Write Resolvers
3. Create handler for GraphQL requests
4. Run locally for testing
5. Deploy to a cloud of your choice

## Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- The [Nitric CLI](https://nitric.io/docs/installation)
- An [AWS](https://aws.amazon.com), [GCP](https://cloud.google.com) or [Azure](https://azure.microsoft.com) account (_your choice_)

## Getting Started

## Build the GraphQL Schema

GraphQL requests are type safe, and so they require a schema to be defined to validate queries against. Lets first add the graphql module from npm.

```bash
yarn add graphql
```

We can then import `buildSchema`, and write out the schema.

```ts
import { buildSchema } from 'graphql';

const schema = buildSchema(`
  type Profile {
    id: String!
    name: String!
    age: Int!
    homeTown: String!
  }

  input ProfileInput {
    name: String!
    age: Int!
    homeTown: String!
  }

  type Query {
    getProfiles: [Profile]
    getProfile(id: String!): Profile
  }

  type Mutation {
    createProfile(profile: ProfileInput!): Profile
    updateProfile(id: String!, profile: ProfileInput!): Profile
  }
`)
```

We will also define a few types to mirror the schema definition.

```ts
interface Profile {
  id: string;
  name: string;
  age: number;
  homeTown: string;
}

type ProfileInput = Omit<Profile, 'id'>;
```

## Create Resolvers

We can create a resolver object for use by the graphql handler.

```ts
const resolvers = {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
}
```

These functions don't exist, so we'll have to define them. But first lets define a collections resource for the functions to operate against.

```ts
import { collection } from '@nitric/sdk';

const profiles = collection<ProfileInput>('profiles').for('reading','writing');
```

### Create a profile

```ts
const createProfile = async ({ profile }): Promise<Profile> => {
  const id = uuid();

  await profiles.doc(id).set(profile);

  return {
    id,
    ...profile,
  }
}
```

### Update a profile

```ts
const updateProfile = async ({ id, profile }) => {
  await profiles.doc(id).set(profile);

  return {
    id,
    ...profile,
  }
}
```
### Get all profiles

```ts
const getProfiles = async (): Promise<Profile[]> => {
  const result = await profiles.query().fetch();
    
  return result.documents.map((doc) => ({
    id: doc.id,
    ...doc.content
  }))
}
```

### Get a profile by its ID

```ts
const getProfile = async ({ id }): Promise<Profile> => {
  const profile = await profiles.doc(id).get();

  return {
    id,
    ...profile,
  }
}
```

## GraphQL Handler

We'll define an api to put our handler in.

```ts
const profileApi = api('public');
```

This api will only have one endpoint, which will handle all the requests.

```ts
import { graphql, buildSchema } from 'graphql';

...

profileApi.post('/', async (ctx) => {
  const { query, variables } = ctx.req.json();
  const result = await graphql({
    schema: schema, 
    source: query, 
    rootValue: resolvers,
  });

  return ctx.res.json(result);
})
```

## Run it!

Now that you have an API defined with a handler for the GraphQL requests, it's time to test it out locally.

Test out your application with the `run` command:

```bash
nitric run
```

> _Note:_ `run` starts a container to act as an API gateway, as well as a container for each of the services.

```
 SUCCESS Configuration gathered (3s)
 SUCCESS  Created Dev Image! (2s)
 SUCCESS  Started Local Services! (2s)
 SUCCESS  Started Functions! (1s)
Local running, use ctrl-C to stop

Api    | Endpoint
public | http://localhost:9001/apis/public
```

Once it starts, the application will receive requests via the API port.

Pressing 'Ctrl-C' will end the application.

We can use cURL, postman or any other HTTP Client to test our application, however it's better if it has GraphQL support.

Here is the GQL query syntax for retrieving all the profiles:

```text
query {
  getProfiles {
    id
    name
    age
    homeTown
  }
}
```

And here is the mutation for creating a profile:

```text
mutation {
  createProfile(profile: {
    name: "Cat",
    age: 1,
    homeTown: "Brisbane"
  }){
    id
  }
}
```

We can use cURL to query the API like so:

```bash
curl --location -X POST \
  'http://localhost:9001/apis/public/' \
  --header 'Content-Type: application/json' \
  --data-raw '{"query":"query { getProfiles { id name age homeTown }}","variables":"{}"}'
```

## Deploy to the cloud

Setup your credentials and any other cloud specific configuration:

- [AWS](/docs/reference/aws)
- [Azure](/docs/reference/azure)
- [GCP](/docs/reference/gcp)

Create a stack - a collection of resources identified in your project which will be deployed.

```bash
nitric stack new
```

```
? What do you want to call your new stack? dev
? Which Cloud do you wish to deploy to? aws
? select the region us-east-1
```

To undeploy run the following command:

```bash
nitric down -s dev
```