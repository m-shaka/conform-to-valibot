import type {
  NullSchema,
  NullableSchema,
  OptionalSchema,
  NullishSchema,
  NonNullableSchema,
  NonOptionalSchema,
  NonNullishSchema,
  ObjectSchema,
  ObjectEntries,
  UnionSchema,
  UnionOptions,
  BaseSchema,
  ArraySchema,
  BigintSchema,
  BooleanSchema,
  DateSchema,
  EnumSchema,
  Enum,
  LiteralSchema,
  Literal,
  NumberSchema,
  PicklistSchema,
  PicklistOptions,
  StringSchema,
  UndefinedSchema,
} from "valibot";
import { coerce } from "valibot";

/**
 * Helpers for coercing string value
 * Modify the value only if it's a string, otherwise return the value as-is
 */
export function coerceString(
  value: unknown,
  transform?: (text: string) => unknown,
) {
  if (typeof value !== "string") {
    return value;
  }

  if (value === "") {
    return undefined;
  }

  if (typeof transform !== "function") {
    return value;
  }

  return transform(value);
}

/**
 * Helpers for coercing file
 * Modify the value only if it's a file, otherwise return the value as-is
 */
export function coerceFile(file: unknown) {
  if (
    typeof File !== "undefined" &&
    file instanceof File &&
    file.name === "" &&
    file.size === 0
  ) {
    return undefined;
  }

  return file;
}

type WrapWithDefaultSchema =
  | NullSchema<BaseSchema>
  | OptionalSchema<BaseSchema>
  | NullableSchema<BaseSchema>
  | NullishSchema<BaseSchema>;
type WrapWithoutDefaultSchema =
  | NonNullableSchema<BaseSchema>
  | NonOptionalSchema<BaseSchema>
  | NonNullableSchema<BaseSchema>
  | NonNullishSchema<BaseSchema>;
type WrapSchema = WrapWithDefaultSchema | WrapWithoutDefaultSchema;

type ValibotSchema =
  | ObjectSchema<ObjectEntries>
  | StringSchema
  | ArraySchema<BaseSchema>
  | BigintSchema
  | BooleanSchema
  | DateSchema
  | EnumSchema<Enum>
  | LiteralSchema<Literal>
  | NumberSchema
  | PicklistSchema<PicklistOptions>
  | UndefinedSchema;

type AllSchema =
  | ValibotSchema
  | WrapSchema
  | UnionSchema<UnionOptions>
  | BaseSchema;

type WrapOption = {
  wrap?: WrapSchema;
  cache?: Map<AllSchema, AllSchema>;
};
/**
 * Reconstruct the provided schema with additional preprocessing steps
 * This coerce empty values to undefined and transform strings to the correct type
 */
export function enableTypeCoercion<Type extends AllSchema,>(
  type: Type,
  options?: WrapOption,
): AllSchema {
  const cache = options?.cache ?? new Map<Type, AllSchema>();
  const result = cache.get(type);

  // Return the cached schema if it's already processed
  // This is to prevent infinite recursion caused by z.lazy()
  if (result) {
    return result;
  }

  // A schema that does not have a type property does not exist.
  // However, in the wrapped property such as optional schema,
  // it is necessary to receive the BaseSchema expression,
  // so in order to receive it, it is also possible to receive the type in BaseSchema.
  if (!("type" in type)) {
    return type;
  }

  let schema: AllSchema = type;

  if (
    type.type === "string" ||
    type.type === "literal" ||
    type.type === "enum" ||
    type.type === "undefined"
  ) {
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output),
    );
  } else if (type.type === "number") {
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output, Number),
    );
  } else if (type.type === "boolean") {
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output, (text) => (text === "on" ? true : text)),
    );
  } else if (type.type === "date") {
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) =>
        coerceString(output, (timestamp) => {
          const date = new Date(timestamp);

          // z.date() does not expose a quick way to set invalid_date error
          // This gets around it by returning the original string if it's invalid
          // See https://github.com/colinhacks/zod/issues/1526
          if (Number.isNaN(date.getTime())) {
            return timestamp;
          }

          return date;
        }),
    );
  } else if (type.type === "bigint") {
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output, BigInt),
    );
  } else if (type.type === "array") {
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => {
        // No preprocess needed if the value is already an array
        if (Array.isArray(output)) {
          return output;
        }

        if (
          typeof output === "undefined" ||
          typeof coerceFile(output) === "undefined"
        ) {
          return [];
        }

        // Wrap it in an array otherwise
        return [output];
      },
    );
  } else if (type.type === "optional") {
    schema = enableTypeCoercion(type.wrapped, {
      wrap: type,
    });
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output),
    );
  } else if (type.type === "nullish") {
    schema = enableTypeCoercion(type.wrapped, {
      wrap: type,
    });
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output),
    );
  } else if (type.type === "nullable") {
    schema = enableTypeCoercion(type.wrapped, {
      wrap: type,
    });
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output),
    );
  } else if (type.type === "non_optional") {
    schema = enableTypeCoercion(type.wrapped, { wrap: type });
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output),
    );
  } else if (type.type === "non_nullish") {
    schema = enableTypeCoercion(type.wrapped, { wrap: type });
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output),
    );
  } else if (type.type === "non_nullable") {
    schema = enableTypeCoercion(type.wrapped, { wrap: type });
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output),
    );
  } else if (type.type === "union") {
    schema = {
      ...type,
      options: type.options.map((option) => enableTypeCoercion(option)),
    };
    schema = coerce(
      options?.wrap
        ? {
            ...options.wrap,
            wrapped: schema,
          }
        : schema,
      (output) => coerceString(output),
    );
  } else if (type.type === "object") {
    const shape = {
      ...type,
      entries: Object.fromEntries(
        Object.entries(type.entries).map(([key, def]) => [
          key,
          enableTypeCoercion(def, { cache }),
        ]),
      ),
    } as ObjectSchema<ObjectEntries>;
    schema = options?.wrap
      ? {
          ...options.wrap,
          // @ts-expect-error
          wrapped: shape,
        }
      : shape;
  }

  if (type !== schema) {
    cache.set(type, schema);
  }

  return schema;
}
