[**@versatiles/style**](../README.md)

***

[@versatiles/style](../globals.md) / Color

# Class: `abstract` Color

Defined in: [color/abstract.ts:6](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L6)

## Extended by

- [`RGB`](RGB.md)
- [`HSL`](HSL.md)
- [`HSV`](HSV.md)

## Constructors

### new Color()

> **new Color**(): [`Color`](Color.md)

#### Returns

[`Color`](Color.md)

## Properties

### HSL

> `static` **HSL**: *typeof* [`HSL`](HSL.md)

Defined in: [color/abstract.ts:8](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L8)

***

### HSV

> `static` **HSV**: *typeof* [`HSV`](HSV.md)

Defined in: [color/abstract.ts:9](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L9)

***

### parse()

> `static` **parse**: (`input`) => [`Color`](Color.md)

Defined in: [color/abstract.ts:7](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L7)

#### Parameters

##### input

`string` | [`Color`](Color.md)

#### Returns

[`Color`](Color.md)

***

### random()

> `static` **random**: (`options`?) => [`HSV`](HSV.md)

Defined in: [color/abstract.ts:11](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L11)

#### Parameters

##### options?

[`RandomColorOptions`](../interfaces/RandomColorOptions.md)

#### Returns

[`HSV`](HSV.md)

***

### RGB

> `static` **RGB**: *typeof* [`RGB`](RGB.md)

Defined in: [color/abstract.ts:10](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L10)

## Methods

### asArray()

> `abstract` **asArray**(): `number`[]

Defined in: [color/abstract.ts:20](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L20)

#### Returns

`number`[]

***

### asHex()

> **asHex**(): `string`

Defined in: [color/abstract.ts:14](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L14)

#### Returns

`string`

***

### asHSL()

> `abstract` **asHSL**(): [`HSL`](HSL.md)

Defined in: [color/abstract.ts:22](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L22)

#### Returns

[`HSL`](HSL.md)

***

### asHSV()

> `abstract` **asHSV**(): [`HSV`](HSV.md)

Defined in: [color/abstract.ts:23](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L23)

#### Returns

[`HSV`](HSV.md)

***

### asRGB()

> `abstract` **asRGB**(): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:24](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L24)

#### Returns

[`RGB`](RGB.md)

***

### asString()

> `abstract` **asString**(): `string`

Defined in: [color/abstract.ts:18](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L18)

#### Returns

`string`

***

### brightness()

> **brightness**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:62](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L62)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

***

### clone()

> `abstract` **clone**(): [`Color`](Color.md)

Defined in: [color/abstract.ts:12](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L12)

#### Returns

[`Color`](Color.md)

***

### contrast()

> **contrast**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:58](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L58)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

***

### darken()

> **darken**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:70](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L70)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

***

### fade()

> `abstract` **fade**(`value`): [`Color`](Color.md)

Defined in: [color/abstract.ts:82](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L82)

#### Parameters

##### value

`number`

#### Returns

[`Color`](Color.md)

***

### gamma()

> **gamma**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:50](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L50)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

***

### invert()

> **invert**(): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:54](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L54)

#### Returns

[`RGB`](RGB.md)

***

### invertLuminosity()

> **invertLuminosity**(): [`HSL`](HSL.md)

Defined in: [color/abstract.ts:38](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L38)

#### Returns

[`HSL`](HSL.md)

***

### lighten()

> **lighten**(`value`): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:66](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L66)

#### Parameters

##### value

`number`

#### Returns

[`RGB`](RGB.md)

***

### rotateHue()

> **rotateHue**(`offset`): [`HSL`](HSL.md)

Defined in: [color/abstract.ts:42](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L42)

#### Parameters

##### offset

`number`

#### Returns

[`HSL`](HSL.md)

***

### round()

> `abstract` **round**(): [`Color`](Color.md)

Defined in: [color/abstract.ts:19](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L19)

#### Returns

[`Color`](Color.md)

***

### saturate()

> **saturate**(`ratio`): [`HSL`](HSL.md)

Defined in: [color/abstract.ts:46](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L46)

#### Parameters

##### ratio

`number`

#### Returns

[`HSL`](HSL.md)

***

### setHue()

> **setHue**(`value`): [`HSV`](HSV.md)

Defined in: [color/abstract.ts:78](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L78)

#### Parameters

##### value

`number`

#### Returns

[`HSV`](HSV.md)

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

***

### toHSL()

> **toHSL**(): [`HSL`](HSL.md)

Defined in: [color/abstract.ts:26](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L26)

#### Returns

[`HSL`](HSL.md)

***

### toHSV()

> **toHSV**(): [`HSV`](HSV.md)

Defined in: [color/abstract.ts:30](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L30)

#### Returns

[`HSV`](HSV.md)

***

### toRGB()

> **toRGB**(): [`RGB`](RGB.md)

Defined in: [color/abstract.ts:34](https://github.com/versatiles-org/versatiles-style/blob/main/src/color/abstract.ts#L34)

#### Returns

[`RGB`](RGB.md)
