import {z} from "zod"

const categorySchema = z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/)

const partIdSchema = z
    .string()
    .regex(/^[1-9][0-9]*$/)
    .transform(Number)
    .refine(Number.isSafeInteger)

const partIdsSchema = z.array(partIdSchema).min(1).max(100)

export function parseCategory(value: string | undefined) {
    return categorySchema.safeParse(value)
}

export function parsePartIds(values: string[] | undefined) {
    return partIdsSchema
        .transform((ids) => Array.from(new Set(ids)))
        .safeParse(values)
}
