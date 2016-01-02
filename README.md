# mongoose-intl
Mongoose schema plugin for multilingual fields

## Installation

```sh
$ npm install mongoose-intl --save
```

## Overview

### Adding plugin to the schema

Schema definition with `intl` option enabled for some fields:

```js
var mongoose     = require('mongoose'),
    mongooseIntl = require('mongoose-intl'),
    Schema       = mongoose.Schema;

var BlogPost = new Schema({
    title  : { type: String, intl: true },
    body   : { type: String, intl: true }
});
```

*Note:* `intl` option can be enabled for String type only.

Adding plugin to the schema:

```js
BlogPost.plugin(mongooseIntl, { languages: ['en', 'de', 'fr'], defaultLanguage: 'en' });
```

or it can be defined as a global plugin which will be applied to all schemas:

```js
mongoose.plugin(mongooseIntl, { languages: ['en', 'de', 'fr'], defaultLanguage: 'en' });
```

### Plugin options

* languages - required, array with languages, suggested to use 2- or 3-letters language codes using [ISO 639 standard](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
* defaultLanguage - optional, if omitted the first value from `languages` array will be used as a default language

### Database representation

`BlogPost` schema described above will be translated to the following document in the Mongo collection:

```js
{
    "_id": ObjectId(...),
    "title": {
        "en": "...",
        "de": "...",
        "fr": "..."
    },
    "body": {
        "en": "...",
        "de": "...",
        "fr": "..."
    }
}
```

### Usage

`intl`-enabled field is converted to a virtual path and continue interacting as a string, not an object.
It means that you can read it and write to it any string, and it will be stored under default language setting.

Other languages values can be set by using `model.set()` method. All values can be set together as an object, just use `field.all` as a path in `model.set()` method. See examples below. 

Multilingual fields can be set with 3 ways:

```js
var BlogPostModel = mongoose.model('Post', BlogPost);

var post = new BlogPostModel();

post.title = 'Title on default language'; // default language definition, will be stored to title.en

post.set('title.de', 'German title'); // any other language value definition

post.set('title.all', { // defines all languages in one call using an object
    de: 'Another German title',
    fr: 'French title'
});

post.save(function (err) {
    if (err) return handleError(err);
    res.send(post);
});

```

Values can be read using the same options:

```js
var BlogPostModel = mongoose.model('Post', BlogPost);

BlogPostModel.findById('some id', function (err, post) {
  if (err) return handleError(err);
  
  post.title; // 'Title on default language'
  
  post.get('title.de'); // 'Another German title'
  
  post.get('title.all'); // { en: 'Title on default language', de: 'Another German title', fr: 'French title' }
});

```

#### Returning the whole document

The main `intl`-field defined as a virtual, and it will not be returned by `toJSON/toObject` methods which are used during the document conversion to JSON or object.
So you'll get the following result be default:
```js
console.log(post.toJSON());

{
    _id: '...',
    title: {
        en: 'Title on default language',
        de: 'Another German title',
        fr: 'French title'
    },
    body: {
        en: '...',
        de: '...',
        fr: '...'
    }
}
```

Adding virtuals to the response will allow to get more clean result:

```js
var BlogPost = new Schema({
    title  : { type: String, intl: true },
    body   : { type: String, intl: true }
}, {
    toJSON: {
        virtuals: true,
    }
});

....

console.log(post.toJSON());

{
    _id: '...',
    title: 'Title on default language',
    body: '...'
}
```

### Intl-based String type options

[`default`](http://mongoosejs.com/docs/api.html#schematype_SchemaType-default) and [`required`](http://mongoosejs.com/docs/api.html#schematype_SchemaType-required) options are applied to the default language field only.

2 new options were added for all lang-fields: `defaultAll` and `requiredAll`.

Example:

```js
var BlogPost = new Schema({
    title  : { type: String, intl: true, default: 'Some default title', requiredAll: true },
    body   : { type: String, intl: true }
});
```

All others options and validators (e.g. `lowercase`, `uppercase`, `trim`, `minlength`, `maxlength`, `match`, etc.) will be used for all languages.
But please be careful with some of them like `enum` which may not be relevant for multilingual text fields, and indexes which will be added for all fields as well.
