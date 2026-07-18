import { pgTable, text, timestamp, integer, doublePrecision } from "drizzle-orm/pg-core";

export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  timestamp: doublePrecision("timestamp").notNull(),
  
  // Student Info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  classLevel: text("class_level").notNull(),
  room: text("room").notNull(),
  studentNumber: text("student_number").notNull(),

  // Part 1
  part1ScoreR: integer("part1_score_r").notNull(),
  part1ScoreI: integer("part1_score_i").notNull(),
  part1ScoreS: integer("part1_score_s").notNull(),
  part1ScoreC: integer("part1_score_c").notNull(),
  part1ScoreE: integer("part1_score_e").notNull(),
  part1ScoreA: integer("part1_score_a").notNull(),

  // Part 2
  part2ScoreD: integer("part2_score_d").notNull(),
  part2ScoreP: integer("part2_score_p").notNull(),
  part2ScoreT: integer("part2_score_t").notNull(),

  // Part 3
  part3ConsistencyPercentage: doublePrecision("part3_consistency_percentage").notNull(),
});
