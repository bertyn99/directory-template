import { defineRelations } from "drizzle-orm";
import { users, accounts, sessions } from "./auth";
import { venueCategories, franchises } from "./core";
import { countries, cities, addresses } from "./location";
import {
  venues,
  userVenues,
  formulas,
  images,
  events,
  reviews,
  venueActivities,
  venueEquipments,
} from "./venues";
import { thematiques, activities, equipments } from "./activities";
import { venueSources } from "./venueSources";
import { sources, sourceCountries } from "./sources";
import { subscriptions } from "./subscription";
import { matchCandidates } from "./matchCandidates";

export const relations = defineRelations(
  {
    users,
    accounts,
    sessions,
    subscriptions,
    venueCategories,
    franchises,
    countries,
    cities,
    addresses,
    venues,
    userVenues,
    formulas,
    images,
    events,
    reviews,
    thematiques,
    activities,
    equipments,
    venueActivities,
    venueEquipments,
    venueSources,
    sources,
    sourceCountries,
    matchCandidates,
  },
  (r) => ({
  users: {
    venues: r.many.userVenues(),
    ownedFranchises: r.many.franchises(),
    accounts: r.many.accounts(),
    sessions: r.many.sessions(),
    subscription: r.one.subscriptions({
      from: r.users.id,
      to: r.subscriptions.userId,
    }),
    reviewedMatchCandidates: r.many.matchCandidates(),
  },

  accounts: {
    user: r.one.users({
      from: r.accounts.userId,
      to: r.users.id,
    }),
  },

  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },

  subscriptions: {
    user: r.one.users({
      from: r.subscriptions.userId,
      to: r.users.id,
    }),
  },

  venueCategories: {
    venues: r.many.venues(),
  },

  franchises: {
    owner: r.one.users({
      from: r.franchises.ownerId,
      to: r.users.id,
    }),
    venues: r.many.venues(),
  },

  countries: {
    cities: r.many.cities(),
    sourceCountries: r.many.sourceCountries(),
  },

  cities: {
    addresses: r.many.addresses(),
    country: r.one.countries({
      from: r.cities.countryId,
      to: r.countries.id,
    }),
  },

  addresses: {
    city: r.one.cities({
      from: r.addresses.cityId,
      to: r.cities.id,
    }),
    venues: r.many.venues(),
    venueSources: r.many.venueSources(),
  },

  venues: {
    type: r.one.venueCategories({
      from: r.venues.categoryId,
      to: r.venueCategories.id,
    }),
    franchise: r.one.franchises({
      from: r.venues.franchiseId,
      to: r.franchises.id,
    }),
    address: r.one.addresses({
      from: r.venues.addressId,
      to: r.addresses.id,
    }),
    owners: r.many.userVenues(),
    activities: r.many.venueActivities(),
    equipments: r.many.venueEquipments(),
    formulas: r.many.formulas(),
    images: r.many.images(),
    events: r.many.events(),
    reviews: r.many.reviews(),
    venueSources: r.many.venueSources(),
    matchCandidates: r.many.matchCandidates(),
  },

  userVenues: {
    user: r.one.users({
      from: r.userVenues.userId,
      to: r.users.id,
    }),
    venue: r.one.venues({
      from: r.userVenues.venueId,
      to: r.venues.id,
    }),
  },

  formulas: {
    venue: r.one.venues({
      from: r.formulas.venueId,
      to: r.venues.id,
    }),
  },

  images: {
    venue: r.one.venues({
      from: r.images.venueId,
      to: r.venues.id,
    }),
  },

  events: {
    venue: r.one.venues({
      from: r.events.venueId,
      to: r.venues.id,
    }),
  },

  reviews: {
    venue: r.one.venues({
      from: r.reviews.venueId,
      to: r.venues.id,
    }),
  },

  thematiques: {
    activities: r.many.activities(),
  },

  activities: {
    thematique: r.one.thematiques({
      from: r.activities.thematiqueId,
      to: r.thematiques.id,
    }),
    venues: r.many.venueActivities(),
  },

  equipments: {
    venues: r.many.venueEquipments(),
  },

  venueActivities: {
    venue: r.one.venues({
      from: r.venueActivities.venueId,
      to: r.venues.id,
    }),
    activity: r.one.activities({
      from: r.venueActivities.activityId,
      to: r.activities.id,
    }),
  },

  venueEquipments: {
    venue: r.one.venues({
      from: r.venueEquipments.venueId,
      to: r.venues.id,
    }),
    equipment: r.one.equipments({
      from: r.venueEquipments.equipmentId,
      to: r.equipments.id,
    }),
  },

  venueSources: {
    venue: r.one.venues({
      from: r.venueSources.venueId,
      to: r.venues.id,
    }),
    address: r.one.addresses({
      from: r.venueSources.addressId,
      to: r.addresses.id,
    }),
    matchCandidates: r.many.matchCandidates(),
  },

  sources: {
    countries: r.many.sourceCountries(),
  },

  sourceCountries: {
    source: r.one.sources({
      from: r.sourceCountries.sourceId,
      to: r.sources.id,
    }),
    country: r.one.countries({
      from: r.sourceCountries.countryId,
      to: r.countries.id,
    }),
  },

  matchCandidates: {
    venueSource: r.one.venueSources({
      from: r.matchCandidates.venueSourceId,
      to: r.venueSources.id,
    }),
    existingVenue: r.one.venues({
      from: r.matchCandidates.existingVenueId,
      to: r.venues.id,
    }),
    reviewer: r.one.users({
      from: r.matchCandidates.reviewedBy,
      to: r.users.id,
    }),
  },
}));
