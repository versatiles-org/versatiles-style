[**@versatiles/style**](../README.md)

***

[@versatiles/style](../globals.md) / StyleBuilder

# Class: `abstract` StyleBuilder

Defined in: [style\_builder/style\_builder.ts:14](https://github.com/versatiles-org/versatiles-style/blob/main/src/style_builder/style_builder.ts#L14)

## Constructors

### new StyleBuilder()

> **new StyleBuilder**(): [`StyleBuilder`](StyleBuilder.md)

#### Returns

[`StyleBuilder`](StyleBuilder.md)

## Properties

### defaultColors

> `abstract` `readonly` **defaultColors**: [`StyleBuilderColorStrings`](../type-aliases/StyleBuilderColorStrings.md)

Defined in: [style\_builder/style\_builder.ts:19](https://github.com/versatiles-org/versatiles-style/blob/main/src/style_builder/style_builder.ts#L19)

***

### defaultFonts

> `abstract` `readonly` **defaultFonts**: [`StyleBuilderFonts`](../type-aliases/StyleBuilderFonts.md)

Defined in: [style\_builder/style\_builder.ts:21](https://github.com/versatiles-org/versatiles-style/blob/main/src/style_builder/style_builder.ts#L21)

***

### name

> `abstract` `readonly` **name**: `string`

Defined in: [style\_builder/style\_builder.ts:17](https://github.com/versatiles-org/versatiles-style/blob/main/src/style_builder/style_builder.ts#L17)

## Methods

### build()

> **build**(`options`?): `StyleSpecification`

Defined in: [style\_builder/style\_builder.ts:23](https://github.com/versatiles-org/versatiles-style/blob/main/src/style_builder/style_builder.ts#L23)

#### Parameters

##### options?

[`StyleBuilderOptions`](../interfaces/StyleBuilderOptions.md)

#### Returns

`StyleSpecification`

***

### getColors()

> **getColors**(`colors`): [`StyleBuilderColors`](../type-aliases/StyleBuilderColors.md)

Defined in: [style\_builder/style\_builder.ts:105](https://github.com/versatiles-org/versatiles-style/blob/main/src/style_builder/style_builder.ts#L105)

#### Parameters

##### colors

[`StyleBuilderColorStrings`](../type-aliases/StyleBuilderColorStrings.md)

#### Returns

[`StyleBuilderColors`](../type-aliases/StyleBuilderColors.md)

***

### getDefaultOptions()

> **getDefaultOptions**(): [`StyleBuilderOptions`](../interfaces/StyleBuilderOptions.md)

Defined in: [style\_builder/style\_builder.ts:111](https://github.com/versatiles-org/versatiles-style/blob/main/src/style_builder/style_builder.ts#L111)

#### Returns

[`StyleBuilderOptions`](../interfaces/StyleBuilderOptions.md)

***

### getStyleRules()

> `abstract` `protected` **getStyleRules**(`options`): [`StyleRules`](../type-aliases/StyleRules.md)

Defined in: [style\_builder/style\_builder.ts:133](https://github.com/versatiles-org/versatiles-style/blob/main/src/style_builder/style_builder.ts#L133)

#### Parameters

##### options

[`StyleRulesOptions`](../interfaces/StyleRulesOptions.md)

#### Returns

[`StyleRules`](../type-aliases/StyleRules.md)

***

### transformDefaultColors()

> `protected` **transformDefaultColors**(`callback`): `void`

Defined in: [style\_builder/style\_builder.ts:125](https://github.com/versatiles-org/versatiles-style/blob/main/src/style_builder/style_builder.ts#L125)

#### Parameters

##### callback

(`color`) => [`Color`](Color.md)

#### Returns

`void`
