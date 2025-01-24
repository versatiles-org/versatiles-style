[**@versatiles/style**](../README.md)

***

[@versatiles/style](../globals.md) / HSL

# Class: HSL

Defined in: [color/hsl.ts:6](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L6)

## Extends

- [`Color`](Color.md)

## Constructors

### new HSL()

> **new HSL**(`h`, `s`, `l`, `a`): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:12](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L12)

#### Parameters

##### h

`number`

##### s

`number`

##### l

`number`

##### a

`number` = `1`

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`constructor`](Color.md#constructors)

## Properties

### a

> `readonly` **a**: `number` = `1`

Defined in: [color/hsl.ts:10](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L10)

***

### h

> `readonly` **h**: `number` = `0`

Defined in: [color/hsl.ts:7](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L7)

***

### l

> `readonly` **l**: `number` = `0`

Defined in: [color/hsl.ts:9](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L9)

***

### s

> `readonly` **s**: `number` = `0`

Defined in: [color/hsl.ts:8](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L8)

***

### HSL

> `static` **HSL**: *typeof* [`HSL`](HSL.md)

Defined in: [color/abstract.ts:8](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L8)

#### Inherited from

[`Color`](Color.md).[`HSL`](Color.md#hsl)

***

### HSV

> `static` **HSV**: *typeof* [`HSV`](HSV.md)

Defined in: [color/abstract.ts:9](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L9)

#### Inherited from

[`Color`](Color.md).[`HSV`](Color.md#hsv)

***

### random()

> `static` **random**: (`options`?) => [`HSV`](HSV.md)

Defined in: [color/abstract.ts:11](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L11)

#### Parameters

##### options?

[`RandomColorOptions`](../interfaces/RandomColorOptions.md)

#### Returns

[`HSV`](HSV.md)

#### Inherited from

[`Color`](Color.md).[`random`](Color.md#random)

***

### RGB

> `static` **RGB**: *typeof* [`RGB`](RGB.md)

Defined in: [color/abstract.ts:10](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L10)

#### Inherited from

[`Color`](Color.md).[`RGB`](Color.md#rgb)

## Methods

### asArray()

> **asArray**(): \[`number`, `number`, `number`, `number`\]

Defined in: [color/hsl.ts:20](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L20)

#### Returns

\[`number`, `number`, `number`, `number`\]

#### Overrides

[`Color`](Color.md).[`asArray`](Color.md#asarray)

***

### asHex()

> **asHex**(): `string`

Defined in: [color/abstract.ts:14](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L14)

#### Returns

`string`

#### Inherited from

[`Color`](Color.md).[`asHex`](Color.md#ashex)

***

### asHSL()

> **asHSL**(): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:45](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L45)

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`asHSL`](Color.md#ashsl)

***

### asHSV()

> **asHSV**(): [`HSV`](HSV.md)

Defined in: [color/hsl.ts:53](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L53)

#### Returns

[`HSV`](HSV.md)

#### Overrides

[`Color`](Color.md).[`asHSV`](Color.md#ashsv)

***

### asRGB()

> **asRGB**(): [`RGB`](RGB.md)

Defined in: [color/hsl.ts:60](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L60)

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`asRGB`](Color.md#asrgb)

***

### asString()

> **asString**(): `string`

Defined in: [color/hsl.ts:37](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L37)

#### Returns

`string`

#### Overrides

[`Color`](Color.md).[`asString`](Color.md#asstring)

***

### brightness()

> **brightness**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:62](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L62)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

#### Inherited from

[`Color`](Color.md).[`brightness`](Color.md#brightness)

***

### clone()

> **clone**(): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:33](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L33)

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`clone`](Color.md#clone)

***

### contrast()

> **contrast**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:58](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L58)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

#### Inherited from

[`Color`](Color.md).[`contrast`](Color.md#contrast)

***

### darken()

> **darken**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:70](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L70)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

#### Inherited from

[`Color`](Color.md).[`darken`](Color.md#darken)

***

### fade()

> **fade**(`value`): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:119](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L119)

#### Parameters

##### value

`number`

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`fade`](Color.md#fade)

***

### gamma()

> **gamma**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:50](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L50)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

#### Inherited from

[`Color`](Color.md).[`gamma`](Color.md#gamma)

***

### invert()

> **invert**(): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:54](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L54)

#### Returns

[`RGB`](RGB.md)

#### Inherited from

[`Color`](Color.md).[`invert`](Color.md#invert)

***

### invertLuminosity()

> **invertLuminosity**(): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:107](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L107)

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`invertLuminosity`](Color.md#invertluminosity)

***

### lighten()

> **lighten**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:66](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L66)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

#### Inherited from

[`Color`](Color.md).[`lighten`](Color.md#lighten)

***

### rotateHue()

> **rotateHue**(`offset`): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:111](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L111)

#### Parameters

##### offset

`number`

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`rotateHue`](Color.md#rotatehue)

***

### round()

> **round**(): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:24](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L24)

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`round`](Color.md#round)

***

### saturate()

> **saturate**(`ratio`): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:115](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L115)

#### Parameters

##### ratio

`number`

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`saturate`](Color.md#saturate)

***

### setHue()

> **setHue**(`value`): [`HSV`](HSV.md)

Defined in: [color/abstract.ts:78](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L78)

#### Parameters

##### value

`number`

#### Returns

[`HSV`](HSV.md)

#### Inherited from

[`Color`](Color.md).[`setHue`](Color.md#sethue)

***

### tint()

> **tint**(`value`, `tintColor`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:74](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L74)

#### Parameters

##### value

`number`

##### tintColor

[`Color`](Color.md)

#### Returns

[`RGB`](RGB.md)

#### Inherited from

[`Color`](Color.md).[`tint`](Color.md#tint)

***

### toHSL()

> **toHSL**(): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:49](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L49)

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`toHSL`](Color.md#tohsl)

***

### toHSV()

> **toHSV**(): [`HSV`](HSV.md)

Defined in: [color/abstract.ts:30](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L30)

#### Returns

[`HSV`](HSV.md)

#### Inherited from

[`Color`](Color.md).[`toHSV`](Color.md#tohsv)

***

### toRGB()

> **toRGB**(): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:34](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L34)

#### Returns

[`RGB`](RGB.md)

#### Inherited from

[`Color`](Color.md).[`toRGB`](Color.md#torgb)

***

### parse()

> `static` **parse**(`input`): [`HSL`](HSL.md)

Defined in: [color/hsl.ts:89](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/hsl.ts#L89)

#### Parameters

##### input

`string` | [`Color`](Color.md)

#### Returns

[`HSL`](HSL.md)

#### Overrides

`Color.parse`
