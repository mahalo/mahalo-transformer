#mahalo-transformer
This module contains a transformer for Mahalo templates. It is used to parse
templates into executable JavaScript.

## Installation
You should install this package as a development dependency like so:

```sh
npm install --save-dev mahalo-transformer
```

##Usage

```javascript
import * as mahaloTransformer from 'mahalo-transformer';

let result = mahaloTransformer('<use component="./my-component"/><my-component></my-component>');
```