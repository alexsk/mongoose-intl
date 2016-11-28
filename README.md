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

### Language methods

The current language can be set/changed on 3 levels:
* Document level: affects only some document (each particular model instance)
* Schema level: affects all documents created from the models with the particular schema
* Connection level: affects all models (and their schemas) created for the particular Mongoose connection

#### Document level

Each document will receive the following language methods:
* `getLanguages()` - returns an array of available languages
* `getLanguage()` - returns current document's language
* `setLanguage(lang)` - changes document's language to a new one, the value should be equal to the one of available languages
* `unsetLanguage()` - removes previously set document-specific language, schema's default language will be used for the translation

Usage examples:

```js
BlogPostModel.find({}, function (err, posts) {
  if (err) return handleError(err);
  
  console.log(JSON.stringify(posts)); // [{ _id: '...', title: 'Title 1 on default language' },
                                      //  { _id: '...', title: 'Title 2 on default language' }, ...]
  
  posts[0].getLanguages(); // [ 'en', 'de', 'fr' ]
  posts[0].getLanguage(); // 'en'
  
  posts[0].setLanguage('de');
  console.log(JSON.stringify(posts)); // [{ _id: '...', title: 'Another German title' },
                                      //  { _id: '...', title: 'Title 2 on default language' }, ...]
  
  BlogPostModel.setDefaultLanguage('fr'); // schema-level language change (see documentation below)
  console.log(JSON.stringify(posts)); // [{ _id: '...', title: 'Another German title' }, // still 'de'
                                      //  { _id: '...', title: 'French title 2' }, ...]
  
  posts[0].unsetLanguage();
  console.log(JSON.stringify(posts)); // [{ _id: '...', title: 'French title 1' },
                                      //  { _id: '...', title: 'French title 2' }, ...]
});
```

#### Schema level

The plugins adds the following language methods to the schema:
* `getLanguages()` - returns an array of available languages
* `getDefaultLanguage()` - returns current default language
* `setDefaultLanguage(lang)` - changes default language to a new one, the value should be equal to the one of available languages

Usage examples:

```js
BlogPostModel.find({}, function (err, posts) {
  if (err) return handleError(err);
  
  console.log(JSON.stringify(posts)); // [{ _id: '...', title: 'Title 1 on default language' },
                                      //  { _id: '...', title: 'Title 2 on default language' }, ...]
  
  BlogPostModel.getLanguages(); // [ 'en', 'de', 'fr' ]
  BlogPostModel.getDefaultLanguage(); // 'en'
  
  BlogPostModel.setDefaultLanguage('de');
  console.log(JSON.stringify(posts)); // [{ _id: '...', title: 'Another German title 1' },
                                      //  { _id: '...', title: 'Another German title 2' }, ...]
});
```

*Note:* `BlogPostModel.setDefaultLanguage();` method changes language settings on the schema level, it means that in case you have couple models sharing the same schema, language change will be applied to all other models as well.

#### Connection level

One more global method to change the language for all your schemas:
* `setDefaultLanguage(lang)` - updates all schemas for the Mongoose db connection

If you're creating connection explicitly:
```js
var db = mongoose.createConnection('mongodb://user:pass@localhost:port/database');

db.setDefaultLanguage('de');
```
or using the default connection:
```js
mongoose.connect('mongodb://user:pass@localhost:port/database');

mongoose.setDefaultLanguage('de');
```

#### Language change in multiuser environment warning

Schema- and Connection-level methods are actually changing schema's settings, which are app-wide. And if your node app serves requests for the different users (e.g. it's a web server), you should use these methods carefully, making sure they will be executed in the same event loop as the data return method.

```js
mongoose.setDefaultLanguage(userLang);

// .find() method is async and callback function can be executed during another event loop
BlogPostModel.find({}, function (err, posts) {
  if (err) return handleError(err);
  
  response.write(JSON.stringify(posts));
  response.end();
});
```
If we'll have 2 users that are using different languages, and are sending simultaneous requests, than it can be possible that the code above will return the response on the same language for both of them.

Correct usage:
```js
BlogPostModel.find({}, function (err, posts) {
  if (err) return handleError(err);

  mongoose.setDefaultLanguage(userLang);
  response.write(JSON.stringify(posts));
  response.end();
});
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

## Upgrading from v1.x to v2.x

`v2.x` version has incompatible API updates for Mongoose document language methods:
* `getDefaultLanguage()` - was renamed to `getLanguage()`
* `setDefaultLanguage(lang)` - was renamed to `setLanguage(lang)`

`*DefaultLanguage` methods are not available for the documents any more, they are used for the schema settings changes now.

So in the example from `v1.x` documentation:
```js
BlogPostModel.findById('some id', function (err, post) {
  if (err) return handleError(err);

  console.log(post.toJSON()); // { _id: '...', title: 'Title on default language', body: '...' }

  post.getLanguages(); // [ 'en', 'de', 'fr' ]
  post.getDefaultLanguage(); // 'en'

  post.setDefaultLanguage('de');
  console.log(post.toJSON()); // { _id: '...', title: 'Another German title', body: '...' }

});
```
`Default` prefix should be removed from the getter and setter:
```js
BlogPostModel.findById('some id', function (err, post) {
  if (err) return handleError(err);

  console.log(post.toJSON()); // { _id: '...', title: 'Title on default language', body: '...' }

  post.getLanguages(); // [ 'en', 'de', 'fr' ]
  post.getLanguage(); // 'en'

  post.setLanguage('de');
  console.log(post.toJSON()); // { _id: '...', title: 'Another German title', body: '...' }

});
```
