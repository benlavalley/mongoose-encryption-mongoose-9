'use strict';

var _ = require('underscore');
var mongooseEncryption = require('./mongoose-encryption.js');

var VERSION_A_BUF = Buffer.from('a');

/**
 * Export For Migrations
 *
 * Should not be used in conjunction with the main encryption plugin.
 */

module.exports = function(schema, options) {
    options.middleware = false; // don't run middleware during the migration
    mongooseEncryption(schema, options); // get all instance methods

    schema.statics.migrateToA = async function() {
        const docs = await this.find({}); // find all docs in collection

        for (const doc of docs) { // for each doc
            if (doc._ac) { // don't migrate if already migrated
                continue;
            }
            if (doc._ct) { // if previously encrypted
                doc._ct = Buffer.concat([VERSION_A_BUF, doc._ct]); // append version to ciphertext
                await doc.sign(); // sign
                await doc.save(); // save
            } else { // if not previously encrypted
                await doc.encrypt(); // encrypt
                await doc.sign(); // sign
                await doc.save(); // save
            }
        }
    };

    schema.statics.migrateSubDocsToA = async function(subDocField) {
        if (typeof subDocField !== 'string'){
            throw new Error('First argument must be the name of a field in which subdocuments are stored');
        }
        const docs = await this.find({}); // find all docs in collection

        for (const doc of docs) { // for each doc
            if (doc[subDocField]) {
                _.each(doc[subDocField], function(subDoc){ // for each subdoc
                    if (subDoc._ct) { // if previously encrypted
                        subDoc._ct = Buffer.concat([VERSION_A_BUF, subDoc._ct]); // append version to ciphertext
                    }
                });
                await doc.save(); // save
            }
        }
    };


    // sign all the documents in a collection
    schema.statics.signAll = async function() {
        const docs = await this.find({}); // find all docs in collection

        for (const doc of docs) { // for each doc
            await doc.sign(); // sign
            await doc.save(); // save
        }
    };
};
