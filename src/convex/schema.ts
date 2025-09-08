import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Pokemon cache tables
    pokemon: defineTable({
      pokemonId: v.number(),
      name: v.string(),
      height: v.number(),
      weight: v.number(),
      baseExperience: v.optional(v.number()),
      types: v.array(v.string()),
      abilities: v.array(v.object({
        name: v.string(),
        isHidden: v.boolean(),
      })),
      stats: v.array(v.object({
        name: v.string(),
        baseStat: v.number(),
        effort: v.number(),
      })),
      sprites: v.object({
        frontDefault: v.optional(v.string()),
        frontShiny: v.optional(v.string()),
        officialArtwork: v.optional(v.string()),
      }),
      moves: v.array(v.string()),
      generation: v.number(),
    }).index("by_pokemon_id", ["pokemonId"])
      .index("by_name", ["name"])
      .index("by_generation", ["generation"]),

    pokemonSpecies: defineTable({
      pokemonId: v.number(),
      name: v.string(),
      flavorText: v.optional(v.string()),
      genus: v.optional(v.string()),
      captureRate: v.optional(v.number()),
      baseHappiness: v.optional(v.number()),
      growthRate: v.optional(v.string()),
      habitat: v.optional(v.string()),
      evolutionChainId: v.optional(v.number()),
      generation: v.number(),
    }).index("by_pokemon_id", ["pokemonId"]),

    pokemonTypes: defineTable({
      name: v.string(),
      color: v.string(),
    }).index("by_name", ["name"]),

    favorites: defineTable({
      userId: v.id("users"),
      pokemonId: v.number(),
    }).index("by_user", ["userId"])
      .index("by_user_and_pokemon", ["userId", "pokemonId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;