import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const nullableString = v.union(v.string(), v.null());
const tierValidator = v.union(
  v.literal("S"),
  v.literal("A"),
  v.literal("B"),
  v.literal("C"),
  v.literal("D")
);

export default defineSchema({
  profiles: defineTable({
    avatarUrl: nullableString,
    catalogSource: v.union(v.literal("managed"), v.literal("pinned")),
    createdAt: v.number(),
    displayName: nullableString,
    displayUsername: v.string(),
    updatedAt: v.number(),
    userId: v.union(v.string(), v.null()),
    username: v.string(),
  })
    .index("by_username", ["username"])
    .index("by_userId", ["userId"]),

  rankableRepos: defineTable({
    createdAt: v.number(),
    description: nullableString,
    imageLabel: nullableString,
    isPrivate: v.boolean(),
    language: nullableString,
    languageColor: nullableString,
    name: v.string(),
    ownerUsername: v.string(),
    profileId: v.id("profiles"),
    repo: v.string(),
    sortOrder: v.number(),
    stars: v.number(),
    updatedAt: v.number(),
    url: v.string(),
    userId: v.union(v.string(), v.null()),
    username: v.string(),
  })
    .index("by_username", ["username"])
    .index("by_username_repo", ["username", "repo"])
    .index("by_userId", ["userId"]),

  votes: defineTable({
    createdAt: v.number(),
    repo: v.string(),
    tier: tierValidator,
    username: v.string(),
    voterId: v.string(),
  })
    .index("by_username", ["username"])
    .index("by_username_repo", ["username", "repo"])
    .index("by_username_repo_voterId", ["username", "repo", "voterId"]),
});
