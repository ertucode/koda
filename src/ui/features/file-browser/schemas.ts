import z from "zod";

export const sortNames = z.enum(["name", "modifiedTimestamp", "size", "ext"]);
