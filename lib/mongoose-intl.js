'use strict';

var mongoose = require('mongoose'),
    extend   = require('util')._extend;

module.exports = exports = function mongooseIntl(schema, options) {
    if (!options || !options.languages || !Array.isArray(options.languages) || !options.languages.length) {
        throw new mongoose.Error('Required languages array is missing');
    }

    // plugin options to be set under schema options
    schema.options.mongooseIntl = {};
    var pluginOptions = schema.options.mongooseIntl;

    pluginOptions.languages = options.languages.slice(0);

    // the first available language will be used as default if it's not set or unknown value passed
    if (!options.defaultLanguage || pluginOptions.languages.indexOf(options.defaultLanguage) === -1) {
        pluginOptions.defaultLanguage = pluginOptions.languages[0];
    } else {
        pluginOptions.defaultLanguage = options.defaultLanguage.slice(0);
    }

    schema.eachPath(function (path, schemaType) {
        if (schemaType.schema) { // propagate plugin initialization for sub-documents schemas
            schemaType.schema.plugin(mongooseIntl, pluginOptions);
            return;
        }

        if (!schemaType.options.intl) {
            return;
        }

        if (!(schemaType instanceof mongoose.Schema.Types.String)) {
            throw new mongoose.Error('Mongoose-intl plugin can be used with String type only');
        }

        var pathArray = path.split('.'),
            key       = pathArray.pop(),
            prefix    = pathArray.join('.');

        if (prefix) prefix += '.';

        // removing real path, it will be changed to virtual later
        schema.remove(path);

        // schema.remove removes path from paths object only, but doesn't update tree
        // sounds like a bug, removing item from the tree manually
        var tree = pathArray.reduce(function (mem, part) {
            return mem[part];
        }, schema.tree);
        delete tree[key];


        schema.virtual(path)
            .get(function (param) {
                return param[this.schema.options.mongooseIntl.defaultLanguage];
            })
            .set(function (value) {
                this.set(path + '.' + this.schema.options.mongooseIntl.defaultLanguage, value);
            });

        schema.virtual(path + '.all')
            .get(function () {
                return this.getValue(path);
            })
            .set(function (value) {
                pluginOptions.languages.forEach(function (lang) {
                    if (!value[lang]) { return; }
                    this.set(path + '.' + lang, value[lang]);
                }, this);
            });


        // intl option is not needed for the current path any more,
        // and is unwanted for all child lang-properties
        delete schemaType.options.intl;

        var intlObject = {};
        intlObject[key] = {};
        pluginOptions.languages.forEach(function (lang) {
            var langOptions = extend({}, schemaType.options);
            if (lang !== options.defaultLanguage) {
                delete langOptions.default;
                delete langOptions.required;
            }

            if (schemaType.options.defaultAll) {
                langOptions.default = schemaType.options.defaultAll;
            }

            if (schemaType.options.requiredAll) {
                langOptions.required = schemaType.options.requiredAll;
            }
            this[lang] = langOptions;
        }, intlObject[key]);

        // intlObject example:
        // { fieldName: {
        //     en: '',
        //     de: ''
        // }}
        schema.add(intlObject, prefix);
    });

    schema.method({
        getLanguages: function () {
            return this.schema.options.mongooseIntl.languages;
        },
        getDefaultLanguage: function () {
            return this.schema.options.mongooseIntl.defaultLanguage;
        },
        setDefaultLanguage: function (lang) {

            function updateLanguage(schema, lang) {
                schema.options.mongooseIntl.defaultLanguage = lang.slice(0);

                // default language change for sub-documents schemas
                schema.eachPath(function (path, schemaType) {
                    if (schemaType.schema) {
                        updateLanguage(schemaType.schema, lang);
                    }
                });

            }
            if (lang && this.schema.options.mongooseIntl.languages.indexOf(lang) !== -1) {
                updateLanguage(this.schema, lang);
            }
        }
    });
};
