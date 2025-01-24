[**@versatiles/style**](../README.md)

***

[@versatiles/style](../globals.md) / RGB

# Class: RGB

Defined in: [color/rgb.ts:6](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L6)

## Extends

- [`Color`](Color.md)

## Constructors

### new RGB()

> **new RGB**(`r`, `g`, `b`, `a`): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:12](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L12)

#### Parameters

##### r

`number`

##### g

`number`

##### b

`number`

##### a

`number` = `1`

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`constructor`](Color.md#constructors)

## Properties

### a

> `readonly` **a**: `number` = `1`

Defined in: [color/rgb.ts:10](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L10)

***

### b

> `readonly` **b**: `number` = `0`

Defined in: [color/rgb.ts:9](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L9)

***

### g

> `readonly` **g**: `number` = `0`

Defined in: [color/rgb.ts:8](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L8)

***

### r

> `readonly` **r**: `number` = `0`

Defined in: [color/rgb.ts:7](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L7)

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

Defined in: [color/rgb.ts:24](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L24)

#### Returns

\[`number`, `number`, `number`, `number`\]

#### Overrides

[`Color`](Color.md).[`asArray`](Color.md#asarray)

***

### asHex()

> **asHex**(): `string`

Defined in: [color/rgb.ts:45](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L45)

#### Returns

`string`

#### Overrides

[`Color`](Color.md).[`asHex`](Color.md#ashex)

***

### asHSL()

> **asHSL**(): [`HSL`](HSL.md)

Defined in: [color/rgb.ts:58](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L58)

#### Returns

[`HSL`](HSL.md)

#### Overrides

[`Color`](Color.md).[`asHSL`](Color.md#ashsl)

***

### asHSV()

> **asHSV**(): [`HSV`](HSV.md)

Defined in: [color/rgb.ts:85](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L85)

#### Returns

[`HSV`](HSV.md)

#### Overrides

[`Color`](Color.md).[`asHSV`](Color.md#ashsv)

***

### asRGB()

> **asRGB**(): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:115](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L115)

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`asRGB`](Color.md#asrgb)

***

### asString()

> **asString**(): `string`

Defined in: [color/rgb.ts:37](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L37)

#### Returns

`string`

#### Overrides

[`Color`](Color.md).[`asString`](Color.md#asstring)

***

### brightness()

> **brightness**(`value`): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:202](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L202)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`brightness`](Color.md#brightness)

***

### clone()

> **clone**(): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:20](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L20)

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`clone`](Color.md#clone)

***

### contrast()

> **contrast**(`value`): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:191](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L191)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`contrast`](Color.md#contrast)

***

### darken()

> **darken**(`ratio`): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:236](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L236)

#### Parameters

##### ratio

`number`

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`darken`](Color.md#darken)

***

### fade()

> **fade**(`value`): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:245](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L245)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`fade`](Color.md#fade)

***

### gamma()

> **gamma**(`value`): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:171](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L171)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`gamma`](Color.md#gamma)

***

### invert()

> **invert**(): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:182](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L182)

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`invert`](Color.md#invert)

***

### invertLuminosity()

> **invertLuminosity**(): [`HSL`](HSL.md)

Defined in: [color/abstract.ts:38](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L38)

#### Returns

[`HSL`](HSL.md)

#### Inherited from

[`Color`](Color.md).[`invertLuminosity`](Color.md#invertluminosity)

***

### lighten()

> **lighten**(`ratio`): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:227](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L227)

#### Parameters

##### ratio

`number`

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`lighten`](Color.md#lighten)

***

### rotateHue()

> **rotateHue**(`offset`): [`HSL`](HSL.md)

Defined in: [color/abstract.ts:42](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L42)

#### Parameters

##### offset

`number`

#### Returns

[`HSL`](HSL.md)

#### Inherited from

[`Color`](Color.md).[`rotateHue`](Color.md#rotatehue)

***

### round()

> **round**(): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:28](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L28)

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`round`](Color.md#round)

***

### saturate()

> **saturate**(`ratio`): [`HSL`](HSL.md)

Defined in: [color/abstract.ts:46](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L46)

#### Parameters

##### ratio

`number`

#### Returns

[`HSL`](HSL.md)

#### Inherited from

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

Defined in: [color/rgb.ts:215](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L215)

#### Parameters

##### value

`number`

##### tintColor

[`Color`](Color.md)

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`tint`](Color.md#tint)

***

### toHSL()

> **toHSL**(): [`HSL`](HSL.md)

Defined in: [color/abstract.ts:26](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L26)

#### Returns

[`HSL`](HSL.md)

#### Inherited from

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

Defined in: [color/rgb.ts:119](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L119)

#### Returns

[`RGB`](RGB.md)

#### Overrides

[`Color`](Color.md).[`toRGB`](Color.md#torgb)

***

### parse()

> `static` **parse**(`input`): [`RGB`](RGB.md)

Defined in: [color/rgb.ts:123](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/rgb.ts#L123)

#### Parameters

##### input

`string` | [`Color`](Color.md)

#### Returns

[`RGB`](RGB.md)

#### Overrides

`Color.parse`
