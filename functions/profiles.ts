import { api, collection } from '@nitric/sdk';
import { buildSchema, graphql } from 'graphql';
import { uuid } from 'uuidv4';

interface Profile {
  id: string;
  name: string;
  age: number;
  homeTown: string;
}

type ProfileInput = Omit<Profile, 'id'>;

export const profileApi = api('public');

export const profiles = collection<ProfileInput>('bruh').for('writing','reading');

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

const createProfile = async ({ profile }): Promise<Profile> => {
  const id = uuid();

  await profiles.doc(id).set(profile);

  return {
    id,
    ...profile,
  }
}

const updateProfile = async ({ id, profile }) => {
  await profiles.doc(id).set(profile);

  return {
    id,
    ...profile,
  }
}

const getProfiles = async (): Promise<Profile[]> => {
  const result = await profiles.query().fetch();
    
  return result.documents.map((doc) => ({
    id: doc.id,
    ...doc.content
  }))
}

const getProfile = async ({ id }): Promise<Profile> => {
  const profile = await profiles.doc(id).get();

  return {
    id,
    ...profile,
  }
}

const resolvers = {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
}

profileApi.post('/', async (ctx) => {
  const { query, variables } = ctx.req.json();
  const result = await graphql({
    schema: schema, 
    source: query, 
    rootValue: resolvers,
  });

  return ctx.res.json(result);
});